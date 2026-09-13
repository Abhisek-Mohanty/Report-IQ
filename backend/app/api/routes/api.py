from fastapi import APIRouter

# from app.api.routes.basicApi import dashboard
from app.api.routes.basicApi import authentication, document
from app.api.routes.basicApi import company, member
from app.api.routes.basicApi import employee
from app.api.routes.basicApi import inventory


router = APIRouter()
router.include_router(authentication.router, tags=["authentication"], prefix="/auth")
router.include_router(document.router, tags=["document"], prefix="/document")
router.include_router(employee.router, tags=["employee"], prefix="/employee")
router.include_router(inventory.router, tags=["inventory"], prefix="/inventory")
router.include_router(member.router, tags=["member"], prefix="/member")
router.include_router(company.router, tags=["company"], prefix="/company")