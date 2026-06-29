"""op-wrapped EAS launcher (Magnolia).

Authenticates real EAS builds with the SAME credential Watchtower monitors: the
access token in 1Password (Dev-PadMagnet/EAS), pulled transiently per-run via the
headless service account. No plaintext token at rest, no CLI session — so builds
and the health probe use ONE unified 1PW credential.

Usage:
  python scripts/eas_op.py whoami
  python scripts/eas_op.py build -p android --profile production
(or via the eas-op.cmd shim:  scripts\\eas-op.cmd build ...)
"""
import os
import subprocess
import sys

OP = os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "WinGet", "Links", "op.exe")
SA_TOKEN = os.path.join(os.path.expanduser("~"), ".op", "fpm-sa.token")
EAS = os.path.join(os.environ.get("APPDATA", ""), "npm", "eas.cmd")


def main() -> int:
    env = dict(os.environ)
    try:
        with open(SA_TOKEN, "r", encoding="utf-8") as f:
            env["OP_SERVICE_ACCOUNT_TOKEN"] = f.read().strip()
    except OSError as e:
        print(f"[eas-op] cannot read SA token: {e}")
        return 1

    r = subprocess.run([OP, "read", "op://Dev-PadMagnet/EAS/credential"],
                       capture_output=True, text=True, env=env, stdin=subprocess.DEVNULL)
    token = (r.stdout or "").strip()
    if r.returncode != 0 or not token:
        print(f"[eas-op] failed to read EXPO_TOKEN from 1Password: {r.stderr.strip()[:160]}")
        return 1

    env["EXPO_TOKEN"] = token  # transient — only for the eas child process
    eas = EAS if os.path.exists(EAS) else "eas"
    return subprocess.run([eas, *sys.argv[1:]], env=env).returncode


if __name__ == "__main__":
    sys.exit(main())
