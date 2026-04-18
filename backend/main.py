from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import random
import string
import hashlib
import os
import shutil
from pydantic import BaseModel
from typing import Optional
from jose import jwt
from datetime import datetime, timedelta

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY  = "JORILINA_SECRET_2024"
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 heures

# ─── CRÉER LES TABLES AU DÉMARRAGE ────────────────────────────────────────────
# SQLAlchemy lit les models.py et crée les tables si elles n'existent pas
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# ─── DOSSIER POUR LES IMAGES UPLOADÉES ────────────────────────────────────────
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ─── CORS : autorise Angular (port 4200) à parler au backend (port 8000) ──────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SESSION DB ───────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── FONCTIONS UTILITAIRES ────────────────────────────────────────────────────

def generate_code():
    """Génère un code unique de 6 caractères pour les appartements"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))

def hash_password(password: str) -> str:
    """Hash le mot de passe avec SHA256 — ne stocke jamais en clair"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    """Vérifie si le mot de passe correspond au hash"""
    return hashlib.sha256(plain.encode()).hexdigest() == hashed

def create_token(user_id: int, role: str) -> str:
    """Crée un JWT token avec l'ID et le rôle de l'utilisateur"""
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ─── SCHEMAS PYDANTIC ─────────────────────────────────────────────────────────
# Pydantic valide automatiquement les données reçues du frontend

class RegisterData(BaseModel):
    nom:       str
    prenom:    str
    email:     str
    password:  str
    telephone: Optional[str] = ""
    cin:       Optional[str] = ""
    role:      str            # 'proprietaire' ou 'locataire'

class LoginData(BaseModel):
    email:    str
    password: str
    role:     str

class JoinData(BaseModel):
    code:    str
    user_id: int

class DepartmentData(BaseModel):
    nom:         str
    ville:       Optional[str] = ""
    code_postal: Optional[str] = ""
    address:     Optional[str] = ""
    photo:       Optional[str] = ""

class ApartmentData(BaseModel):
    nom:           str
    etage:         Optional[int] = 0
    price:         Optional[int] = 0
    description:   Optional[str] = ""
    photo:         Optional[str] = ""
    department_id: int
    status:        Optional[str] = "libre"
    code:          Optional[str] = None

class ContractData(BaseModel):
    date_debut:    str
    date_fin:      str
    caution:       int
    montant_total: int
    tenant_id:     int
    apartment_id:  int
    contract_file: Optional[str] = ""

class FactureData(BaseModel):
    type:         str
    montant:      int
    date_facture: str
    contract_id:  int

class UserUpdateData(BaseModel):
    nom:       str
    prenom:    str
    email:     str
    telephone: Optional[str] = ""

# ══════════════════════════════════════════════════════════════════════════════
# ROOT
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"message": "Jorilina IMMO API fonctionne ✅"}

# ══════════════════════════════════════════════════════════════════════════════
# UPLOAD IMAGE
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/upload-image")
def upload_image(file: UploadFile = File(...)):
    """Reçoit une image, la sauvegarde dans /uploads, retourne son URL"""
    ext      = file.filename.split(".")[-1]
    filename = f"{random.randint(100000, 999999)}.{ext}"
    path     = f"uploads/{filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"http://127.0.0.1:8000/uploads/{filename}"}

# ══════════════════════════════════════════════════════════════════════════════
# AUTH — REGISTER & LOGIN
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/register")
def register(data: RegisterData, db: Session = Depends(get_db)):
    """Crée un nouveau compte utilisateur"""

    # Vérifie si l'email est déjà utilisé
    existing = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Crée l'utilisateur avec mot de passe hashé
    user = models.User(
        nom       = data.nom,
        prenom    = data.prenom,
        email     = data.email,
        password  = hash_password(data.password),
        telephone = data.telephone,
        cin       = data.cin,
        role      = data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Génère le token et retourne la réponse
    token = create_token(user.id, user.role)
    return {
        "access_token": token,
        "user": {
            "id":     user.id,
            "nom":    user.nom,
            "prenom": user.prenom,
            "email":  user.email,
            "role":   user.role,
            "apartment_id": user.apartment_id
        }
    }


@app.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    """Connecte un utilisateur existant"""

    # Cherche l'utilisateur par email
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email introuvable")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    if user.role != data.role:
        raise HTTPException(
            status_code=403,
            detail=f"Ce compte est un compte {user.role}, pas {data.role}"
        )

    token = create_token(user.id, user.role)
    return {
        "access_token": token,
        "user": {
            "id":           user.id,
            "nom":          user.nom,
            "prenom":       user.prenom,
            "email":        user.email,
            "role":         user.role,
            "apartment_id": user.apartment_id
        }
    }

# ══════════════════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ══════════════════════════════════════════════════════════════════════════════

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
        raise HTTPException(status_code=404, detail="Département introuvable")
    for key, value in data.dict().items():
        setattr(dep, key, value)
    db.commit()
    db.refresh(dep)
    return dep

@app.delete("/departments/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    dep = db.query(models.Department).get(id)
    if not dep:
        raise HTTPException(status_code=404, detail="Département introuvable")
    db.delete(dep)
    db.commit()
    return {"message": "Département supprimé"}

# ══════════════════════════════════════════════════════════════════════════════
# APARTMENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/apartments")
def get_all_apartments(db: Session = Depends(get_db)):
    """Retourne tous les appartements — pour le propriétaire"""
    return db.query(models.Apartment).all()

@app.get("/apartments/user/{user_id}")
def get_apartments_for_user(user_id: int, db: Session = Depends(get_db)):
    """Retourne les appartements selon le rôle de l'utilisateur"""
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if user.role == "proprietaire":
        # Le propriétaire voit tous les appartements
        return db.query(models.Apartment).all()
    else:
        # Le locataire voit seulement son appartement
        if user.apartment_id:
            return db.query(models.Apartment).filter(
                models.Apartment.id == user.apartment_id
            ).all()
        return []

