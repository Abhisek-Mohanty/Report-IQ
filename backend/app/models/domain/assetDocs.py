from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class AssetDocument(Base):
    __tablename__ = "AssetDocuments"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    assetId = Column("assetId", Integer, ForeignKey("Assets.id"))
    maintainanceId = Column("maintainanceId", Integer, ForeignKey("MaintainanceLogs.id"))
    description = Column("description", String)
    s3Path = Column("s3Path", String)

    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="AssetDocument.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="AssetDocument.updatedBy==User.id")
    # Asset           = relationship("Asset", back_populates="AssetDocument")
    # MaintainanceLog = relationship("MaintainanceLog", back_populates="AssetDocument")
    MaintainanceLog = relationship("MaintainanceLog",back_populates="MaintainanceDocuments")


      