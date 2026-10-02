from typing import Callable, Optional

from fastapi import Depends, HTTPException, Security, Request, Response
from fastapi.security import APIKeyHeader
from starlette import requests, status
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel

from app.api.dependencies.database import get_repository
from app.core.config import JWT_TOKEN_PREFIX, SECRET_KEY
from app.db.errors import EntityDoesNotExist, UnauthorizedAccess

from app.db.repositories.users import UsersRepository
from app.db.repositories.authentication import AuthenticationRepository

from app.models.schemas.apiUsers import APIUser
from app.models.domain.users import User
from app.resources import error_strings
from app.services import jwt
from app.resources.helper.moment import Moment
# from app.resources.library.paymentGateway.razorpay import Razorpay
# from app.db.repositories.colender import ColenderRepository


class RWAPIKeyHeader(APIKeyHeader):
    def __init__(
        self,
        *,
        name: str = "Authorization",
        scheme_name: str = None,
        auto_error: bool = True
    ) -> None:
        super().__init__(name=name, scheme_name=scheme_name, auto_error=auto_error)

    async def __call__(
        self, request: requests.Request
    ) -> Optional[str]:
        try:
            return await super().__call__(request)
        except StarletteHTTPException as original_auth_exc:
            raise HTTPException(
                status_code=original_auth_exc.status_code,
               
                detail=error_strings.AUTHENTICATION_REQUIRED,
            )
        
def get_current_user_authorizer(*, required: bool = True) -> Callable:  # type: ignore
    try:
        return _get_current_user if required else _get_current_user_optional
    except: 
        pass

def _get_authorization_header_retriever(
    *, required: bool = True
) -> Callable:  # type: ignore
    return _get_authorization_header if required else _get_authorization_header_optional


def _get_authorization_header(
        api_key: str = Security(RWAPIKeyHeader())
        ) -> str:
    try:
        print(api_key.split(" "))
        token_prefix, token = api_key.split(" ")
    except ValueError:
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.WRONG_TOKEN_PREFIX
        )
    if token_prefix != JWT_TOKEN_PREFIX:
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.WRONG_TOKEN_PREFIX
        )

    return token


def _get_authorization_header_optional(
    authorization: Optional[str] = Security(RWAPIKeyHeader(auto_error=False)),
) -> str:
    if authorization:
        return _get_authorization_header(authorization)

    return ""


async def _get_current_user(
    authentication_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
    token: str = Depends(_get_authorization_header_retriever()),
) -> User:
    try:
        print("\n\n\n\n\n\n","_get_current_user",token,str(SECRET_KEY))
        oToken = jwt.get_username_from_token(token, str(SECRET_KEY))
        print("\n\n\n\n\n\n","_get_current_user",oToken)

    except ValueError:
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )

    try:
        oReturn = None
        print("#################################")
        if hasattr(oToken,"id"):
            oReturn = await authentication_repo.get_user_by_id(id= str(oToken.id), context="ReportIQ")
        else:
            oReturn = await authentication_repo.get_user_by_sub(email=oToken.sub, context="ReportIQ")

        oReturn.project = "RepostIQ"

        print("********************************************************************************")    
        print("Email ID :"+ oReturn.emailId)    
        print("Name     :"+ oReturn.firstName + " " + oReturn.lastName)    
        print("Mode  :"+ str(oReturn.modeType))    
        print("DateTime :"+ str(Moment().now)  )  
        print("_________________________________________________ Request Detail ===============>")    
        return  oReturn
    # except EntityDoesNotExist:
    except BaseException as error:
        raise error
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )


async def _get_current_user_optional(
    repo: UsersRepository = Depends(get_repository(UsersRepository)),
    token: str = Depends(_get_authorization_header_retriever(required=False)),
) -> Optional[User]:
    try:
        if token:
            return await _get_current_user(repo, token)
    except:
        pass
    return None


# async def verifyWebhookSignature(request, webhook_body) -> bool:
#     try:
#         webhook_signature = request.headers.get('x-razorpay-signature')
#         body_bytes = await request.body()
#         body_str = body_bytes.decode('utf-8')
#         razorpay_client = Razorpay(True)
#         razorpay_auth = await razorpay_client.verifyWebhookSignature(body_str, webhook_signature)
#         return razorpay_auth
#     except:
#         return False

####################### API USER ####################################

def get_api_user_authorizer(*, required: bool = True) -> Callable:  # type: ignore
    try:
        return _get_api_user if required else _get_api_user_optional 
    except: 
        pass
    
async def _get_api_user(
    request: Request,
    response: Response,
    authentication_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
) -> APIUser: 
    try:
        oReturn = await authentication_repo.apiValidateUser(request, response)
        print("#####################################################################################")    
        print("Email ID :"+ oReturn.emailId)    
        print("Name     :"+ oReturn.firstName + " " + oReturn.lastName)    
        print("API User :"+ str(oReturn.apiUserId))    
        print("DateTime :"+ str(Moment().now))    
        print("_________________________________________________ API Request Detail ===============>")    
        return oReturn  
    except ValueError:
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )
        
async def _get_api_user_optional(
    repo: UsersRepository = Depends(get_repository(UsersRepository)),
    token: str = Depends(_get_authorization_header_retriever(required=False)),
) -> Optional[User]:
    try:
        if token:
            return await _get_current_user(repo, token)
    except:
        pass
    return None



####################### API USER ####################################


def get_webhook_user_authorizer(*, required: bool = True) -> Callable:  # type: ignore
    try:
        return _get_webhook_user if required else _get_webhook_user_optional 
    except: 
        pass

async def _get_webhook_user(
    request: Request,
    response: Response,
    authentication_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
) -> APIUser: 
    try:
        return await authentication_repo.webhookValidateUser(request, response)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )
    
async def _get_webhook_user_optional(
    repo: UsersRepository = Depends(get_repository(UsersRepository)),
    token: str = Depends(_get_authorization_header_retriever(required=False)),
) -> Optional[User]:
    try:
        if token:
            return await _get_current_user(repo, token)
    except:
        pass
    return None



####################### API USER ####################################


def get_webhook_user_authorizer(*, required: bool = True) -> Callable:  # type: ignore
    try:
        return _get_webhook_user if required else _get_webhook_user_optional 
    except: 
        pass

async def _get_webhook_user(
    request: Request,
    response: Response,
    authentication_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
) -> APIUser: 
    try:
        return await authentication_repo.webhookValidateUser(request, response)
    except ValueError:
        raise UnauthorizedAccess(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )
    
async def _get_webhook_user_optional(
    repo: UsersRepository = Depends(get_repository(UsersRepository)),
    token: str = Depends(_get_authorization_header_retriever(required=False)),
) -> Optional[User]:
    try:
        if token:
            return await _get_current_user(repo, token)
    except:
        pass
    return None
