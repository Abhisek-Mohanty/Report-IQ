
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Body
from starlette import requests, status
from starlette.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST

from app.api.dependencies.database import get_repository
from app.db.errors import EntityDoesNotExist
from app.resources import error_strings
from app.db.repositories.base import BaseRepository

from loguru import logger
    
class TokenParser(BaseRepository):
    async def oValidateProcess(self, data):
        logger.error("Implement Data Validation")
        self.db_session.close()
        return True