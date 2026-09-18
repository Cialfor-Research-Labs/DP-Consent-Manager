import os
import re
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_db

from dotenv import load_dotenv
load_dotenv()

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def get_jwt_secret() -> str:
    """
    Safely resolve JWT secret key from environment variables.
    Requires JWT_SECRET_KEY (or JWT_SECRET) from environment in all configurations.
    Fails securely if missing without fallback to prevent running with insecure defaults.
    Never prints or logs the secret key value.
    """
    secret = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET")
    if secret:
        return secret

    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY environment variable is not configured. "
        "The application requires a secure cryptographic secret key from the environment. "
        "Please configure JWT_SECRET_KEY in your environment or .env file."
    )

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_password_strength(password: str) -> tuple[bool, str]:
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[@$!%*#?&_\-^~+=]", password):
        return False, "Password must contain at least one special character (@$!%*#?&_-^~+=)."
    return True, ""

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": now
    })
    secret = get_jwt_secret()
    return jwt.encode(to_encode, secret, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    secret = get_jwt_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name, role, data_principal_id, fiduciary_name, created_at FROM users WHERE id = ?;", (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_dict = dict(row)
    user_dict["dp_id"] = user_dict.get("data_principal_id")
    return user_dict

def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, role, data_principal_id, fiduciary_name, created_at FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        user_dict = dict(row)
        user_dict["dp_id"] = user_dict.get("data_principal_id")
        return user_dict
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "")
        # Normalize comparison
        normalized_allowed = [r.upper() for r in allowed_roles]
        if user_role.upper() not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{user_role}' does not have permission for this resource.",
            )
        return current_user
    return role_checker
