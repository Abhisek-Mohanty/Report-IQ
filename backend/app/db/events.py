import aiomysql
from fastapi import FastAPI
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship
from urllib.parse import quote_plus

from app.core.config import (
    DEBUG,
    DB_TYPE,
    SUPABASE_HOST,
    SUPABASE_PORT,
    SUPABASE_USER,
    SUPABASE_PWD,
    SUPABASE_DB,
    SUPABASE_DATABASE_URL,
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PWD,
    MYSQL_DB,
    MYSQL_DATABASE_URL,
    MAX_CONNECTIONS_COUNT,
    MIN_CONNECTIONS_COUNT,
)


class DBSession:
    db = None

oDBSession = DBSession()


async def connect_to_db(app: FastAPI) -> None:
    app.state.db_session = await getDBConnection()
    logger.info("Database connection established successfully")


async def close_db_connection(app: FastAPI) -> None:
    logger.info("Closing connection to database")

    app.state.db_session.close()
    # app.state.pool.close()

    logger.info("Connection closed")


async def getDBConnection():
    try:
        if oDBSession.db:
            return oDBSession.db

        if DB_TYPE == "mysql":
            connection_string = f"mysql+pymysql://{MYSQL_USER}:%s@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
            logger.info("Connecting to MySQL Database at {0}:{1}/{2}", MYSQL_HOST, MYSQL_PORT, MYSQL_DB)
            db = create_engine(
                connection_string % quote_plus(str(MYSQL_PWD)),
                echo=DEBUG,
                pool_size=5,
                max_overflow=5,
                pool_pre_ping=True,
            )
        else:
            # Default: Supabase (PostgreSQL via psycopg2)
            if SUPABASE_DATABASE_URL:
                db_url = SUPABASE_DATABASE_URL
            else:
                encoded_pwd = quote_plus(str(SUPABASE_PWD))
                db_url = f"postgresql+psycopg2://{SUPABASE_USER}:{encoded_pwd}@{SUPABASE_HOST}:{SUPABASE_PORT}/{SUPABASE_DB}?sslmode=require"

            logger.info(
                "Connecting to Supabase (PostgreSQL) at {0}:{1}/{2} as user {3}",
                SUPABASE_HOST,
                SUPABASE_PORT,
                SUPABASE_DB,
                SUPABASE_USER,
            )
            db = create_engine(
                db_url,
                echo=DEBUG,
                pool_size=5,
                max_overflow=5,
                pool_recycle=300,
                pool_pre_ping=True,
            )

        session_factory = sessionmaker(bind=db, autoflush=False, expire_on_commit=True)
        oDBSession.db = session_factory()

        return oDBSession.db
    except BaseException as error:
        logger.error("Failed to establish database connection: {0}", error)
        print("Database connection error:", error)
        raise error
