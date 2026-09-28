import secrets
from typing import Any
from app.resources.constant import STATUS
from sqlalchemy import or_
from sqlalchemy.orm import load_only, contains_eager, joinedload
from starlette.exceptions import HTTPException
import re

from app.api.response.http_response import SendErrorResponse, SendExportResponse, SendSuccessResponse

from app.resources.helper.common import *
from app.db.repositories.base import BaseRepository
from app.resources.helper.moment import Moment
from app.db.repositories.base import BaseRepository
from app.core.config import DEFAULT_PASSWORD
from app.services import security
from app.resources.library.S3.index import s3Bucket

from app.models.domain.db import *
from fastapi.encoders import jsonable_encoder

class UsersRepository(BaseRepository):  

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
        
    async def getById(self, user , id: int):
        try:
            oUser = self.db_session.query(
                            User
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


    async def getList(self, user, paggination, filter):
        try:
            filter["userId"] = user.id
            if filter.get("export"):
                return await self.exportToExcel(filter)
            else:
                oData = self._getList(paggination, filter)
                return SendSuccessResponse(
                    data = await oData
                )
        except HTTPException as error:
            raise error 

    async def exportToExcel(self, filter):
        try:
            oData = list(map(lambda item: {
                "employeeId"     : item.employeeId,
                "name"          : f'{item.firstName} {item.lastName}',
                "email"         : item.emailId,
                "mobile"        : item.mobile,
                "status"        : item.status if item.status else "",
                "dob"           : item.dob,
                
                "createdBy"     : item.CreatedBy.firstName + " " + item.CreatedBy.lastName,
                "createdAt"     : Moment(item.createdAt).format()
            }, await self._getList({} , filter) ))

            oHeader = {
                "employeeId"    : "Employee Id",
                "name"          : "Employee Name",
                "email"         : "Email",
                "mobile"        : "Mobile",
                "status"        : "Status",
                "dob"           : "Date of Birth",
                
                "createdBy"        : "Created By",
                "createdAt"        : "Created At"
            }
            return SendExportResponse(
                header = oHeader,
                data = oData
            )
        except HTTPException as error:
            raise error 
        
    async def _getList(self, paggination, filter ):
        try:
            (limit , offset) = self.getPaggination(paggination)

            queryBuilder = self.db_session.query( 
                    User
                )

            filters = [ ]
               
            if getAttr(filter,"name") != None:
                filters.append( *self.parseInput( User.firstName     , getAttr(filter,"name") ) )
                filters.append( *self.parseInput( User.lastName     , getAttr(filter,"name") ) )
               
            if getAttr(filter,"employeeId") != None:
                filters.append( *self.parseInput( User.employeeId         , getAttr(filter,"employeeId") ) )
               
            if getAttr(filter,"email") != None:
                filters.append( *self.parseInput( User.email         , getAttr(filter,"email") ) )
               
            if getAttr(filter,"mobile") != None:
                filters.append( *self.parseInput( User.mobile        , getAttr(filter,"mobile") ) )
               
            if getAttr(filter,"status") != None:
                filters.append( User.status == getAttr(filter,"status") )
                        
            if filter["search"] != None and filter["searchField"] != None: 
            
                if filter["searchField"] == "name":
                    filters.append( or_( 
                                        *self.parseInput( User.firstName         , getAttr(filter,"search") ),
                                        *self.parseInput( User.lastName         , getAttr(filter,"search") )
                                    ).self_group() )
            
                if filter["searchField"] == "email":
                    filters.append( *self.parseInput( User.emailId        , getAttr(filter,"search") ) )
                
                if filter["searchField"] == "employeeId":
                    filters.append( *self.parseInput( User.employeeId        , getAttr(filter,"search") ) )
            
                if filter["searchField"] == "mobile":
                    filters.append( *self.parseInput( User.mobile          , getAttr(filter,"search") ) )
                        
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(
                        *filters
                    ).order_by( 
                        User.id.desc()
                    ).limit(
                        limit
                    ).offset(
                        offset
                    ).all()
            else:
                oData = queryBuilder.filter(
                            *filters
                        ).order_by(
                            User.id.desc()
                        ).all()
                
            return oData
        except HTTPException as error:
            raise error 

    async def updatePassword(self, user, payload):
        try:
            oUser = self.db_session.query(
                            User
                        ).filter(
                            User.id != payload.get("id")
                        ).first()
            
            if payload.get("newpassword"):
                oUser.salt = security.generate_salt()
                generated_hash_password = security.get_password_hash(payload['newpassword'])
                oUser.password = generated_hash_password
                self.db_session.commit()

            return SendSuccessResponse(
                    data = oUser,
                    message = "User Password updated."
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
        
    async def updateUser(self, user, payload):
        try:
            if payload.get("id"):
                oUser = self.db_session.query(
                            User
                        ).filter(
                            User.emailId == payload.get("emailId"),
                            User.id != payload.get("id")
                        ).first()
                if oUser:
                    return SendErrorResponse(
                        message = "Email address already exist."
                    ).send()
                
                oUser = self.db_session.query(
                            User
                        ).filter(
                            User.id == payload.get("id")
                        ).first()
                oUser = self.mapDataToModel(oUser, payload, user= user) 
                   
            else:
                oUserData = self.mapDataToModel(User(), payload, user= user)
                oUserData.salt = security.generate_salt()
                generated_hash_password = security.get_password_hash("TechfinoHRMS@123")
                oUserData.password = generated_hash_password


                oUserData.isActive = STATUS.ACTIVE.value
                oUserData.isDisabled = STATUS.INACTIVE.value
                oUserData.isLocked = STATUS.INACTIVE.value
                oUserData.updatedAt = Moment().now
                oUserData.passwordChangeRequired = False
                
                oUserData = self.save(oUserData)
                oUser = jsonable_encoder(oUserData)

            self.db_session.commit()

            return SendSuccessResponse(
                    data = oUser,
                    message = "User detail updated."
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
    