from typing import Optional, Any

from starlette import requests, status
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
import secrets
from app.resources import success_strings, error_strings, constant
from app.resources.constant import *
from app.api.response.http_response import *
from app.core.config import CLIENT_PATH, ENVIRONMENT, SUPPORT_MAILID

from app.db.errors import *
from app.db.repositories.base import BaseRepository

from app.resources.helper.moment import Moment
from app.resources.helper.common import *

from sqlalchemy import or_, func
from sqlalchemy.orm import load_only, lazyload, joinedload, join, contains_eager
from app.models.domain.db import *
from app.resources.library.S3.index import s3Bucket
from app.resources.library.email.sns import SnsEmail

class ProjectRepository(BaseRepository):  
    
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
                "company"       : item.company if item.company else "",
                "title"         : item.title if item.title else "",
                "description"   : item.description if item.description else "",
                "status"        : item.status if item.status else "",
                "startAt"       : item.startAt if item.startAt else "",
                "endAt"         : item.endAt if item.endAt else "",
                "departments"   : ("").join(item.departments) if item.departments else "",
                
                "createdBy"     : item.CreatedBy.firstName + " " + item.CreatedBy.lastName,
                "createdAt"     : Moment(item.createdAt).format()
            }, await self._getList({} , filter) ))

            oHeader = {
                "company"       : "Company",
                "title"         : "Title",
                "description"   : "Description",
                "status"        : "Status",
                "startAt"       : "Start At",
                "endAt"         : "End At",
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
            
        
            queryBuilder = self.db_session.query( 
                    Project
                ).options(
                    load_only(*[
                        "id","company","title","description","status","startAt","endAt","createdAt","departments"
                    ])
                ).options(
                    joinedload(
                        Project.Company
                    ).options(load_only(*["id","title"]))
                # ).options(
                #     joinedload(
                #         Project.Backlog
                #     ).options(load_only(*["id"]))
                # ).options(
                #     joinedload(
                #         Project.Sprint
                #     ).options(load_only(*["id"]))
                ).options(
                    joinedload(
                        Project.ProjectTeam
                    ).options(
                        load_only(*["id","member","role"])
                    ).options(
                        joinedload(
                            ProjectTeam.Member
                        ).options(load_only(*["id","emailId","firstName","lastName","profilePic"]))
                    )
                ).join(
                    Project.CreatedBy
                ).options(
                    contains_eager(Project.CreatedBy)                 
                    .options(load_only(*["id","emailId","firstName","lastName"]))
                )

            filters = [
                or_(
                    Project.createdBy == filter.get("userId"),
                    Project.id.in_(projectIds)
                ).self_group()
            ]
               
            if getAttr(filter,"title") != None:
                filters.append( *self.parseInput( Project.title          , getAttr(filter,"title") ) )
               
            if getAttr(filter,"status") != None:
                filters.append( *self.parseInput( Project.status         , getAttr(filter,"status") ) )
               
            if getAttr(filter,"startAt") != None:
                filters.append( *self.parseInput( Project.startAt        , getAttr(filter,"startAt") ) )
               
            if getAttr(filter,"endAt") != None:
                filters.append( *self.parseInput( Project.endAt          , getAttr(filter,"endAt") ) )
                        
            if filter["search"] != None and filter["searchField"] != None: 
            
                if filter["searchField"] == "status":
                    filters.append( *self.parseInput( Project.status         , getAttr(filter,"search") ) )
            
                if filter["searchField"] == "startAt":
                    filters.append( *self.parseInput( Project.startAt        , getAttr(filter,"search") ) )
            
                if filter["searchField"] == "endAt":
                    filters.append( *self.parseInput( Project.endAt          , getAttr(filter,"search") ) )
                        
            oData = {}
            if limit > 0 and not filter.get("export"):
                oData = queryBuilder.filter(
                        *filters
                    ).order_by( 
                        Project.id.desc()
                    ).limit(
                        limit
                    ).offset(
                        offset
                    ).all()
            else:
                oData = queryBuilder.filter(
                            *filters
                        ).order_by(
                            Project.id.desc()
                        ).all()
                
            oS3Bucket = s3Bucket()
            for oItem in oData:
                oItem.backlogCount = self.db_session.query(Backlog).options(load_only(*["id"])).filter( Backlog.project == oItem.id ).count()
                oItem.sprintCount = self.db_session.query(Sprint).options(load_only(*["id"])).filter( Sprint.project == oItem.id ).count()
                for oMember in oItem.ProjectTeam:
                    if ( oMember.Member.profilePic ):
                        oUrl= await oS3Bucket.getSignedURL( oMember.Member.profilePic )
                        oMember.Member.profilePicURL = oUrl.get("url",None)

            return oData
        except HTTPException as error:
            raise error 

    async def getOne(self, id):
        try:
            oProject = self.db_session.query(Project).filter( Project.id == id ).first()   
            self.notFound(oProject)
            return SendSuccessResponse(
                data = oProject
            ).send()
        except HTTPException as error:
            raise error 

    async def modify(self, user, payload):
        try:
            oProject = self.db_session.query(Project).filter( Project.id == getAttr(payload,"id",None) ).first()   
            if oProject:
                return await self.update(user, oProject.id, payload)
            else:
                return await self.create(user, payload)

        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def create(self, user, payload):
        try:

            oExistingProject = self.db_session.query(
                                    Project
                                ).filter( 
                                    Project.title == getAttr(payload,"title",None),                     
                                    Project.createdBy == user.id                                         
                                 ).first()   
            if oExistingProject:
                return SendErrorResponse(
                    message = "Project with same title already exist."
                ).send()
            
            oProject = self.mapDataToModel(Project( ),payload,user)
            
            now = Moment().now
            oProject = Project(
                company         = getAttr(payload,"company",None),
                title           = getAttr(payload,"title",None),
                description     = getAttr(payload,"description",None),
                status          = getAttr(payload,"status",None),
                startAt         = getAttr(payload,"startAt",None),
                endAt           = getAttr(payload,"endAt",None),
                departments     = getAttr(payload,"departments",[]),
            
                createdBy       = user.id,
                createdAt       = now,
                updatedBy       = user.id,
                updatedAt       = now
            )
            oProject = self.save(oProject)
            oProject = jsonable_encoder(oProject)
            self.db_session.commit()
            
            oUser = self.db_session.query(
                User
            ).filter(
                User.id == user.id
            ).first()

            await self.addMember(user=user, payload= { "member" : oUser.emailId, "project" : oProject["id"]  })

            return SendSuccessResponse(
                data = oProject
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def update(self, user, id, payload):
        try:
            oProject = self.db_session.query(Project).filter( Project.id == id ).first()   
            self.notFound(oProject)
            
            oExistingProject = self.db_session.query(
                                    Project
                                ).filter( 
                                    Project.title == getAttr(payload,"title",None),
                                    Project.id != oProject.id,                                         
                                    Project.createdBy == user.id                                         
                                 ).first()   
            if oExistingProject:
                return SendErrorResponse(
                    message = "Project with same title already exist."
                ).send()
            
            oProject = self.mapDataToModel(oProject,payload,user)
            
            now = Moment().now
            oProject.company         = getAttr(payload,"company",None)
            oProject.title           = getAttr(payload,"title",None)
            oProject.description     = getAttr(payload,"description",None)
            oProject.status          = getAttr(payload,"status",None)
            oProject.startAt         = getAttr(payload,"startAt",None)
            oProject.endAt           = getAttr(payload,"endAt",None)
            oProject.departments     = getAttr(payload,"departments",[])
            
            oProject.updatedBy       = user.id
            oProject.updatedAt       = now
            
            self.db_session.commit()

            return SendSuccessResponse(
                data = oProject
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error 

    async def activate(self, user, id, payload):
        try:
            oProject = self.db_session.query(Project).filter( Project.id == id ).first()   
            self.notFound(oProject)
            
            oProject.status    = True if oProject.status == 0 else False
            oProject.updatedBy = user.id
            oProject.updatedAt = Moment().now
            
            self.db_session.commit()

            return SendSuccessResponse(
                data = oProject
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error
        

    async def select(self, user, id):
        try:
            oProject = self.db_session.query(Project).filter( Project.id == id ).first()   
            self.notFound(oProject)
            
            token =  await genAuthToken(user = user, context = user.context, project = id)
            return SendSuccessResponse(
                data = { "token" : token  },
                message = "Project selected for scrum."
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error
        
    #### Project Team ####

    async def getMembers(self, user, id):
        try:
            if id == 0:
                id = user.project
            oProjectTeams = self.db_session.query(
                                ProjectTeam
                            ).options(
                                load_only(*[ "id", "member", "status", "role", "startFrom", "endAt"])
                            ).options(
                                joinedload(
                                    ProjectTeam.Member
                                ).options(load_only(*[ "id", "firstName", "lastName", "emailId", "employeeId", "mobile","profilePic"]))
                            ).filter( 
                                ProjectTeam.project == id 
                            ).all()
               
            oProjectTeams = jsonable_encoder(oProjectTeams)
            
            oS3Bucket = s3Bucket()
            for oMember in oProjectTeams:
                if oMember.get("Member") and oMember.get("Member").get("profilePic"):
                    oUrl= await oS3Bucket.getSignedURL( oMember.get("Member").get("profilePic") )
                    oMember["Member"]["profilePicURL"] = oUrl.get("url",None)

            return SendSuccessResponse(
                data = oProjectTeams
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error
        
    async def addMember(self, user, payload):
        try:
            oCheck = self.db_session.query(
                User
            ).filter(
                User.emailId == getAttr(payload,"member",None)
            ).first()

            if not oCheck:
                return SendErrorResponse(
                    message = "Member detail not found."
                ).send()
            
            if oCheck and oCheck.isDisabled:
                return SendErrorResponse(
                    message = "Member is not allowed to be added to any project."
                ).send()
            
            oExiting = self.db_session.query(
                ProjectTeam
                ).filter( 
                    ProjectTeam.project == getAttr(payload,"project",None),
                    ProjectTeam.member == oCheck.id 
                ).first()  
             
            if oExiting and getAttr(payload,"id",None) == None:
                return SendErrorResponse(
                    message = "Member already Exist."
                ).send()

            if getAttr(payload,"id",None):
                oProjectTeam = self.mapDataToModel(oExiting,payload,user)
                oProjectTeam.member = oCheck.id
            else:
                oProjectTeam = self.mapDataToModel(ProjectTeam( ),payload,user)
                oProjectTeam.member = oCheck.id
                if oProjectTeam.member == user.id:
                    oProjectTeam.role = 3
                    oProjectTeam.status = MEMBER_STATUS.ACTIVE.value
                else:
                    oProjectTeam.status = MEMBER_STATUS.INVITE.value
                self.save(oProjectTeam)
                await self.inviteMember(user=user,payload = { "member" : oProjectTeam.id })

            self.db_session.commit()
            return SendSuccessResponse(
                data = oProjectTeam
            ).send()
        except HTTPException as error:
            self.db_session.rollback()
            raise error
         
    async def removeMember(self, user, payload):
        try:
            oProjectTeam = self.db_session.query(ProjectTeam).filter( ProjectTeam.id == getAttr(payload,"member",None) ).first()   
            self.notFound(oProjectTeam)
            
            self.db_session.delete(oProjectTeam)

            self.db_session.commit()
            return SendSuccessResponse(
                data = oProjectTeam
            ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            raise error 
        
    async def memberActivation(self, token):
        try:
            oProjectTeam = self.db_session.query(ProjectTeam).filter( ProjectTeam.token == token ).first()   
            self.notFound(oProjectTeam)
            
            if oProjectTeam.status == MEMBER_STATUS.INVITE.value:
                oProjectTeam.status = MEMBER_STATUS.ACTIVE.value
                oProjectTeam.token = None
                self.db_session.commit()
            else:
                return SendErrorResponse(
                    message = "Member is not in desired status."
                ).send()

            
            return SendSuccessResponse(
                message = "Member status activated for project."
            ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            raise error 
         
    async def inviteMember(self, user, payload):
        try:

            oProjectTeam = self.db_session.query(
                                    ProjectTeam
                                ).options(
                                    joinedload(ProjectTeam.Project)
                                ).options(
                                    joinedload(ProjectTeam.Member)
                                ).filter( 
                                    ProjectTeam.id == getAttr(payload,"member",None) 
                                ).first()   
            self.notFound(oProjectTeam)
            
            if oProjectTeam.status == MEMBER_STATUS.INVITE.value:
                token = secrets.token_hex(20)
                link = CLIENT_PATH + "/#/authentication/activate/" + token
                
                oProjectTeam.token = token
                 
                oSnsEmail = SnsEmail( ) 
                await oSnsEmail.sendEmail(
                    addresses=[oProjectTeam.Member.emailId],
                    subject = f"Member activation link at TTechfino HRMS for {oProjectTeam.Project.title} project team",
                    content = "".join([
                                f"<div>Dear {oProjectTeam.Member.firstName},</div><br>",
                                f"<div>You have been invited for the <strong>{oProjectTeam.Project.title}</strong> project team.</div>"
                                "<div>You can join the team by clicking on below activation link .</div>"
                                f"<div><br/>Activation Link : <a href='{link}'>{link}</a></div><br/><br/>"
                                "<div>Thank You<br/>Techfino HRMS Team</div>"
                              ]),
                    options={"sender" : SUPPORT_MAILID }
                )
                self.db_session.commit()
            else:   
                return SendSuccessResponse(
                    message = "Member is not in desired status."
                ).send()
            
            return SendSuccessResponse(
                message = "Invite mail resend."
            ).send()
        
        except HTTPException as error:
            self.db_session.rollback()
            raise error 