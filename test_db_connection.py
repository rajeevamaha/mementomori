#!/usr/bin/env python3
"""
One-off Supabase/Postgres check for this project.
Reads POSTGRES_URL from .env (same file npm run dev uses).

  pip install psycopg2-binary
  python test_db_connection.py
"""

from __future__ import annotations

import os
import socket
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


def load_postgres_url() -> str | None:
    root = Path(__file__).resolve().parent
    env_path = root / ".env"
    if env_path.is_file():
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("POSTGRES_URL="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                return val or None
    return os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")


def ensure_ssl_query(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname and parsed.hostname not in ("localhost", "127.0.0.1"):
        qs = parse_qs(parsed.query)
        if "sslmode" not in qs:
            sep = "&" if parsed.query else "?"
            return f"{url}{sep}sslmode=require"
    return url


def main() -> int:
    url = load_postgres_url()
    if not url:
        print("No POSTGRES_URL in .env or environment.")
        return 1

    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or 5432
    db = (parsed.path or "/postgres").lstrip("/") or "postgres"
    user = parsed.username or "(missing)"

    print("=== Connection target (from .env) ===")
    print(f"  host:     {host}")
    print(f"  port:     {port}")
    print(f"  database: {db}")
    print(f"  user:     {user}")
    print("  password: (hidden)")
    print()

    print("=== DNS lookup ===")
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        families = {4: "IPv4", 6: "IPv6"}
        for info in infos[:8]:
            fam = families.get(info[0], str(info[0]))
            print(f"  {fam}  {info[4][0]}:{info[4][1]}")
        if not infos:
            print("  No addresses returned.")
            return 1
    except socket.gaierror as e:
        print(f"  FAILED: {e}")
        print()
        print("This is the same class of error as Node's getaddrinfo ENOTFOUND.")
        print("Try: Supabase -> Database -> Connection pooling (Transaction, port 6543)")
        print("     or change DNS to 1.1.1.1 / 8.8.8.8, or another network.")
        return 1

    print()
    print("=== Postgres (psycopg2) ===")
    try:
        import psycopg2
    except ImportError:
        print("  psycopg2 not installed. Run:  pip install psycopg2-binary")
        return 1

    connect_url = ensure_ssl_query(url)
    try:
        conn = psycopg2.connect(connect_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            print(f"  SELECT 1 => {cur.fetchone()[0]}")

            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name LIKE 'mbd_%'
                ORDER BY 1
                """
            )
            tables = [row[0] for row in cur.fetchall()]
            if tables:
                print(f"  App tables: {', '.join(tables)}")
            else:
                print("  App tables: (none yet — register once in the app to create them)")

        conn.close()
        print()
        print("SUCCESS: database is reachable from Python.")
        return 0
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")
        if "password authentication failed" in str(e).lower():
            print("  -> Wrong password; reset in Supabase and update .env")
        return 1


if __name__ == "__main__":
    sys.exit(main())
