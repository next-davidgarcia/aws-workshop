from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os


MYSQL_DATABASE_URL = f"mysql+mysqlconnector://{os.environ['APP_DB_USR']}:{os.environ['APP_DB_PASSWD']}@{os.environ['APP_DB_HOST']}:{os.environ['APP_DB_PORT']}/{os.environ['APP_DB_SCHEME']}"

engine = create_engine(MYSQL_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()