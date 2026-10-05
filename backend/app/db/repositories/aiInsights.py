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
from app.resources.constant import ASSET_TYPE,ASSET_STATUS,COVERSATION_TYPE
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
            now = Moment.now()
            oDataSet = DataSet(
                rowSchema = json.dumps(getAttr(payload,"columnTypes",[])),
                sourceFileName = getAttr(payload,"name","NA"),
                rowCount = getAttr(payload,"rowCount",0),
                rowExamples = json.dumps(getAttr(payload,"rows",[])),
                createdBy = user.id,
                updatedAt = now,
                createdAt = now,
                updatedBy = user.id
                ) 
            self.save(oDataSet)
            oDataSet.dataSetNumber = f"DS-{now.strftime("%Y%m%d")}-{oDataSet:06d}"

            oConversation = Conversation(
                    dataSetId = oDataSet.id,
                    type = COVERSATION_TYPE.AI_INSIGHTS.value,
                    createdBy = user.id, 
                    updatedBy = user.id, 
                    createdAt = now, 
                    updatedAt = now, 
                )
            self.save(oConversation)

            # oAcitvityLog = ActivityLog(
            #         dataSetId = Column("dataSetId", Integer , ForeignKey("DataSets.id"))
            #         conversationId = Column("conversationId", Integer , ForeignKey("Conversations.id"))
            #         prompt = Column("prompt", String)
            #         promptType = Column("promptType", Integer)
            #         statusCode = Column("statusCode", String)
            #         response   = Column("response", String)
            #         promptToken = Column("promptToken", Float)
            #         completionToken = Column("completionToken", Float)
            #         totalTokens = Column("totalTokens", Float)
            #         createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
            #         updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
            #         createdAt = Column("createdAt", DateTime ) 
            #         updatedAt = Column("updatedAt", DateTime )

            # )
            
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
         
