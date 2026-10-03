# from app.db.repositories.users import UsersRepository
# from fastapi import APIRouter,  Response, Request, Body , Depends, HTTPException, UploadFile, File
# from starlette.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST

# from app.api.response.http_response import SendResponse
# from app.api.dependencies.database import get_repository

# from app.db.repositories.application import ApplicationRepository

# from app.resources.validators.token.basic import TokenParser
# from app.resources.validators.validate import validation

# router = APIRouter()

# @router.get("/application/{token}/detail", 
#     response_model = SendResponse, 
#     name = "application:get-application-detail")
# async def get_application_detail(
#     request : Request,
#     oApplicationRepository: ApplicationRepository = Depends(get_repository(ApplicationRepository)),
#     token : str = None
# ) -> SendResponse:
#     oResult = await oApplicationRepository.basicDetail(token = token)
    
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.get("/{token}/mandate", 
#     response_model = SendResponse, 
#     name = "application:get-mandate-info")
# async def get_mandate_reginfo(
#     response : Response,
#     request : Request,
#     oApplicationRepository: ApplicationRepository = Depends(get_repository(ApplicationRepository)),
#     token : str = None
# ) -> SendResponse:
#     oResult = await oApplicationRepository.regMandateInfo(user = None, token = token)
    
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.put("/{token}/verification", 
#     response_model = SendResponse, 
#     name = "application:process-mandate")
# async def process_mandate_reginfo(
#     response : Response,
#     request : Request,
#     oApplicationRepository: ApplicationRepository = Depends(get_repository(ApplicationRepository)),
#     token : str = None,
#     payload = Body(...)
# ) -> SendResponse:
#     oResult = await oApplicationRepository.processMandate(user = None, token = token, payload=payload)
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.post("/resetPassword/{token}", response_model=SendResponse, name="anonymous:login")
# async def login(
#     body = Body(...),
#     users_repo: UsersRepository = Depends(get_repository(UsersRepository)),
#     token : str = None,
# ) -> SendResponse:
#     oResult = await users_repo.resetPassword(token=token, payload=body)
#     return SendResponse(
#     data = oResult
#     ).send()

# @router.post("/{token}/otpcontent", response_model=SendResponse, name="anonymous:otpcontent")
# async def login(
#     payload = Body(...),
#     oApplicationRepository: ApplicationRepository = Depends(get_repository(ApplicationRepository)),
#     token : str = None
# ) -> SendResponse:
#     oResult = await oApplicationRepository.otpConcent(token=token, payload = payload )
#     return SendResponse(
#     data = oResult
#     ).send()
    