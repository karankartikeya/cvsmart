import jwt
from jwt import PyJWKClient

from app.config import settings


class JWTVerificationError(Exception):
    pass


_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not settings.supabase_url:
            raise JWTVerificationError("SUPABASE_URL not configured")
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = PyJWKClient(jwks_url)
    return _jwk_client


def verify_jwt(token: str) -> dict:
    """Verify a Supabase-issued access token and return its claims.

    Raises JWTVerificationError on any invalid, expired, or malformed token.
    """
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_aud,
        )
    except jwt.PyJWTError as exc:
        raise JWTVerificationError(str(exc)) from exc