@app.post("/apartments")
def add_apartment(data: ApartmentData, db: Session = Depends(get_db)):
    ap = models.Apartment(
        nom           = data.nom,
        etage         = data.etage,
        price         = data.price,
        description   = data.description,
        photo         = data.photo,
        department_id = data.department_id,
        status        = data.status or "libre",
        code          = data.code or generate_code()
    )
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap

@app.put("/apartments/{id}")
def update_apartment(id: int, data: ApartmentData, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(status_code=404, detail="Appartement introuvable")
    for key, value in data.dict().items():
        if value is not None:
            setattr(ap, key, value)
    db.commit()
    db.refresh(ap)
    return ap

@app.delete("/apartments/{id}")
def delete_apartment(id: int, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(status_code=404, detail="Appartement introuvable")
    db.delete(ap)
    db.commit()
    return {"message": "Appartement supprimé"}

# ══════════════════════════════════════════════════════════════════════════════
# JOIN — locataire rejoint un appartement avec un code
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/join")
def join_apartment(data: JoinData, db: Session = Depends(get_db)):
    """Le locataire entre un code pour rejoindre un appartement"""

    # Cherche l'appartement par code
    ap = db.query(models.Apartment).filter(
        models.Apartment.code == data.code
    ).first()

    if not ap:
        raise HTTPException(status_code=404, detail="Code invalide")

    if ap.status == "occupe":
        raise HTTPException(status_code=400, detail="Appartement déjà occupé")

    # Associe l'appartement au locataire
    user = db.query(models.User).get(data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.apartment_id = ap.id
    ap.status         = "occupe"
    db.commit()

    return {"message": f"Vous avez rejoint l'appartement {ap.nom} !"}

# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user

@app.put("/users/{id}")
def update_user(id: int, data: UserUpdateData, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.nom       = data.nom
    user.prenom    = data.prenom
    user.email     = data.email
    user.telephone = data.telephone
    db.commit()
    db.refresh(user)
    return user

@app.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}

# ══════════════════════════════════════════════════════════════════════════════
# CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/contracts")
def get_contracts(db: Session = Depends(get_db)):
    return db.query(models.Contract).all()

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
        raise HTTPException(status_code=404, detail="Contrat introuvable")
    for key, value in data.dict().items():
        setattr(contract, key, value)
    db.commit()
    db.refresh(contract)
    return contract

@app.delete("/contracts/{id}")
def delete_contract(id: int, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).get(id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")
    db.delete(contract)
    db.commit()
    return {"message": "Contrat supprimé"}

# ══════════════════════════════════════════════════════════════════════════════
# FACTURES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/factures")
def get_factures(db: Session = Depends(get_db)):
    return db.query(models.Facture).all()

@app.post("/factures")
def add_facture(data: FactureData, db: Session = Depends(get_db)):
    facture = models.Facture(**data.dict(), status="en_attente")
    db.add(facture)
    db.commit()
    db.refresh(facture)
    return facture

@app.put("/factures/{id}/pay")
def pay_facture(id: int, db: Session = Depends(get_db)):
    """Marque une facture comme payée"""
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    facture.status = "payee"
    db.commit()
    return {"message": "Facture marquée comme payée"}

@app.delete("/factures/{id}")
def delete_facture(id: int, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    db.delete(facture)
    db.commit()
    return {"message": "Facture supprimée"}