#import asyncpg
#import asyncio
import aiomysql
from fastapi import FastAPI
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship

from urllib.parse import quote_plus

from app.core.config import SUPABASE_USERNAME, PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PWD, MYSQL_DB, DEBUG 

#loop = asyncio.get_event_loop()



class DBSession :
    db = None

oDBSession = DBSession()

async def connect_to_db(app: FastAPI) -> None:
    app.state.db_session = await getDBConnection()
    logger.info("Connection established")


async def close_db_connection(app: FastAPI) -> None:
    logger.info("Closing connection to database")

    app.state.db_session.close()
    logger.info("Connection closed")


# async def getDBConnection(): 
#     try:
#         if DBSession.db:
#             return oDBSession.db 
#         connection_string="postgresql://"+str(SUPABASE_USERNAME)+":"+str(PASSWORD)+"@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
#         logger.info("Connecting to {0}", connection_string)
#         db = create_engine(
#                             connection_string,
#                             pool_size=5,
#                             max_overflow=10,
#                             pool_pre_ping=True,
#                             connect_args={"sslmode": "require"}
#                         )

#         session_factory = sessionmaker(bind=db, autoflush=False, expire_on_commit=True)
#         oDBSession.db = session_factory()
        
#         return oDBSession.db
#     except BaseException as error:
#         print(error)

async def getDBConnection():
    try:
        if DBSession.db:
            return oDBSession.db 
        
        connection_string = 'mysql+pymysql://'+ str(MYSQL_USER) +':'+'%s'+'@'+str(MYSQL_HOST)+'/'+str(MYSQL_DB)
        logger.info("Connecting to {0}", connection_string)
        db = create_engine(
                            connection_string % quote_plus(str(MYSQL_PWD)),
                            echo=DEBUG,                        
                            pool_size=5, 
                            max_overflow=5
                        )

        session_factory = sessionmaker(bind=db, autoflush=False, expire_on_commit=True)
        oDBSession.db = session_factory()
        
        return oDBSession.db
    except BaseException as error:
        print(error)
