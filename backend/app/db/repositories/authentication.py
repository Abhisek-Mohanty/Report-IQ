from datetime import timedelta
import secrets
import string
from typing import Any
from dateutil.relativedelta import relativedelta
from app.resources.helper.random import Random
from app.resources.helper import random
from app.resources.library.email.sns import SnsEmail
from starlette.exceptions import HTTPException
from app.resources.constant import *
from app.api.response.http_response import *
from app.core.config import  CLIENT_PATH, DEFAULT_PASSWORD, ENVIRONMENT, LOCKOUT_DURATION_MINUTES, LOGIN_THRESHOLD, SUPPORT_MAILID
import re

from app.db.errors import EntityDoesNotExist, UnauthorizedAccess
from app.db.repositories.base import BaseRepository

from app.resources.helper.moment import Moment
from app.resources.helper.common import *

from app.models.domain.db import *
from app.services import security
from app.services.authentication import check_email_is_taken, check_username_is_taken
from app.resources.constant import USER_CONTEXT


class AuthenticationRepository(BaseRepository):

    async def get_user_by_id(self, *, id: str, context : str):
        try:
            if id == "":
                raise ErrorResponse(400,"Invalid User id/Password")

            oModel = await self.getContextModel(context)
            if oModel is None:
                raise ErrorResponse(403, "Unauthorized Access. Try with valid portal.")
        
            user_row = self.db_session.query( oModel ).filter(
                            oModel.id == id
                        ).first()
            
            # print("#################################")
            # print(jsonable_encoder(user_row))
            if user_row and user_row.isDisabled == False:
                raise UnauthorizedAccess(403,"Unauthorized Access.")
            if user_row and user_row.isLocked == False:
                raise UnauthorizedAccess(403,"Your Account as been Suspended.")
            
            
            
            if user_row:
                oUserAuth = UserAuth( )
                oUserAuth.data(user_row,context)
                return oUserAuth
            
            raise EntityDoesNotExist("user does not exist")
        except Exception as error:
            print(str(error))
            raise UnauthorizedAccess(403,"Unauthorized Access.")
        
    async def get_user_by_sub(self, *, sub: str, payload:dict, context: str = "ReportIQ"):
        try:
            oModel = await self.getContextModel(context)
            if oModel is None:
                raise ErrorResponse(403, "Unauthorized Access. Try with valid portal.")
        
            user_row = self.db_session.query( oModel ).filter(
                            oModel.sub == sub
                        ).first()
            if user_row:
                oUserAuth = UserAuth( )
                oUserAuth.data(user_row,context)
                return oUserAuth
            else:
                now = Moment().now
                oUser = oModel(
                    emailId = getAttr(payload,"email",""),
                    modeType = MODE_LOGIN.GOOGLE.value,
                    planType= PLAN_TYPE.UNPAID.value,
                    firstName= getAttr(payload,"given_name",""),
                    lastName=getAttr(payload,"family_name",""),
                    fullName=getAttr(payload,"name",""),
                    sub=  getAttr(payload,"sub",""),
                    profilePic=getAttr(payload,"picture",""),
                    createdAt = now,
                    updatedAt= now
                )
                self.save(oUser)
                result = jsonable_encoder(oUser)
                self.db_session.commit()
                oUserAuth = UserAuth( )
                oUserAuth.data(result,context)
                return oUserAuth            
        except Exception as error:
            raise
            print(str(error))
            raise UnauthorizedAccess(403,"Unauthorized Access.")
   
    async def get_user_by_email(self, *, email: str, context : str, userId = None):
        try:
            if email == "":
                raise ErrorResponse(400,"Invalid User id/Password")

            oModel = await self.getContextModel(context)
            if oModel is None:
                raise ErrorResponse(403, "Unauthorized Access. Try with valid portal.")
        
            if context == USER_CONTEXT.CUSTOMER.value:
                if email:
                    user_row = self.db_session.query( oModel ).filter(
                                            oModel.email == email
                                        ).first()
                else:
                    user_row = self.db_session.query( oModel ).filter(
                                            oModel.id == userId
                                        ).first()
            else:
                user_row = self.db_session.query( oModel ).filter(
                                        oModel.emailId == email
                                    ).first()
                
            if user_row and context != USER_CONTEXT.CUSTOMER.value and user_row.isActive == False:
                raise UnauthorizedAccess(403,"Unauthorized Access.")
            
            if user_row:
                oUserAuth = UserAuth( )
                oUserAuth.data(user_row,context)
                return oUserAuth
            
            raise EntityDoesNotExist("user with email {0} does not exist".format(email))
        except Exception as error:
            raise EntityDoesNotExist("user with email {0} does not exist".format(email))
            
            
    async def getRole(self, role: int):
        role_row = None
        # if( role ):
        #     role_row = self.db_session.query( RBACRole ).filter(
        #                 RBACRole.id == role
        #             ).first()
        return role_row
    
    async def getOne(self, *, username: str, context: str):
        oModel = await self.getContextModel(context) 
    
        email_field = "emailId"

        oUser = self.db_session.query(oModel).filter(getattr(oModel, email_field) == username).first()
    
        self.notFound(oUser)
    
        if oUser and not oUser.isActive:
            raise UnauthorizedAccess(403, "Unauthorized Access.")
    
        return oUser

            
    async def user_login_attempt(self, user: Any, isWrongPassword: bool):
        try:
            oModel = await self.getContextModel(user.context)
            
            oUser = self.db_session.query(oModel).filter(oModel.id == user.id).first()
            self.notFound(oUser)
            
            # lockout_duration = datetime.timedelta(hours=LOCKOUT_DURATION_HOUR)
            lockout_duration = timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            if not oUser.lastLoginAt:
                oUser.lastLoginAt = Moment().now
            time_difference = Moment().now - oUser.lastLoginAt
            
            if not oUser.loginAttempts:
                oUser.loginAttempts = 0
                
            if isWrongPassword:
                if oUser.isLocked == 1:
                    if oUser.lastLoginAt and Moment().now - oUser.lastLoginAt < lockout_duration:
                        minutes_left = round((lockout_duration - time_difference).total_seconds() / 60)
                        return SendErrorResponse(
                            message  = f"Account blocked. Try again after {minutes_left} minutes."
                        ).send()
                    else:
                        oUser.loginAttempts = 0
                        oUser.isLocked = 0
                
                if oUser.loginAttempts <= LOGIN_THRESHOLD:
                    oUser.loginAttempts += 1
                    oUser.lastLoginAt = Moment().now
                    if oUser.loginAttempts >= LOGIN_THRESHOLD:
                        oUser.isLocked = 1
                    
                self.db_session.commit()
                return LOGIN_THRESHOLD - oUser.loginAttempts
            else:
                isLockedAccount = time_difference < lockout_duration and oUser.loginAttempts >= LOGIN_THRESHOLD
                if isLockedAccount:
                    minutes_left = round((lockout_duration - time_difference).total_seconds() / 60)
                    return SendErrorResponse(
                        message  = f"Account blocked. Try again after {minutes_left} minutes."
                    )
                    
                if int(Moment(oUser.lastLoginAt).format("%Y%m%d")) == int(Moment().format("%Y%m%d")):    
                
                    oUser.isLocked = 0
                    oUser.loginAttempts = 0
                    oUser.lastLoginAt = Moment().now
                    token = await self.getToken(oUser, user.context)
                    self.db_session.commit()
                    oPage = ""
                    # if user.context == "admin" or user.context == USER_CONTEXT.ADMIN.value:
                    #     oRole = self.db_session.query(
                    #                         RBACRole
                    #                     ).filter( 
                    #                         RBACRole.id == oUser.role
                    #                     ).first()  
                    #     if oRole:
                    #         oPage = oRole.landingPage
                        
                    
                    return { "token" : token , "landingPage" : oPage  }
                elif user.context == "admin" or user.context == USER_CONTEXT.ADMIN.value:
                #     oUser.loginSessionId = secrets.token_hex(20)
                #     oUser.loginOTP = Random().genOTP()
                #     oUser.otpValidTill = Moment().add(10,"M")    
                    
                #     self.db_session.commit()
                
                #     templateData = {
                #     "name": f'{oUser.firstName} {oUser.lastName}',
                #     "otp": f'<b>{str(oUser.loginOTP).strip().rjust(6, "0")}</b>',
                #     "validTill": f'{Moment(getLocalDateTime(oUser.otpValidTill)).format("%d %b, %Y, %H:%M:%S")} (10 Minutes)'
                #     }
                #     # oEmailTemplate = self.db_session.query(
                #     #                     Template
                #     #                 ).filter( 
                #     #                     Template.name == "LOGIN_OTP_EMAIL"
                #     #                 ).first()   
                #     # if oEmailTemplate and oUser.emailId:
                #     #     mailContent = oEmailTemplate.content % templateData
                #     #     await SnsEmail().sendEmail(
                #     #         addresses=[oUser.emailId],
                #     #         subject=(oEmailTemplate.subject or oEmailTemplate.name) ,
                #     #         content=mailContent,
                #     #         options={"sender" : SUPPORT_MAILID }
                #     #     )                
                #     # return { 
                #     #     'sessionId' : oUser.loginSessionId
                #     # }
                #     return { 
                #          "token" : token, 'sessionId' : oUser.loginSessionId
                #     }
                # else:
                    oUser.loginSessionId = secrets.token_hex(20)
                    oUser.loginAttempts = 0
                    oUser.lastLoginAt = Moment().now
                    self.db_session.commit()
                    token = await self.getToken(oUser, user.context)
                    return { 
                         "token" : token, 'sessionId' : oUser.loginSessionId
                    }
            
        except HTTPException:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
        
    async def forgetPassword(self, context, email: str):
        try:
            oModel = await self.getContextModel(context)
            oUser = await self.getOne(username=email, context=context)
            # oEmailTemplate = self.db_session.query(
            #                         Template
            #                     ).filter( 
            #                         Template.name == "RESET_USER_PASSWORD_EMAIL"
            #                     ).first()   
            # self.notFound(oEmailTemplate)

            token = secrets.token_hex(20)
            oUser.resetPasswordToken = token

            # characters = ''.join(random.sample(string.ascii_letters + string.digits + string.punctuation, 8)) + random.choice(string.digits) + random.choice(string.ascii_uppercase) + random.choice(string.punctuation)
            # pwd = ''.join(random.sample(characters, len(10)))

            # Set expiration time to 30 minutes from now
            oUser.resetPasswordExpires = Moment().add(30,"M")
            # oUser.resetPasswordExpires = Moment().add(10,"minute")
            self.db_session.commit()
                  
                    
            baseUrl = await self.getContextPath(context) + "/#/authentication/resetPassword/" + token
            # oBitly = await oTinyURLRepository.generateLinks(oUser, {"urls": [baseUrl]})

            templateData = {
                "fullName" : oUser.firstName + " " + oUser.lastName,
                # "resetLink" : oBitly['data'][0]['shortUrl']
                "resetLink" : baseUrl
            }

            # if oEmailTemplate and (getattr(oUser, "emailId", None) or getattr(oUser, "email", None)):
            #         mailContent = oEmailTemplate.content % templateData

            await SnsEmail().sendEmail(
                addresses = [getattr(oUser, "emailId", None) or getattr(oUser, "email", None)],
                subject='Reset Your Password at Techfino HRMS' ,
                content= "".join([
                                f"<div>Dear {oUser.firstName},</div><br>",
                                f"<div>Seems like you forget your password. If this is true, click below link to reset your password.</div>"
                                f"<div><br/>Link : <a href='{baseUrl}'>Reset My Password</a></div><br/><br/>"
                                "<div>Please ignore this mail if you have not initiated for resetting the password. </div>"
                              ]),
                options={"sender" : SUPPORT_MAILID }
            )
            return SendSuccessResponse(
                message  = "Request raised successfully, Please check your mail to reset password."
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
    
    async def valiDateOTP(self, payload, context):
        try:
            oModel = await self.getContextModel(context)
            oUser = self.db_session.query(
                                    oModel
                                ).filter( 
                                    oModel.loginSessionId == payload.get("sessionId",None)
                                ).first()  
            self.notFound(oUser)

            now = Moment().now
            # Check if resetPasswordExpires has expired
            if oUser.otpValidTill and oUser.otpValidTill < now:
                return SendErrorResponse(
                    message  = "Login OTP has expired, Try again."
                )
            
            if str(oUser.loginOTP).strip().rjust(6, '0') != str(payload["otp"]).strip().rjust(6, '0'):
                return SendErrorResponse(
                    message="Invalid Login OTP, Try again with valid OTP."
                )
            
            oUser.isLocked = 0
            oUser.loginAttempts = 0
            oUser.lastLoginAt = Moment().now
                        
            oPage = ""
            # if context == "admin" or context == USER_CONTEXT.ADMIN.value:
            #     oRole = self.db_session.query(
            #                         RBACRole
            #                     ).filter( 
            #                         RBACRole.id == oUser.role
            #                     ).first()  
            #     if oRole:
            #         oPage = oRole.landingPage
                
            class UserData(BaseModel):
                id : int 
                emailId : str 
            oUserObj = UserData( id = oUser.id, emailId = ( getAttr(oUser,"email") or getAttr(oUser,"emailId") ) )
            
            self.db_session.commit()
            
            token = await self.getToken(oUserObj, context)
            return SendSuccessResponse(
                message = "Login authentication successfull, Redirecting to home page.",
                data = { "token" : token , "landingPage" : oPage }
            )
        
        except HTTPException:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
            
    async def sendLoginOtp(self, payload):
        try:
            context = payload.get("context")
            oModel = await self.getContextModel(context)
            oUser = self.db_session.query(
                                    oModel
                                ).filter( 
                                    oModel.emailId == payload.get("email",None)
                                ).first()  
            self.notFound(oUser)

            otp = Random().genOTP()
            oUser.loginSessionId = payload.get("sessionId",None)
            oUser.loginOTP = otp
            oUser.otpValidTill = Moment().add(10,"M")                

            await SnsEmail().sendEmail(
                addresses = [getattr(oUser, "emailId", None) or getattr(oUser, "email", None)],
                subject = f'{otp} for Techfino HRMS Login.' ,
                content = "".join([
                                f"<div>Dear {oUser.firstName},</div><br>",
                                f"<div><strong>{otp}</strong> is OTP login OTP for account at Techfino HRMS and its valid for 10 minuts.</div>"
                                "<div>Please ignore this mail if you have not initiated for login.</div>"
                                ]),
                options={"sender" : SUPPORT_MAILID }
            )    

            self.db_session.commit()

            if ENVIRONMENT == "DEV":
                return SendSuccessResponse(
                    data = {
                        'sessionId' : oUser.loginSessionId,
                        'otp' : otp
                    }
                )          
            return SendSuccessResponse(
                data = {
                    'sessionId' : oUser.loginSessionId
                }
            )
        except HTTPException:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
            
    async def checkToken(self, token):
        try:
            oModel = User
            oUser = self.db_session.query(User).filter(
                oModel.resetPasswordToken == token
            ).first()

            self.notFound(oUser)

            if not oUser.resetPasswordExpires:
                return SendErrorResponse(
                    message="Invalid or expired password reset token."
                ).send()

            now = Moment().now
            if oUser.resetPasswordExpires < now:
                return SendErrorResponse(
                    message  = "Password reset link has expired"
                ).send()
           
            return SendSuccessResponse(
                data = { "status" : True }
            ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
            
    async def resetPassword(self, payload, token, context):
        try:
            oModel = await self.getContextModel(context)
            oUser = self.db_session.query(oModel).filter(
                oModel.resetPasswordToken == token
            ).first()

            self.notFound(oUser)

            if not oUser.resetPasswordExpires:
                return SendErrorResponse(
                    message="Invalid or expired password reset token."
                ).send()

            now = Moment().now
            if oUser.resetPasswordExpires < now:
                return SendErrorResponse(
                    message  = "Password reset link has expired"
                ).send()
            
            if payload['password'] == DEFAULT_PASSWORD:
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
            generated_hash_password = security.get_password_hash(payload['confirmPassword'])
            oUser.resetPasswordToken = None

            password_expiry_date = now + relativedelta(months=1)

            oUser.password = generated_hash_password
            oUser.resetPasswordExpires = password_expiry_date

            oUser.updatedAt = now
            self.db_session.commit()

            return SendSuccessResponse(
                message  = "Reset password successfully"
            ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
            
    async def changePassword(self, user, payload):
        try:
            oModel = await self.getContextModel(user.context)
            oUser = self.db_session.query(
                                    oModel
                                ).filter( 
                                    oModel.id == user.id
                                ).first()  

            self.notFound(oUser)

            password = getAttr(oUser,"password") or getAttr(oUser,"passkey")
            if password:
                check_previous_password = security.verify_password(payload.get("newpassword"), password)
                
                # new_password = payload['password']
                if check_previous_password or payload.get("password") == DEFAULT_PASSWORD:
                    return SendErrorResponse(
                        message = "Password cannot be the same as previous/default password."
                    ).send()
            
            
            if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$#*@&%])\S{8,32}$', payload.get("newpassword")):
                return SendErrorResponse(
                    message=(
                        "Password must contain at least one uppercase letter, "
                        "one lowercase letter, one digit, "
                        "one special character, have a minimum length of 8 characters, "
                        "and have a maximum length of 32 characters."
                    )
                ).send()
            
            if password and payload.get("password"):
                check_previous_password = security.verify_password(payload.get("password"), password)
            
                # new_password = payload['password']
                if not check_previous_password:
                    return SendErrorResponse(
                        message = "Invalid current password."
                    ).send()
                
            oUser.salt = security.generate_salt()
            generated_hash_password = security.get_password_hash(payload.get("newpassword"))
            
            if hasattr(oUser,"passkey"):
                oUser.passkey = generated_hash_password
            else:
                oUser.password = generated_hash_password

            oUser.updatedAt = Moment().now
            oUser.passwordChangeRequired = False
            oUser.resetPasswordExpires = Moment().add(1,"m")
            self.db_session.commit()

            return SendSuccessResponse(
                message  = "Password changed successfully."
            ).send()
        except HTTPException:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
    
            
    async def signup(self, payload):
        try:
            oUser = self.db_session.query(
                                    User
                                ).filter( 
                                    User.emailId == payload.get("email")
                                ).first()  

            if oUser:
                return SendErrorResponse(
                    message = "Email ID already registered."
                ).send()

            password = payload.get("password")
            if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$#*@&%])\S{8,32}$', payload.get("password")):
                return SendErrorResponse(
                    message=(
                        "Password must contain at least one uppercase letter, "
                        "one lowercase letter, one digit, "
                        "one special character, have a minimum length of 8 characters, "
                        "and have a maximum length of 32 characters."
                    )
                ).send()
            
            oUser = self.mapDataToModel(User(),payload)
            oUser.passwordChangeRequired = True
            oUser.emailId = payload.get("email")
            oUser.isActive = STATUS.ACTIVE.value
            oUser.isDisabled = 0
            oUser.isLocked = 0
            oUser.resetPasswordExpires = getAttr(payload,"resetPasswordExpires",Moment().add(30,"d"))
            
            oUser.salt = security.generate_salt()
            oUser.password = security.get_password_hash(password)

            self.save(oUser)
            self.db_session.commit()

            return SendSuccessResponse(
                message  = "User signup successfully."
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
    
    async def checkPasswordValidity(self, user, username: str):
        try:
            oModel = await self.getContextModel(user.context)
            oUser = await self.getOne(username=username, oModel= oModel)
            updatedDate = oUser.updatedAt

            lastUpdate = Moment().now > oUser.resetPasswordExpires
            if lastUpdate:
                oUser.passwordChangeRequired = True
                self.db_session.commit()
        except HTTPException:
            self.db_session.rollback()
            return SendErrorResponse(
                message = "Something went wrong"
            ).send()
            
    async def getContextModel(self, context):
        oModel = None
        # if str(context).lower() == "admin" or context == USER_CONTEXT.ADMIN.value:
        oModel = User
        
        if not oModel:
            raise EntityDoesNotExist(
                status_code=HTTP_400_BAD_REQUEST, detail="Context not found."
            )
        return oModel
    
    async def getContextPath(self, context):
        oPath = CLIENT_PATH
        return oPath
    
    async def getToken(self, user, context):
        return await genAuthToken(user=user,context=context)
           
    async def apiValidateUser(self, request, response):
        try:
            raise UnauthorizedAccess(403,"Unauthorized Access.")
                
            
        except HTTPException:
            self.db_session.rollback()
            raise UnauthorizedAccess(403,"Something went wrong")

    async def webhookValidateUser(self, request, response):
        try:
            raise UnauthorizedAccess(403,"Unauthorized Access.")
            
        except HTTPException:
            self.db_session.rollback()
            raise UnauthorizedAccess(403,"Something went wrong")

         
class UserAuth():
    id : int = None
    emailId: str = ""
    firstName : str = None
    lastName : str = None
    sub : str = None
    modeType : str = None
    profilePic : str = None
    fullName : str = None




    def data(self, data : any, context : any):
        try:
            data = jsonable_encoder(data)
            self.context = context
            self.id = data.get("id")
            self.emailId = data.get("emailId") or data.get("email") 
            self.firstName = data.get("firstName")
            self.lastName = data.get("lastName")
            self.sub = data.get("sub")
            self.modeType = data.get("modeType")
            self.profilePic = data.get("profilePic")
            self.fullName = data.get("fullName")

        except Exception as error:
            # raise error
            pass
   
    def check_password(self, password: str) -> bool:
        # print("##############################################################")
        # print(password)
        # generated_hash_password = security.get_password_hash(password)
        # print(generated_hash_password)        
        return True
        return security.verify_password(password, self.hashed_password)
