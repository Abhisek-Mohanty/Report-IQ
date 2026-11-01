import logging
import sys
from typing import List

from loguru import logger
from starlette.config import Config
from starlette.datastructures import CommaSeparatedStrings, Secret

from app.core.logging import InterceptHandler

URL_PREFIX = "/api/v1"
API_PREFIX = "/api/v2"
WS_PREFIX  = "/ws/v1"
WEBHOOK_PREFIX  = "/webhook/v1"

JWT_TOKEN_PREFIX = "Bearer"

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_file_path = BASE_DIR / ".env"
config = Config(str(env_file_path) if env_file_path.exists() else ".env")

VERSION: str = config("VERSION", cast=str, default="1.0.0")
ENVIRONMENT: str = config("ENVIRONMENT", cast=str, default="prod")
DEBUG: bool = config("DEBUG", cast=bool, default=False)

DEFAULT_PASSWORD: str = config("DEFAULT_PASSWORD", cast=str, default="Techfino@123")
SUPPORT_MAILID: str = config("SUPPORT_MAILID", cast=str, default="support@techfino.in")

# Database Selection: "supabase" (default) or "mysql"
DB_TYPE: str = config("DB_TYPE", cast=str, default="supabase").lower()

# Supabase (PostgreSQL) Configuration
SUPABASE_HOST: str = config("SUPABASE_HOST", cast=str, default="aws-1-eu-west-3.pooler.supabase.com")
SUPABASE_PORT: int = config("SUPABASE_PORT", cast=int, default=5432)
SUPABASE_USER: str = config("SUPABASE_USER", cast=str, default="postgres.eatzroepoegkvxtqtcsl")
SUPABASE_PWD: str = config("SUPABASE_PWD", cast=str, default="")
SUPABASE_DB: str = config("SUPABASE_DB", cast=str, default="postgres")
SUPABASE_DATABASE_URL: str = config("SUPABASE_DATABASE_URL", cast=str, default="")

# MySQL Configuration
MYSQL_DATABASE_URL: str = config("MYSQL_DB_CONNECTION", cast=str, default="")
MYSQL_HOST: str = config("MYSQL_HOST", cast=str, default="127.0.0.1")
MYSQL_PORT: int = config("MYSQL_PORT", cast=int, default=3306)
MYSQL_USER: str = config("MYSQL_USER", cast=str, default="root")
MYSQL_PWD: str = config("MYSQL_PWD", cast=str, default="")
MYSQL_DB: str = config("MYSQL_DB", cast=str, default="")

MAX_CONNECTIONS_COUNT: int = config("MAX_CONNECTIONS_COUNT", cast=int, default=10)
MIN_CONNECTIONS_COUNT: int = config("MIN_CONNECTIONS_COUNT", cast=int, default=10)
GOOGLE_GEMINI: str = config("GOOGLE_GEMINI", cast=str, default="")


SECRET_KEY: Secret = config("SECRET_KEY", cast=Secret)

PROJECT_NAME: str = config("PROJECT_NAME", default="MSME - TechFino Capital Pvt. Ltd.")
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS", cast=CommaSeparatedStrings, default="*"
)

BITLY_TARGET:str   = config("BITLY_TARGET",cast=str,default="")
BITLY_HOST_URL:str = config("BITLY_HOST_URL",cast=str,default="")
CLIENT_PATH:str    = config("CLIENT_PATH",cast=str,default="")

DOCURLS = '/docs' if ENVIRONMENT == 'dev' else None 
# logging configuration

LOGGING_LEVEL = logging.DEBUG if DEBUG else logging.INFO
logging.basicConfig(
    handlers=[InterceptHandler(level=LOGGING_LEVEL)], level=LOGGING_LEVEL
)
logger.configure(handlers=[{"sink": sys.stderr, "level": LOGGING_LEVEL}])

AWS_ACCESS_KEY_ID:str = config("AWS_ACCESS_KEY_ID",cast=str,default="")
AWS_SECRET_ACCESS_KEY:str = config("AWS_SECRET_ACCESS_KEY",cast=str,default="")
AWS_REGION:str      = config("AWS_REGION",cast=str,default="")
AWS_REGION2:str     = config("AWS_REGION2",cast=str,default="")
AWS_BUCKET_NAME:str = config("AWS_BUCKET_NAME",cast=str,default="")
AWS_BUCKET_PATH:str = config("AWS_BUCKET_PATH",cast=str,default="")

SMS_ARN:str = config("SMS_ARN",cast=str,default="")
EMAIL_ARN:str = config("EMAIL_ARN",cast=str,default="")

LOGIN_THRESHOLD:int = config("LOGIN_THRESHOLD",cast=int,default=3)
LOCKOUT_DURATION_HOUR:int = config("LOCKOUT_DURATION_HOUR",cast=int,default=24)
LOCKOUT_DURATION_MINUTES:int = config("LOCKOUT_DURATION_MINUTES", cast=int, default=10)


WEBHOOK_AUTH:str = config("WEBHOOK_AUTH",cast=str,default="")
SERVER_DEFAULT_OFFSET:str = config("SERVER_DEFAULT_OFFSET",cast=str,default="")

SYSTEM_NOTIFICATION_EMAIL: str = config("SYSTEM_NOTIFICATION_EMAIL", cast=str, default="")
HR_SUPPORT_MAIL: str = config("HR_SUPPORT_MAIL", cast=str, default="hr@techfino.in")

VERIFICATION_LINK_VALID_DAYS: str = config("HR_SUPPORT_MAIL", cast=int, default=3)


# ############ MSME ####################
MSME_CLIENT_ID:str = config("MSME_CLIENT_ID",cast=str,default="")
MSME_CLIENT_SECRET:str = config("MSME_CLIENT_SECRET",cast=str,default="")
MSME_END_POINT:str = config("MSME_END_POINT",cast=str,default="")
MSME_API_KEY:str = config("MSME_API_KEY",cast=str,default="")

AUTH_GOOGLE_ID:str = config("AUTH_GOOGLE_ID",cast=str,default="")
AUTH_GOOGLE_SECRET:str = config("AUTH_GOOGLE_SECRET",cast=str,default="")

