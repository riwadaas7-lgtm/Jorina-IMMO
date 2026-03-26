from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base
from sqlalchemy.orm import relationship


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    nom = Column(String)
    ville = Column(String)
    code_postal = Column(String)
    address = Column(String)

    apartments = relationship(
        "Apartment",
        back_populates="department",
        cascade="all, delete"
    )

class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(Integer, primary_key=True)
    nom = Column(String)
    etage = Column(Integer)
    price = Column(Integer)
    status = Column(String)  # libre / occupe
    description = Column(String)
    photo = Column(String)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)    
    department = relationship("Department", back_populates="apartments")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    nom = Column(String)
    prenom = Column(String)
    email = Column(String, unique=True)
    telephone = Column(String)
    cin = Column(String)
    role = Column(String)  # locataire / proprietaire

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    date_debut = Column(String)
    date_fin = Column(String)
    status = Column(String)
    caution = Column(Integer)
    montant_total = Column(Integer)

    tenant_id = Column(Integer, ForeignKey("users.id"))
    apartment_id = Column(Integer, ForeignKey("apartments.id"))

class Facture(Base):
    __tablename__ = "factures"

    id = Column(Integer, primary_key=True)
    type = Column(String)
    montant = Column(Integer)
    date_facture = Column(String)
    status = Column(String)
    contract_id = Column(Integer, ForeignKey("contracts.id"))