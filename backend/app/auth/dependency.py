from dataclasses import dataclass

from fastapi import Header, HTTPException

from app.auth.jwt_verify import JWTVerificationError, verify_jwt


@dataclass
class UserContext:
    id: str
    email: str | None


def _parse_bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


async def get_current_user_optional(
    authorization: str | None = Header(default=None),
) -> UserContext | None:
    token = _parse_bearer(authorization)
    if token is None:
        return None
    try:
        claims = verify_jwt(token)
    except JWTVerificationError:
        return None
    return UserContext(id=claims["sub"], email=claims.get("email"))


async def get_current_user_required(
    authorization: str | None = Header(default=None),
) -> UserContext:
    user = await get_current_user_optional(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
