from itertools import cycle
import json
import argparse
import sys

from typing import Callable
from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

from app.resources.helper.encoder import getSalt
from app.db.errors import *
from app.api.errors.http_error import *
from app.api.errors.validation_error import http422_error_handler

from app.api.routes.api import router as url_router
from app.api.routes.openApi import router as api_router
from app.api.routes.ws import router as ws_router
from app.api.routes.webhook import router as webhook_router
from app.api.routes.cron import router as cron_router

from app.core.config import API_PREFIX, ENVIRONMENT, URL_PREFIX, WEBHOOK_PREFIX, WS_PREFIX,SECRET_KEY
from app.core.config import ALLOWED_HOSTS, DEBUG, PROJECT_NAME, VERSION ,DOCURLS
from app.core.events import create_start_app_handler, create_stop_app_handler
from starlette.middleware.sessions import SessionMiddleware

def get_application() -> FastAPI:
    
    middleware = [
        Middleware(
            # CORSMiddleware,
            SessionMiddleware,
            secret_key = SECRET_KEY
            # allow_origins= ALLOWED_HOSTS,
            # allow_credentials=True,
            # allow_methods=["GET","POST","PUT","DELETE","HEAD","PATCH"],
            # allow_headers=['*','api-key','Content-Type','Content-Length','Content-Disposition','fileName','X-Parse-Token','Access-Control-Allow-Credentials'],
            # expose_headers=['Content-Disposition','fileName','X-Parse-Token']
        ),
        Middleware(
                    CORSMiddleware,
                    # SessionMiddleware,
                    # secret_key = SECRET_KEY,
                    allow_origins= ALLOWED_HOSTS,
                    allow_credentials=True,
                    allow_methods=["GET","POST","PUT","DELETE","HEAD","PATCH"],
                    allow_headers=['*','api-key','Content-Type','Content-Length','Content-Disposition','fileName','X-Parse-Token','Access-Control-Allow-Credentials'],
                    expose_headers=['Content-Disposition','fileName','X-Parse-Token']
                )
    ]

    max_size = 50 * 1024 * 1024  # 50 megabytes                      
    application = FastAPI(middleware=middleware,
                          max_size = max_size,
                          title=PROJECT_NAME, 
                          debug=DEBUG, 
                          version=VERSION, 
                          docs_url= DOCURLS, 
                          redoc_url= DOCURLS)

    if ENVIRONMENT == "prod":
        application.add_middleware(HTTPSRedirectMiddleware)
    
    application.add_event_handler("startup", create_start_app_handler(application))
    application.add_event_handler("shutdown", create_stop_app_handler(application))

    application.add_exception_handler(UnauthorizedAccess, unauthorized_access)
    application.add_exception_handler(HTTPException, http_error_handler)
    application.add_exception_handler(EntityDoesNotExist, empty_record_error_handler)
    application.add_exception_handler(ErrorResponse, application_error_handler)
    application.add_exception_handler(ValidationResponse, validation_error_handler)
    application.add_exception_handler(RequestValidationError, http422_error_handler)

    async def securityCheck( response : Response ):
        response.headers["X-Parse-Token"] = getSalt()
    
    async def check_request_size(request: Request ):
        max_size = 50 * 1024 * 1024  # 50 megabytes                      
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > max_size:
            raise HTTPException(
                status_code=413,
                detail="Request Entity Too Large",
            )
            
    # Web Application Routers
    application.include_router(
        url_router, 
        dependencies=[Depends(check_request_size), Depends(securityCheck)],
        prefix=URL_PREFIX
    )
    
    # API User Routers
    application.include_router(
        api_router, 
        dependencies=[Depends(check_request_size), Depends(securityCheck)],
        prefix=API_PREFIX
    )
    
    # WS Routers
    application.include_router(
        ws_router, 
        dependencies=[Depends(check_request_size), Depends(securityCheck)],
        prefix=WS_PREFIX
    )
    
    # Webhook Routers
    application.include_router(
        webhook_router, 
        dependencies=[Depends(check_request_size), Depends(securityCheck)],
        prefix=WEBHOOK_PREFIX
    )
    
    args = sys.argv
    if "CRON:ENABLED" in args:
        print("ENABLE CORN")
        # Cron Routers
        application.include_router(
            cron_router
        )
    
    application.max_request_size = max_size 
    return application


app = get_application()