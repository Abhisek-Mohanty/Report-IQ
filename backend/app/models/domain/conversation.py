from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class Conversation(Base):
    __tablename__ = "Conversations"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    dataSetId = Column("dataSetId", Integer , ForeignKey("DataSets.id"))
    type = Column("type", Integer)
    totalTokens = Column("totalTokens", Float)
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="Conversation.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="Conversation.updatedBy==User.id")

      