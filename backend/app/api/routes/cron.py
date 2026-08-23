from fastapi import APIRouter
from app.db.events import getDBConnection 
from fastapi_utilities import repeat_every, repeat_at

# from app.db.repositories.cronJob.application import ApplicationCronRepository
# # from app.db.repositories.rbacPermission import RBACPermissionRepository
# from app.db.repositories.cronJob.reminder import Reminder
# from app.db.repositories.cronJob.collection import CollectionCronRepository
# from app.db.repositories.cronJob.mis import MIS
# from app.db.repositories.cronJob.razorpayPresentation import autoRazorpayPresentation
# from app.db.repositories.cronJob.misMailReminder import MisMailReminder
# from app.db.repositories.manualActivity import ManualActivityRepository
from app.core.config import ENVIRONMENT

router = APIRouter()

class sessionDB :
    db = None

oSessionDB = sessionDB()