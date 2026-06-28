"""PadMagnet env manifest — 1Password is the source of truth.

Assembles every MANAGED PadMagnet env var from 1Password (vaults Dev-PadMagnet +
the shared Dev-Shared) and can (a) verify it matches the working .env.local,
(b) regenerate .env.local, or (c) push to Vercel. PUSH-ONLY — it never runs
`vercel env pull` (that command is DESTRUCTIVE for PadMagnet; see
scripts/push-env-to-vercel.mjs header). Secret values are never printed.

Standalone by design (tool-independence): the ONLY shared dependency is the
machine 1Password channel — the headless service account `fpm-sa`. No imports
from any other repo.

1P sources:
  Dev-PadMagnet : Supabase-PadMagnet, Stripe-PadMagnet (LIVE), Twilio-PadMagnet,
                  Upstash-Redis-PadMagnet, Google-Geocoding-PadMagnet,
                  PadMagnet-Platform-Secrets, Xai API Credentials,
                  Resend API Credentials (PadMagnet's OWN key, not the shared one)
  Dev-Shared    : Bridge-IDX, Brave-Search, Vercel API Credentials (NO-TOUCH shared vault)

Usage:
  python scripts/push_env_from_1pw.py verify          # diff 1P vs .env.local (default; no writes)
  python scripts/push_env_from_1pw.py write-local     # rewrite .env.local from 1P (+ preserved local-only keys)
  python scripts/push_env_from_1pw.py push --all      # upsert all managed vars to Vercel (prod/preview/dev)
  python scripts/push_env_from_1pw.py push KEY        # upsert one var to Vercel
"""
import os, sys, json, subprocess, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_LOCAL = os.path.join(REPO, ".env.local")

# ---- non-secret identifiers (safe to hardcode) ----
VERCEL_PROJECT_ID = "prj_6IdlxcYkPklDIvf0t0rYq76avCLn"
VERCEL_TEAM_ID = "team_ZGocscJZ5XewDIQcLe70UbfI"
XAI_MODEL = "grok-4.20-0309-non-reasoning"

# ---- headless 1Password service-account reader (embedded; no cross-repo import) ----
OP = os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "WinGet", "Links", "op.exe")
TOKEN_FILE = r"C:\Users\chris\.op\fpm-sa.token"

def _op_env():
    e = dict(os.environ)
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        e["OP_SERVICE_ACCOUNT_TOKEN"] = f.read().strip()
    return e

