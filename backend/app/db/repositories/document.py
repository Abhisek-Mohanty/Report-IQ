from typing import Optional, Any

from app.resources.library.htmltopdf.pdfGenerator import generate_pdf
from starlette import requests, status
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
import secrets
from app.resources import success_strings, error_strings, constant
from app.resources.constant import *
from app.api.response.http_response import *
from app.core.config import CLIENT_PATH, ENVIRONMENT, SUPPORT_MAILID

from app.db.errors import *
from app.db.repositories.base import BaseRepository

from app.resources.helper.moment import Moment
from app.resources.helper.common import *

from sqlalchemy import or_, func
from sqlalchemy.orm import load_only, lazyload, joinedload, join, contains_eager
from app.models.domain.db import *

class DocumentRepository(BaseRepository):  
    async def getPDF(self,  payload):
        try:
            htmlContent = None
            fileName = ""
            mediaType = None
            try:
                pdfcontent = await generate_pdf("<html><body><h2>Hello</h2></body></html>")
                fileName = Moment().format("%Y%m%d") + "-LOD-Letter.pdf"
                mediaType = "application/pdf"
                htmlContent = pdfcontent
            except Exception as e:
                print(f"PDF generation failed: {e}")

            return SendFileResponse(
                content = htmlContent,
                fileName = fileName,
                mediaType = mediaType
            )
        except HTTPException as error:
            raise error 
            