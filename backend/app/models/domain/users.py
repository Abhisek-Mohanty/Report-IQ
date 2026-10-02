from typing import Optional

from app.models.common import DateTimeModelMixin, IDModelMixin
from app.models.domain.rwmodel import RWModel , Base
from app.services import security

from sqlalchemy import inspect, Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship

from loguru import logger


class User(Base):
    __tablename__ = "Users"
    extend_existing=True
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    emailId         = Column("emailId", String)
    modeType      = Column("modeType", Integer)
    planType        = Column("planType", Integer)
    firstName       = Column("firstName", String)
    lastName        = Column("lastName", String)
    fullName        = Column("fullName", String)
    mobile          = Column("mobile", String)
    alternateEmailId = Column("alternateEmailId", String)
    alternateMobile = Column("alternateMobile", String)
    sub             = Column("sub", String)
    gender          = Column("gender", Integer)
    dob             = Column("dob", DateTime)
    profilePic      = Column("profilePic", String)
    isDisabled      = Column("isDisabled", String)
    isLocked        = Column("isLocked", String)
    createdAt       = Column( "createdAt", DateTime)
    createdBy       = Column("createdBy", Integer, ForeignKey("Users.id"))
    updatedAt       = Column("updatedAt",DateTime)
    updatedBy       = Column("updatedBy", Integer, ForeignKey("Users.id"))

    CreatedByUser = relationship("User", foreign_keys=[createdBy], primaryjoin="User.createdBy==User.id")
    UpdatedByUser = relationship("User", foreign_keys=[updatedBy], primaryjoin="User.updatedBy==User.id")
    
    
class UserInDB(IDModelMixin, DateTimeModelMixin):
    context: str = ""
    salt: str = ""
    hashed_password: str = ""
    emailId: str = ""
    id : int = None
    firstName : str = None
    lastName : str = None
    resetPasswordToken : str = None
    resetPasswordExpires : str = None
    passwordChangeRequired : bool = None
    role : int = None

    def data(self,data : any):
        self.id = data.id
        self.emailId = data.emailId
        self.firstName = data.firstName
        self.lastName = data.lastName
        self.resetPasswordToken = data.resetPasswordToken
        self.resetPasswordExpires = data.resetPasswordExpires
        self.passwordChangeRequired = data.passwordChangeRequired
        if(data.salt):
            self.salt = data.salt
        if(data.password):
            self.hashed_password = data.password
        if(data.role):
            self.role = data.role
        # self.salt = security.generate_salt()
        # self.hashed_password = security.get_password_hash(self.salt + "string")
        # logger.info(self.salt)
        # logger.info(self.hashed_password)

    def check_password(self, password: str) -> bool:
        return security.verify_password(self.salt + password, self.hashed_password)

    def change_password(self, password: str) -> None:
        self.salt = security.generate_salt()
        self.hashed_password = security.get_password_hash(self.salt + password)
