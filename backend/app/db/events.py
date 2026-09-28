#import asyncpg
#import asyncio
import aiomysql
from fastapi import FastAPI
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship

from urllib.parse import quote_plus

from app.core.config import DEBUG ,MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PWD, MYSQL_DB, MYSQL_DATABASE_URL, MAX_CONNECTIONS_COUNT, MIN_CONNECTIONS_COUNT

#loop = asyncio.get_event_loop()


class DBSession :
    db = None

oDBSession = DBSession()

async def connect_to_db(app: FastAPI) -> None:
    app.state.db_session = await getDBConnection()
    
    # app.state.pool = await aiomysql.create_pool(
    #                             host=str(MYSQL_HOST), port=int(MYSQL_PORT),
    #                              user=str(MYSQL_USER), password=str(MYSQL_PWD),
    #                             db=str(MYSQL_DB) , loop=None, autocommit=False)

    logger.info("Connection established")


async def close_db_connection(app: FastAPI) -> None:
    logger.info("Closing connection to database")

    app.state.db_session.close()
    # app.state.pool.close()

    logger.info("Connection closed")


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
