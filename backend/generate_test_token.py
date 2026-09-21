"""
Prints a test JWT signed with backend/.env's JWT_SECRET_KEY, so you don't
need jwt.io to get an Authorization header while no real login exists yet.

Token payload shape matches what app/core/security.py expects:
{"sub": <user_id>, "role": <role_string>, "exp": <timestamp>}

Usage:
    python generate_test_token.py                    # sub=1, role=admin, no expiry (~year 2100)
    python generate_test_token.py --role manager
    python generate_test_token.py --role student      # to test the 403 role gate
    python generate_test_token.py --sub 42 --role admin --minutes 60
"""
import argparse
import os
import time

from dotenv import load_dotenv
from jose import jwt

load_dotenv()

ALGORITHM = "HS256"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sub", default="1", help="user id to embed in 'sub' claim (default: 1)")
    parser.add_argument("--role", default="admin", help="role to embed, e.g. admin/manager/student (default: admin)")
    parser.add_argument(
        "--minutes",
        type=int,
        default=None,
        help="expire N minutes from now, instead of the default far-future expiry",
    )
    args = parser.parse_args()

    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise SystemExit(
            "JWT_SECRET_KEY is not set. Copy .env.example to .env and fill it in first."
        )

    exp = int(time.time()) + args.minutes * 60 if args.minutes else 4102444800  # ~year 2100
    payload = {"sub": args.sub, "role": args.role, "exp": exp}
    token = jwt.encode(payload, secret, algorithm=ALGORITHM)

    print(token)
    print()
    print(f"Payload: {payload}")
    print()
    print("Browser console (run on the dashboard page):")
    print(f'  localStorage.setItem("authToken", "{token}")')
    print()
    print("curl:")
    print(f'  curl -H "Authorization: Bearer {token}" http://localhost:8000/api/dashboard/summary')


if __name__ == "__main__":
    main()
