from typing import AsyncGenerator, Callable, Type

#from asyncpg.pool import Pool
import aiomysql
from aiomysql.pool import Pool
from fastapi import Depends
from starlette.requests import Request

from app.db.repositories.base import BaseRepository


def _get_db_pool(request: Request) -> Pool:
    try:
        return request.app.state.pool
    except:
        return False
    
def _get_app_db_session(request: Request) -> any:
    try:
        return request.app.state.db_session
    except:
        return False
def get_repository(repo_type: Type[BaseRepository]) -> Callable:  # type: ignore
    async def _get_repo(
        # pool: Pool = Depends(_get_db_pool),
        db_session: any = Depends(_get_app_db_session),
    ) -> AsyncGenerator[BaseRepository, None]:
        if db_session:
            try:
                # async with pool.acquire() as conn:
                #     # yield repo_type(conn)
                #     async with conn.cursor(aiomysql.DictCursor) as cur:
                #         try:
                #             # this is where the "work" happens!
                #             yield repo_type(db_session, cur)
                #         except:
                #             # if any kind of exception occurs, rollback transaction
                #             db_session.rollback()
                #             raise
                #         finally:
                #             db_session.close()
                #         # yield repo_type(db_session, cur)
                try:
                    # this is where the "work" happens!
                    yield repo_type(db_session)
                except Exception as error:
                    # if any kind of exception occurs, rollback transaction
                    db_session.rollback()
                    raise
                finally:
                    db_session.close()
            except Exception as error:
                if db_session:
                    db_session.close()
                print("Fail to acqure Pool or DB Connection 1")
                print(str(error))
                raise
        else:
            if db_session:
                db_session.close()
            print("Fail to acqure Pool or DB Connection 2")
            raise
    return _get_repo