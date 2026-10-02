from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class JWTMeta(BaseModel):
    exp: datetime
    sub: str


class JWTUser(BaseModel):
    id: Optional[int] = None
    username: str = ""
    email:str = ""
    sub:str = ""
