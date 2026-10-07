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

@router.post("/detailedAnalysis", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: AiInsightsRepository = Depends(get_repository(AiInsightsRepository)),
) -> SendResponse:
    oResult = await oRepository.getDetailedAnalyis( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()
