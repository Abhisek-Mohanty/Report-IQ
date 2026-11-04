from datetime import timedelta
from typing import Annotated
from fastapi import Depends, Request, APIRouter
from app.core import config
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from urllib.parse import urlencode
from google.oauth2 import id_token
from app.api.dependencies.database import get_repository
from app.db.repositories.authentication import AuthenticationRepository
from google.auth.transport import requests
from app.db.errors import EntityDoesNotExist, UnauthorizedAccess
import os
# from .auth import create_access_token
from dotenv import load_dotenv
from app.services import jwt
import json
from fastapi.encoders import jsonable_encoder



# from utils.config import Settings
from functools import lru_cache

load_dotenv()

router = APIRouter()


# @lru_cache
# def get_settings():
#     return Settings()

# Configure OAuth
oauth = OAuth()
oauth.register(
    name="google",
    client_id=config.AUTH_GOOGLE_ID,
    client_secret=config.AUTH_GOOGLE_SECRET,
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    authorize_params={"scope": "openid email profile"},
    access_token_url="https://oauth2.googleapis.com/token",
    client_kwargs={"scope": "openid email profile"},
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration"
)

# Redirect user to Google for authentication
@router.get("/auth/google")
async def auth_google(request: Request):
    return await oauth.google.authorize_redirect(request, redirect_uri=config.BASE_URL+"/auth/google/callback")


# Handle the OAuth callback from Google
@router.get("/auth/google/callback")
async def google_callback(
    request : Request,
    authentication_repo: AuthenticationRepository = Depends(get_repository(AuthenticationRepository)),
    ):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or {}
        google_id_token = token.get("id_token")

        if not google_id_token:
            raise UnauthorizedAccess(401,"Google ID token not found")

        user_info = id_token.verify_oauth2_token(
            google_id_token,
            requests.Request(),
            config.AUTH_GOOGLE_ID,
            clock_skew_in_seconds=10,
        )
        
        oUser = None
        sub = user_info.get("sub")
        if not sub:
            raise UnauthorizedAccess(401,"Google user ID not found")

        oUser = await authentication_repo.get_user_by_sub(sub= str(sub),payload=user_info)
        if not oUser:
            raise UnauthorizedAccess(403,"Unauthorized Access")
        access_token = jwt.create_access_token_for_user(oUser,str(config.SECRET_KEY))
        oUser = jsonable_encoder(oUser)
        frontend_url = config.REDIRECT_URL
        params = urlencode({
                    "token": access_token,
                    "profile": json.dumps({
                        "name": oUser.get("fullName", ""),
                        "email": oUser.get("emailId", ""),
                        "picture": oUser.get("profilePic", ""),
                    })
                })
        return RedirectResponse(url=f"{frontend_url}/auth/callback?{params}")
            
        # return {"access_token": access_token, "token": token}
    except Exception as e:
        import traceback
        print("Error:", traceback.format_exc())  # Debugging step
        return {"error": str(e)}
