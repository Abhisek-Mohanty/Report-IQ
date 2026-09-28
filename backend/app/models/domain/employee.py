from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class Employee(Base):
    __tablename__ = "Employees"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    employeeId       = Column("employeeId", String)
    firstName       = Column("firstName", String)
    lastName        = Column("lastName", String)
    position        = Column("position", String)
    emailId         = Column("emailId", String)
    mobile          = Column("mobile", String)
    status          = Column("status", Integer)
    personalEmail   = Column("personalEmail", String)
    dob             = Column("dob", String)
    gender          = Column("gender", Integer)
    profilePic      = Column("profilePic", String)
    address         = Column("address", String)
    department      = Column("department", Integer)
    joiningDate     = Column("joiningDate", DateTime)
    exitDate        = Column("exitDate", DateTime)
    terminationReasion = Column("terminationReasion", String)
    reportingManager = Column("reportingManager", Integer)
    verificationToken  = Column("verificationToken", String)
    tokenValidTill  = Column("tokenValidTill", String)
    verificationStatus = Column("verificationStatus", Integer)
    verificationRemark = Column("verificationRemark", String)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Employee.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="Employee.updatedBy==User.id")
    
    EmployeePAN     = relationship("EmployeePAN", back_populates="Employee")
    EmployeeKYC     = relationship("EmployeeKYC", back_populates="Employee")
    EmployeeDoc     = relationship("EmployeeDoc", back_populates="Employee")
    CrimeCheck      = relationship("CrimeCheck", back_populates="Employee")
      