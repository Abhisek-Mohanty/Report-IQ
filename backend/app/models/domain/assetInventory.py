from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class AssetInventory(Base):
    __tablename__ = "AssetInventories"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    assetId = Column("assetId", Integer, ForeignKey("Assets.id"))
    invoiceId = Column("invoiceId", Integer, ForeignKey("Invoices.id"))
    invoiceType = Column("invoiceType", Integer)
    
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="AssetInventory.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="AssetInventory.updatedBy==User.id")

    Invoice =  relationship("Invoice", back_populates="AssetInventory")
    Asset =  relationship("Asset", back_populates="AssetInventory")

