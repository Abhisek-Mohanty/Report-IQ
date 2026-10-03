from fastapi import APIRouter

# from app.api.routes.basicApi import dashboard
from app.api.routes.basicApi import authentication
# from app.api.routes.basicApi import company, member
# from app.api.routes.basicApi import employee
# from app.api.routes.basicApi import inventory
from app.api.routes.basicApi import google_auth
from app.api.routes.basicApi import aiInsights


router = APIRouter()
# router.include_router(authentication.router, tags=["authentication"], prefix="/auth")
router.include_router(google_auth.router, tags=["google_auth"], prefix="")
# router.include_router(document.router, tags=["document"], prefix="/document")
# router.include_router(employee.router, tags=["employee"], prefix="/employee")
# router.include_router(inventory.router, tags=["inventory"], prefix="/inventory")
# router.include_router(member.router, tags=["member"], prefix="/member")
# router.include_router(company.router, tags=["company"], prefix="/company")
router.include_router(aiInsights.router, tags=["aiInsights"], prefix="/aiInsights")
