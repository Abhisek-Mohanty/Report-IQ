from fastapi import APIRouter

from app.api.routes.basicApi import authentication
from app.api.routes.basicApi import google_auth
from app.api.routes.basicApi import aiInsights
from app.api.routes.basicApi import aiValidator


router = APIRouter()
# router.include_router(authentication.router, tags=["authentication"], prefix="/auth")
router.include_router(google_auth.router, tags=["google_auth"], prefix="")
router.include_router(aiInsights.router, tags=["aiInsights"], prefix="/aiInsights")
router.include_router(aiValidator.router, tags=["aiValidator"], prefix="/aiValidator")

