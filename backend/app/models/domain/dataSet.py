from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

class DataSet(Base):
    __tablename__ = "DataSets"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    dataSetNumber = Column("dataSetNumber", String)
    rowSchema = Column("rowSchema", String)
    sourceFileName = Column("sourceFileName", String)
    rowCount = Column("rowCount", Integer)
    rowExamples = Column("rowExamples", String)
    createdBy = Column("createdBy", Integer , ForeignKey("Users.id")) 
    updatedBy = Column("updatedBy", Integer , ForeignKey("Users.id")) 
    createdAt = Column("createdAt", DateTime ) 
    updatedAt = Column("updatedAt", DateTime ) 
    
    CreatedBy       = relationship("User", primaryjoin="DataSet.createdBy==User.id")
    UpdatedBy       = relationship("User", primaryjoin="DataSet.updatedBy==User.id")

      