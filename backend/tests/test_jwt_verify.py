import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.auth.jwt_verify import JWTVerificationError, verify_jwt


@pytest.fixture
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _sign(private_key, **overrides) -> str:
    now = int(time.time())
    payload = {
        "sub": "user-123",
        "email": "person@example.com",
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        **overrides,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


def _patched_jwk_client(public_key):
    client = MagicMock()
    signing_key = MagicMock()
    signing_key.key = public_key
    client.get_signing_key_from_jwt.return_value = signing_key
    return client


def test_verify_jwt_accepts_valid_token(keypair):
    private_key, public_key = keypair
    token = _sign(private_key)
    with patch("app.auth.jwt_verify._get_jwk_client", return_value=_patched_jwk_client(public_key)):
        claims = verify_jwt(token)
    assert claims["sub"] == "user-123"
    assert claims["email"] == "person@example.com"


def test_verify_jwt_rejects_expired_token(keypair):
    private_key, public_key = keypair
    token = _sign(private_key, exp=int(time.time()) - 10)
    with patch("app.auth.jwt_verify._get_jwk_client", return_value=_patched_jwk_client(public_key)):
        with pytest.raises(JWTVerificationError):
            verify_jwt(token)


def test_verify_jwt_rejects_wrong_signature(keypair):
    _, public_key = keypair
    other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _sign(other_private_key)
    with patch("app.auth.jwt_verify._get_jwk_client", return_value=_patched_jwk_client(public_key)):
        with pytest.raises(JWTVerificationError):
            verify_jwt(token)


def test_verify_jwt_rejects_wrong_audience(keypair):
    private_key, public_key = keypair
    token = _sign(private_key, aud="other-audience")
    with patch("app.auth.jwt_verify._get_jwk_client", return_value=_patched_jwk_client(public_key)):
        with pytest.raises(JWTVerificationError):
            verify_jwt(token)
