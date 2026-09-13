from typing import Optional

from app.models.domain.rwmodel import Base

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship


class Crawl(Base):
    __tablename__ = "Crawls"
    id = Column("id", Integer, primary_key=True, index=True, autoincrement=True)
    pageURL = Column("pageURL", String)
    metaData = Column("metaData", String)
    header = Column("header", String)
    lastUpdatedAt = Column("lastUpdatedAt", DateTime)
    createdAt = Column("createdAt", DateTime) 


    




