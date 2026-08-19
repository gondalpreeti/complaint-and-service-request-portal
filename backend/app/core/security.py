"""
JWT authentication & role-based access control.

ASSUMPTION (no login/auth code exists yet to confirm this):
Token payload shape is {"sub": <user_id>, "role": <role_string>, "exp": <timestamp>}.
Update `decode_token` if Team 1's actual login implementation differs.
"""
import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"

bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    user_id: str
    role: str


def decode_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    role = payload.get("role")
    if user_id is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing required claims",
        )
    return CurrentUser(user_id=user_id, role=role)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    return decode_token(credentials.credentials)


def require_roles(*allowed_roles: str):
    """
    Dependency factory for role-gated routes.
    Usage: Depends(require_roles("admin", "manager"))
    """

    async def _check(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to access this resource",
            )
        return current_user

    return _check
