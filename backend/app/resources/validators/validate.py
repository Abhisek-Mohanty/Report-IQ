
from typing import Callable

from fastapi import Depends, HTTPException, Body
from starlette.status import HTTP_400_BAD_REQUEST

from app.api.dependencies.database import get_repository
from app.resources import error_strings

def validation(oRepository : callable, validationFun: str = "", optional = False) -> Callable:  # type: ignore
    async def __init(
        data = Body(...),
        oRepositor = Depends(get_repository(oRepository)),
        validationFun : str = validationFun,
        token : str = None,
        optional = optional
    ) -> None:
        oFun =  getattr(oRepositor, "oValidate"+validationFun, None)
        if oFun:
            if token:
                data["token"] = token
            return oFun( data = data )
        else:
            oRepositor.db_session.close()
            if not optional:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, 
                    detail=error_strings.VALUDATION_SERVER_ERROR
                )
        
    return __init

