from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    nom           = Column(String(100), nullable=False)
    ville         = Column(String(100))
    code_postal   = Column(String(20))
    address       = Column(String(255))
    photo         = Column(String(500), nullable=True)
    titre_foncier = Column(String(50), unique=True, nullable=True)
    owner_id      = Column(Integer, ForeignKey("users.id"), nullable=True)

    apartments = relationship("Apartment", back_populates="department", cascade="all, delete")


class Apartment(Base):
    __tablename__ = "apartments"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    nom           = Column(String(100), nullable=False)
    etage         = Column(Integer, default=0)
    price         = Column(Integer, default=0)
    status        = Column(String(20), default="libre")
    description   = Column(String(255), nullable=True)
    photo         = Column(String(500), nullable=True)
    code          = Column(String(20), unique=True, nullable=True)
    code_date     = Column(String(30), nullable=True)   # date de génération du code
    maintenance   = Column(Integer, default=0)  # 0 = normal, 1 = en maintenance

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="apartments")
    tenants    = relationship("User", back_populates="apartment")
    contracts  = relationship("Contract", back_populates="apartment", cascade="all, delete")


class User(Base):
    __tablename__ = "users"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    nom                 = Column(String(100), nullable=False)
    prenom              = Column(String(100), nullable=False)
    email               = Column(String(150), unique=True, nullable=False)
    telephone           = Column(String(30), nullable=True)
    cin                 = Column(String(30), nullable=True)
    password            = Column(String(255), nullable=False)
    role                = Column(String(20), nullable=False)
    must_change_password = Column(Integer, default=0)  # 1 = doit changer son mot de passe
    statut               = Column(String(20), default="actif")  # actif | ancien

    tenant_code         = Column(String(20), unique=True, nullable=True)
    apartment_id        = Column(Integer, ForeignKey("apartments.id"), nullable=True)

    apartment = relationship("Apartment", back_populates="tenants")
    contracts = relationship("Contract", back_populates="tenant")

    # Messages envoyés et reçus
    sent_messages     = relationship("Message", foreign_keys="Message.sender_id",   back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")


class Contract(Base):
    __tablename__ = "contracts"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    date_debut    = Column(String(20), nullable=False)
    date_fin      = Column(String(20), nullable=False)
    status        = Column(String(20), default="actif")
    caution       = Column(Integer, default=0)
    montant_total = Column(Integer, default=0)
    contract_file = Column(String(500), nullable=True)
    tenant_id     = Column(Integer, ForeignKey("users.id"))
    apartment_id  = Column(Integer, ForeignKey("apartments.id"))

    tenant    = relationship("User", back_populates="contracts")
    apartment = relationship("Apartment", back_populates="contracts")
    factures  = relationship("Facture", back_populates="contract", cascade="all, delete")


class Facture(Base):
    __tablename__ = "factures"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    type                 = Column(String(50), nullable=False)
    montant              = Column(Integer, nullable=False)
    date_facture         = Column(String(20), nullable=False)
    status               = Column(String(20), default="en_attente")
    periode_consommation = Column(String(100), nullable=True)
    date_delai           = Column(String(20), nullable=True)
    contract_id          = Column(Integer, ForeignKey("contracts.id"))

    contract = relationship("Contract", back_populates="factures")


class Message(Base):
    __tablename__ = "messages"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime, server_default=func.now())  # auto timestamp

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")