def item(vault, title):
    """Read a 1P item's fields as {label: value}. UTF-8 safe (Windows cp1252 trap)."""
    r = subprocess.run([OP, "item", "get", title, "--vault", vault, "--format", "json"],
                       stdin=subprocess.DEVNULL, capture_output=True, env=_op_env(),
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(f"op get {vault}/{title} rc={r.returncode}: {r.stderr.strip()[:200]}")
    return {f.get("label"): (f.get("value") or "").strip()
            for f in json.loads(r.stdout).get("fields", [])}

# ---- assemble managed env from 1Password ----
def build_env():
    sb     = item("Dev-PadMagnet", "Supabase-PadMagnet")
    stripe = item("Dev-PadMagnet", "Stripe-PadMagnet (LIVE)")
    tw     = item("Dev-PadMagnet", "Twilio-PadMagnet")
    up     = item("Dev-PadMagnet", "Upstash-Redis-PadMagnet")
    geo    = item("Dev-PadMagnet", "Google-Geocoding-PadMagnet")
    plat   = item("Dev-PadMagnet", "PadMagnet-Platform-Secrets")
    xai    = item("Dev-PadMagnet", "Xai API Credentials")
    bridge = item("Dev-Shared", "Bridge-IDX")
    brave  = item("Dev-Shared", "Brave-Search")
    # Resend: PadMagnet uses its OWN key (verified distinct from the Dev-Shared/CL
    # shared key 2026-06-28) — own item, keeps PadMagnet tool-independent.
    resend = item("Dev-PadMagnet", "Resend API Credentials")
    vercel = item("Dev-Shared", "Vercel API Credentials")
    return {
        # Supabase (own project)
        "NEXT_PUBLIC_SUPABASE_URL":      sb["project_url"],
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": sb["anon_key"],
        "SUPABASE_SERVICE_ROLE_KEY":     sb["service_role_key"],
        "SUPABASE_ACCESS_TOKEN":         sb["access_token"],
        "DATABASE_URL":                  sb["database_url"],
        # Stripe (LIVE)
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": stripe["publishable_key"],
        "STRIPE_SECRET_KEY":                  stripe["secret_key"],
        "STRIPE_WEBHOOK_SECRET":              stripe["webhook_secret"],
        # Twilio (PadMagnet account)
        "TWILIO_ACCOUNT_SID":  tw["account_sid"],
        "TWILIO_AUTH_TOKEN":   tw["auth_token"],
        "TWILIO_PHONE_NUMBER": tw["phone_number"],
        # Upstash Redis
        "UPSTASH_REDIS_REST_URL":   up["rest_url"],
        "UPSTASH_REDIS_REST_TOKEN": up["rest_token"],
        # Google Geocoding (PadMagnet GCP key)
        "GOOGLE_GEOCODING_KEY":        geo["geocoding_key"],
        "GOOGLE_SERVER_GEOCODING_KEY": geo["server_geocoding_key"],
        # self-issued
        "CRON_SECRET": plat["cron_secret"],
        # X.ai / Grok
        "XAI_API_KEY": xai["credential"],
        "XAI_MODEL":   XAI_MODEL,
        # Bridge / RESO MLS (SHARED account, miamire dataset — same as sfrm-tools)
        "BRIDGE_SERVER_TOKEN":  bridge["server_token"],
        "BRIDGE_BROWSER_TOKEN": bridge["browser_token"],
        "BRIDGE_CLIENT_ID":     bridge["client_id"],
        "BRIDGE_CLIENT_SECRET": bridge["client_secret"],
        "BRIDGE_DATASET_CODE":  bridge["dataset_code"],
        # Brave Search (SHARED key)
        "BRAVE_API_KEY": brave["api_key"],
        # Resend (SHARED key)
        "RESEND_API_KEY": resend["credential"],
        # Vercel API token (SHARED) + identifiers
        "VERCEL_TOKEN":      vercel["credential"],
        "VERCEL_PROJECT_ID": VERCEL_PROJECT_ID,
        "VERCEL_TEAM_ID":    VERCEL_TEAM_ID,
    }

# Local-only keys NOT sourced from 1P (ephemeral or test fixtures) — never pushed,
# preserved on write-local so a regenerate never wipes them.
PRESERVE_LOCAL_ONLY = [
    "VERCEL_OIDC_TOKEN",                # Vercel-managed, short-lived, auto-rotated
    "MAESTRO_OWNER_TEST_EMAIL", "MAESTRO_OWNER_TEST_PASSWORD",
    "ADMIN_TEST_PASSWORD_PLAYWRIGHT",
    "PADMAGNET_OWNER_TEST_ACCT_PW", "PADMAGNET_RENTER_TEST_ACCT_PW",
    "SHA256_ANDROID_FINGERPRINT", "SHA1_ANDROID_FINGERPRINT",
    "PADMAGNET_MARKETING_OWNER_PW", "PADMAGNET_MARKETING_RENTER_PW",
]

def load_local():
    env = {}
    if not os.path.exists(ENV_LOCAL):
        return env
    with open(ENV_LOCAL, encoding="utf-8") as fh:
        for line in fh:
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            env[k.strip()] = v
    return env

def mask(v):
    return f"…{v[-3:]} (len {len(v)})" if len(v) > 6 else f"(len {len(v)})"

def cmd_verify():
    managed = build_env()
    empty = [k for k, v in managed.items() if not v]
    if empty:
        raise SystemExit(f"empty 1P values for {empty} — stop")
    local = load_local()
    ok = True
    print("=== MANAGED (1P) vs .env.local ===")
    for k, v in managed.items():
        lv = local.get(k)
        if lv is None:
            print(f"  [MISS] {k}  — in 1P, absent from .env.local  {mask(v)}")
            ok = False
        elif lv == v:
            print(f"  [PASS] {k}  {mask(v)}")
        else:
            print(f"  [DIFF] {k}  1P {mask(v)} != local {mask(lv)}")
            ok = False
    missing_local = [k for k in PRESERVE_LOCAL_ONLY if k not in local]
    print(f"\n  local-only preserved keys present: "
          f"{[k for k in PRESERVE_LOCAL_ONLY if k in local]}")
    if missing_local:
        print(f"  (note: PRESERVE keys absent from .env.local: {missing_local})")
    # keys in .env.local that are neither managed nor preserved (drift watch)
    known = set(managed) | set(PRESERVE_LOCAL_ONLY)
    unknown = sorted(k for k in local if k not in known)
    if unknown:
        print(f"  ⚠ unclassified keys in .env.local (neither 1P-managed nor preserved): {unknown}")
    print("\nVERIFY OK — 1Password faithfully reproduces every managed key."
          if ok else "\n*** MISMATCH — do not rely on 1P as source until resolved ***")
    return ok

def cmd_write_local():
    managed = build_env()
    empty = [k for k, v in managed.items() if not v]
    if empty:
        raise SystemExit(f"empty 1P values for {empty} — refuse to write")
    local = load_local()
    out = dict(managed)
    for k in PRESERVE_LOCAL_ONLY:
        if local.get(k):
            out[k] = local[k]
    with open(ENV_LOCAL, "w", encoding="utf-8") as fh:
        for k, v in out.items():
            fh.write(f"{k}={v}\n")
    print(f".env.local rewritten ({len(out)} vars: {len(managed)} managed + "
          f"{len(out) - len(managed)} preserved local-only)")

def cmd_push(args):
    managed = build_env()
    if "--all" in args:
        keys = list(managed)
    else:
        keys = [a for a in args if not a.startswith("--")]
        bad = [k for k in keys if k not in managed]
        if bad:
            raise SystemExit(f"not managed: {bad}")
    payload = [{"key": k, "value": managed[k], "type": "encrypted",
                "target": ["production", "preview", "development"]} for k in keys]
    if any(not p["value"] for p in payload):
        raise SystemExit("empty value in push set — abort")
    req = urllib.request.Request(
        f"https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/env"
        f"?teamId={VERCEL_TEAM_ID}&upsert=true",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {managed['VERCEL_TOKEN']}",
                 "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read())
    print(f"vercel upsert OK: {len(res.get('created', []))} entries "
          f"({sorted(e['key'] for e in res.get('created', []))})")
    if res.get("failed"):
        raise SystemExit(f"FAILED: {json.dumps(res['failed'])[:400]}")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "verify"
    if cmd == "verify":
        sys.exit(0 if cmd_verify() else 1)
    elif cmd == "write-local":
        cmd_write_local()
    elif cmd == "push":
        cmd_push(sys.argv[2:])
    else:
        print(__doc__)
        sys.exit(1)
