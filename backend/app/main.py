from itertools import cycle
import json
import argparse
import sys

from typing import Callable
from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from app.api.routes.api import router as url_router
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

from app.core.events import create_start_app_handler, create_stop_app_handler

def get_application() -> FastAPI:
    
    middleware = [
            Middleware(
            CORSMiddleware,
            allow_origins=["*"],  
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ]

    application = FastAPI(
        title="Findex The Search Engine",
        debug=True,
        version=1,
        docs_url='/docs',
        redoc_url="/redoc",  
        middleware=middleware
    )

    application.include_router(url_router)

    # Startup / Shutdown events
    application.add_event_handler(
        "startup",
        create_start_app_handler(application)
    )
    application.add_event_handler(
        "shutdown",
        create_stop_app_handler(application)
    )

    return application


app = get_application()