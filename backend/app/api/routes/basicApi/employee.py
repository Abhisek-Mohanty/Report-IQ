from fastapi import APIRouter, Body, Depends, HTTPException, Form
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.database import get_repository
from app.core import config
from app.models.domain.users import User
from app.resources.helper.common import *
from app.db.repositories.employee import EmployeeRepository

router = APIRouter()

@router.get("", 
    response_model = SendResponse, 
    name = "branch:get-branches")
async def get_branches(
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
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
    # await oBranch.validateAccess(current_user,"MANUAL ACTIVITY")    
    
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
    name = "branch:get-branch")
async def get_branch(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
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
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.modify( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/bulkVerification", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.bulkVerification( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/verification", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.initiateVerification( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/updatedoc", 
    response_model = SendResponse, 
    name = "member:save-updateDoc")
async def updateDoc(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.updateDoc( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/{token}/verification", 
    response_model = SendResponse, 
    name = "member:save-user")
async def save_user(
    token : str = None,
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.getVerificationDetail( token = token, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/verifyPan", 
    response_model = SendResponse, 
    name = "member:verifyPan")
async def verifyPan(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.verifyPanNumber( payload = payload )
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/ekyc/register", 
    response_model = SendResponse, 
    name = "member:initiate_ekyc")
async def initiate_ekyc(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.initiateeKycRequest( payload = payload )
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/crimecheck", 
    response_model = SendResponse, 
    name = "member:initiate_crimecheck")
async def initiate_crimecheck(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.initiateCrimeCheck( payload = payload )
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/requestReport", 
    response_model = SendResponse, 
    name = "member:requestReport_crimecheck")
async def requestReport_crimecheck(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.requestReport( payload = payload )
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/captueReport", 
    response_model = SendResponse, 
    name = "member:captue_crimecheck")
async def captueReport(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.captueReport( payload = payload )
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/update", 
    response_model = SendResponse, 
    name = "member:update")
async def update(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.update( payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/sync", 
    response_model = SendResponse, 
    name = "member:sync")
async def update(
    payload = Body(...),
    current_user : User = Depends(get_current_user_authorizer()),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.syncWithSystem( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()

##########################################################################################
@router.post("/signedUrl", 
    response_model = SendResponse, 
    name = "member:uploadDoc")
async def uploadDoc(
    payload = Body(...),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.getSigneURL( payload = payload )
    return SendResponse(
        data = oResult
    ).send()

@router.post("/uploaddoc", 
    response_model = SendResponse, 
    name = "member:uploadDoc")
async def uploadDoc(
    id = Form(None),
    file = Form(None),
    oRepository: EmployeeRepository = Depends(get_repository(EmployeeRepository)),
) -> SendResponse:
    oResult = await oRepository.uploadDocument( payload = { "id" : id }, file = file)
    
    return SendResponse(
        data = oResult
    ).send()
