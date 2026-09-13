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

from sqlalchemy.orm import Session, load_only, lazyload, joinedload, join, contains_eager
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

    # #############################################################################c

    def save(self, model) -> Any:
        self.db_session.add(model)
        self.db_session.flush()
        self.db_session.refresh(model)
        return model
    
    
    
    
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

    
        