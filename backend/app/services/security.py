import bcrypt
from passlib.context import CryptContext
from app.core.config import WEBHOOK_AUTH
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_salt() -> str:
    return bcrypt.gensalt().decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    prehash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return pwd_context.verify(prehash, hashed_password)

def get_password_hash(password: str) -> str:
    prehash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return pwd_context.hash(prehash)

def webhook_auth(api_key: str) -> bool:
    if api_key == WEBHOOK_AUTH:
        return True
    else:
        return False
