from fastapi import APIRouter, Body, Depends, HTTPException
from starlette.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST

from app.api.response.http_response import SendResponse
from app.api.dependencies.database import get_repository
from app.core import config
from app.db.errors import EntityDoesNotExist
from app.db.repositories.users import UsersRepository
from app.models.schemas.users import (
    UserInCreate,
    UserInLogin,
    UserInResponse,
    UserWithToken,
)
from backend.app.resources import error_strings
from app.services import jwt
from app.services.authentication import check_email_is_taken, check_username_is_taken

router = APIRouter()

@router.post("/login", 
    response_model=SendResponse, 
    name="auth:login")
async def login(
    # user_login: UserInLogin = Body(..., embed=True, alias="user"),
    user_login: UserInLogin = Body(...),
    users_repo: UsersRepository = Depends(get_repository(UsersRepository)),
) -> SendResponse:
    wrong_login_error = HTTPException(
        status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INCORRECT_LOGIN_INPUT
    )

    try:
        user = await users_repo.get_user_by_email(email=user_login.username)
    except EntityDoesNotExist as existence_error:
        raise wrong_login_error from existence_error

    if not user.check_password(user_login.password):
        raise wrong_login_error

    token = jwt.create_access_token_for_user(user, str(config.SECRET_KEY))
    return SendResponse(
        data = { 
            'email' : user.emailId,
            'token' :token
        }
    )
