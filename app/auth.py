import os

from fastapi import HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

SECRET_KEY = os.environ["SECRET_KEY"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

SESSION_COOKIE = "brasa_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 dias

_serializer = URLSafeTimedSerializer(SECRET_KEY)


def verify_password(password: str) -> bool:
    return password == ADMIN_PASSWORD


def create_session_token() -> str:
    return _serializer.dumps({"admin": True})


def get_current_admin(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        _serializer.loads(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")
