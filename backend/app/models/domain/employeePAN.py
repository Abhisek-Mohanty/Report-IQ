from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class EmployeePAN(Base):
    __tablename__ = "EmployeePANs"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    employeeId      = Column("employeeId", Integer, ForeignKey("Employees.id"))
    panNumber       = Column("panNumber", String)
    fullName       = Column("fullName", String)
    isValid         = Column("isValid", Integer)
    panDocument     = Column("panDocument", String)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="EmployeePAN.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="EmployeePAN.updatedBy==User.id")
    
    Employee        = relationship("Employee", back_populates="EmployeePAN")    