from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class AssetAssign(Base):
    __tablename__ = "AssetAssigns"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    assetId = Column("assetId", Integer, ForeignKey("Assets.id"))
    isHistory = Column("isHistory", Integer)
    assignedAt = Column("assignedAt", DateTime)
    assignedTo = Column("assignedTo", Integer, ForeignKey("Employees.id"))
    assignedBy = Column("assignedBy", Integer, ForeignKey("Users.id"))
    assignStatus = Column("assignStatus", Integer)
    assignSubStatus = Column("assignSubStatus", Integer)

    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="AssetAssign.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="AssetAssign.updatedBy==User.id")
    AssignedTo      = relationship("Employee", primaryjoin="AssetAssign.assignedTo==Employee.id")

    Asset           = relationship("Asset", back_populates = "AssetAssign")