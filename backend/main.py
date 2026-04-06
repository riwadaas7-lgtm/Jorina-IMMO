from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, engine
import models
import random
import string
import os
import uuid
from pydantic import BaseModel
from typing import Optional
from jose import jwt
from datetime import datetime, timedelta
import bcrypt

SECRET_KEY = "JORILINA_SECRET_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def ensure_schema():
    with engine.connect() as conn:
        department_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(departments)"))]
        if "photo" not in department_cols:
            conn.execute(text("ALTER TABLE departments ADD COLUMN photo VARCHAR"))
        apartment_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(apartments)"))]
        if "photo" not in apartment_cols:
            conn.execute(text("ALTER TABLE apartments ADD COLUMN photo VARCHAR"))
        user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)"))]
        if "tenant_code" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN tenant_code VARCHAR"))
        contract_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(contracts)"))]
        if "contract_file" not in contract_cols:
            conn.execute(text("ALTER TABLE contracts ADD COLUMN contract_file VARCHAR"))
        conn.commit()

ensure_schema()
models.Base.metadata.create_all(bind=engine)
app = FastAPI()
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def generate_tenant_code(db: Session) -> str:
    while True:
        code = "LOC-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        exists = db.query(models.User).filter(models.User.tenant_code == code).first()
        if not exists:
            return code


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def seed_test_data():
    db = SessionLocal()
    try:
        if db.query(models.Department).count() == 0:
            d1 = models.Department(
                nom="Residence Palmier",
                ville="Tunis",
                code_postal="1002",
                address="12 Rue de Marseille"
            )
            d2 = models.Department(
                nom="Residence Jasmin",
                ville="Sousse",
                code_postal="4000",
                address="8 Avenue Habib Bourguiba"
            )
            d3 = models.Department(
                nom="Residence Carthage",
                ville="Nabeul",
                code_postal="8000",
                address="21 Rue des Orangers"
            )
            db.add_all([d1, d2, d3])
            db.commit()
            db.refresh(d1)
            db.refresh(d2)
            db.refresh(d3)

            a1 = models.Apartment(
                nom="A101",
                etage=1,
                price=1200,
                status="libre",
                description="2 chambres, balcon",
                department_id=d1.id,
                code=generate_code(),
            )
            a2 = models.Apartment(
                nom="B204",
                etage=2,
                price=1500,
                status="occupe",
                description="3 chambres, vue mer",
                department_id=d2.id,
                code=generate_code(),
            )
            a3 = models.Apartment(
                nom="C303",
                etage=3,
                price=980,
                status="libre",
                description="Studio meuble",
                department_id=d3.id,
                code=generate_code(),
            )
            db.add_all([a1, a2, a3])
            db.commit()
            db.refresh(a2)

            owner = models.User(
                nom="Owner",
                prenom="Test",
                email="owner@test.com",
                telephone="+21612345678",
                cin="AA111111",
                password=hash_password("test1234"),
                role="proprietaire",
            )
            tenant = models.User(
                nom="Tenant",
                prenom="Test",
                email="tenant@test.com",
                telephone="+21687654321",
                cin="BB222222",
                password=hash_password("test1234"),
                role="locataire",
                tenant_code="LOC-TEST0001",
                apartment_id=a2.id,
            )
            db.add_all([owner, tenant])
            db.commit()
            db.refresh(tenant)

            contract = models.Contract(
                date_debut="2026-01-01",
                date_fin="2026-12-31",
                status="actif",
                caution=2000,
                montant_total=18000,
                tenant_id=tenant.id,
                apartment_id=a2.id,
            )
            db.add(contract)
            db.commit()
            db.refresh(contract)

            facture = models.Facture(
                type="loyer",
                montant=1500,
                date_facture="2026-02-01",
                status="en_attente",
                contract_id=contract.id,
            )
            db.add(facture)
            db.commit()
    finally:
        db.close()


seed_test_data()
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
    photo: Optional[str] = ""

class ApartmentData(BaseModel):
    nom: str
    etage: Optional[int] = 0
    price: Optional[int] = 0
    description: Optional[str] = ""
    department_id: int
    photo: Optional[str] = ""

class ContractData(BaseModel):
    date_debut: str
    date_fin: str
    caution: int
    montant_total: int
    tenant_id: int
    apartment_id: int
    contract_file: Optional[str] = ""

class UserUpdateData(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    cin: Optional[str] = None
    password: Optional[str] = None

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
        role=data.role,
        tenant_code=generate_tenant_code(db) if data.role == "locataire" else None
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
            "role": user.role,
            "tenant_code": user.tenant_code
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
            "tenant_code": user.tenant_code,
            "apartment_id": user.apartment_id
        }
    }


@app.post("/upload-image")
def upload_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = file.file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"http://127.0.0.1:8000/uploads/{filename}"}


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
        photo=data.photo,
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
    users = db.query(models.User).all()
    changed = False
    for user in users:
        if user.role == "locataire" and not user.tenant_code:
          user.tenant_code = generate_tenant_code(db)
          changed = True
    if changed:
        db.commit()
    return users

@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{id}")
def update_user(id: int, data: UserUpdateData, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    payload = data.dict(exclude_unset=True)

    if "email" in payload:
        existing = db.query(models.User).filter(
            models.User.email == payload["email"],
            models.User.id != id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    if "password" in payload and payload["password"]:
        payload["password"] = hash_password(payload["password"])

    for key, value in payload.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
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




