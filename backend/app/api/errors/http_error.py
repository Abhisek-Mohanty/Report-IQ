from enum import Enum
from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.db.errors import *

class AccessCode(Enum):
    OK           = 200
    BAD_REQUEST  = 400
    UNAUTHORISED = 401
    FORBIDDEN    = 403
    NOT_FOUND    = 404
    INTERAL_SERVER_ERROR = 500
    NOT_IMPLEMENTED = 501
    BAD_GATEWAY  = 502

async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse({
            "message": exc.detail,
            "errorType": "GENERIC",
            "errorMessages": [exc.detail],
            "logout": False,
            "stack": None
        }, status_code=AccessCode.BAD_REQUEST.value)

async def unauthorized_access(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse({
            "message": exc.detail,
            "errorType": "GENERIC",
            "errorMessages": [exc.detail],
            "logout": True,
            "stack": None
        }, status_code=AccessCode.UNAUTHORISED.value)

async def validation_error_handler(_: Request, exc: ValidationResponse) -> JSONResponse:
    return JSONResponse({
            "message": exc.detail,
            "errorType": "VALIDATION",
            "errorMessages": exc.msgList if hasattr(exc,"msgList") else  []
        }, status_code=exc.status_code)

async def application_error_handler(_: Request, exc: ErrorResponse) -> JSONResponse:
    return JSONResponse({
            "message": exc.detail,
            "errorType": "INTERNAL",
            "data" : exc.data if hasattr(exc,"data") else None
        }, status_code=exc.status_code)

async def empty_record_error_handler(_: Request, exc: EntityDoesNotExist) -> JSONResponse:
    return JSONResponse({
            "message": exc.detail,
            "errorType": "INTERNAL",
            "data" : None
        }, status_code=exc.status_code)
