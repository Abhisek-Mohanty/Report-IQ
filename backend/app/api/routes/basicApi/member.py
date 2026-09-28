from fastapi import APIRouter, Body, Depends, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from app.models.domain.users import User
from app.resources import success_strings, error_strings
from app.resources.helper.common import *
from app.db.repositories.users import UsersRepository

router = APIRouter()

@router.get("", 
    response_model = SendResponse, 
    name = "member:get-profile")
async def get_profile(
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository))
) -> SendResponse: 
    oResult = await oRepository.getProfile( user = current_user )

    return SendResponse(
        data = oResult
    ).send()


@router.post("", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    oResult = await oRepository.modify( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/changepassword", 
    response_model = SendResponse, 
    name = "member:changePassword")
async def changePassword(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    oResult = await oRepository.changePassword( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/updatepassword", 
    response_model = SendResponse, 
    name = "member:changePassword")
async def changePassword(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    oResult = await oRepository.updatePassword( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.get("/members", 
    response_model = SendResponse, 
    name = "member:updateUser")
async def updateUser(
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
    limit : int = 25,
    page : int = 0,
    name            : str = None,
    email           : str = None,
    mobile          : str = None,
    status          : str = None,
    q               : str = None,
    qf              : str = None
) -> SendResponse:
    # await oBranch.validateAccess(current_user,"MANUAL ACTIVITY")    
    
    oResult = await oRepository.getList( 
        user=current_user,
        paggination = { 
            "limit" : limit, 
            "offset" : page 
        }, 
        filter = {    
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

@router.post("/{id}/detail", 
    response_model = SendResponse, 
    name = "member:getUser")
async def getUser(
    current_user : User = Depends(get_current_user_authorizer()),
    id : int= None,
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    oResult = await oRepository.getById( user = current_user, id = id)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/updateUser", 
    response_model = SendResponse, 
    name = "member:updateUser")
async def updateUser(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    oResult = await oRepository.updateUser( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()
