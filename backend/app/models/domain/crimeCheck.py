from app.models.domain.rwmodel import Base

from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class CrimeCheck(Base):
    __tablename__ = "CrimeChecks"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    employeeId = Column("employeeId", Integer, ForeignKey("Employees.id"))
    requestId = Column("requestId", String)
    requestTime = Column("requestTime", DateTime)
    status = Column("status", String)
    completeReponse = Column("completeReponse", String)
    fileName        = Column("fileName", String)
    downloadUrl = Column("downloadUrl", String)

    createdBy = Column("createdBy", Integer, ForeignKey("Users.id"))
    updatedBy = Column("updatedBy", Integer, ForeignKey("Users.id"))
    createdAt = Column("createdAt", DateTime)
    updatedAt = Column("updatedAt", DateTime)
    
    CreatedBy = relationship("User", primaryjoin="CrimeCheck.createdBy==User.id")
    UpdatedBy = relationship("User", primaryjoin="CrimeCheck.updatedBy==User.id")
    Employee = relationship("Employee", back_populates="CrimeCheck")