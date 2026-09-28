from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class EmployeeDoc(Base):
    __tablename__ = "EmployeeDocs"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    employeeId      = Column("employeeId", Integer, ForeignKey("Employees.id"))
    title           = Column("title", String)
    documentType    = Column("documentType", Integer)
    remark          = Column("remark", String)
    documentPath    = Column("documentPath", String)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="EmployeeDoc.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="EmployeeDoc.updatedBy==User.id")
    
    Employee        = relationship("Employee", back_populates="EmployeeDoc")
