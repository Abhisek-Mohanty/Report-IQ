from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class EmployeeKYC(Base):
    __tablename__ = "EmployeeKYCs"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    employeeId      = Column("employeeId", Integer, ForeignKey("Employees.id"))
    aadharNumber    = Column("aadharNumber", String)
    completedAt     = Column("completedAt", DateTime)
    kycDetail       = Column("kycDetail", String)
    eKycRequestId   = Column("eKycRequestId", String)
    eKycStatus      = Column("eKycStatus", String)
    eKycAccessTokenId = Column("eKycAccessTokenId", String)
    isValid         = Column("isValid", Integer)

    name            = Column("name", String)
    idNumber        = Column("idNumber", String)
    documentType    = Column("documentType", String)
    gender          = Column("gender", String)
    dob             = Column("dob", DateTime)
    image           = Column("image", String)
    currentAddress  = Column("currentAddress", String)
    currentDistrictOrCity = Column("currentDistrictOrCity", String)
    currentLocalityOrPostOffice = Column("currentLocalityOrPostOffice", String)
    currentPincode  = Column("currentPincode", String)
    currentState    = Column("currentState", String)
    permanentAddress = Column("permanentAddress", String)
    permanentDistrictOrCity = Column("permanentDistrictOrCity", String)
    permanentLocalityOrPostOffice = Column("permanentLocalityOrPostOffice", String)
    permanentPincode = Column("permanentPincode", String)
    permanentState  = Column("permanentState", String)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="EmployeeKYC.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="EmployeeKYC.updatedBy==User.id")
    
    Employee        = relationship("Employee", back_populates="EmployeeKYC") 