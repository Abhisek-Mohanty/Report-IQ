from app.models.common import DateTimeModelMixin, IDModelMixin

class Webhook():
    emailId: str = ""
    id : int = None
    webhookeUserId : str = None
    firstName : str = None
    lastName : str = None
    
    def data(self, data : any):
        self.id = data.id
        self.webhookeUserId = data.webhookeUserId
        self.emailId = data.email
        self.firstName = data.firstName
        self.lastName = data.lastName