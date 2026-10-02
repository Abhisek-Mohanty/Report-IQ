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
from app.db.repositories.base import BaseRepository
from app.core.config import CLIENT_PATH, DEFAULT_PASSWORD, SUPPORT_MAILID, HR_SUPPORT_MAIL, VERIFICATION_LINK_VALID_DAYS
from app.resources.constant import ASSET_TYPE,ASSET_STATUS, EMPLOYEEMENT_STATUS, STATUS, VERIFCATION_TYPE, ASSET_STATUS_TYPE, ASSIGN_STATUS_TYPE, MAINTAINCE_STATUS_TYPE
from app.services import security
from app.resources.library.S3.index import s3Bucket
from app.resources.library.email.sns import SnsEmail
from app.resources.constant import INVOICE_TYPE, OWNER_TYPE
from fastapi.encoders import jsonable_encoder
from app.resources.library.ai.gemini import GEMINI_AI

from app.models.domain.db import *

class AiInsightsRepository(BaseRepository): 


    async def getTrendAnalyis(self, user, payload):
        try:
            if getAttr(payload,"excel_data",False):
                return SendErrorResponse(
                        message = "Don't receive any data"
                    ).send() 
            gemini = GEMINI_AI()
            Input = []
            return SendSuccessResponse(
                        data = []
                    )
    

            
        except Exception as error:
            raise error 

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
                                        Invoice
                                    ).options(
                                        joinedload(Invoice.AssetInventory)
                                        .options(
                                            joinedload(AssetInventory.Asset)
                                        )
                                    )

            filters = [ ]
               
            # if getAttr(filter,"type") != None:
            #     if getAttr(filter,"type") == "onboarding":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_BOARDING.value )
            #     elif getAttr(filter,"type") == "onnotice":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_NOTICE.value )
            #     elif getAttr(filter,"type") == "active":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ACTIVE.value )
            #     elif getAttr(filter,"type") == "terminated":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.TERMINATED.value )


            # if getAttr(filter,"name") != None:
            #     filters.append( *self.parseInput( Employee.firstName     , getAttr(filter,"name") ) )
            #     filters.append( *self.parseInput( Employee.lastName     , getAttr(filter,"name") ) )
               
            # if getAttr(filter,"employeeId") != None:
            #     filters.append( *self.parseInput( Employee.employeeId         , getAttr(filter,"employeeId") ) )
               
            # if getAttr(filter,"email") != None:
            #     filters.append( *self.parseInput( Employee.emailId         , getAttr(filter,"email") ) )
               
            # if getAttr(filter,"mobile") != None:
            #     filters.append( *self.parseInput( Employee.mobile        , getAttr(filter,"mobile") ) )
               
            # if getAttr(filter,"status") != None:
            #     filters.append( Employee.status == getAttr(filter,"status") )
                        
            # if filter["search"] != None and filter["searchField"] != None: 
            
            #     if filter["searchField"] == "name":
            #         filters.append( or_( 
            #                             *self.parseInput( Employee.firstName         , getAttr(filter,"search") ),
            #                             *self.parseInput( Employee.lastName         , getAttr(filter,"search") )
            #                         ).self_group() )
            
            #     if filter["searchField"] == "employeeId":
            #         filters.append( *self.parseInput( Employee.employeeId        , getAttr(filter,"search") ) )

            #     if filter["searchField"] == "email":
            #         filters.append( *self.parseInput( Employee.emailId        , getAttr(filter,"search") ) )
            
            #     if filter["searchField"] == "mobile":
            #         filters.append( *self.parseInput( Employee.mobile          , getAttr(filter,"search") ) )
                        
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(
                        *filters
                    ).order_by( 
                        Invoice.id.desc()
                    ).limit(
                        limit
                    ).offset(
                        offset
                    ).all()
            else:
                oData = queryBuilder.filter(
                            *filters
                        ).order_by(
                            Invoice.id.desc()
                        ).all()
                
            return oData
        except HTTPException as error:
            raise error 
    async def modify(self, user, payload):
        try:
            oInvoice = {}
            if payload.get("id"):
                oInvoice = self.db_session.query(Invoice).filter(Invoice.id == payload.get("id")).first()
                self.notFound(oInvoice)
                return SendErrorResponse(
                        message = "Duplicate email ID, fail to save detail."
                    ).send()
            else:

                oInvoice = self.db_session.query(
                            Invoice
                        ).filter(
                            Invoice.invoiceRefNumber == payload.get("invoiceRefNumber")
                        ).first()
                if oInvoice:
                    return SendErrorResponse(
                        message = "Duplicate Invoice reference number."
                    ).send()  
                
                oInvoice = self.mapDataToModel(Invoice(), payload, user= user)
                oInvoice = self.save(oInvoice)
                oInvoice.invoiceNumber = INVOICE_TYPE['IN'+'I'+payload.get("invoiceType")] +'-'+ str(oInvoice.id).rjust(9, '0')
            
            self.db_session.commit()

            return SendSuccessResponse(
                    data = oInvoice,
                    message = "Invoice detail updated."
                ).send()
        except HTTPException as error:
            SendErrorResponse(
                message = str(error)
            ).send()

    async def getAssetList(self, user, paggination, filter):
        try:
            if filter.get("export"):
                return await self.exportToExcelAsset(filter)
            else:
                oData = self._getAssetList(paggination, filter)
                return SendSuccessResponse(
                    data = await oData
                )
        except HTTPException as error:
            raise error 

    async def exportToExcelAsset(self, filter):
        try:
            oData = list(map(lambda item: {
                "assetNumber"   : item.assetNumber,
                "modelNumber"   : item.modelNumber,
                "serialNumber"  : item.serialNumber,
                "status"        : ASSET_STATUS.get(item.status),
                "assetType"     : ASSET_TYPE.get(item.assetType),
                "ownerType"     : OWNER_TYPE.get(item.ownerType),
                "warrentyAt"   : item.warrentyAt,
                
                "createdBy"     : item.CreatedBy.firstName + " " + item.CreatedBy.lastName,
                "createdAt"     : Moment(item.createdAt).format()
            }, await self._getAssetList({} , filter) ))

            oHeader = {
                "assetNumber"   : "Asset Number",
                "modelNumber"   : "Model Number",
                "serialNumber"  : "Serial Number",
                "status"        : "Status",
                "assetType"     : "Asset Type",
                "ownerType"     : "Owner Type",
                "warrentyAt"      : "Warrenty Date",
                "createdBy"        : "Created By",
                "createdAt"        : "Created At"
            }
            return SendExportResponse(
                header = oHeader,
                data = oData
            )
        except HTTPException as error:
            raise error 
        
    async def _getAssetList(self, paggination, filter ):
        try:
            (limit , offset) = self.getPaggination(paggination)

            queryBuilder = self.db_session.query( 
                                        Asset
                                    ).options(
                                        joinedload(Asset.AssetInventory)
                                        .options(
                                                joinedload(AssetInventory.Invoice)
                                            )
                                    ).options(
                                        joinedload(Asset.LastAssignLog)
                                        .options(
                                            joinedload(AssetAssign.AssignedTo)
                                        )
                                    ).options(
                                        joinedload(Asset.MaintainanceLog)
                                    )

            filters = [ ]
               
            # if getAttr(filter,"type") != None:
            #     if getAttr(filter,"type") == "onboarding":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_BOARDING.value )
            #     elif getAttr(filter,"type") == "onnotice":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ON_NOTICE.value )
            #     elif getAttr(filter,"type") == "active":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.ACTIVE.value )
            #     elif getAttr(filter,"type") == "terminated":
            #         filters.append( Employee.status == EMPLOYEEMENT_STATUS.TERMINATED.value )


            # if getAttr(filter,"name") != None:
            #     filters.append( *self.parseInput( Employee.firstName     , getAttr(filter,"name") ) )
            #     filters.append( *self.parseInput( Employee.lastName     , getAttr(filter,"name") ) )
               
            # if getAttr(filter,"employeeId") != None:
            #     filters.append( *self.parseInput( Employee.employeeId         , getAttr(filter,"employeeId") ) )
               
            # if getAttr(filter,"email") != None:
            #     filters.append( *self.parseInput( Employee.emailId         , getAttr(filter,"email") ) )
               
            # if getAttr(filter,"mobile") != None:
            #     filters.append( *self.parseInput( Employee.mobile        , getAttr(filter,"mobile") ) )
               
            # if getAttr(filter,"status") != None:
            #     filters.append( Employee.status == getAttr(filter,"status") )
                        
            # if filter["search"] != None and filter["searchField"] != None: 
            
            #     if filter["searchField"] == "name":
            #         filters.append( or_( 
            #                             *self.parseInput( Employee.firstName         , getAttr(filter,"search") ),
            #                             *self.parseInput( Employee.lastName         , getAttr(filter,"search") )
            #                         ).self_group() )
            
            #     if filter["searchField"] == "employeeId":
            #         filters.append( *self.parseInput( Employee.employeeId        , getAttr(filter,"search") ) )

            #     if filter["searchField"] == "email":
            #         filters.append( *self.parseInput( Employee.emailId        , getAttr(filter,"search") ) )
            
            #     if filter["searchField"] == "mobile":
            #         filters.append( *self.parseInput( Employee.mobile          , getAttr(filter,"search") ) )
                        
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(
                        *filters
                    ).order_by( 
                        Asset.id.desc()
                    ).limit(
                        limit
                    ).offset(
                        offset
                    ).all()
            else:
                oData = queryBuilder.filter(
                            *filters
                        ).order_by(
                            Asset.id.desc()
                        ).all()
                
            return oData
        except HTTPException as error:
            raise error


    async def modifyAsset(self, user, payload):
        try:
            oAssets = {}
            if payload.get("id"):
                oAssets = self.db_session.query(Asset).filter(Asset.id == payload.get("id")).first()
                self.notFound(oAssets)
                return SendErrorResponse(
                        message = "Duplicate Serial Number, failed to save detail."
                    ).send()
            else:

                oAssets = self.db_session.query(
                            Asset
                        ).filter(
                            or_(Asset.serialNumber == payload.get("serialNumber"),
                                Asset.serialNumber == payload.get("modelNumber")).self_group()
                        ).first()
                if oAssets:
                    return SendErrorResponse(
                        message = "Duplicate Serial Number, failed to save detail."
                    ).send()  

                if not payload.get('invoiceId'):
                    return SendErrorResponse(
                        message = 'Please select Invoice number'
                    )
                
                oInvoice = self.db_session.query(
                                    Invoice
                                ).filter(Invoice.invoiceNumber == payload.get('invoiceId')).first()
                self.notFound(oInvoice)
                oAssets = self.mapDataToModel(Asset(), payload, user= user)
                oAssets = self.save(oAssets)
                oAssets.assetNumber = OWNER_TYPE['O'+payload.get("ownerType")] +'-'+ str(oAssets.id).rjust(9,'0')
                
                oAssetInventory = AssetInventory(
                                    assetId = oAssets.id,
                                    invoiceId = oInvoice.id,
                                    invoiceType = oInvoice.invoiceType
                                )
                oAssetInventory = self.save(oAssetInventory)
                
            
            self.db_session.commit()

            return SendSuccessResponse(
                    data = oAssets,
                    message = "Invoice detail updated."
                ).send()
        except HTTPException as error:
            SendErrorResponse(
                message = str(error)
            ).send() 



    async def getDetail(self, user, id):
        try:
            if not id:
                return SendErrorResponse(
                        message = "Invalid Asset selection."
                    ).send()

            oAsset = self.db_session.query(
                            Asset
                        ).options(
                            joinedload(Asset.LastAssignLog)
                            .options(
                                joinedload(AssetAssign.AssignedTo)
                                .options(load_only(*["id","firstName","lastName","emailId","employeeId"]))
                            )
                        ).options(
                            joinedload(Asset.LastMaintainanceLog)
                        ).filter(
                            Asset.id == id
                        ).first()
            return SendSuccessResponse(
                    data = oAsset
                ).send()

        except HTTPException as error:
            SendErrorResponse(
                message = str(error)
            ).send()
    
    async def getAssetHistory(self, user, id):
        try:
            if not id:
                return SendErrorResponse(
                        message = "Invalid Asset selection."
                    ).send()

            oAsset = self.db_session.query(
                            Asset
                        ).options(
                            joinedload(Asset.AssetAssign)
                            .options(
                                joinedload(AssetAssign.AssignedTo)
                                .options(load_only(*["id","firstName","lastName","emailId","employeeId"]))
                            )
                        ).options(
                            joinedload(Asset.MaintainanceLog)
                        ).options(
                            joinedload(Asset.AssetInventory)
                            .options(
                                joinedload(AssetInventory.Invoice)
                            )
                        ).filter(
                            Asset.id == id
                        ).first()
            return SendSuccessResponse(
                    data = oAsset
                ).send()

        except HTTPException as error:
            SendErrorResponse(
                message = str(error)
            ).send()


    async def modifyMaintainance(self, user, payload, id):
        try:
            now = Moment().now
            if not id:
                return SendErrorResponse(
                        message = "Invalid Asset selection."
                    ).send()

            oAsset = self.db_session.query(
                            Asset
                        ).options(
                            joinedload(Asset.LastAssignLog)
                        ).options(
                            joinedload(Asset.LastMaintainanceLog)
                        ).filter(
                            Asset.id == id
                        ).first()
            self.notFound(oAsset)

            if oAsset.LastAssignLog is None :
                return SendErrorResponse(
                        message = "Asset is not assigned yet."
                    ).send()
            

            if oAsset.LastAssignLog.assignStatus ==  ASSIGN_STATUS_TYPE.ASSIGNED.value:
                oAsset.LastAssignLog.assignSubStatus = oAsset.LastAssignLog.assignStatus
                oAsset.LastAssignLog.assignStatus = ASSIGN_STATUS_TYPE.MAINTAINANCE.value
                oAsset.LastAssignLog.updatedBy   = user.id,
                oAsset.LastAssignLog.updatedAt   = now,

            
            oAsset.status = ASSET_STATUS_TYPE.MAINTAINANCE.value
            oAsset.updatedBy   = user.id,
            oAsset.updatedAt   = now,

            if oAsset.LastMaintainanceLog:
                oAsset.LastMaintainanceLog.isHistory = True

            oMantainanceLog = MaintainanceLog(
                            issueType = payload.get('issueType'),
                            assetId = oAsset.id,
                            issueComment = payload.get('issueComment'),
                            assetOwner = oAsset.LastAssignLog.assignedTo,
                            reportTo = user.id,
                            isHistory = False,
                            maintainanceStatus = MAINTAINCE_STATUS_TYPE.UNDER_MAINTAINCE.value,
                            updatedBy   = user.id,
                            updatedAt   = now,
                            createdBy   = user.id,
                            createdAt   = now
                        )
            oMantainanceLog = self.save(oMantainanceLog)
            documents = payload.get('maintainacePhotos',[])

            for item in documents:
                oDocuments = {}
                oDocuments = AssetDocument(
                    maintainanceId = oMantainanceLog.id,
                    description = item.comment,
                    s3Path = item.s3Path,
                    updatedBy   = user.id,
                    updatedAt   = now,
                    createdBy   = user.id,
                    createdAt   = now        
                            )
                oDocuments = self.save(oDocuments)
                

            self.db_session.commit()
            return SendSuccessResponse(
                    data = payload
                ).send()
            
        except HTTPException as error:
            self.db_session.rollback()
            raise error
            SendErrorResponse(
                message = str(error)
            ).send()

    async def assignAsset(self, user, payload, id):
        try:
            now = Moment().now
            if not id:
                return SendErrorResponse(
                        message = "Invalid Asset selection."
                    ).send()

            oAsset = self.db_session.query(
                            Asset
                        ).options(
                            joinedload(Asset.LastAssignLog)
                        ).options(
                            joinedload(Asset.LastMaintainanceLog)
                        ).filter(
                            Asset.id == id
                        ).first()
            self.notFound(oAsset)

            if not payload.get('assignedTo'):
                return SendErrorResponse(
                        message = "Please select valid user to assign"
                    ).send()
            
            if oAsset.LastAssignLog and oAsset.LastAssignLog.assignStatus in [ASSIGN_STATUS_TYPE.ASSIGNED.value, 
                                                     ASSIGN_STATUS_TYPE.INITIATED.value, 
                                                     ASSIGN_STATUS_TYPE.MAINTAINANCE.value]:
                return SendErrorResponse(
                        message = "This Asset is already Assigned."
                    ).send()

            oUser = self.db_session.query(Employee).filter(Employee.employeeId == payload.get('assignedTo')).first()
            self.notFound(oUser)

            if oAsset.LastAssignLog:
                oAsset.LastAssignLog.isHistory = True
            
            oAsset.status = ASSET_STATUS_TYPE.AVAILABLE.value
            oAsset.updatedBy   = user.id,
            oAsset.updatedAt   = now,
            
            oAssign = AssetAssign(
                        assetId = oAsset.id,
                        isHistory = False,
                        assignedAt = now,
                        assignedTo = oUser.id,
                        assignedBy = user.id,
                        assignStatus = ASSIGN_STATUS_TYPE.INITIATED.value,
                        updatedBy   = user.id,
                        updatedAt   = now,
                        createdBy   = user.id,
                        createdAt   = now  
                    )
            oAssign = self.save(oAssign)
            self.db_session.commit()
            return SendSuccessResponse(
                        message = "Asset assgin initiated."
                    ).send()

        except HTTPException as error:
            self.db_session.rollback()
            raise error
            SendErrorResponse(
                message = str(error)
            ).send()

    async def assignStatus(self, user, payload,id):
        try:
            oResult = ""
            now = Moment().now
            if not id:
                return SendErrorResponse(
                        message = "Invalid selection."
                    ).send()
            oAssign = self.db_session.query(AssetAssign).filter(AssetAssign.id == id).first()
            self.notFound(oAssign)
            oAsset = self.db_session.query(Asset).filter(Asset.id == oAssign.assetId).first()
            self.notFound(oAsset)

            if payload.get('status') == ASSIGN_STATUS_TYPE.ASSIGNED.value:
                oAssign.assignStatus = ASSIGN_STATUS_TYPE.ASSIGNED.value
                oAssign.assignSubStatus = ASSIGN_STATUS_TYPE.INITIATED.value
                oAsset.status = ASSET_STATUS_TYPE.ASSIGNED.value
                oAsset.updatedBy = user.id
                oAsset.updatedAt = now
                oResult = "Asset assgin successfully."

            if payload.get('status') == ASSIGN_STATUS_TYPE.CANCELLED.value:
                oAssign.assignStatus = ASSIGN_STATUS_TYPE.CANCELLED.value
                oAssign.assignSubStatus = ASSIGN_STATUS_TYPE.INITIATED.value
                oAsset.status = ASSET_STATUS_TYPE.AVAILABLE.value
                oAsset.updatedBy = user.id
                oAsset.updatedAt = now
                oResult = "Assign cancelled, Now available."

            if payload.get('status') == ASSIGN_STATUS_TYPE.HANDHOVERED.value:
                oAssign.assignSubStatus = oAssign.assignStatus
                oAssign.assignStatus = ASSIGN_STATUS_TYPE.HANDHOVERED.value
                oAsset.status = ASSET_STATUS_TYPE.AVAILABLE.value
                oAsset.updatedBy = user.id
                oAsset.updatedAt = now
                oResult = "Asset collected successfully."


            oAssign.assignedBy = user.id
            oAssign.assignedAt = now
            oAssign.updatedBy = user.id
            oAssign.updatedAt = now

            self.db_session.commit()

            return SendSuccessResponse(
                        message = oResult
                    ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            raise error
            SendErrorResponse(
                message = str(error)
            ).send()
    
    async def maintainanceStatus(self, user, payload, id):
        try:
            oResult = ""
            now = Moment().now
            if not id:
                return SendErrorResponse(
                        message = "Invalid selection."
                    ).send()
            
            oMaintainance = self.db_session.query(MaintainanceLog).filter(MaintainanceLog.id == id).first()
            self.notFound(oMaintainance)
            
            oAsset = self.db_session.query(Asset).filter(Asset.id == oMaintainance.assetId).first()
            self.notFound(oAsset)
            
            oLastAssign = self.db_session.query(AssetAssign).filter(AssetAssign.assetId == oMaintainance.assetId, AssetAssign.isHistory == False ).first()
            self.notFound(oLastAssign)
            
            oMaintainanceLog = {}

            if payload.get('status') == MAINTAINCE_STATUS_TYPE.AVAILABLE.value:
                oMaintainance.isHistory = True
                oMaintainance.updatedBy = user.id
                oMaintainance.updatedAt = now

                oMaintainanceLog = MaintainanceLog(
                            issueType = oMaintainance.issueType,
                            assetId = oAsset.id,
                            issueComment = oMaintainance.issueComment,
                            assetOwner = oLastAssign.assignedTo,
                            reportTo = user.id,
                            isHistory = False,
                            maintainanceStatus = MAINTAINCE_STATUS_TYPE.AVAILABLE.value,
                            updatedBy   = user.id,
                            updatedAt   = now,
                            createdBy   = user.id,
                            createdAt   = now
                        )
                oMaintainanceLog = self.save(oMaintainanceLog)
                oAsset.status = ASSET_STATUS_TYPE.ASSIGNED.value
                oAsset.updatedBy = user.id
                oAsset.updatedAt = now
                oLastAssign.assignSubStatus = oLastAssign.assignStatus
                oLastAssign.assignStatus = ASSIGN_STATUS_TYPE.ASSIGNED.value
                oLastAssign.updatedBy = user.id
                oLastAssign.updatedAt = now

                oResult = "Asset repaired successfully."
            
            self.db_session.commit()
            return SendSuccessResponse(
                        message = oResult
                    ).send()

        except HTTPException as error:
            self.db_session.rollback()
            raise error
            SendErrorResponse(
                message = str(error)
            ).send()

