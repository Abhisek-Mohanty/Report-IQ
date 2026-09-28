from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class Asset(Base):
    __tablename__ = "Assets"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    assetNumber = Column("assetNumber", String)
    modelNumber = Column("modelNumber", String)
    serialNumber = Column("serialNumber", String)
    status = Column("status", Integer)
    specifications = Column("specifications", String)
    branch = Column("branch", Integer)
    assetType = Column("assetType", Integer)
    ownerType = Column("ownerType", Integer)
    warrentyAt = Column("warrentyAt",DateTime)
    assetphoto = Column("assetphoto", String)
    lebelPhoto = Column("lebelPhoto", String)
    returnedAt = Column("returnedAt", DateTime)
    
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Asset.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="Asset.updatedBy==User.id")
    LastAssignLog      = relationship("AssetAssign", viewonly=True, uselist=False, primaryjoin="and_(Asset.id==AssetAssign.assetId, AssetAssign.isHistory == 0 )")
    LastMaintainanceLog      = relationship("MaintainanceLog", viewonly=True, uselist=False, primaryjoin="and_(Asset.id==MaintainanceLog.assetId, MaintainanceLog.isHistory == 0 )")


    AssetInventory =  relationship("AssetInventory", back_populates="Asset")
    AssetAssign = relationship("AssetAssign", back_populates = "Asset")
    MaintainanceLog = relationship("MaintainanceLog", back_populates = "Asset")

      