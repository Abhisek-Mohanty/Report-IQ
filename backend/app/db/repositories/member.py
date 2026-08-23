import secrets
from typing import Any
from sqlalchemy import or_
from starlette.exceptions import HTTPException
from sqlalchemy.orm import load_only
import re

from app.api.response.http_response import SendErrorResponse, SendSuccessResponse

from app.resources.helper.common import *
from app.db.repositories.base import BaseRepository
from app.resources.helper.moment import Moment
from app.db.repositories.base import BaseRepository
from app.core.config import DEFAULT_PASSWORD
from app.services import security
from app.resources.library.S3.index import s3Bucket

from app.models.domain.db import *

class MemberRepository(BaseRepository):  

    async def getProfile(self, user):
        try:
            oUser = self.db_session.query(
                        User
                    ).options(
                        load_only(*["id","firstName","lastName","emailId","mobile","gender","dob"])
                    ).filter(
                        User.id == user.id
                    ).first()
            
            self.notFound(oUser)
    
            oS3Bucket = s3Bucket()
            if oUser.profilePic:
                oUser.profilePicURL = await oS3Bucket.getSignedURL(oUser.profilePic)
                oUser.profilePicURL = oUser.profilePicURL["url"]
        
            oUser.project = user.project
            return SendSuccessResponse(
                    data = oUser
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )
         
    async def modify(self, user, payload):
        try:
            oUser = self.db_session.query(User).filter(User.id == user.id).first()
            self.notFound(oUser)
    
            oUser = self.mapDataToModel(oUser, payload, user= user)
            self.db_session.commit()

            return SendSuccessResponse(
                    data = oUser,
                    message = "Your profile detail updated."
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
        
    async def getById(self, *, id: int):
        try:
            oUser = self.db_session.query(
                            User
                        ).options( 
                            load_only(*["id","firstName","lastName","isActive","mobile","emailId","employeeId","profilePic"])
                        ).filter(
                            User.id == id
                        ).first()
                        
            self.notFound(oUser)
               
            oS3Bucket = s3Bucket()
            if oUser.profilePic:
                oUser.profilePicURL = await oS3Bucket.getSignedURL(oUser.profilePic)
                oUser.profilePicURL = oUser.profilePicURL["url"]
        
            return SendSuccessResponse(
                    data=oUser
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
            
    async def changePassword(self, user, payload):
        oUser = self.db_session.query(
                                User
                            ).filter( 
                                User.id == user.id
                            ).first()  

        self.notFound(oUser)

        check_password = security.verify_password(payload['password'], oUser.password)
        if not check_password:
            return SendErrorResponse(
                message="Fail to verify current password ."
            ).send()
        
        check_previous_password = security.verify_password(payload['newpassword'], oUser.password)

        # new_password = payload['password']
        if check_previous_password or payload['newpassword'] == DEFAULT_PASSWORD:
            return SendErrorResponse(
                message="Password cannot be the same as previous/default password."
            ).send()
        
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$#*@&%])\S{8,32}$', payload['password']):
            return SendErrorResponse(
                message=(
                    "Password must contain at least one uppercase letter, "
                    "one lowercase letter, one digit, "
                    "one special character, have a minimum length of 8 characters, "
                    "and have a maximum length of 32 characters."
                )
            ).send()
        
        oUser.salt = security.generate_salt()
        generated_hash_password = security.get_password_hash(payload['newpassword'])
        oUser.password = generated_hash_password

        oUser.updatedAt = Moment().now
        oUser.passwordChangeRequired = False
        self.db_session.commit()

        return SendSuccessResponse(
            message  = "Password reset successfully."
        ).send()
    
    async def checkPasswordValidity(self, username: str):
        oUser = await self.getOne(username=username)
        updatedDate = oUser.updatedAt

        lastUpdate = Moment().now - updatedDate
        if lastUpdate.days >= 30:
            oUser.passwordChangeRequired = True
            self.db_session.commit()