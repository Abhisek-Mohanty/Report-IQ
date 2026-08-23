from fastapi import APIRouter, Body, Depends, HTTPException, Form
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.authentication import get_current_user_authorizer
from app.api.dependencies.validateAccess import validate_user_access
from app.api.dependencies.database import get_repository
from app.core import config
from app.db.repositories.branch import BranchRepository
from app.models.domain.users import User
from app.resources import success_strings, error_strings
from app.resources.helper.common import *
from app.db.repositories.authentication import UserAuth

router = APIRouter()

@router.get("", 
    response_model = SendResponse, 
    name = "branch:get-branches")
async def get_branches(
    current_user : UserAuth = Depends(get_current_user_authorizer()),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
    limit : int = 25,
    page : int = 0,
    name            : str = None,
    branchCode      : str = None,
    city            : str = None,
    state           : str = None,
    pincode         : str = None,
    geoLocationLat  : str = None,
    geoLocationLong : str = None,
    enabled         : str = None,
    q               : str = None,
    qf              : str = None,
    flag            : bool = False,
) -> SendResponse:
    # await oBranch.validateAccess(current_user,"MANUAL ACTIVITY")    
    
    oResult = await oBranch.getList( 
        user=current_user,
        paggination = { 
            "limit" : limit, 
            "offset" : page 
        }, 
        filter = {    
            "name"          : name,
            "branchCode"    : branchCode,
            "city"          : city,
            "state"         : state,
            "pincode"       : pincode,
            "geoLocationLat" : geoLocationLat,
            "geoLocationLong" : geoLocationLong,
            "enabled"       : enabled,    
            "search"        : q, 
            "searchField"   : qf,
            "flag"          : flag
        })
    
    return SendResponse(
        data = oResult
    ).send()

@router.get("/{id}", 
    response_model = SendResponse, 
    name = "branch:get-branch")
async def get_branch(
    id : int = id,
    current_user : User = Depends(get_current_user_authorizer()),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
    status: str = None
) -> SendResponse: 
    oResult = await oBranch.getOne( id = id )

    return SendResponse(
        data = oResult
    ).send()

@router.post("/bycode", 
    response_model = SendResponse, 
    name = "branch:get-branch")
async def get_branch(
    payload = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
    status: str = None
) -> SendResponse: 
    oResult = await oBranch.getByCode( payload = payload )

    return SendResponse(
        data = oResult
    ).send()

@router.post("/list", 
    response_model = SendResponse, 
    name = "branch:get-branch")
async def get_branch(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository))
) -> SendResponse: 
    oResult = await oBranch.getBranchList( user = current_user,payload = payload)

    return SendResponse(
        data = oResult
    ).send()


@router.post("", 
    response_model = SendResponse, 
    name = "branch:save-branch")
async def save_branch(
    current_user : User = Depends(get_current_user_authorizer()),
    payload = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository))
) -> SendResponse:
    oResult = await oBranch.modify( user = current_user, payload = payload)
    
    return SendResponse(
        data = oResult
    ).send()


@router.post("/{id}/activate", 
    response_model = SendResponse, 
    name = "branch:status-branch")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    id : int = id,
    data = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.activate( user = current_user, payload = data)
    
    return SendResponse(
        data = oResult
    ).send()

@router.get("/{id}/employee", 
    response_model = SendResponse, 
    name = "branch:status-branch")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    id : int = id,
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.getEmployees( user = current_user, id = id)
    
    return SendResponse(
        data = oResult
    ).send()

@router.post("/{id}/employee", 
    response_model = SendResponse, 
    name = "branch:status-branch")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    id : int = id,
    data = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.addEmployee( user = current_user, id = id, payload = data)
    
    return SendResponse(
        data = oResult
    ).send()

@router.put("/{id}/delete/employee", 
    response_model = SendResponse, 
    name = "branch:delete-employee")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    id : int = id,
    data = Body(...),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.deleteEmployee( user = current_user, id = id, payload = data)
    
    return SendResponse(
        data = oResult
    ).send()
    
@router.post('/qrcode', 
    response_model=SendResponse, 
    name="branch:QRCode")
async def get_QRCode(
    data= Body(...),
    current_user : UserAuth = Depends(get_current_user_authorizer()),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.getQrCode(user=current_user, payload=data)
    return SendResponse(
        data=oResult
    ).send()
    
@router.get("/download/branchDetails/excel",
            response_model=SendResponse,
            name = "BranchDetailsExcel:getExport-branchDetails")
async def getBranchDetailsExport(
    current_user: UserAuth = Depends(get_current_user_authorizer()),
    oBranchDetails: BranchRepository = Depends(
        get_repository(BranchRepository))
) -> SendResponse:
    oResult = await oBranchDetails.exportBranchDetails(
        current_user,
        filter={
            "flag": True
        }
    )
    return SendResponse(
        data=oResult
    ).send()  

@router.get("/document/{id}", 
    response_model = SendResponse, 
    name = "branch:get-document")
async def status(
    current_user: User = Depends(get_current_user_authorizer()),
    id : int = id,
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
) -> SendResponse:
    oResult = await oBranch.getDocuments( user = current_user, id = id)
    
    return SendResponse(
        data = oResult
    ).send() 


@router.post("/document/upload",
    response_model = SendResponse, 
    name = "branch:document-upload")
async def update_tc_template(
    current_user : UserAuth = Depends(get_current_user_authorizer()),
    oBranch: BranchRepository = Depends(get_repository(BranchRepository)),
    file = Form(None),
    branchId = Form(None),
    documentType = Form(None),
    other = Form(None),
    description = Form(None),
    commentAsProposer = Form(None),
    validTill = Form(None),
    renewalRequired = Form(None),
) -> SendResponse:
    oResult = await oBranch.upload_document(current_user, file, branchId, documentType, other, description, commentAsProposer, validTill, renewalRequired)
    
    return SendResponse(
        data = oResult
    ).send()