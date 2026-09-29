from fastapi import APIRouter, Body, Depends, HTTPException, Form
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from app.models.domain.users import User
from app.resources.helper.common import *
from app.db.repositories.aiInsights import AiInsightsRepository

router = APIRouter()

@router.get("", 
    response_model = SendResponse, 
    name = "insights-get-trendAnalyis")
async def get_trend_analysis(
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
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
        user=current_user,
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

@router.get("/{id}/detail", 
    response_model = SendResponse, 
    name = "insights-get-trendAnalyis")
async def get_branch(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
    status: str = None
) -> SendResponse: 
    oResult = await oRepository.getDetail(user=current_user, id = id )

    return SendResponse(
        data = oResult
    ).send()

@router.post("", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.modify( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()


#------------------------- Asset Module--------------------------------------------------------------------

@router.get("/asset", 
    response_model = SendResponse, 
    name = "insights-get-trendAnalyises")
async def get_branches(
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
    limit : int = 25,
    page : int = 0,
    type            : str = None,
    name            : str = None,
    email           : str = None,
    mobile          : str = None,
    status          : str = None,
    q               : str = None,
    qf              : str = None,
    export          : bool = False,
) -> SendResponse:    
    oResult = await oRepository.getAssetList( 
        user=current_user,
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
            "searchField"  : qf,
            "export"       : export
        })
    
    return SendResponse(
        data = oResult
    ).send()


@router.get("/{id}/detailHistory", 
    response_model = SendResponse, 
    name = "insights-get-trendAnalyis")
async def get_branch(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
    status: str = None
) -> SendResponse: 
    oResult = await oRepository.getAssetHistory(user=current_user, id = id )
    return SendResponse(
        data = oResult
    ).send()



@router.post("/trendAnalysis", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.getTrendAnalyis( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()


@router.post("/{id}/maintaincaeLog", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.modifyMaintainance( user = current_user, payload = payload, id = id)
    return SendResponse(
        data = oResult
    ).send()

@router.post("/{id}/assign", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.assignAsset( user = current_user, payload = payload, id = id)
    return SendResponse(
        data = oResult
    ).send()


@router.post("/{id}/assignStatus", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.assignStatus( user = current_user, payload = payload, id = id)
    return SendResponse(
        data = oResult
    ).send()


@router.post("/{id}/maintainanceStatus", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.maintainanceStatus( user = current_user, payload = payload, id = id)
    return SendResponse(
        data = oResult
    ).send()


