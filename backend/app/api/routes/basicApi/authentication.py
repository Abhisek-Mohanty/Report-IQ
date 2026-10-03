# from datetime import datetime, timedelta
# from fastapi.security import OAuth2PasswordBearer
# from fastapi import APIRouter, Body, Depends, HTTPException
# from starlette.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST
# # from jinja2 import Template

# from app.api.response.http_response import SendErrorResponse, SendResponse
# from app.api.dependencies.database import get_repository
# from app.core import config
# from app.db.errors import EntityDoesNotExist
# # from app.db.repositories.users import UsersRepository, TinyURLRepository
# # from app.db.repositories.customer import CustomerRepository
# from app.db.repositories.authentication import AuthenticationRepository
# from app.api.dependencies.authentication import get_current_user_authorizer
# from app.db.repositories.project import ProjectRepository

# # from app.db.repositories.template import TemplateRepository

# from app.resources import error_strings
# from app.services.authentication import check_email_is_taken, check_username_is_taken
# from app.core.config import JWT_TOKEN_PREFIX
# from app.resources.constant import USER_CONTEXT, USER_CONTEXT_KEY

# router = APIRouter()

# @router.post("/login",
#     response_model=SendResponse, 
#     name="auth:user-login")
# async def user_login(
#     # user_login: UserInLogin = Body(..., embed=True, alias="user"),
#     user_login = Body(...),
#     users_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
# ) -> SendResponse:
#     wrong_login_error = HTTPException(
#         status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INCORRECT_LOGIN_INPUT
#     )
#     if user_login.get("username") == "" or user_login.get("password") == "":
#         raise wrong_login_error

#     try:
#         user = await users_repo.get_user_by_email(email=user_login.get("username"), context=user_login.get("context","admin") )
#     except EntityDoesNotExist as existence_error:
#         raise wrong_login_error from existence_error

#     if not user.check_password(user_login.get("password")):
#         login_attempts_left = await users_repo.user_login_attempt(user=user, isWrongPassword = True)
#         if isinstance(login_attempts_left, int):
#             raise HTTPException(
#                 status_code=HTTP_400_BAD_REQUEST, detail=f"Incorrect password. {login_attempts_left+1} attempts left."
#             )   
#         else:
#             raise HTTPException(
#                 status_code=HTTP_400_BAD_REQUEST, detail=login_attempts_left["message"]
#             )  
        
#     oResult = await users_repo.user_login_attempt(user=user, isWrongPassword = False)
    
#     if isinstance(oResult, SendErrorResponse):
#         raise HTTPException(
#             status_code=HTTP_400_BAD_REQUEST, detail=oResult.message
#         )
#     return SendResponse(
#         data = oResult
#     )

# @router.post("/validateotp", 
#     response_model=SendResponse, 
#     name="auth:login")
# async def validateotp(
#     user_login = Body(...),
#     users_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
# ) -> SendResponse:
    
#     user = await users_repo.valiDateOTP(payload=user_login, context=user_login.get("context","admin") )
    
#     return SendResponse(
#         data = user
#     ).send()
   
# @router.post("/changepassword", 
#     response_model = SendResponse)
# async def change_password(
#     current_user : AuthenticationRepository = Depends(get_current_user_authorizer()),
#     payload = Body(...),
#     oUser: AuthenticationRepository = Depends(get_repository(AuthenticationRepository))
# ) -> SendResponse:
#     oResult = await oUser.changePassword( user = current_user, payload = payload)
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.post("/forgetpassword", response_model=SendResponse, name="auth:login")
# async def login(
#     payload = Body(...),
#     oUser: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
# ) -> SendResponse:
#     oResult = await oUser.forgetPassword(context= payload.get("context"), email=payload.get("email"))
#     return SendResponse(
#         data = oResult
#     ).send()
    
# @router.get("/resetpassword/{token}", response_model=SendResponse, name="auth:login")
# async def resetPassword(
#     oUser: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
#     token : str = None
# ) -> SendResponse:
#     oResult = await oUser.checkToken(token=token )
#     return SendResponse(
#         data = oResult
#     ).send()
    
# @router.post("/resetpassword/{token}", response_model=SendResponse, name="auth:login")
# async def resetPassword(
#     oUser: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
#     # current_user : AuthenticationRepository = Depends(get_current_user_authorizer()),
#     token : str = None,
#     payload = Body(...),
# ) -> SendResponse:
#     oResult = await oUser.resetPassword(token=token, payload=payload, context=payload.get("context") )
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.post("/sendloginotp", response_model=SendResponse, name="auth:login")
# async def send_otp_to_login(
#     payload = Body(...),
#     customer_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository))
# ) -> SendResponse:
#     oResult = await customer_repo.sendLoginOtp(payload=payload)
    
#     return SendResponse(
#         data = oResult
#     ).send()

# # /auth/customerOtpLogin
# @router.post("/otplogin", response_model=SendResponse, name="auth:login")
# async def login(
#     payload = Body(...),
#     customer_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository))
# ) -> SendResponse:
#     oResult = await customer_repo.valiDateOTP(payload=payload, context= None)
    
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.post("/signup", response_model=SendResponse, name="auth:login")
# async def login(
#     payload = Body(...),
#     oRepository: AuthenticationRepository = Depends(get_repository(AuthenticationRepository))
# ) -> SendResponse:
#     oResult = await oRepository.signup(payload=payload)
    
#     return SendResponse(
#         data = oResult
#     ).send()

# @router.post("/activate/{token}", response_model=SendResponse, name="auth:login")
# async def login(
#     token : str = None,
#     payload = Body(...),
#     oRepository: ProjectRepository = Depends(get_repository(ProjectRepository))
# ) -> SendResponse:
#     oResult = await oRepository.memberActivation(token=token)
    
#     return SendResponse(
#         data = oResult
#     ).send()
