import logging
import sys
from typing import List

from databases import DatabaseURL
from loguru import logger
from starlette.config import Config
from starlette.datastructures import CommaSeparatedStrings, Secret
from fastapi.encoders import jsonable_encoder


URL_PREFIX = "/api/v1"
API_PREFIX = "/api/v2"
WS_PREFIX  = "/ws/v1"
WEBHOOK_PREFIX  = "/webhook/v1"

JWT_TOKEN_PREFIX = "Bearer"

config = Config(".env")

SUPABASE_USERNAME: str = config("SUPABASE_USERNAME", cast=str, default="1.0.0")
PASSWORD: str = config("PASSWORD", cast=str, default="1.0.0")


MYSQL_DATABASE_URL: DatabaseURL = config("MYSQL_DB_CONNECTION", cast=DatabaseURL)
MAX_CONNECTIONS_COUNT: int = config("MAX_CONNECTIONS_COUNT", cast=int, default=10)
MIN_CONNECTIONS_COUNT: int = config("MIN_CONNECTIONS_COUNT", cast=int, default=10)
MYSQL_HOST:str = config("MYSQL_HOST",cast=str,default="127.0.0.1")
MYSQL_PORT:int = config("MYSQL_PORT",cast=int,default=3306)
MYSQL_USER:str = config("MYSQL_USER",cast=str,default="root")
MYSQL_PWD:str  = config("MYSQL_PWD",cast=str,default="")
MYSQL_DB:str   = config("MYSQL_DB",cast=str,default="")
DEBUG: bool = config("DEBUG", cast=bool, default=False)
SERVER_DEFAULT_OFFSET:str = config("SERVER_DEFAULT_OFFSET",cast=str,default="")


