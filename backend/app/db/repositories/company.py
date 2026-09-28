from typing import Optional, Any

from starlette import requests, status
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import success_strings, error_strings, constant
from app.resources.constant import *
from app.api.response.http_response import *
from app.core.config import ENVIRONMENT

from app.db.errors import *
from app.db.repositories.base import BaseRepository

from app.resources.helper.moment import Moment
from app.resources.helper.common import *

from sqlalchemy import or_
from sqlalchemy.orm import load_only, lazyload, joinedload, join, contains_eager
from app.models.domain.db import *

class CompanyRepository(BaseRepository):  
    
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
                "title"         : item.title if item.title else "",
                "description"   : item.description if item.description else "",
                "status"        : item.status if item.status else "",
                "address"       : item.address if item.address else "",
                "employees"     : item.employees if item.employees else "",
                
                "createdBy"     : item.CreatedBy.firstName + " " + item.CreatedBy.lastName,
                "createdAt"     : Moment(item.createdAt).format()
            }, await self._getList({} , filter) ))

            oHeader = {
                "title"         : "Title",
                "description"   : "Description",
                "status"        : "Status",
                "address"       : "Address",
                "employees"     : "Employees",
                
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
            projectIds = []
            oProjectTeams = self.db_session.query( 
                            ProjectTeam
                        ).options(
                            load_only(*["project"])
                        ).filter(
                            ProjectTeam.member == filter.get("userId"),
                            ProjectTeam.status == MEMBER_STATUS.ACTIVE.value
                        ).all()
            for oProject in oProjectTeams:
                projectIds.append(oProject.project)
            
            oProjects = self.db_session.query( 
                            Project
                        ).options(
                            load_only(*["company"])
                        ).filter(
                            or_(
                                Project.createdBy == filter.get("userId"),
                                Project.id.in_(projectIds)
                            ).self_group()
                        ).all()
            companyIds = []
            for oProject in oProjects:
                companyIds.append(oProject.company)
            
            filters = [
                or_(
                    Company.createdBy == filter.get("userId"),
                    Company.id.in_(companyIds)
                ).self_group()
            ]
            
            queryBuilder = self.db_session.query( Company ).\
                options(
                    load_only(*[
                        "id","title","description","status","address","employees","createdAt"
                    ])
                ).options(
                    joinedload(Company.CreatedBy)                 
                    .options(load_only(*["id","emailId","firstName","lastName"]))
                ).options(
                    joinedload(Company.Project)                 
                    .options(load_only(*["id"]))
                )
               
            if getAttr(filter,"title") != None:
                filters.append( *self.parseInput( Company.title          , getAttr(filter,"title") ) )
               
            if getAttr(filter,"status") != None:
                filters.append( *self.parseInput( Company.status         , getAttr(filter,"status") ) )
               
            if filter["search"] != None and filter["searchField"] != None: 
            
                if filter["searchField"] == "title":
                    filters.append( *self.parseInput( Company.title          , getAttr(filter,"search") ) )
            
                if filter["searchField"] == "status":
                    filters.append( *self.parseInput( Company.status         , getAttr(filter,"search") ) )
            
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(*filters).\
                    order_by( Company.id.desc()).\
                    limit(limit).\
                    offset(offset).\
                    all()
            else:
                oData = queryBuilder.filter(*filters).\
                        order_by(Company.id.desc()).\
                        all()

            return oData
        except HTTPException as error:
            raise error 

    async def getOne(self, id):
        try:
            oCompany = self.db_session.query(Company).filter( Company.id == id ).first()   
            self.notFound(oCompany)
            return SendSuccessResponse(
                data = oCompany
            ).send()
        except HTTPException as error:
            raise error 

    async def modify(self, user, payload):
        try:
            oCompany = self.db_session.query(Company).filter( Company.id == getAttr(payload,"id",None) ).first()   
            if oCompany:
                return await self.update(user, oCompany.id, payload)
            else:
                return await self.create(user, payload)

        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def create(self, user, payload):
        try:
            oCompany = self.mapDataToModel(Company( ),payload,user)
            
            now = Moment().now
            oCompany = Company(
                title           = getAttr(payload,"title",None),
                description     = getAttr(payload,"description",None),
                status          = getAttr(payload,"status",None),
                address         = getAttr(payload,"address",None),
                employees       = getAttr(payload,"employees",None),
            
                createdBy       = user.id,
                createdAt       = now,
                updatedBy       = user.id,
                updatedAt       = now
            )
            self.save(oCompany)

            self.db_session.commit()
            return SendSuccessResponse(
                data = oCompany
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def update(self, user, id, payload):
        try:
            oCompany = self.db_session.query(Company).filter( Company.id == id ).first()   
            self.notFound(oCompany)
            
            oCompany = self.mapDataToModel(oCompany,payload,user)
            
            now = Moment().now
            oCompany.title           = getAttr(payload,"title",None)
            oCompany.description     = getAttr(payload,"description",None)
            oCompany.status          = getAttr(payload,"status",None)
            oCompany.address         = getAttr(payload,"address",None)
            oCompany.employees       = getAttr(payload,"employees",None)
            
            oCompany.updatedBy       = user.id
            oCompany.updatedAt       = now
            
            self.db_session.commit()

            return SendSuccessResponse(
                data = oCompany
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def activate(self, user, id, payload):
        try:
            oCompany = self.db_session.query(Company).filter( Company.id == id ).first()   
            self.notFound(oCompany)
            
            oCompany.status    = True if oCompany.status == 0 else False
            oCompany.updatedBy = user.id
            oCompany.updatedAt = Moment().now
            
            self.db_session.commit()

            return SendSuccessResponse(
                data = oCompany
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error 