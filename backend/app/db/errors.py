from starlette.responses import JSONResponse
from fastapi import status

class CustomException(Exception):
    """Raised when entity was not found in database."""
    def __init__(self, status_code, detail="Internal Server Error"):
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.detail)

class UnauthorizedAccess(Exception):
    """Raised when entity was not found in database."""
    def __init__(self, status_code, detail="Entity Doens not Exist"):
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.detail)

class EntityDoesNotExist(Exception):
    """Raised when entity was not found in database."""
    def __init__(self, status_code, detail="Entity Doens not Exist"):
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.detail)

class ErrorResponse(Exception):
    """Raised when exception raised."""
    def __init__(self, status_code, detail="Internal Server Error"):
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.detail)

class ValidationResponse(Exception):
    """Raised when entity has validation error."""
    def __init__(self, status_code, detail="Data validation error.", msgList=[]):
        self.status_code = status_code
        self.detail = detail
        self.msgList = msgList

        super().__init__(self.detail)
