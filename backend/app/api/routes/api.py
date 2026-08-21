from fastapi import APIRouter
from app.api.routes import crawl

router = APIRouter()
router.include_router(crawl.router, tags=["document"], prefix="/document")