from typing import Any, List, Sequence, Tuple
from fastapi import Request

from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.db.errors import *
from app.resources import error_strings
import datetime

#import asyncio
import aiomysql
from aiomysql.connection import Connection
from aiomysql.cursors import Cursor
from sqlalchemy import inspect, null, or_, and_
from sqlalchemy.sql import text

from app.resources.helper.moment import Moment
from app.resources.helper.common import * 
# from app.models.domain.db import *
# from app.resources.constant import USER_CONTEXT
from sqlalchemy.orm import Session, load_only, lazyload, joinedload, join, contains_eager
from app.api.response.http_response import SendErrorResponse
from fastapi.encoders import jsonable_encoder

#from asyncpg import Record
#from asyncpg.connection import Connection
from loguru import logger
import json

def _log_query(query: str, query_params: Tuple[Any, ...]) -> None:
    logger.debug("query: {0}, values: {1}", query, query_params)

class BaseRepository:
    
    # def __init__(self, cur : Cursor) -> None:
    # def __init__(self, conn: any) -> None:
    def __init__(self, conn: any, cur : Cursor = None) -> None:
        self.model = None
        self._cur = cur
        self._conn = conn
        # with conn.cursor(aiomysql.DictCursor) as cur:
        #     self._cur = cur

    @property
    def db_session(self) -> any :
        return self._conn
    
    @property
    def cursor(self) -> Cursor:
        return self._cur

    ################## SQL QUERY BASE #######################################

    async def _log_and_fetch_one(self, query: str, *query_params: Any) -> Any:
        _log_query(query, query_params)
        await self._cur.execute(query, *query_params)
        return await self._cur.fetchone()

    async def _log_and_fetch_all(self, query: str, *query_params: Any) -> Any:
        _log_query(query, query_params)
        await self._cur.execute(query, *query_params)
        return await self._cur.fetchall()
    
    async def _log_and_fetch_value(self, query: str, *query_params: Any) -> Any:
        _log_query(query, query_params)
        await self._cur.execute(query, *query_params)
        return await self._cur.fetchmany()

    async def _log_and_execute(self, query: str, *query_params: Any) -> None:
        _log_query(query, query_params)
        await self._cur.execute(query, *query_params)

    async def _log_and_execute_many(
        self, query: str, *query_params: Sequence[Tuple[Any, ...]]
    ) -> None:
        _log_query(query, query_params)
        await self._cur.executemany(query, *query_params)

    ################################################################
    
    def getPaggination(self, filter):
        limit = filter.get("limit",25) 
        offset = 0
        if getAttr(filter,"offset"):
            offset = getAttr(filter,"offset") 
        
        if offset > 1:
            offset = ( (offset - 1) * limit )

        if offset == 1:
            offset = 0 
            
        return (limit, offset)

    def save(self, model) -> Any:
        self.db_session.add(model)
        self.db_session.flush()
        self.db_session.refresh(model)
        return model
    
    def deleteByField(self, oModel, deleteIds, field = "id"):
        oProcessedIds = []
        if len(deleteIds):
            oDeleteList = self.db_session.query(oModel).\
                                filter( getattr(oModel,field).in_(deleteIds)).\
                                all()
            if oDeleteList :
                for oItem in oDeleteList:
                    oProcessedIds.append(oItem.id)
                    self.db_session.delete(oItem)

        return oProcessedIds
    
    def deleteIDNotIn(self, oModel, deleteIds, oConditions = {}):
        if len(deleteIds):
            oDeleteList = self.db_session.query(oModel).\
                            filter( oModel.id.notin_(deleteIds))
            oDeleteList = self.buildQuery(oDeleteList, oModel, oConditions)
            oDeleteList.all()
            for oItem in oDeleteList:
                self.db_session.delete(oItem)

    def update(self, oModel, oData, user):
        hasChange = False
        for okay in oData:
            if getattr(oModel, okay) == oData[okay]:
                setattr(oModel, okay, oData[okay])
                hasChange = True
        if hasChange == True:
            oModel.updatedBy   = user.id
            oModel.updatedAt   = Moment().now 
    
    def mapDataToModel(self, oModel, oData, user = None, fieldList = []) -> Any:
        now = Moment().now
        if(len(fieldList) > 0):
            for key  in fieldList:
                # if oData.get(key) and hasattr(oModel,key) and key != "id" and ( type(oData[key]) is not dict and type(oData[key]) is not list ):
                if hasattr(oModel,key) and key != "id" and ( type(oData[key]) is not dict and type(oData[key]) is not list ):
                    setattr(oModel, key , oData[key])
        else:
            for key  in oData:
                if hasattr(oModel,key) and key != "id" and ( type(oData[key]) is not dict and type(oData[key]) is not list ):
                    # if(type(getattr(oModel, key)) == type(None)):
                    try:
                        setattr(oModel, key , oData[key])
                    except:
                        pass
        # if oModel:
        #     oModel.updatedBy   = user.id if user and user.context == USER_CONTEXT.ADMIN.value else None
        #     oModel.updatedAt   = now
        #     if oModel.createdBy == None:
        #         oModel.createdBy   = user.id  if user and user.context == USER_CONTEXT.ADMIN.value else None
        #     if oModel.createdAt is None:
        #         oModel.createdAt   = now
            
        return oModel
    
    def buildQuery(self, oQuery, oModel, oConditions):
        for key  in oConditions:
            if type(oConditions[key]) is dict:
                if getAttr(oConditions[key],"Op"):
                    attr = (oConditions[key]["Op"])
                    if attr ==  "eq":
                        oQuery.filter( getattr(oModel,oConditions[key]) == oConditions[key] )
                    elif attr ==  "ne":
                        oQuery.filter( getattr(oModel,oConditions[key]) != oConditions[key] )
                    elif attr ==  "in":
                        oQuery.filter( getattr(oModel,oConditions[key]).in_( getAttr(oConditions[key],"value",[]) ) )
                    elif attr ==  "notIn":
                        oQuery.filter( getattr(oModel,oConditions[key]).notin_( getAttr(oConditions[key],"value") ) )
                    elif attr ==  "gt":
                        oQuery.filter( getattr(oModel,oConditions[key]) > oConditions[key] )
                    elif attr ==  "gte":
                        oQuery.filter( getattr(oModel,oConditions[key]) >= oConditions[key] )
                    elif attr ==  "lt":
                        oQuery.filter( getattr(oModel,oConditions[key]) < oConditions[key] )
                    elif attr ==  "lte":
                        oQuery.filter( getattr(oModel,oConditions[key]) <= oConditions[key] )
                    elif attr ==  "bt":
                        oQuery.filter( getattr(oModel,oConditions[key]).between( *oConditions[key] ) )
            else:
                oQuery.filter( getattr(oModel,oConditions[key]) == oConditions[key] )
        
        return oQuery
    
    def parseInput(self, oField,  value: str, operation = "eq" , defaultVal : any = ""):
        def likeOperation(operation, value):
            return value.replace("*","%") if operation=="like" else value
        
        if(value):
            def isInteger(value):
                return value if isInteger(value) else value
            

            def inOperation(oField, condition , operator, singleOperator , list):
                if len(list) > 1:
                    if operator == "in":
                        condition.append( oField.in_(list) )
                    else:
                        condition.append( oField.notin_(list) )
                elif len(list) == 1:
                    if singleOperator == "eq":
                        condition.append( oField == list[0] )
                    else:
                        condition.append( oField != list[0] )
                
                return condition

            returnCon = []
            try:
                join = ""
                try:    
                    obj = json.loads(value)
                except:
                    if (value or defaultVal).find('*') > -1:
                        return [ oField.like(likeOperation("like",value or defaultVal)) ]
                    else:
                        return [ oField == (value or defaultVal) ]
                
                if type(obj) is not list:
                    if (value or defaultVal).find('*') > -1:
                        return [ oField.like(likeOperation("like",value or defaultVal)) ]
                    else:
                        return [ oField == (value or defaultVal) ]
                
                condition = []
                eqList = []
                notEqList = []
                for item in obj:
                    entity = None
                    attr = getAttr(item,"type")
                    if attr == "eq":
                            eqList.append(getAttr(item,"low")) 
                    elif attr ==  "ne":
                        notEqList.append(getAttr(item,"low"))                            
                    elif attr ==  "gt":
                        entity = oField > getAttr(item,"low")
                    elif attr ==  "gte":
                        entity = oField >= ( getAttr(item,"low") )
                    elif attr ==  "lt" :
                        entity = oField < getAttr(item,"low")
                    elif attr ==  "lte" :
                        entity = oField <= getAttr(item,"low")
                    elif attr ==  "like":
                        entity = oField.like( getAttr(item,"low").replace("*","%") )
                    elif attr ==  "notlike":
                        entity = oField.notlike( getAttr(item,"low").replace("*","%") )
                    elif attr ==  "notNull":
                        entity = oField.is_not()
                    elif attr ==  "isNull":
                        entity = oField.is_()
                    elif attr ==  "bt":
                        entity = oField.between(getAttr(item,"low"),getAttr(item,"high"))
                    elif attr ==  "notbt":
                        entity = oField.notbetween(getAttr(item,"low"),getAttr(item,"high"))
                    elif attr ==  "in":
                        entity = oField.in_(getAttr(item,"low").split(","))
                    elif attr ==  "notin":
                        entity = oField.notin_(getAttr(item,"low").split(","))
                    
                    if entity is not None:
                        condition.append(entity) 
                    if(join != "" and join !=  getAttr(item,"join")):
                        group = {}
                        condition = inOperation(oField, condition, "in", "eq", eqList)
                        condition = inOperation(oField, condition, "notIn", "ne", notEqList)
                        if len(condition) > 1:
                            if join == "or":
                                returnCon.append( or_( condition ) )
                            else:
                                returnCon.append( and_( condition ) )
                        else:
                            returnCon.append( condition )
                        condition = []
                        eqList = []
                        notEqList = []
                    
                    join =  getAttr(item,"join")

                condition = inOperation(oField, condition, "in", "eq", eqList)
                
                condition = inOperation(oField, condition, "notIn", "ne", notEqList)
                
                returnCon.append( or_(*condition) )
                
                if len(returnCon) > 1:
                    return [and_(*returnCon)]
                elif len(returnCon) == 1:
                    return returnCon
                else:
                    if join == "or":
                        returnCon.append( or_( condition ) )
                    else:
                        returnCon.append( and_( condition ) )
                    return returnCon
            except Exception as error:
                return []

        return  [oField == likeOperation(operation, value or defaultVal)]


    def execute(self, query):
        return self.db_session.execute(query)
        # print(result)
        # for r in result:
        #     print(r[0]) # Access by positional index
            # print(r) # Access by positional index
            # print(r['count']) # Access by column name as a string
            # r_dict = dict(r.items()) # convert to dict keyed by column names
            # print(r_dict)
            
    def fetch(self, model, query, single = True, params: Any = None):
        result = self.db_session.query(model).from_statement(
            text(query)
        )
        if params:
            result.params(*params)
        if single :
            return result.first()
        else:
            return result.all()
            
    ##################################################################
    
    def toJSON(self,result):
        if type(result) is list:
            oResult = []
            for data in result:
                # referred_classes = data.__mapper__.relationships
                # referred_classes = [r.mapper.class_.__table__ for r in referred_classes]
                # print(referred_classes)
                oResult.append({c.name: str(getattr(data, c.name)) for c in data.__table__.columns})
            return oResult
        return {c.name: str(getattr(result, c.name)) for c in result.__table__.columns}
    
    def _asDict(self, result) -> Any:
        return [self._dict(row) for row in result]
    
    def _dict(self, row):
        d = {}
        for column in row.__table__.columns:
            d[column.name] = getattr(row, column.name)
        return d
    
    def notFound(self, oObject, msg = error_strings.RECORD_NOT_FOUND, model = None, callback = False ):
        if(not oObject):
            if callback == False:
                if model is not None:
                    msg = msg.format( model )
                raise EntityDoesNotExist(
                    status_code=HTTP_400_BAD_REQUEST, detail=msg
                )
            return False
        return True
    
    def isExist(self, oObject):
        if(not oObject):
            return False
        return True
    

    async def validateAccess(self, user, accessCode):
        # oRBACPermissions = self.db_session.query(
        #                     RBACPermission
        #                 ).filter( 
        #                     or_ ( 
        #                         RBACPermission.user == user.id,
        #                         RBACPermission.role == user.role
        #                     ),
        #                     RBACPermission.title == accessCode
        #                 ).all()
                            
        # if len(oRBACPermissions) > 0:
        #     for oRBACPermission in oRBACPermissions:
        #         if oRBACPermission.allowEdit == ACCESS_STATUS.ALLOW.value or oRBACPermission.allowAccess == ACCESS_STATUS.ALLOW.value:  
        return True
                
        raise HTTPException(
            status_code=403,
            detail=error_strings.INVALID_ACCESS
        )
        