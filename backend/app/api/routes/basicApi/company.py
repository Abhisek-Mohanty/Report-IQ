from fastapi import APIRouter, Body, Depends, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from app.db.repositories.company import CompanyRepository
from app.models.domain.users import User
from app.resources import success_strings, error_strings
from app.resources.helper.common import *

router = APIRouter()

@router.get("", 
    response_model = SendResponse, 
    name = "company:get-companys")
async def get_companys(
    current_user : User = Depends(get_current_user_authorizer()),
    oCompany: CompanyRepository = Depends(get_repository(CompanyRepository)),
    limit : int = 25,
    page : int = 0,
    title           : str = None,
    status          : str = None,
    address         : str = None,
    employees       : str = None,
    dataTo          : str = None,
    dataFrom        : str = None,
    q               : str = None,
    qf              : str = None,
    export          : str = None
) -> SendResponse:    
    oResult = await oCompany.getList( 
        user = current_user,
        paggination = { 
            "limit" : limit, 
            "offset" : page 
        }, 
        filter = {
    
            "title"         : title,
            "status"        : status,
            "address"       : address,
            "employees"     : employees,
    
            "dataTo"        : dataTo,
            "dataFrom"      : dataFrom,
            "search"        : q, 
            "searchField"   : qf,
            "export"        : export
        })
    
    return SendResponse(
        data = oResult
    ).send()

@router.get("/{id}", 
    response_model = SendResponse, 
    name = "company:get-company")
async def get_company(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    oCompany: CompanyRepository = Depends(get_repository(CompanyRepository)),
    status: str = None
) -> SendResponse: 
    oResult = await oCompany.getOne( id = id )

    return SendResponse(
        data = oResult
    ).send()


@router.post("", 
    response_model = SendResponse, 
    name = "company:save-company")
async def save_company(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oCompany: CompanyRepository = Depends(get_repository(CompanyRepository))
) -> SendResponse:
    oResult = await oCompany.modify( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()


@router.post("/activate", 
    response_model = SendResponse, 
    name = "company:status-company")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    data = Body(...),
    oCompany: CompanyRepository = Depends(get_repository(CompanyRepository)),
) -> SendResponse:
    oResult = await oCompany.activate( user = current_user, payload = data)
    
    return SendResponse(
        data = oResult
    ).send()