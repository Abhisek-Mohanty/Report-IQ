from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class MaintainanceLog(Base):
    __tablename__ = "MaintainanceLogs"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    assetId = Column("assetId", Integer, ForeignKey("Assets.id"))
    issueType = Column("issueType", Integer)
    issueComment = Column("issueComment", String)
    assetOwner = Column("assetOwner", Integer , ForeignKey("Users.id"))
    reportTo = Column("reportTo", Integer , ForeignKey("Users.id"))
    isHistory = Column("isHistory", Integer)
    maintainanceStatus = Column("maintainanceStatus", Integer)
    
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="MaintainanceLog.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="MaintainanceLog.updatedBy==User.id")
    Asset           = relationship("Asset", back_populates="MaintainanceLog")
    MaintainanceDocuments = relationship("AssetDocument",back_populates="MaintainanceLog")

      