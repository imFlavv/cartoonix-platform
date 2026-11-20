"""Manage OIDC clients (e.g. Cartoonix Land) directly on the server.

Run from /app/backend (or the backend dir on the VPS) with MONGO_URL and DB_NAME in the environment / .env:

  python scripts/oidc_clients.py create --client-id cartoonix-land --name "Cartoonix Land" \
      --redirect-uri https://GAME_HOST/auth/cartoonix/callback
  python scripts/oidc_clients.py list
  python scripts/oidc_clients.py add-redirect    --client-id cartoonix-land --redirect-uri https://...
  python scripts/oidc_clients.py remove-redirect --client-id cartoonix-land --redirect-uri https://...
  python scripts/oidc_clients.py rotate-secret   --client-id cartoonix-land
  python scripts/oidc_clients.py disable|enable  --client-id cartoonix-land

The client secret is printed ONCE and only its bcrypt hash is stored.
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from oidc_provider import generate_client_secret, hash_client_secret, is_valid_redirect_uri  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def _check_uris(uris):
    bad = [u for u in uris if not is_valid_redirect_uri(u)]
    if bad:
        sys.exit(f"Invalid redirect URI(s) (https only, no fragment/wildcard): {bad}")


def _print_secret(client_id, secret):
    print(f"client_id={client_id}")
    print(f"client_secret={secret}")
    print("Save the secret now in the game backend secret store. It cannot be shown again.")


def main():
    p = argparse.ArgumentParser(description="Cartoonix OIDC client management")
    p.add_argument("command", choices=["create", "list", "add-redirect", "remove-redirect", "rotate-secret", "disable", "enable"])
    p.add_argument("--client-id")
    p.add_argument("--name")
    p.add_argument("--redirect-uri", action="append", default=[])
    a = p.parse_args()
    col = _db().oidc_clients
    now = datetime.now(timezone.utc).isoformat()

    if a.command == "list":
        for c in col.find({}, {"_id": 0, "client_secret_hash": 0}):
            print(c)
        return
    if not a.client_id:
        sys.exit("--client-id is required")

    if a.command == "create":
        if not a.redirect_uri:
            sys.exit("at least one --redirect-uri is required")
        _check_uris(a.redirect_uri)
        if col.find_one({"client_id": a.client_id}):
            sys.exit("client already exists (use rotate-secret / add-redirect)")
        secret = generate_client_secret()
        col.insert_one({
            "client_id": a.client_id, "name": a.name or a.client_id,
            "client_secret_hash": hash_client_secret(secret),
            "redirect_uris": a.redirect_uri, "disabled": False,
            "created_at": now, "updated_at": now,
        })
        _print_secret(a.client_id, secret)
        return

    if not col.find_one({"client_id": a.client_id}):
        sys.exit("unknown client_id")
    if a.command == "add-redirect":
        _check_uris(a.redirect_uri)
        col.update_one({"client_id": a.client_id}, {"$addToSet": {"redirect_uris": {"$each": a.redirect_uri}}, "$set": {"updated_at": now}})
    elif a.command == "remove-redirect":
        col.update_one({"client_id": a.client_id}, {"$pullAll": {"redirect_uris": a.redirect_uri}, "$set": {"updated_at": now}})
    elif a.command == "rotate-secret":
        secret = generate_client_secret()
        col.update_one({"client_id": a.client_id}, {"$set": {"client_secret_hash": hash_client_secret(secret), "updated_at": now}})
        _print_secret(a.client_id, secret)
        return
    elif a.command in ("disable", "enable"):
        col.update_one({"client_id": a.client_id}, {"$set": {"disabled": a.command == "disable", "updated_at": now}})
    print(col.find_one({"client_id": a.client_id}, {"_id": 0, "client_secret_hash": 0}))


if __name__ == "__main__":
    main()
