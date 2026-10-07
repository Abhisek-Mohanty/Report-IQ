import io
import secrets
from typing import Any
from sqlalchemy import or_
from starlette.exceptions import HTTPException
from sqlalchemy.orm import load_only, contains_eager, joinedload
import re

from app.api.response.http_response import SendErrorResponse, SendExportResponse, SendSuccessResponse
from app.prompt.aiInsights import AI_INSIGHTS_DATASET_PATTERN_SYSTEM_INSTRUCTION,AI_INSIGHTS_DATASET_PATTERN_USER_PROMPT

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

class AiInsightsRepository(BaseRepository): 


    async def getTrendAnalyis(self, user, payload):
        try:
            if getAttr(payload,"excel_data",False):
                return SendErrorResponse(
                        message = "Don't receive any data"
                    ).send()
            now = Moment().now
            # oDataSet = DataSet(
            #     rowSchema = json.dumps(getAttr(payload,"columnTypes",[])),
            #     sourceFileName = getAttr(payload,"name","NA"),
            #     rowCount = getAttr(payload,"rowCount",0),
            #     rowExamples = json.dumps(getAttr(payload,"rows",[])),
            #     createdBy = user.id,
            #     updatedAt = now,
            #     createdAt = now,
            #     updatedBy = user.id
            #     ) 
            # self.save(oDataSet)
            # oDataSet.dataSetNumber = f"DS-{now.strftime("%Y%m%d")}-"+str(oDataSet.id).rjust(9, '0')

            # oConversation = Conversation(
            #         dataSetId = oDataSet.id,
            #         type = COVERSATION_TYPE.AI_INSIGHTS.value,
            #         createdBy = user.id, 
            #         updatedBy = user.id, 
            #         createdAt = now, 
            #         updatedAt = now, 
            #     )
            # self.save(oConversation)

            # prompt = AI_INSIGHTS_DATASET_PATTERN_USER_PROMPT.format(PAYLOAD=payload)
            # system_instruction = AI_INSIGHTS_DATASET_PATTERN_SYSTEM_INSTRUCTION 
            # gemini = GEMINI_AI()
            # oResponse = await gemini.gemini_response(prompt=prompt,operation_instruction=system_instruction)
            # print("\n\n\n\n\n\n\n",oResponse)
            # response_text = oResponse.text

            # oAcitvityLog = ActivityLog(
            #         dataSetId = oDataSet.id,
            #         conversationId = oConversation.id,
            #         promptType = PROMPT_TYPE.PREDEFINED.value,
            #         promptToken=oResponse.usage_metadata.prompt_token_count,
            #         completionToken=oResponse.usage_metadata.candidates_token_count,
            #         totalTokens=oResponse.usage_metadata.total_token_count,
            #         response=response_text,
            #         createdBy = user.id, 
            #         updatedBy = user.id, 
            #         createdAt = now, 
            #         updatedAt = now,
            # )
            # self.save(oAcitvityLog)
            # self.db_session.commit()
            oResult = self.db_session.query(
                            ActivityLog
                        ).first()
            response_json = json.loads(oResult.response)
            return SendSuccessResponse(
                        data = response_json
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
            return SendSuccessResponse(
                    data = []
                )
            
        except Exception as error:
            raise error
            return SendErrorResponse(
                message = error
            )
         
