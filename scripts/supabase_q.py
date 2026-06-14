#!/usr/bin/env python3
"""
supabase_q.py — read-first Supabase query helper for PadMagnet.

WHY THIS EXISTS
  Raw `curl -s -X POST .../database/query` reads and writes share an identical
  command prefix, so the permission engine can't tell SELECT from DROP. This
  helper runs under the already-allowed `python:*` rule (so reads are silent),
  and moves the read/write gate into code: reads run by default, writes are
  REFUSED unless you pass --write (which Chris must explicitly approve).

  Aligns with the API-FIRST rule: reusable helper per service, creds from the
  project .env.local (the 1P-fed channel), verify by read-back. Never prints
  secrets — only query results.

USAGE
  python scripts/supabase_q.py "SELECT id, city FROM listings LIMIT 5"
  python scripts/supabase_q.py -f query.sql
  echo "SELECT now()" | python scripts/supabase_q.py
  python scripts/supabase_q.py --write "UPDATE listings SET ... WHERE id='...'"   # gated
  python scripts/supabase_q.py --raw "SELECT ..."        # raw JSON, no pretty print
  python scripts/supabase_q.py --dry-run --write "DELETE ..."  # classify only, no exec

EXIT CODES
  0 ok | 2 write blocked (no --write) | 3 config/usage error | 4 API/HTTP error
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env.local"

# Keywords that, when a statement STARTS with one (and contains no write verb),
# make it a read. EXPLAIN is read ONLY without ANALYZE (ANALYZE executes).
READ_STARTERS = {"SELECT", "SHOW", "TABLE", "VALUES", "EXPLAIN", "WITH"}

# Any whole-word match (after stripping strings/comments) forces --write.
WRITE_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "COMMENT", "REINDEX", "VACUUM", "MERGE", "REFRESH",
    "CALL", "COPY", "REPLACE", "LOCK", "NOTIFY", "REASSIGN", "CLUSTER",
}


def load_env(path: Path) -> dict:
    """Parse KEY=VALUE lines from .env.local. Values are kept in-process only."""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        env[key] = val
    return env


def project_ref(env: dict) -> str:
    ref = os.environ.get("SUPABASE_PROJECT_REF") or env.get("SUPABASE_PROJECT_REF")
    if ref:
        return ref
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    m = re.search(r"https?://([a-z0-9]+)\.supabase\.co", url)
    if m:
        return m.group(1)
    raise SystemExit("config error: can't derive project ref "
                     "(set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL)")


def strip_noise(sql: str) -> str:
    """Remove comments and string/dollar-quoted literals before classifying,
    so a literal like WHERE status='DELETE' is not misread as a write."""
    s = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)      # /* block */
    s = re.sub(r"--[^\n]*", " ", s)                       # -- line
    s = re.sub(r"\$([A-Za-z_]*)\$.*?\$\1\$", " ", s, flags=re.S)  # $tag$...$tag$
    s = re.sub(r"'(?:''|[^'])*'", " ", s)                 # 'single quoted'
    return s


def classify(sql: str):
    """Return ('read'|'write', reason)."""
    cleaned = strip_noise(sql).upper()
    tokens = re.findall(r"[A-Z_]+", cleaned)
    if not tokens:
        return "write", "empty or unparseable statement"
    first = tokens[0]
    write_hits = sorted(WRITE_KEYWORDS.intersection(tokens))
    if write_hits:
        return "write", f"write keyword(s): {', '.join(write_hits)}"
    if first == "EXPLAIN" and "ANALYZE" in tokens:
        return "write", "EXPLAIN ANALYZE executes the plan"
    if first in READ_STARTERS:
        return "read", f"read statement starting with {first}"
    return "write", f"non-read leading keyword: {first}"


def run_query(ref: str, token: str, sql: str):
    url = f"https://api.supabase.com/v1/projects/{ref}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    # api.supabase.com sits behind Cloudflare, which 403s urllib's default UA.
    req.add_header("User-Agent", "padmagnet-supabase_q/1.0")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise SystemExit(f"API error {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise SystemExit(f"network error: {e.reason}")


def pretty(rows):
    if not isinstance(rows, list) or not rows:
        print(json.dumps(rows, indent=2, default=str))
        return
    cols = list(rows[0].keys()) if isinstance(rows[0], dict) else None
    if not cols:
        print(json.dumps(rows, indent=2, default=str))
        return
    widths = {c: max(len(c), *(len(str(r.get(c, ""))) for r in rows)) for c in cols}
    print(" | ".join(c.ljust(widths[c]) for c in cols))
    print("-+-".join("-" * widths[c] for c in cols))
    for r in rows:
        print(" | ".join(str(r.get(c, "")).ljust(widths[c]) for c in cols))
    print(f"\n({len(rows)} row{'s' if len(rows) != 1 else ''})")


def main():
    ap = argparse.ArgumentParser(description="Read-first Supabase query helper.")
    ap.add_argument("sql", nargs="?", help="SQL string (or use -f / stdin)")
    ap.add_argument("-f", "--file", help="read SQL from a file")
    ap.add_argument("--write", action="store_true",
                    help="permit a data/schema-modifying statement (Chris-approved)")
    ap.add_argument("--raw", action="store_true", help="print raw JSON, no table")
    ap.add_argument("--dry-run", action="store_true",
                    help="classify only; do not execute")
    args = ap.parse_args()

    if args.file:
        sql = Path(args.file).read_text(encoding="utf-8")
    elif args.sql:
        sql = args.sql
    elif not sys.stdin.isatty():
        sql = sys.stdin.read()
    else:
        ap.error("no SQL provided (positional, -f FILE, or stdin)")
    sql = sql.strip().rstrip(";").strip()
    if not sql:
        raise SystemExit("config error: empty query")

    kind, reason = classify(sql)

    if kind == "write" and not args.write:
        sys.stderr.write(
            f"\n  BLOCKED — write detected ({reason}).\n"
            f"  This helper runs reads silently; writes need explicit approval.\n"
            f"  If Chris approved it, re-run with --write.\n\n"
            f"  SQL: {sql[:300]}{'...' if len(sql) > 300 else ''}\n\n")
        sys.exit(2)

    if args.dry_run:
        print(f"classified: {kind} ({reason})")
        sys.exit(0)

    env = load_env(ENV_FILE)
    token = os.environ.get("SUPABASE_ACCESS_TOKEN") or env.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise SystemExit("config error: SUPABASE_ACCESS_TOKEN not found "
                         "(env or .env.local)")
    ref = project_ref(env)

    if kind == "write":
        sys.stderr.write(f"  >> running APPROVED write ({reason})\n")

    result = run_query(ref, token, sql)
    if args.raw:
        print(json.dumps(result, indent=2, default=str))
    else:
        pretty(result)


if __name__ == "__main__":
    main()
