from typing import Optional

from pydantic import BaseModel, EmailStr, HttpUrl

from app.models.domain.users import User
from app.models.schemas.rwschema import RWSchema

class UserInLogin(RWSchema):
    username: EmailStr
    password: str

class UserInCreate(UserInLogin):
    emailId: str

class UserInUpdate(BaseModel):
    emailId: Optional[EmailStr] = None
    password: Optional[str] = None

class UserWithToken(RWSchema):
    email: str
    token: str

class UserInResponse(RWSchema):
    user: UserWithToken
