
from app.models.domain.db import *

class UserDataFiter():
    db_session = None
    def __init__(self, db_session: any) -> None:
        self.db_session = db_session
        
    async def loadFilters(self, user):
        filters = []
        if user.context == "customer":
            filters.append( Customer.id == user.id )
            return filters
        elif user.context == "partner":
            filters.append( Customer.id == user.id )
            return filters
        
        oEmployee = self.db_session.query(Employee).filter(Employee.id == user.id).first()
        if not oEmployee:
            return []
            
        oEmployeeBranch = self.db_session.query(
                        Branch
                    ).join(
                        Branch.BranchEmployee
                    ).filter(
                        BranchEmployee.employeeId == user.id
                    ).all()
        if not oEmployeeBranch:
            return []
          
        return filters
    