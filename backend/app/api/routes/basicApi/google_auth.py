from datetime import timedelta
from typing import Annotated
from fastapi import Depends, Request, APIRouter
from app.core import config
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from urllib.parse import urlencode
import os
# from .auth import create_access_token
from dotenv import load_dotenv
from app.services import jwt
import json


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
    return await oauth.google.authorize_redirect(request, redirect_uri="http://localhost:8000/api/v1/auth/google/callback")


# Handle the OAuth callback from Google
@router.get("/auth/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or {}
        access_token = jwt.create_access_token_for_user(user_info,str(config.SECRET_KEY))
        frontend_url = "http://localhost:3000"
        params = urlencode({
                    "token": access_token,
                    "profile": json.dumps({
                        "name": user_info.get("name", ""),
                        "email": user_info.get("email", ""),
                        "picture": user_info.get("picture", ""),
                    })
                })
        return RedirectResponse(
                    url=f"{frontend_url}/auth/callback?token={params}"
                )

        return {"access_token": access_token, "token": token}
    except Exception as e:
        import traceback
        print("Error:", traceback.format_exc())  # Debugging step
        return {"error": str(e)}
