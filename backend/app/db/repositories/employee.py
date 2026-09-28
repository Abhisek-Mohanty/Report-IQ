import io
import secrets
from typing import Any
from sqlalchemy import or_
from starlette.exceptions import HTTPException
from sqlalchemy.orm import load_only, contains_eager, joinedload
import re

from app.api.response.http_response import SendErrorResponse, SendExportResponse, SendSuccessResponse

from app.resources.helper.common import *
from app.db.repositories.base import BaseRepository
from app.resources.helper.moment import Moment
from app.core.config import CLIENT_PATH, DEFAULT_PASSWORD, SUPPORT_MAILID, HR_SUPPORT_MAIL, VERIFICATION_LINK_VALID_DAYS
from app.resources.constant import EMPLOYEEMENT_STATUS, STATUS, VERIFCATION_TYPE
from app.services import security
from app.resources.library.S3.index import s3Bucket
from app.resources.library.email.sns import SnsEmail
from app.resources.library.msme.msme import MSME
from fastapi.encoders import jsonable_encoder

from app.models.domain.db import *

class EmployeeRepository(BaseRepository):  

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
                "name"          : f'{item.firstName} {item.lastName}',
                "email"         : item.email,
                "mobile"        : item.mobile,
                "status"        : item.status if item.status else "",
                "dob"           : item.dob,
                "joiningDate"   : item.joiningDate,
                "exitDate"      : item.exitDate,
                "departments"   : ("").join(item.departments) if item.departments else "",
                
                "createdBy"     : item.CreatedBy.firstName + " " + item.CreatedBy.lastName,
                "createdAt"     : Moment(item.createdAt).format()
            }, await self._getList({} , filter) ))

            oHeader = {
                "name"          : "Employee Name",
                "email"         : "Email",
                "mobile"        : "Mobile",
                "status"        : "Status",
                "dob"           : "Date of Birth",
                "joiningDate"   : "Joining Date",
                "ExitDate"      : "Exit Date",
                "departments"   : "Departments",
                
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
                    Employee
                ).options(
                    joinedload(
                        Employee.CreatedBy
                    ).options(load_only(*["id","emailId","firstName","lastName"]))
                )

            filters = [ ]
               
            if getAttr(filter,"type") != None:
                if getAttr(filter,"type") == "onboarding":
                    filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_BOARDING.value )
                elif getAttr(filter,"type") == "onnotice":
                    filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_NOTICE.value )
                elif getAttr(filter,"type") == "active":
                    filters.append( Employee.status == EMPLOYEEMENT_STATUS.ACTIVE.value )
                elif getAttr(filter,"type") == "terminated":
                    filters.append( Employee.status == EMPLOYEEMENT_STATUS.TERMINATED.value )


            if getAttr(filter,"name") != None:
                filters.append( *self.parseInput( Employee.firstName     , getAttr(filter,"name") ) )
                filters.append( *self.parseInput( Employee.lastName     , getAttr(filter,"name") ) )
               
            if getAttr(filter,"employeeId") != None:
                filters.append( *self.parseInput( Employee.employeeId         , getAttr(filter,"employeeId") ) )
               
            if getAttr(filter,"email") != None:
                filters.append( *self.parseInput( Employee.emailId         , getAttr(filter,"email") ) )
               
            if getAttr(filter,"mobile") != None:
                filters.append( *self.parseInput( Employee.mobile        , getAttr(filter,"mobile") ) )
               
            if getAttr(filter,"status") != None:
                filters.append( Employee.status == getAttr(filter,"status") )
                        
            if filter["search"] != None and filter["searchField"] != None: 
            
                if filter["searchField"] == "name":
                    filters.append( or_( 
                                        *self.parseInput( Employee.firstName         , getAttr(filter,"search") ),
                                        *self.parseInput( Employee.lastName         , getAttr(filter,"search") )
                                    ).self_group() )
            
                if filter["searchField"] == "employeeId":
                    filters.append( *self.parseInput( Employee.employeeId        , getAttr(filter,"search") ) )

                if filter["searchField"] == "email":
                    filters.append( *self.parseInput( Employee.emailId        , getAttr(filter,"search") ) )
            
                if filter["searchField"] == "mobile":
                    filters.append( *self.parseInput( Employee.mobile          , getAttr(filter,"search") ) )
                        
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(
                        *filters
                    ).order_by( 
                        Employee.id.desc()
                    ).limit(
                        limit
                    ).offset(
                        offset
                    ).all()
            else:
                oData = queryBuilder.filter(
                            *filters
                        ).order_by(
                            Employee.id.desc()
                        ).all()
                
            return oData
        except HTTPException as error:
            raise error 

    
    async def getDetail(self, user, id):
        try:
                       
            oUser = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeePAN)                 
                    ).options(
                        joinedload(Employee.EmployeeKYC)                 
                    ).options(
                        joinedload(Employee.EmployeeDoc)                 
                    ).options(
                        joinedload(
                            Employee.CreatedBy
                        ).options(
                            load_only(*["id","emailId","firstName","lastName"])
                        )
                    ).filter(
                        Employee.id == id
                    ).first()
            
            self.notFound(oUser)
    
            oS3Bucket = s3Bucket()
            if oUser.profilePic:
                oUser.profilePicURL = await oS3Bucket.getSignedURL(oUser.profilePic)
                oUser.profilePicURL = oUser.profilePicURL["url"]
        
            return SendSuccessResponse(
                    data = oUser
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )
         
    async def modify(self, user, payload):
        try:
            
            if payload.get("id"):
                oUser = self.db_session.query(Employee).filter(Employee.id == payload.get("id")).first()
                self.notFound(oUser)
    
                oExistingUser = self.db_session.query(
                            Employee
                        ).filter(
                            Employee.emailId == payload.get("emailId"),
                            Employee.id != payload.get("id")
                        ).first()
                if oExistingUser:
                    return SendErrorResponse(
                        message = "Duplicate email ID, fail to save detail."
                    ).send()  
                  
                oUser = self.mapDataToModel(oUser, payload, user= user)
            else:
                oUser = self.db_session.query(
                            Employee
                        ).filter(
                            Employee.emailId == payload.get("emailId")
                        ).first()
                if oUser:
                    return SendErrorResponse(
                        message = "Duplicate email ID, fail to save detail."
                    ).send()    
                
                oUser = self.mapDataToModel(Employee(), payload, user= user)

                oUser = self.save(oUser)
            
            self.db_session.commit()

            return SendSuccessResponse(
                    data = oUser,
                    message = "Employee detail updated."
                ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
        
    async def bulkVerification(self, user, payload):
        try:
            oUsers = self.db_session.query(
                            Employee
                        ).options(
                            load_only(*["id","employeeId"])
                        ).filter(
                            Employee.verificationStatus.notin_([VERIFCATION_TYPE.FAILED.value,
                                                                VERIFCATION_TYPE.INITATE.value,
                                                                VERIFCATION_TYPE.VERIFIED.value])
                        ).all()
            oData = []
            jsonable_encoder()
            for item in oUsers:
                payload = {'id':0}
                oEmp = {'id': 0, 'employeeId':'', 'reason':'' , 'error':False}
                payload["id"] = item.id
                oEmp["id"] = item.id
                oEmp["employeeId"] = item.employeeId

                try:
                    oResponse = await self.initiateVerification(user,payload)
                    if oResponse:
                       oEmp["reason"] = getAttr(oResponse,'message',"Unknown")
                       oEmp["error"] = getAttr(oResponse,'error',None)
                       oData.append(oEmp)
                       continue
                    else:
                       oEmp["reason"] = "Unknown Reason found."
                       oEmp["error"] = False 
                       oData.append(oEmp)
                       continue

                except Exception as error:
                    oEmp["reason"] = error
                    oEmp["error"] = False
                    oData.append(oEmp)
                    continue
            
            return SendSuccessResponse(
                data= oData
            )

        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )
        
    async def initiateVerification(self, user, payload):
        try:
            
            oUser = self.db_session.query(Employee).filter(Employee.id == payload.get("id")).first()
            self.notFound(oUser)
    
            if not oUser.personalEmail:
                return SendErrorResponse(
                    message = "Employee personal mail ID is not available, fail to initiate process link."
                ).send()    

            if oUser.verificationStatus == VERIFCATION_TYPE.VERIFIED.value:
                return SendErrorResponse(
                    message = "Employee already verfied."
                ).send()    


            token = secrets.token_hex(20)
            if oUser.tokenValidTill and oUser.tokenValidTill > Moment().now:
                token = oUser.verificationToken
                
            oUser.verificationToken = token
            oUser.verificationStatus = VERIFCATION_TYPE.INITATE.value
            oUser.status = EMPLOYEEMENT_STATUS.ON_BOARDING.value

            # Set expiration time to 1 Day from now
            oUser.tokenValidTill = Moment().add( VERIFICATION_LINK_VALID_DAYS ,"D")
            
            self.db_session.commit()
                  
                    
            baseUrl = CLIENT_PATH + "/#/verification/" + token
            
            await SnsEmail().sendEmail(
                addresses = [getattr(oUser, "personalEmail", None)],
                subject='Employee Verification Process at Techfino Capital' ,
                content= "".join([
                                f"<div>Dear {oUser.firstName} {oUser.lastName},</div>",
                                f"<div><br/>On behalf of the entire team, welcome to Techfino Capital! We're thrilled to have you on board! 🎉</div>", 
                                f"<div><br/>To help you get started, here's a verification link to setting up your profile at techfino 👇 </div>",
                                f"<div style='text-align:center;'><br/><a href='{baseUrl}' style='font-size:20px;'><button style='padding: 5px 10px; border-radius: 3px; background: blue; color : #FFF;'>Start Process</button></a>",
                                f"<div></br><br/> <strong>OR Use below Link</strong></div><br/>",
                                f"<strong>{baseUrl}</strong></div>",
                                f"<div><br/><strong>Note:</strong> Need a hand? Our support team is always ready to help. Just reach out to <strong>{HR_SUPPORT_MAIL}</strong>, and we'll guide you through every step.</div>",
                                f"<div><br/>To help you complete process quickly, here are a few things you can keep handy before you start:</div>",
                                f"<div><strong><ul><li>AADHAR Card</li>",
                                f"<li>PAN Card</li>",
                                f"<li>Address Proof</li></ul></strong></div>",
                                f"<div>We can't wait to see what you achieve with TechFino Capital. Let's make your first experience amazing with us!</div>", 
                                f"<div><br/><br/><strong>Cheers,</div>",
                                f"<div>Techfino HR Team</strong></div>"
                              ]),
                options={"sender" : SUPPORT_MAILID }
            )
            return SendSuccessResponse(
                message  = "Request send successfully, Please inform employee to check his personal mail to start process."
            ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
        
    async def getVerificationDetail(self, token, payload):
        try:
            oUser = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeePAN)                 
                    ).options(
                        joinedload(Employee.EmployeeKYC)                 
                    ).options(
                        joinedload(Employee.EmployeeDoc)                 
                    ).filter(
                        Employee.verificationToken == token
                    ).first()
            self.notFound(oUser)
    
            if not oUser.tokenValidTill or oUser.tokenValidTill < Moment().now:
                return SendErrorResponse(
                    message = "Link expired or invalid, fail to start process."
                ).send()    
            return SendSuccessResponse(
                data = oUser

            ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
        
    async def update(self, payload):
        try:
            
            oUser = self.db_session.query(
                        Employee
                    ).filter(
                        Employee.id == payload.get("employeeId")
                    ).first()
            self.notFound(oUser)
    
            if not oUser.tokenValidTill or oUser.tokenValidTill < Moment().now:
                return SendErrorResponse(
                    message = "Link expired or invalid, fail to start process."
                ).send() 

            oReturnData = {}
            if payload.get("process") == "pan":
                oEmployeePANs = oUser.EmployeePAN
                for oEmployeePAN in oEmployeePANs:
                    if oEmployeePAN.panNumber == payload.get("panNumber"):
                        oEmployeePAN.panNumber = payload.get("panNumber").upper()
                        oEmployeePAN.fullName = payload.get("fullName")
                        oEmployeePAN.panDocument = payload.get("panDocument")
                        oEmployeePAN.isValid = STATUS.ACTIVE.value
                        oReturnData = jsonable_encoder(oEmployeePAN)

            if payload.get("process") == "ekyc":
                oEmployeeKYCs = oUser.EmployeeKYC
                for oEmployeeKYC in oEmployeeKYCs:
                    
                    if oEmployeeKYC.eKycRequestId == payload.get("digio_doc_id"):
                        oDigio = Digio( ) 
                        oDigioEkycResponse = await oDigio.getEkycResponse(payload.get("digio_doc_id"))
                        
                        customerDetails = oDigioEkycResponse.get("actions",[{}])[0].get("details",{}).get("aadhaar",{})
                        oEmployeeKYC.name = customerDetails.get("name")
                        oEmployeeKYC.idNumber = customerDetails.get("id_number")
                        oEmployeeKYC.documentType = customerDetails.get("document_type")
                        oEmployeeKYC.gender = "Male" if customerDetails.get("gender") == "M" else "Female"
                        oEmployeeKYC.dob = Moment(customerDetails.get("dob"),"%d/%m/%Y").now if customerDetails.get("dob") else None
                        oEmployeeKYC.image=  customerDetails.get("image")
                        oEmployeeKYC.currentAddress = customerDetails.get("current_address_details",{}).get("address")
                        oEmployeeKYC.currentDistrictOrCity = customerDetails.get("current_address_details",{}).get("district_or_city")
                        oEmployeeKYC.currentLocalityOrPostOffice = customerDetails.get("current_address_details",{}).get("locality_or_post_office")
                        oEmployeeKYC.currentPincode = customerDetails.get("current_address_detail",{}).get("pincode")
                        oEmployeeKYC.currentState = customerDetails.get("current_address_details",{}).get("state")
                        oEmployeeKYC.permanentAddress = customerDetails.get("permanent_address_details",{}).get("address")
                        oEmployeeKYC.permanentDistrictOrCity = customerDetails.get("permanent_address_details",{}).get("district_or_city")
                        oEmployeeKYC.permanentLocalityOrPostOffice = customerDetails.get("permanent_address_details",{}).get("locality_or_post_office")
                        oEmployeeKYC.permanentPincode = customerDetails.get("permanent_address_details",{}).get("pincode")
                        oEmployeeKYC.permanentState = customerDetails.get("permanent_address_details",{}).get("state")
                        
                        oEmployeeKYC.kycDetail = json.dumps(oDigioEkycResponse)
                        oEmployeeKYC.eKycStatus = oDigioEkycResponse.get("status")
                        if  ( oEmployeeKYC.eKycStatus == "completed" or
                                oEmployeeKYC.eKycStatus == "approval_pending" ):
                            oEmployeeKYC.isValid = STATUS.ACTIVE.value
                        else:
                            oEmployeeKYC.isValid = STATUS.INACTIVE.value

                        oReturnData = jsonable_encoder(oEmployeeKYC)
            self.db_session.commit()

            return SendSuccessResponse(
                message = "Detail Updated.",
                data = oReturnData
            ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 

    async def verifyPanNumber(self, payload):
        try:
            oUser = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeePAN)                 
                    ).filter(
                        Employee.id == payload.get("id")
                    ).first()
            self.notFound(oUser)

            if len(oUser.EmployeePAN) > 3:
                return SendErrorResponse(
                    message = "PAN verification limit exceeded."
                ).send()
            
            if not oUser.tokenValidTill or oUser.tokenValidTill < Moment().now:
                return SendErrorResponse(
                    message = "Link expired or invalid, fail to start process."
                ).send()  

            oPanExists = self.db_session.query(
                            EmployeePAN
                        ).filter(
                            EmployeePAN.panNumber == payload.get("pan")
                        ).first()
            if oPanExists:
                return SendSuccessResponse(
                    data = oPanExists
                ).send()
            
            oPanVerify = Digio( ) 
            oData = await oPanVerify.verify(payload["pan"])
            if oData.get("error"):
                return SendErrorResponse(
                    message = oData.get("message")
                ).send()  

            else: 
                oPanExists = EmployeePAN()
                oPanExists.panNumber = payload.get("pan").upper()
                oPanExists.fullName = oData.get("full_name")
                oPanExists.employeeId = payload.get("id")
                oPanExists.isValid = STATUS.ACTIVE.value if oData.get("status") == 'VALID' else STATUS.INACTIVE.value
                oPanExists.createdAt = Moment().now
                oPanExists.updatedAt = Moment().now

                oPanExists = self.save(oPanExists)
                oPanData = jsonable_encoder(oPanExists)
                self.db_session.commit()
                oPanExists = oPanData

                return SendSuccessResponse(
                    data = oPanExists
                ).send()
            
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )

    
    async def initiateeKycRequest(self, payload):
        try:
            oUser = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeeKYC)                 
                    ).filter(
                        Employee.id == payload.get("id")
                    ).first()
            self.notFound(oUser)
    
            if not oUser.tokenValidTill or oUser.tokenValidTill < Moment().now:
                return SendErrorResponse(
                    message = "Link expired or invalid, fail to start process."
                ).send()  

            oExists = self.db_session.query(
                            EmployeeKYC
                        ).filter(
                            EmployeeKYC.employeeId == payload.get("id"),
                            or_(
                                EmployeeKYC.eKycStatus == "completed",
                                EmployeeKYC.eKycStatus == "approval_pending"
                            ).self_group()
                        ).first()
            if oExists:
                return SendSuccessResponse(
                    message = "KYC already completed.",
                    data = oExists
                ).send()
            
            oExists = self.db_session.query(
                            EmployeeKYC
                        ).filter(
                            EmployeeKYC.employeeId == payload.get("id"),
                            EmployeeKYC.eKycStatus == "requested"
                        ).first()
            if oExists:
                return SendSuccessResponse(
                    data = oExists
                ).send()
    
            oEmployeeKYC = {}
            oPanVerify = Digio( ) 
            oData = await oPanVerify.sendEkycRequest(oUser)
            if oData == False or oData.get("error"):
                return SendErrorResponse(
                    message = oData.get("message")
                ).send()  
            else:
                oEmployeeKYC = EmployeeKYC()
                oEmployeeKYC.employeeId = payload.get("id")
                oEmployeeKYC.eKycRequestId = oData.get("id")
                oEmployeeKYC.eKycStatus = oData.get("status")
                oEmployeeKYC.eKycAccessTokenId = oData.get("access_token",{}).get("id")
                oEmployeeKYC.createdAt = Moment().now
                oEmployeeKYC.updatedAt = Moment().now

                oEmployeeKYC = self.save(oEmployeeKYC)
                self.db_session.commit()

                oEmployeeKYC = {}
                oEmployeeKYC["eKycRequestId"] = oData.get("id")
                oEmployeeKYC["eKycStatus"] = oData.get("status")
                oEmployeeKYC["eKycAccessTokenId"] = oData.get("access_token",{}).get("id")
                
            return SendSuccessResponse(
                data = oEmployeeKYC
            ).send()
    
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
         
    async def initiateCrimeCheck(self, payload):
        try:
            oUser = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeePAN)                 
                    ).options(
                        joinedload(Employee.EmployeeKYC)                 
                    ).filter(
                        Employee.id == payload.get("id")
                    ).first()
            self.notFound(oUser)
    
            if not oUser.tokenValidTill or oUser.tokenValidTill < Moment().now:
                return SendErrorResponse(
                    message = "Link expired or invalid, fail to start process."
                ).send()  

            oExists = self.db_session.query(
                            CrimeCheck
                        ).filter(
                            CrimeCheck.employeeId == payload.get("id"),
                            CrimeCheck.status == STATUS.ACTIVE.value
                        ).first()
            if oExists:
                return SendSuccessResponse(
                    message = "Crime check already completed.",
                    data = {}
                ).send()
            
            oEmployeePAN = None
            for oItem in oUser.EmployeePAN:
                if oItem.isValid:
                    oEmployeePAN = oItem
                    break

            oEmployeeKYC = None
            currentAddress = None
            for oItem in oUser.EmployeeKYC:
                if oItem.eKycStatus == "completed" or oItem.eKycStatus == "approval_pending":
                    oEmployeeKYC = oItem
                    currentAddress = "".join([ 
                                    oEmployeeKYC.permanentAddress,
                                    oEmployeeKYC.permanentDistrictOrCity,
                                    oEmployeeKYC.permanentLocalityOrPostOffice,
                                    oEmployeeKYC.permanentPincode,
                                    oEmployeeKYC.permanentState])
                    break
                        

            if not oEmployeePAN or not oEmployeeKYC:
                return SendErrorResponse(message="Request Initiation Failed, Data missing.!").send()
            
            userDetails = {
                "fullName" : oEmployeeKYC.name,
                "fatherName" : "",
                "dob" : oUser.dob,
                "panNumber" : oEmployeePAN.panNumber if oEmployeePAN is not None else None,
                "address" : currentAddress if oEmployeeKYC is not None else None
            }
            
            oCrimeChecks = CrimeChecks()
            oCrimeCheckresponse = await oCrimeChecks.initiateRequest(userDetails)
            
            if oCrimeCheckresponse.get("status") == "OK":
                request_id = oCrimeCheckresponse.get("requestId")
                request_time = oCrimeCheckresponse.get("requestTime")
                status = oCrimeCheckresponse.get("status")

                oCrimeCheck = CrimeCheck(
                    employeeId = payload.get("id"),
                    requestId=request_id,
                    requestTime=request_time,
                    status=status,
                    completeReponse=json.dumps(oCrimeCheckresponse),
                    createdAt=Moment().now,
                    updatedAt=Moment().now
                )

                
                self.save(oCrimeCheck)
                self.db_session.commit()

                return SendSuccessResponse(
                    message = "Detail Updated"
                ).send()
            else:
                return SendErrorResponse(message="Request Initiation Failed.!").send()
            
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
         
    async def requestReport(self, payload):
        try:
            oUser = self.db_session.query(
                        Employee
                    ).filter(
                        Employee.id == payload.get("id")
                    ).first()
            
            self.notFound(oUser, "Employee detail not found.")
            
            oCrimeCheck = self.db_session.query(CrimeCheck).filter(
                CrimeCheck.employeeId == oUser.id,
                CrimeCheck.requestId == payload.get("requestId")
            ).first()
            self.notFound(oCrimeCheck)

            if oCrimeCheck.fileName:
                return SendSuccessResponse(
                    data = {"filename" : oCrimeCheck.fileName}
                ).send()
            
            oCrimeChecks = CrimeChecks()
            pdf_content = oCrimeChecks.getCrimeCheckPdf(oCrimeCheck.requestId)
            if not pdf_content:
                return SendErrorResponse(message="Unable to fetch crime report.").send()

            file_name = "CrimeCheckReport_" + payload.get("requestId") + ".pdf"

            pdfBytes = io.BytesIO(pdf_content)
            oS3Bucket = s3Bucket()
            fileName = await oS3Bucket.upload(
                pdfBytes, "hrms/document", file_name, True, True
            )
            oCrimeCheck.fileName = fileName.filename
            self.db_session.commit()

            return SendSuccessResponse(
                data = fileName
            ).send()
        
        except Exception as error:
            self.db_session.rollback()
            return SendErrorResponse(message=str(error)).send()
    
    async def updateDoc(self, user, payload):
        try:
            
            oEmployeeDoc = EmployeeDoc()
            now = Moment().now
            oEmployeeDoc.employeeId      = getAttr(payload,"employeeId",None)
            oEmployeeDoc.documentType    = getAttr(payload,"documentType",None)
            oEmployeeDoc.title           = getAttr(payload,"title",None)
            oEmployeeDoc.remark          = getAttr(payload,"remark",None)
            oEmployeeDoc.documentPath    = getAttr(payload,"documentPath",None)
            
            oEmployeeDoc.updatedBy       = user.id
            oEmployeeDoc.updatedAt       = now
            oEmployeeDoc.createdBy       = user.id
            oEmployeeDoc.createdAt       = now
            
            oEmployeeDoc = self.save(oEmployeeDoc)
                
            self.db_session.commit()

            return SendSuccessResponse(
                data = "Document updated"
            ).send()
    
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )      
    
    async def syncWithSystem(self, user, payload):
        try:
            
            oEmployee = self.db_session.query(
                        Employee
                    ).options(
                        joinedload(Employee.EmployeePAN)                 
                    ).filter(
                        Employee.id == payload.get("id")
                    ).first()
            self.notFound(oEmployee)
    
            oMSME = MSME()

            oData = {
                "employeeId"      : oEmployee.employeeId,
                "firstName"       : oEmployee.firstName,
                "lastName"        : oEmployee.lastName,
                "position"        : oEmployee.position,
                "emailId"         : oEmployee.emailId,
                "mobile"          : oEmployee.mobile,
                "status"          : oEmployee.status,
                "alternateEmailId"   : oEmployee.personalEmail,
                "dob"             : getDateObject( Moment(oEmployee.dob,"%Y-%m-%d").now ) if Moment(oEmployee.dob,"%Y-%m-%d").now else None,
                "gender"          : oEmployee.gender, 
                "profilePic"      : oEmployee.profilePic,
                "address"         : oEmployee.address,
                "department"      : oEmployee.department, 
                "dateOfJoining"   : getDateObject( Moment(oEmployee.joiningDate).now ) if Moment(oEmployee.joiningDate).now else None,
                "dateOfExit"   : getDateObject( Moment(oEmployee.exitDate).now ) if Moment(oEmployee.exitDate).now else None
            }

            for oItem in oEmployee.EmployeePAN:
                if oItem.isValid:
                    oData["panNumber"] = oItem.panNumber
                    break

            oResponse = await oMSME.pushToMsme(oData)
            if oResponse:
                if oResponse.get("errorType"):
                    return SendErrorResponse(
                        message = oResponse.get("message")
                    ).send()
                else:
                    return SendSuccessResponse(
                        message = oResponse.get("message"),
                        data = oResponse.get("data")
                    ).send()

            return SendErrorResponse(
                message = "Fail to process request."
            ).send()
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )      
    
    async def getSigneURL(self, payload):
        try:
            oS3Bucket = s3Bucket()
            fileName = await oS3Bucket.getSignedURL(filename=payload.get("path"))
            return SendSuccessResponse(
                data = fileName
            ).send()
    
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            ) 
         
    async def uploadDocument(self, payload, file):
        try:
            oS3Bucket = s3Bucket()
            fileSource = file
            
            if not file.filename.lower().endswith( ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif','.heic', '.mpga', '.mpeg','.pdf','.doc') ):
                return SendErrorResponse(
                    message = "Invalid file format"
                )
            
            isHeic = file.filename.lower().endswith(('.heic'))
            if isHeic:
                file.filename = file.filename.replace(".heic",".jpeg")
    
            fileName = ""
            fileName = await oS3Bucket.upload(fileSource,"hrms/emp-"+payload.get("id"),file.filename)
            
            return SendSuccessResponse(
                data = fileName
            ).send()
    
        except Exception as error:
            return SendErrorResponse(
                message = str(error)
            )  