"""JWT authentication (bcrypt) for the Biology Study Assistant."""
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from database import ObjectId
from fastapi import HTTPException, Request

JWT_ALGORITHM = "HS256"
ACCESS_MIN = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def get_refresh_secret() -> str:
    return os.environ.get("JWT_REFRESH_SECRET", os.environ["JWT_SECRET"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS), "type": "refresh"}
    return jwt.encode(payload, get_refresh_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access_token, refresh_token):
    response.set_cookie("access_token", access_token, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_DAYS * 86400, path="/")


def clear_auth_cookies(response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _extract_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


async def get_current_user_from_request(request: Request, db) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
