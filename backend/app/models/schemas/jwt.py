from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class JWTMeta(BaseModel):
    exp: datetime
    sub: str


class JWTUser(BaseModel):
    id: int
    username: str = ""
    context : int = None
    switchId : int = None
    project : int = None
    debug : bool = False
