from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    nom = Column(String)
    ville = Column(String)
    code_postal = Column(String)
    address = Column(String)
    photo = Column(String)

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
    status = Column(String, default="libre")   # libre / occupe
    description = Column(String)
    photo = Column(String)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    code = Column(String, unique=True)

    department = relationship("Department", back_populates="apartments")
    tenants = relationship("User", back_populates="apartment")
    contracts = relationship("Contract", back_populates="apartment", cascade="all, delete")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    nom = Column(String)
    prenom = Column(String)
    email = Column(String, unique=True)
    telephone = Column(String)
    cin = Column(String)
    password = Column(String)               # ✅ added
    role = Column(String)                   # locataire / proprietaire
    tenant_code = Column(String, unique=True, nullable=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=True)

    apartment = relationship("Apartment", back_populates="tenants")
    contracts = relationship("Contract", back_populates="tenant")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    date_debut = Column(String)
    date_fin = Column(String)
    status = Column(String)                 # actif / termine / resilie
    caution = Column(Integer)
    montant_total = Column(Integer)
    contract_file = Column(String, nullable=True)

    tenant_id = Column(Integer, ForeignKey("users.id"))
    apartment_id = Column(Integer, ForeignKey("apartments.id"))

    tenant = relationship("User", back_populates="contracts")
    apartment = relationship("Apartment", back_populates="contracts")
    factures = relationship("Facture", back_populates="contract", cascade="all, delete")


class Facture(Base):
    __tablename__ = "factures"

    id = Column(Integer, primary_key=True)
    type = Column(String)                   # loyer / charge / autre
    montant = Column(Integer)
    date_facture = Column(String)
    status = Column(String)                 # payee / en_attente
    contract_id = Column(Integer, ForeignKey("contracts.id"))

    contract = relationship("Contract", back_populates="factures")
