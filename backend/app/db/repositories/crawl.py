import io
import secrets
from typing import Any
from sqlalchemy import or_
from starlette.exceptions import HTTPException
from sqlalchemy.orm import load_only, contains_eager, joinedload
import re

from app.api.response.http_response import SendErrorResponse, SendExportResponse, SendSuccessResponse

from app.resources.helper.common import *
from app.db.repositories.base import BaseRepository
from app.resources.helper.moment import Moment
from fastapi.encoders import jsonable_encoder

from app.models.domain.db import *

class CrawlRepository(BaseRepository):  
    async def getList(self,paggination,filter):
        try:
            oData = self.db_session.query(
                Crawl
            ).all()

            return SendSuccessResponse(
                data = oData
            )
        except HTTPException as error:
            raise error