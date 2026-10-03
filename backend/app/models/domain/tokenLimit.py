from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class TokenLimit(Base):
    __tablename__ = "TokenLimits"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    loggedBy = Column("loggedBy", Integer , ForeignKey("Users.id")) 
    usedTokens = Column("usedTokens", Float)
    usageDate = Column("usageDate", DateTime )

    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="TokenLimit.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="TokenLimit.updatedBy==User.id")
    LoggedBy        = relationship("User", primaryjoin="TokenLimit.loggedBy==User.id")

      