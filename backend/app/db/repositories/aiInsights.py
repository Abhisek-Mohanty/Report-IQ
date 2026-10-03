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
from app.db.repositories.base import BaseRepository
from app.core.config import CLIENT_PATH, DEFAULT_PASSWORD, SUPPORT_MAILID, HR_SUPPORT_MAIL, VERIFICATION_LINK_VALID_DAYS
from app.resources.constant import ASSET_TYPE,ASSET_STATUS, EMPLOYEEMENT_STATUS, STATUS, VERIFCATION_TYPE, ASSET_STATUS_TYPE, ASSIGN_STATUS_TYPE, MAINTAINCE_STATUS_TYPE
from app.services import security
from app.resources.library.S3.index import s3Bucket
from app.resources.library.email.sns import SnsEmail
from app.resources.constant import INVOICE_TYPE, OWNER_TYPE
from fastapi.encoders import jsonable_encoder
from app.resources.library.ai.gemini import GEMINI_AI

from app.models.domain.db import *

class AiInsightsRepository(BaseRepository): 


    async def getTrendAnalyis(self, user, payload):
        try:
            if getAttr(payload,"excel_data",False):
                return SendErrorResponse(
                        message = "Don't receive any data"
                    ).send() 


            
            gemini = GEMINI_AI()
            Input = []
            return SendSuccessResponse(
                        data = []
                    )
    

            
        except Exception as error:
            raise error
            return SendErrorResponse(
                message = error
            )
         
