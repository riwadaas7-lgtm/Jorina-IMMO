from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ✅ Connexion MySQL au lieu de SQLite
# Format : mysql+pymysql://utilisateur:motdepasse@host:port/nom_base
DATABASE_URL = "mysql+pymysql://root:@localhost:3307/jorilina_db"
# root     = utilisateur MySQL (par défaut avec XAMPP)
# ""       = mot de passe vide (par défaut avec XAMPP)
# 3307     = port MySQL changé pour éviter les conflits avec une autre instance de MySQL
# jorilina_db = nom de la base qu'on vient de créer

engine = create_engine(DATABASE_URL)
# Note : on enlève connect_args={"check_same_thread": False}
# c'était spécifique à SQLite, MySQL n'en a pas besoin

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()