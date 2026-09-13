from fastapi import APIRouter,  Response, Request, Header, Body , Depends, BackgroundTasks, HTTPException, UploadFile, File, Form
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from app.models.schemas.users import User
from app.db.repositories.authentication import UserAuth
from app.db.repositories.document import DocumentRepository

from app.models.domain.db import *
from app.resources.helper.common import *

from app.resources.library.S3.index import s3Bucket


router = APIRouter()

@router.post("/upload",
    response_model = SendResponse, 
    name = "application:upload")
async def upload_file(
    current_user: UserAuth =Depends(get_current_user_authorizer()),
    # file : UploadFile = File(None),
    file = Form(None),
    docType = Form(None)
) -> SendResponse:
    oS3Bucket = s3Bucket()
    fileSource = file
    fileName = await oS3Bucket.upload(fileSource,"hrms/"+docType,file.filename)
    return SendResponse(
        message = "File Uploaded",
        data = fileName
    )


@router.post("/signedurl", 
    response_model = SendResponse, 
    name = "application:get-signed-url")
async def get_file_URL(
    request : Request,
    current_user: UserAuth = Depends(get_current_user_authorizer()),
    payload = Body(...)
) -> SendResponse:
    if( hasattr( payload, "filename") ):
        return SendResponse(
            message = "No File Name Given",
            data =  {}
        )    
    oS3Bucket = s3Bucket()
    fileName = await oS3Bucket.getSignedURL(payload["filename"])
    return SendResponse(
        message = "File Retrieved",
        data =  fileName
    )   


@router.get("/getpdf", 
    response_model = SendResponse, 
    name = "application:get-signed-url")
async def get_file_URL(
    request : Request,
    current_user: UserAuth = Depends(get_current_user_authorizer()),
    oDocument: DocumentRepository = Depends(get_repository(DocumentRepository))
) -> SendResponse:
    oResult = await oDocument.getPDF(payload = {})
    return SendResponse(
        data =  oResult
    ).send()   
