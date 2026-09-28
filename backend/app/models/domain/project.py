from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import relationship

class Project(Base):
    __tablename__ = "Projects"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    company         = Column("company", Integer, ForeignKey("Companies.id"))
    title           = Column("title", String)
    description     = Column("description", String)
    status          = Column("status", Integer)
    startAt         = Column("startAt", DateTime)
    endAt           = Column("endAt", DateTime)
    departments     = Column("departments", JSON)
        
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Project.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="Project.updatedBy==User.id")
    
    Company         = relationship("Company", back_populates="Project")
     