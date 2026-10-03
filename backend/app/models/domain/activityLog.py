from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class ActivityLog(Base):
    __tablename__ = "ActivityLogs"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    dataSetId = Column("dataSetId", Integer , ForeignKey("DataSets.id"))
    conversationId = Column("conversationId", Integer , ForeignKey("Conversations.id"))
    prompt = Column("prompt", String)
    promptType = Column("promptType", Integer)
    statusCode = Column("statusCode", String)
    response   = Column("response", String)
    promptToken = Column("promptToken", Float)
    completionToken = Column("completionToken", Float)
    totalTokens = Column("totalTokens", Float)
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="ActivityLog.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="ActivityLog.updatedBy==User.id")

      