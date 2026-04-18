from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    nom         = Column(String(100), nullable=False)
    ville       = Column(String(100))
    code_postal = Column(String(20))
    address     = Column(String(255))
    photo       = Column(String(500), nullable=True)

    # Un département contient plusieurs appartements
    # cascade="all, delete" = si on supprime le département,
    # ses appartements sont supprimés automatiquement
    apartments = relationship(
        "Apartment",
        back_populates="department",
        cascade="all, delete"
    )


class Apartment(Base):
    __tablename__ = "apartments"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    nom           = Column(String(100), nullable=False)
    etage         = Column(Integer, default=0)
    price         = Column(Integer, default=0)
    status        = Column(String(20), default="libre")  # libre / occupe / maintenance
    description   = Column(String(255), nullable=True)
    photo         = Column(String(500), nullable=True)
    code          = Column(String(20), unique=True, nullable=True)

    # Clé étrangère vers departments
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    # Relations
    department = relationship("Department", back_populates="apartments")
    tenants    = relationship("User",     back_populates="apartment")
    contracts  = relationship("Contract", back_populates="apartment", cascade="all, delete")


class User(Base):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    nom         = Column(String(100), nullable=False)
    prenom      = Column(String(100), nullable=False)
    email       = Column(String(150), unique=True, nullable=False)
    telephone   = Column(String(30),  nullable=True)
    cin         = Column(String(30),  nullable=True)
    password    = Column(String(255), nullable=False)
    role        = Column(String(20),  nullable=False)  # proprietaire / locataire
    tenant_code = Column(String(20),  unique=True, nullable=True)

    # Clé étrangère vers apartments (nullable = locataire sans appart)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=True)

    # Relations
    apartment = relationship("Apartment", back_populates="tenants")
    contracts = relationship("Contract",  back_populates="tenant")


class Contract(Base):
    __tablename__ = "contracts"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    date_debut    = Column(String(20), nullable=False)
    date_fin      = Column(String(20), nullable=False)
    status        = Column(String(20), default="actif")  # actif / termine / resilie
    caution       = Column(Integer, default=0)
    montant_total = Column(Integer, default=0)
    contract_file = Column(String(500), nullable=True)

    # Clés étrangères
    tenant_id    = Column(Integer, ForeignKey("users.id"))
    apartment_id = Column(Integer, ForeignKey("apartments.id"))

    # Relations
    tenant    = relationship("User",      back_populates="contracts")
    apartment = relationship("Apartment", back_populates="contracts")
    factures  = relationship("Facture",   back_populates="contract", cascade="all, delete")


class Facture(Base):
    __tablename__ = "factures"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    type         = Column(String(50),  nullable=False)   # loyer / electricite / eau / autre
    montant      = Column(Integer,     nullable=False)
    date_facture = Column(String(20),  nullable=False)
    status       = Column(String(20),  default="en_attente")  # en_attente / payee / en_retard

    # Clé étrangère vers contracts
    contract_id  = Column(Integer, ForeignKey("contracts.id"))

    # Relation
    contract = relationship("Contract", back_populates="factures")