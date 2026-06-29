@echo off
REM op-wrapped EAS launcher — see scripts\eas_op.py. Auths real EAS builds with
REM the SAME 1Password token Watchtower monitors (Dev-PadMagnet/EAS), pulled
REM transiently per-run (no plaintext at rest, no CLI session).
REM Usage:  scripts\eas-op.cmd build -p android --profile production
python "%~dp0eas_op.py" %*
