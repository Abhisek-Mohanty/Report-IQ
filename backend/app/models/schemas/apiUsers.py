from app.models.common import DateTimeModelMixin, IDModelMixin

class APIUser():
    emailId: str = ""
    id : int = None
    apiUserId : str = None
    firstName : str = None
    lastName : str = None
    
    def data(self,data : any):
        self.id = data.id
        self.apiUserId = data.apiUserId
        self.emailId = data.email
        self.firstName = data.firstName
        self.lastName = data.lastName