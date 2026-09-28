from typing import Callable, Optional
from fastapi import Depends, HTTPException
from starlette import status
from starlette.exceptions import HTTPException

from app.core.config import SECRET_KEY

from app.models.domain.users import User
from app.resources import error_strings
from app.services import jwt
from app.api.dependencies.authentication import _get_authorization_header_retriever

def validate_user_access(*, required: bool = True) -> Callable:  # type: ignore
    try:
        return _get_current_user if required else _get_current_user_optional
    except: 
        raise HTTPException(
            status_code=403,
            detail=error_strings.INVALID_ACCESS
        )

async def _get_current_user(
    token: str = Depends(_get_authorization_header_retriever())
) -> User:
    try:
        oToken = jwt.get_username_from_token(token, str(SECRET_KEY))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )
    
    if oToken:
        return  oToken
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=error_strings.MALFORMED_PAYLOAD
        )

async def _get_current_user_optional(
    token: str = Depends(_get_authorization_header_retriever(required=False))
) -> Optional[User]:
    try:
        return token
    except:
        pass
    return None
