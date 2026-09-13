from fastapi import APIRouter, Body, Depends, HTTPException, Form
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
# from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from loguru import logger
from app.resources.helper.common import *
from app.db.repositories.crawl import CrawlRepository

router = APIRouter()

logger.info("Crawl router loaded")


@router.get("/")
def read_root():
    return {"Hello": "World"}

@router.get("/crawl", 
    response_model = SendResponse, 
    name = "branch:get-branches")
async def get_branches(
    oRepository: CrawlRepository = Depends(get_repository(CrawlRepository)),
    limit : int = 25,
    page : int = 0,
    type            : str = None,
    name            : str = None,
    email           : str = None,
    mobile          : str = None,
    status          : str = None,
    q               : str = None,
    qf              : str = None
) -> SendResponse:    
    oResult = await oRepository.getList( 
        paggination = { 
            "limit" : limit, 
            "offset" : page 
        }, 
        filter = {    
            "type"         : type,
            "name"         : name,
            "email"        : email,
            "mobile"       : mobile,
            "status"       : status,    
            "search"       : q, 
            "searchField"  : qf
        })
    
    return SendResponse(
        data = oResult
    ).send()