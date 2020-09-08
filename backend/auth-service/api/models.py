from sqlalchemy import Boolean, Column, ForeignKey, Integer, String

from .database import Base

class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(16), unique=True, index=True)
    name = Column(String(16))
    surname = Column(String(16))
    password = Column(String(16))


