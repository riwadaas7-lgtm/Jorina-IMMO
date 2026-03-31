from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import random
import string
from pydantic import BaseModel
from typing import Optional
from jose import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext

# ─── CONFIG ───────────────────────────────────────────────
SECRET_KEY = "JORILINA_SECRET_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── INIT ─────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB ───────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── HELPERS ──────────────────────────────────────────────
def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ─── SCHEMAS ──────────────────────────────────────────────
class RegisterData(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str
    telephone: Optional[str] = ""
    cin: Optional[str] = ""
    role: str                          # locataire / proprietaire

class LoginData(BaseModel):
    email: str
    password: str
    role: str                          # locataire / proprietaire

class JoinData(BaseModel):
    code: str
    user_id: int

class DepartmentData(BaseModel):
    nom: str
    ville: str
    code_postal: str
    address: str

class ApartmentData(BaseModel):
    nom: str
    etage: Optional[int] = 0
    price: Optional[int] = 0
    description: Optional[str] = ""
    department_id: int

class ContractData(BaseModel):
    date_debut: str
    date_fin: str
    caution: int
    montant_total: int
    tenant_id: int
    apartment_id: int

class FactureData(BaseModel):
    type: str
    montant: int
    date_facture: str
    contract_id: int

# ══════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════

@app.post("/register")
def register(data: RegisterData, db: Session = Depends(get_db)):
    # check duplicate email
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password=hash_password(data.password),
        telephone=data.telephone,
        cin=data.cin,
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.role)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": user.role
        }
    }


@app.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email introuvable")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    if user.role != data.role:
        raise HTTPException(status_code=403, detail=f"Ce compte est un compte {user.role}, pas {data.role}")

    token = create_token(user.id, user.role)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": user.role,
            "apartment_id": user.apartment_id
        }
    }


# ══════════════════════════════════════════════════════════
# DEPARTMENTS
# ══════════════════════════════════════════════════════════

@app.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@app.post("/departments")
def add_department(data: DepartmentData, db: Session = Depends(get_db)):
    dep = models.Department(**data.dict())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep

@app.put("/departments/{id}")
def update_department(id: int, data: DepartmentData, db: Session = Depends(get_db)):
    dep = db.query(models.Department).get(id)
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, value in data.dict().items():
        setattr(dep, key, value)
    db.commit()
    db.refresh(dep)
    return dep

@app.delete("/departments/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    dep = db.query(models.Department).get(id)
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dep)
    db.commit()
    return {"message": "Département supprimé"}


# ══════════════════════════════════════════════════════════
# APARTMENTS
# ══════════════════════════════════════════════════════════

@app.get("/apartments")
def get_all_apartments(db: Session = Depends(get_db)):
    return db.query(models.Apartment).all()

@app.get("/apartments/user/{user_id}")
def get_apartments_for_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "proprietaire":
        return db.query(models.Apartment).all()
    if user.apartment_id:
        return db.query(models.Apartment).filter(
            models.Apartment.id == user.apartment_id
        ).all()
    return []

@app.post("/apartments")
def add_apartment(data: ApartmentData, db: Session = Depends(get_db)):
    ap = models.Apartment(
        nom=data.nom,
        etage=data.etage,
        price=data.price,
        description=data.description,
        department_id=data.department_id,
        code=generate_code(),
        status="libre"
    )
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap

@app.put("/apartments/{id}")
def update_apartment(id: int, data: ApartmentData, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(status_code=404, detail="Apartment not found")
    for key, value in data.dict().items():
        setattr(ap, key, value)
    db.commit()
    db.refresh(ap)
    return ap

@app.delete("/apartments/{id}")
def delete_apartment(id: int, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(status_code=404, detail="Apartment not found")
    db.delete(ap)
    db.commit()
    return {"message": "Appartement supprimé"}


# ══════════════════════════════════════════════════════════
# JOIN WITH CODE (locataire joins apartment)
# ══════════════════════════════════════════════════════════

@app.post("/join")
def join_apartment(data: JoinData, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).filter(models.Apartment.code == data.code).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Code invalide")
    if ap.status == "occupe":
        raise HTTPException(status_code=400, detail="Appartement déjà occupé")

    user = db.query(models.User).get(data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.apartment_id = ap.id
    ap.status = "occupe"
    db.commit()
    return {"message": "Vous avez rejoint l'appartement", "apartment": ap.nom}


# ══════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"message": "Jorina IMMO API is running "}

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}


# ══════════════════════════════════════════════════════════
# CONTRACTS
# ══════════════════════════════════════════════════════════

@app.get("/contracts")
def get_contracts(db: Session = Depends(get_db)):
    return db.query(models.Contract).all()

@app.get("/contracts/user/{user_id}")
def get_contracts_for_user(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Contract).filter(
        models.Contract.tenant_id == user_id
    ).all()

@app.post("/contracts")
def add_contract(data: ContractData, db: Session = Depends(get_db)):
    contract = models.Contract(**data.dict(), status="actif")
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract

@app.put("/contracts/{id}")
def update_contract(id: int, data: ContractData, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).get(id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    for key, value in data.dict().items():
        setattr(contract, key, value)
    db.commit()
    db.refresh(contract)
    return contract

@app.delete("/contracts/{id}")
def delete_contract(id: int, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).get(id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    db.delete(contract)
    db.commit()
    return {"message": "Contrat supprimé"}


# ══════════════════════════════════════════════════════════
# FACTURES
# ══════════════════════════════════════════════════════════

@app.get("/factures")
def get_factures(db: Session = Depends(get_db)):
    return db.query(models.Facture).all()

@app.get("/factures/contract/{contract_id}")
def get_factures_for_contract(contract_id: int, db: Session = Depends(get_db)):
    return db.query(models.Facture).filter(
        models.Facture.contract_id == contract_id
    ).all()

@app.post("/factures")
def add_facture(data: FactureData, db: Session = Depends(get_db)):
    facture = models.Facture(**data.dict(), status="en_attente")
    db.add(facture)
    db.commit()
    db.refresh(facture)
    return facture

@app.put("/factures/{id}/pay")
def pay_facture(id: int, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")
    facture.status = "payee"
    db.commit()
    return {"message": "Facture marquée comme payée"}

@app.delete("/factures/{id}")
def delete_facture(id: int, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")
    db.delete(facture)
    db.commit()
    return {"message": "Facture supprimée"}