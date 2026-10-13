import io
import secrets
from typing import Any
from sqlalchemy import or_
from starlette.exceptions import HTTPException
from sqlalchemy.orm import load_only, contains_eager, joinedload
import re

from app.api.response.http_response import SendErrorResponse, SendExportResponse, SendSuccessResponse
from app.prompt.aiValidator import REFERENCE_EXCEL_VALIDATOR_SYSTEM_PROMPT

from app.resources.helper.common import *
from app.db.repositories.base import BaseRepository
from app.resources.helper.moment import Moment
from app.db.repositories.base import BaseRepository
from app.core.config import CLIENT_PATH, DEFAULT_PASSWORD, SUPPORT_MAILID, HR_SUPPORT_MAIL, VERIFICATION_LINK_VALID_DAYS
from app.resources.constant import COVERSATION_TYPE,PROMPT_TYPE
from app.services import security
from app.resources.library.S3.index import s3Bucket
from app.resources.library.email.sns import SnsEmail
from app.resources.constant import INVOICE_TYPE, OWNER_TYPE
from fastapi.encoders import jsonable_encoder
from app.resources.library.ai.gemini import GEMINI_AI

from app.models.domain.db import *

class AiValidatorRepository(BaseRepository): 


    async def getValidationExcel(self, user, payload):
        try:

            now = Moment().now
            # prompt = DETAILED_ANALYSIS_DATASET_PATTERN_USER_PROMT.format(PAYLOAD=payload)
            print("\n\n\n\n\n\n\n","prompt",prompt)
            system_instruction = REFERENCE_EXCEL_VALIDATOR_SYSTEM_PROMPT 
            gemini = GEMINI_AI()
            oResponse = await gemini.gemini_response(prompt=prompt,operation_instruction=system_instruction)
            print("\n\n\n\n\n\n\n",oResponse)
            response_text = oResponse.text

            oAcitvityLog = ActivityLog(
                    dataSetId = 1,
                    conversationId = 1,
                    promptType = PROMPT_TYPE.PREDEFINED.value,
                    promptToken=oResponse.usage_metadata.prompt_token_count,
                    completionToken=oResponse.usage_metadata.candidates_token_count,
                    totalTokens=oResponse.usage_metadata.total_token_count,
                    response=response_text,
                    createdBy = user.id, 
                    updatedBy = user.id, 
                    createdAt = now, 
                    updatedAt = now,
            )
            self.save(oAcitvityLog)
            self.db_session.commit()
            response_json = json.loads(oResponse.text)
            
            return SendSuccessResponse(
                        data = []
                    )
    

            
        except Exception as error:
            raise error
            return SendErrorResponse(
                message = error
            )
    async def getDetailedAnalyis(self, user, payload):
        try:
            print("\n\n\n\n",payload)
            if getAttr(payload,"excel_data",False):
                return SendErrorResponse(
                        message = "Don't receive any data"
                    ).send()
            now = Moment().now
            prompt = DETAILED_ANALYSIS_DATASET_PATTERN_USER_PROMT.format(PAYLOAD=payload)
            print("\n\n\n\n\n\n\n","prompt",prompt)
            system_instruction = DETAILED_ANALYSIS_DATASET_PATTERN_SYSTEM_INSTRUCTION 
            gemini = GEMINI_AI()
            oResponse = await gemini.gemini_response(prompt=prompt,operation_instruction=system_instruction)
            print("\n\n\n\n\n\n\n",oResponse)
            response_text = oResponse.text

            oAcitvityLog = ActivityLog(
                    dataSetId = 1,
                    conversationId = 1,
                    promptType = PROMPT_TYPE.PREDEFINED.value,
                    promptToken=oResponse.usage_metadata.prompt_token_count,
                    completionToken=oResponse.usage_metadata.candidates_token_count,
                    totalTokens=oResponse.usage_metadata.total_token_count,
                    response=response_text,
                    createdBy = user.id, 
                    updatedBy = user.id, 
                    createdAt = now, 
                    updatedAt = now,
            )
            self.save(oAcitvityLog)
            self.db_session.commit()
            response_json = json.loads(oResponse.text)
            return SendSuccessResponse(
                    data = response_json
                )
            
        except Exception as error:
            raise error
            return SendErrorResponse(
                message = error
            )
         
