from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class Company(Base):
    __tablename__ = "Companies"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    title           = Column("title", String)
    description     = Column("description", String)
    status          = Column("status", Integer)
    address         = Column("address", String)
    employees       = Column("employees", Integer)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Company.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="Company.updatedBy==User.id")
    
    Project         = relationship("Project", back_populates="Company")
    