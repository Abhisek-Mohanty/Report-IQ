from fastapi import APIRouter

from app.api.routes.basicApi import employee

router = APIRouter()
router.include_router(employee.router, tags=["crimecheck"], prefix="/crimecheck")
