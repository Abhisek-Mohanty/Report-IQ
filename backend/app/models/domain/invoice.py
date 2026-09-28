from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class Invoice(Base):
    __tablename__ = "Invoices"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    invoiceNumber = Column("invoiceNumber", String)
    invoiceRefNumber = Column("invoiceRefNumber", String)
    paidAmount = Column("paidAmount", Integer)
    billingAt = Column("billingAt", DateTime)
    quantity = Column("quantity", Integer)
    invoiceType = Column("invoiceType", Integer)
    clearanceAt = Column("clearanceAt", DateTime)
    billingFrom = Column("billingFrom", String)
    invoiceDoc = Column("invoiceDoc", String)
    status = Column("status", Integer)
    deliveryDate = Column("deliveryDate", DateTime)
    deliveryType = Column("deliveryType", Integer)
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Invoice.createdBy == User.id")
    UpdatedBy       = relationship("User", primaryjoin="Invoice.updatedBy == User.id")
    AssetInventory =  relationship("AssetInventory", back_populates="Invoice")
    
    
      