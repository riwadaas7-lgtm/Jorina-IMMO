from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from database import SessionLocal, engine
from schemas import *
import models
import random, hashlib, os, shutil, json, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jose import jwt

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY         = "JORILINA_SECRET_2024"
ALGORITHM          = "HS256"
TOKEN_EXPIRE_HOURS = 24

# ─── EMAIL CONFIG ─────────────────────────────────────────────────────────────
EMAIL_SENDER   = "riwadaas7@gmail.com"
EMAIL_PASSWORD = "uptp ibes lvnf gajo"
EMAIL_ENABLED  = True
APP_URL        = "http://localhost:4200"

# ─── INIT ─────────────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)
app = FastAPI()

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WEBSOCKET MANAGER ────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[user_id] = websocket
        print(f"✅ WS connecté: user {user_id} | Total: {len(self.connections)}")

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)
        print(f"❌ WS déconnecté: user {user_id}")

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections

ws_manager = ConnectionManager()

# ─── UTILITAIRES ──────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def now_str(fmt="%H:%M") -> str:
    return datetime.now().strftime(fmt)

def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub":  str(user_id),
        "role": role,
        "exp":  datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def user_response(user) -> dict:
    return {
        "id":                   user.id,
        "nom":                  user.nom,
        "prenom":               user.prenom,
        "email":                user.email,
        "role":                 user.role,
        "apartment_id":         user.apartment_id,
        "must_change_password": user.must_change_password,
        "statut":               user.statut or "actif"
    }

def format_message(msg: models.Message) -> dict:
    return {
        "id":          msg.id,
        "sender_id":   msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content":     msg.content,
        "created_at":  msg.created_at.strftime("%d/%m/%Y %H:%M") if msg.created_at else "",
        "time":        msg.created_at.strftime("%H:%M")           if msg.created_at else "",
        "date":        msg.created_at.strftime("%d/%m/%Y")        if msg.created_at else "",
    }

# ─── HELPER NOTIFICATION WS ───────────────────────────────────────────────────
async def notify(user_id: int, title: str, content: str, notif_type: str = "info"):
    """Envoie une notification WS à un utilisateur."""
    await ws_manager.send_to_user(user_id, {
        "type":       "notification",
        "title":      title,
        "content":    content,
        "notif_type": notif_type,
        "time":       now_str()
    })

# ─── EMAILS ───────────────────────────────────────────────────────────────────
def _smtp_send(to: str, subject: str, body: str):
    """Envoi SMTP générique — toute erreur est loguée sans planter l'API."""
    if not EMAIL_ENABLED:
        print(f"[EMAIL SIMULÉ] → {to}")
        return
    print(f"📧 Envoi email à {to}...")
    try:
        msg = MIMEMultipart()
        msg['From']    = EMAIL_SENDER
        msg['To']      = to
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, to, msg.as_string())
        server.quit()
        print(f"✅ Email envoyé à {to}")
    except Exception as e:
        print(f"❌ Erreur email vers {to}: {e}")

def send_invitation_email(to_email: str, prenom: str, nom: str,
                          apartment_nom: str, temp_password: str):
    """Email envoyé quand un locataire est assigné à un appartement."""
    subject = "🏠 Votre accès JORILINA IMMO"
    body = f"""Bonjour {prenom} {nom},

Vous avez été assigné(e) à l'appartement : {apartment_nom}

Voici vos informations de connexion :

📧 Email               : {to_email}
🔑 Mot de passe temporaire : {temp_password}

Accédez à votre espace ici :
{APP_URL}/login

Une fois connecté(e), vous pouvez :
  - Consulter votre appartement
  - Voir vos contrats et factures
  - Contacter votre propriétaire

⚠️ Pensez à changer votre mot de passe dès la première connexion.

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)

def send_expulsion_email(to_email: str, prenom: str, apartment_nom: str):
    """Email envoyé quand un locataire est retiré d'un appartement."""
    subject = "⚠️ Accès appartement retiré — JORILINA IMMO"
    body = f"""Bonjour {prenom},

Votre accès à l'appartement {apartment_nom} a été retiré par votre propriétaire.

Votre compte reste actif. Si vous pensez qu'il s'agit d'une erreur,
contactez directement votre propriétaire.

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)

def send_retard_email(to_email: str, prenom: str, montant: int,
                      type_facture: str, date_delai: str):
    """Email de rappel automatique pour facture en retard."""
    subject = "⚠️ Facture en retard — JORILINA IMMO"
    body = f"""Bonjour {prenom},

Votre facture de {montant} DT ({type_facture}) est en retard.

Date limite dépassée : {date_delai}

Veuillez régler cette facture dès que possible.
Connectez-vous pour effectuer le paiement :
{APP_URL}/login

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)

def send_contract_expired_email(to_email: str, prenom: str, date_fin: str):
    subject = "⚠️ Votre contrat a expiré — JORILINA IMMO"
    body = f"""Bonjour {prenom},

Votre contrat de location a expiré le {date_fin}.

Veuillez contacter votre propriétaire pour :
  - Renouveler votre contrat
  - Ou organiser votre départ

Connectez-vous pour voir les détails :
{APP_URL}/login

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)


def send_contract_renewed_email(to_email: str, prenom: str,
                                 date_debut: str, date_fin: str):
    subject = "✅ Contrat renouvelé — JORILINA IMMO"
    body = f"""Bonjour {prenom},

Votre contrat de location a été renouvelé.

  Nouvelle date de début : {date_debut}
  Nouvelle date de fin   : {date_fin}

Connectez-vous pour voir les détails :
{APP_URL}/login

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)


def send_contract_terminated_email(to_email: str, prenom: str, apartment_nom: str):
    subject = "📄 Contrat terminé — JORILINA IMMO"
    body = f"""Bonjour {prenom},

Votre contrat de location pour l'appartement {apartment_nom} a été terminé par votre propriétaire.

Votre compte reste actif. Vous pouvez toujours :
  - Consulter vos anciens contrats
  - Voir et payer vos factures impayées
  

Connectez-vous ici :
{APP_URL}/login

Cordialement,
L'équipe JORILINA IMMO
"""
    _smtp_send(to_email, subject, body)


# ─── WEBSOCKET ENDPOINT ───────────────────────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int,db: Session = Depends(get_db)):
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "chat":
                receiver_id = data.get("to")
                content     = data.get("content", "").strip()
                if not receiver_id or not content:
                    continue

                receiver_id = int(receiver_id)

                db_msg = models.Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    content=content
                )
                db.add(db_msg)
                db.commit()
                db.refresh(db_msg)

                formatted = format_message(db_msg)

                # Envoie au destinataire (bulle gauche)
                await ws_manager.send_to_user(receiver_id, {
                    **formatted,
                    "type":      "chat",
                    "is_mine":   False,
                    "from_name": data.get("from_name", "")
                })
                # Confirmation à l'expéditeur (bulle droite)
                await ws_manager.send_to_user(user_id, {
                    **formatted,
                    "type":    "chat",
                    "is_mine": True
                })

            elif msg_type == "notification":
                target_id = data.get("to")
                if target_id:
                    await ws_manager.send_to_user(int(target_id), {
                        "type":       "notification",
                        "title":      data.get("title", ""),
                        "content":    data.get("content", ""),
                        "notif_type": data.get("notif_type", "info"),
                        "time":       now_str()
                    })

    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        print(f"❌ Erreur WS user {user_id}: {e}")
        ws_manager.disconnect(user_id)


# ─── ROOT & UPLOAD ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Jorilina IMMO API ✅"}

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    ext      = (file.filename or "").rsplit(".", 1)[-1].lower()
    filename = f"{random.randint(100000, 999999)}.{ext}"
    contents = await file.read()
    with open(f"uploads/{filename}", "wb") as f:
        f.write(contents)
    return {"url": f"http://127.0.0.1:8000/uploads/{filename}"}


# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/register")
def register(data: RegisterData, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Email déjà utilisé")
    user = models.User(
        nom=data.nom, prenom=data.prenom, email=data.email,
        password=hash_password(data.password),
        telephone=data.telephone, cin=data.cin, role=data.role,
        must_change_password=0
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id, user.role), "user": user_response(user)}

@app.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if user.role != data.role:
        raise HTTPException(403, f"Ce compte est un compte {user.role}")
    return {"access_token": create_token(user.id, user.role), "user": user_response(user)}

@app.put("/users/{id}/change-password")
def change_password(id: int, data: ChangePasswordData, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if not verify_password(data.old_password, user.password):
        raise HTTPException(400, "Ancien mot de passe incorrect")
    user.password             = hash_password(data.new_password)
    user.must_change_password = 0
    db.commit()
    return {"message": "Mot de passe changé avec succès"}


# ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
@app.get("/departments")
def get_departments(owner_id: int, db: Session = Depends(get_db)):
    return db.query(models.Department).filter(
        models.Department.owner_id == owner_id
    ).all()

@app.post("/departments")
def add_department(data: DepartmentData, db: Session = Depends(get_db)):
    if db.query(models.Department).filter(
        models.Department.nom      == data.nom,
        models.Department.owner_id == data.owner_id
    ).first():
        raise HTTPException(400, f"Vous avez déjà un département nommé '{data.nom}'")
    if data.titre_foncier and db.query(models.Department).filter(
        models.Department.titre_foncier == data.titre_foncier
    ).first():
        raise HTTPException(400, f"Le titre foncier '{data.titre_foncier}' est déjà enregistré")
    dep = models.Department(
        nom=data.nom, ville=data.ville, code_postal=data.code_postal,
        address=data.address, photo=data.photo,
        titre_foncier=data.titre_foncier or None,
        owner_id=data.owner_id
    )
    db.add(dep); db.commit(); db.refresh(dep)
    return dep

@app.put("/departments/{id}")
def update_department(id: int, data: DepartmentData, db: Session = Depends(get_db)):
    dep = db.query(models.Department).get(id)
    if not dep:
        raise HTTPException(404, "Département introuvable")
    if data.titre_foncier and data.titre_foncier != dep.titre_foncier:
        if db.query(models.Department).filter(
            models.Department.titre_foncier == data.titre_foncier,
            models.Department.id != id
        ).first():
            raise HTTPException(400, f"Le titre foncier '{data.titre_foncier}' est déjà utilisé")
    dep.nom           = data.nom
    dep.ville         = data.ville
    dep.code_postal   = data.code_postal
    dep.address       = data.address
    dep.photo         = data.photo
    dep.titre_foncier = data.titre_foncier or None
    db.commit(); db.refresh(dep)
    return dep

@app.delete("/departments/{id}")
async def delete_department(id: int, db: Session = Depends(get_db)):
    dep = db.query(models.Department).get(id)
    if not dep:
        raise HTTPException(404, "Département introuvable")

    # Trouve tous les appartements occupés de ce département
    apartments = db.query(models.Apartment).filter(
        models.Apartment.department_id == id
    ).all()

    for ap in apartments:
        if ap.status == "occupe":
            tenant = db.query(models.User).filter(
                models.User.apartment_id == ap.id
            ).first()
            if tenant:
                tenant.apartment_id = None
                db.flush()
                await notify(
                    tenant.id,
                    "⚠️ Appartement supprimé",
                    f"L'appartement {ap.nom} a été supprimé par votre propriétaire.",
                    "danger"
                )
                send_expulsion_email(tenant.email, tenant.prenom, ap.nom)

    db.delete(dep)
    db.commit()
    return {"message": "Département supprimé"}

# ─── APARTMENTS ───────────────────────────────────────────────────────────────
@app.get("/apartments")
def get_all_apartments(owner_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Apartment)
        .join(models.Department)
        .filter(models.Department.owner_id == owner_id)
        .all()
    )

@app.get("/apartments/user/{user_id}")
def get_apartments_for_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if user.role == "proprietaire":
        return (
            db.query(models.Apartment)
            .join(models.Department)
            .filter(models.Department.owner_id == user_id)
            .all()
        )
    if user.apartment_id:
        return db.query(models.Apartment).filter(
            models.Apartment.id == user.apartment_id
        ).all()
    return []

@app.post("/apartments")
def add_apartment(data: ApartmentData, db: Session = Depends(get_db)):
    if db.query(models.Apartment).filter(
        models.Apartment.nom           == data.nom,
        models.Apartment.department_id == data.department_id
    ).first():
        raise HTTPException(400, f"L'appartement '{data.nom}' existe déjà dans ce département")
    ap = models.Apartment(
        nom=data.nom, etage=data.etage, price=data.price,
        description=data.description, photo=data.photo,
        department_id=data.department_id,
        status=data.status or "libre",
    )
    db.add(ap); db.commit(); db.refresh(ap)
    return ap

@app.put("/apartments/{id}")
async def update_apartment(id: int, data: ApartmentData, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(404, "Appartement introuvable")

    old_maintenance = ap.maintenance
    ap.nom           = data.nom
    ap.etage         = data.etage
    ap.price         = data.price
    ap.description   = data.description
    ap.photo         = data.photo
    ap.department_id = data.department_id
    ap.status        = data.status
    ap.maintenance   = data.maintenance or 0
    db.commit()
    db.refresh(ap)

    # If maintenance just turned ON and apartment is occupied → notify tenant
    if data.maintenance and not old_maintenance and ap.status == "occupe":
        tenant = db.query(models.User).filter(
            models.User.apartment_id == ap.id
        ).first()
        if tenant:
            await notify(
                tenant.id,
                "🔧 Appartement en maintenance",
                f"Votre appartement {ap.nom} est en cours de maintenance. "
                f"Contactez votre propriétaire pour plus d'informations.",
                "warning"
            )

    return ap
@app.delete("/apartments/{id}")
async def delete_apartment(id: int, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    if not ap:
        raise HTTPException(404, "Appartement introuvable")

    # Block if occupied
    if ap.status == "occupe":
        raise HTTPException(400,
            "Impossible de supprimer un appartement occupé. "
            "Libérez-le d'abord depuis la page Locataires.")

    db.delete(ap)
    db.commit()
    return {"message": "Appartement supprimé"}


# ─── USERS ────────────────────────────────────────────────────────────────────
@app.get("/users")
def get_users(owner_id: int, db: Session = Depends(get_db)):
    """
    Returns all locataires (actif + ancien) for this owner.
    Actifs = currently assigned to one of owner's apartments.
    Anciens = previously assigned (statut = ancien).
    """
    # Actifs — currently in owner's apartments
    actifs = (
        db.query(models.User)
        .join(models.Apartment, models.User.apartment_id == models.Apartment.id)
        .join(models.Department, models.Apartment.department_id == models.Department.id)
        .filter(
            models.Department.owner_id == owner_id,
            models.User.role           == "locataire",
            models.User.statut         == "actif"
        )
        .all()
    )

    # Anciens — had a contract with this owner before
    anciens = (
        db.query(models.User)
        .join(models.Contract, models.Contract.tenant_id == models.User.id)
        .join(models.Apartment, models.Contract.apartment_id == models.Apartment.id)
        .join(models.Department, models.Apartment.department_id == models.Department.id)
        .filter(
            models.Department.owner_id == owner_id,
            models.User.role           == "locataire",
            models.User.statut         == "ancien"
        )
        .distinct()
        .all()
    )

    return actifs + anciens

@app.get("/users/by-cin/{cin}")
def get_user_by_cin(cin: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.cin  == cin,
        models.User.role == "locataire"
    ).first()
    if not user:
        return {"found": False}
    return {
        "found":         True,
        "id":            user.id,
        "nom":           user.nom,
        "prenom":        user.prenom,
        "email":         user.email,
        "telephone":     user.telephone,
        "cin":           user.cin,
        "has_apartment": user.apartment_id is not None,
        "apartment_id":  user.apartment_id
    }

@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    return user

@app.put("/users/{id}")
def update_user(id: int, data: UserUpdateData, db: Session = Depends(get_db)):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if data.email != user.email:
        if db.query(models.User).filter(
            models.User.email == data.email,
            models.User.id    != id
        ).first():
            raise HTTPException(400, "Cet email est déjà utilisé")
    user.nom       = data.nom
    user.prenom    = data.prenom
    user.email     = data.email
    user.telephone = data.telephone
    db.commit(); db.refresh(user)
    return user
@app.delete("/users/{id}")
async def delete_user(
    id: int,
    permanent: bool = False,
    force: bool = False,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Block if active contract
    active_contract = db.query(models.Contract).filter(
        models.Contract.tenant_id == id,
        models.Contract.status.in_(["actif", "renouveler"])
    ).first()
    if active_contract:
        raise HTTPException(400,
            f"Impossible — contrat actif jusqu'au {active_contract.date_fin}. "
            f"Terminez d'abord le contrat.")

    # Check unpaid factures
    unpaid = (
        db.query(models.Facture)
        .join(models.Contract)
        .filter(
            models.Contract.tenant_id == id,
            models.Facture.status.in_(["en_attente", "en_retard"])
        )
        .all()
    )
    if unpaid and not force:
        total = sum(f.montant for f in unpaid)
        raise HTTPException(400,
            f"Ce locataire a {len(unpaid)} facture(s) impayée(s) "
            f"pour un total de {total} DT. "
            f"Utilisez force=true pour ignorer.")

    if not permanent:
        # SOFT DELETE — archive
        if user.apartment_id:
            apt = db.query(models.Apartment).get(user.apartment_id)
            if apt:
                apt.status = "libre"
                send_expulsion_email(user.email, user.prenom, apt.nom)
        user.statut       = "ancien"
        user.apartment_id = None
        db.commit()
        return {"message": "Locataire archivé", "archived": True}

    else:
        # HARD DELETE — delete messages first to avoid FK constraint
        if user.apartment_id:
            apt = db.query(models.Apartment).get(user.apartment_id)
            if apt:
                apt.status = "libre"

        # Delete messages manually before deleting user
        db.query(models.Message).filter(
            (models.Message.sender_id == id) |
            (models.Message.receiver_id == id)
        ).delete(synchronize_session=False)

        db.delete(user)
        db.commit()
        return {"message": "Locataire supprimé définitivement", "archived": False}

@app.post("/users/add-locataire")
async def add_locataire(data: AddLocataireData, db: Session = Depends(get_db)):
    """
    Assigne un locataire à un appartement.
    - Si appartement occupé → expulse l'ancien (email + notif WS)
    - Si locataire déjà dans un autre apt → libère l'ancien apt
    - Assigne le nouveau → email invitation + notif WS
    - Notifie le propriétaire
    """
    apartment = db.query(models.Apartment).get(data.apartment_id)
    if not apartment:
        raise HTTPException(404, "Appartement introuvable")

    dept     = db.query(models.Department).get(apartment.department_id)
    owner_id = dept.owner_id if dept else None

    # ── Expulse l'ancien locataire si appartement occupé ───────────────────
    if apartment.status == "occupe":
        old_tenant = db.query(models.User).filter(
            models.User.apartment_id == apartment.id
        ).first()
        if old_tenant:
            old_tenant.apartment_id = None
            db.flush()
            await notify(
                old_tenant.id,
                "⚠️ Appartement retiré",
                f"Vous avez été retiré(e) de l'appartement {apartment.nom} par votre propriétaire.",
                "danger"
            )
            send_expulsion_email(old_tenant.email, old_tenant.prenom, apartment.nom)

    # ── Trouve ou crée le locataire ────────────────────────────────────────
    existing = db.query(models.User).filter(
        models.User.cin  == data.cin,
        models.User.role == "locataire"
    ).first()

    is_new = False

    if existing:
        if existing.apartment_id and existing.apartment_id != data.apartment_id:
            old_apt = db.query(models.Apartment).get(existing.apartment_id)
            if old_apt:
                old_apt.status = "libre"
        # Reactivate if ancien
        existing.statut = "actif"
        user = existing
    else:
        if not data.nom or not data.prenom or not data.email:
            raise HTTPException(400, "Nouveau locataire : nom, prénom et email obligatoires")
        if db.query(models.User).filter(models.User.email == data.email).first():
            raise HTTPException(400, "Cet email est déjà utilisé")
        user = models.User(
            nom=data.nom, prenom=data.prenom, email=data.email,
            telephone=data.telephone, cin=data.cin, role="locataire",
            password=hash_password(data.cin),
            must_change_password=1
        )
        db.add(user)
        db.flush()
        is_new = True

    # ── Assigne ────────────────────────────────────────────────────────────
    user.apartment_id = data.apartment_id
    apartment.status  = "occupe"
    db.commit()
    db.refresh(user)

    # ── Email + notif locataire ────────────────────────────────────────────
    send_invitation_email(
        to_email=user.email, prenom=user.prenom, nom=user.nom,
        apartment_nom=apartment.nom, temp_password=data.cin
    )
    await notify(
        user.id,
        "🏠 Appartement assigné",
        f"Vous avez été assigné(e) à l'appartement {apartment.nom}. Consultez votre email.",
        "success"
    )

    # ── Notif propriétaire ─────────────────────────────────────────────────
    if owner_id:
        await notify(
            owner_id,
            "👤 Locataire assigné",
            f"{user.prenom} {user.nom} a été assigné(e) à {apartment.nom}",
            "success"
        )

    return {
        "message": "Locataire assigné avec succès",
        "is_new":  is_new,
        "user":    user_response(user)
    }


@app.put("/users/{id}/free-apartment")
async def free_apartment(id: int, db: Session = Depends(get_db)):
    """Libère l'appartement d'un locataire — expulsion + email + notif WS."""
    user = db.query(models.User).get(id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if not user.apartment_id:
        raise HTTPException(400, "Ce locataire n'a pas d'appartement")

    apartment = db.query(models.Apartment).get(user.apartment_id)
    apt_nom   = apartment.nom if apartment else "inconnu"

    user.apartment_id = None
    if apartment:
        apartment.status = "libre"
    db.commit()

    await notify(user.id, "⚠️ Appartement retiré",
        f"Vous avez été retiré(e) de l'appartement {apt_nom} par votre propriétaire.", "danger")
    send_expulsion_email(user.email, user.prenom, apt_nom)

    return {"message": f"Appartement {apt_nom} libéré"}


# ─── CONTRACTS ────────────────────────────────────────────────────────────────
@app.get("/contracts")
async def get_contracts(owner_id: int, db: Session = Depends(get_db)):
    today   = date.today()
    today_s = today.isoformat()
    soon    = (today + timedelta(days=60)).isoformat()

    rows = (
        db.query(models.Contract, models.User, models.Apartment)
        .join(models.User,       models.Contract.tenant_id     == models.User.id)
        .join(models.Apartment,  models.Contract.apartment_id  == models.Apartment.id)
        .join(models.Department, models.Apartment.department_id == models.Department.id)
        .filter(models.Department.owner_id == owner_id)
        .all()
    )

    result = []
    for contract, user, apartment in rows:

        if contract.status == "actif" and contract.date_fin < today_s:
            contract.status = "expire"
            db.flush()
            await notify(owner_id,
                "⚠️ Contrat expiré",
                f"Le contrat de {user.prenom} {user.nom} ({apartment.nom}) a expiré.",
                "warning")
            await notify(user.id,
                "⚠️ Contrat expiré",
                "Votre contrat a expiré. Contactez votre propriétaire.",
                "warning")
            send_contract_expired_email(user.email, user.prenom, contract.date_fin)

        elif contract.status == "actif" and contract.date_fin <= soon:
            contract.status = "renouveler"
            db.flush()
            await notify(owner_id,
                "🔔 Contrat bientôt expiré",
                f"Le contrat de {user.prenom} {user.nom} expire le {contract.date_fin}.",
                "info")
            await notify(user.id,
                "🔔 Contrat bientôt expiré",
                f"Votre contrat expire le {contract.date_fin}. Contactez votre propriétaire.",
                "info")

        db.commit()

        # ← Return plain dict — fixes serialization
        result.append({
            "id":             contract.id,
            "tenant_id":      contract.tenant_id,
            "apartment_id":   contract.apartment_id,
            "tenant_name":    f"{user.prenom} {user.nom}",
            "apartment_name": apartment.nom,
            "date_debut":     contract.date_debut,
            "date_fin":       contract.date_fin,
            "montant_total":  contract.montant_total,
            "caution":        contract.caution,
            "contract_file":  contract.contract_file,
            "status":         contract.status
        })

    return result

@app.get("/contracts/user/{user_id}")
def get_contracts_for_user(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Contract).filter(
        models.Contract.tenant_id == user_id
    ).all()

@app.post("/contracts")
async def add_contract(data: ContractData, db: Session = Depends(get_db)):
    contract = models.Contract(
        date_debut=data.date_debut, date_fin=data.date_fin,
        caution=data.caution, montant_total=data.montant_total,
        tenant_id=data.tenant_id, apartment_id=data.apartment_id,
        contract_file=data.contract_file, status="actif"
    )
    db.add(contract); db.commit(); db.refresh(contract)
    await notify(data.tenant_id, "📄 Nouveau contrat",
        f"Un contrat a été créé pour vous du {data.date_debut} au {data.date_fin}", "info")
    return contract

@app.put("/contracts/{id}")
def update_contract(id: int, data: ContractData, db: Session = Depends(get_db)):
    c = db.query(models.Contract).get(id)
    if not c:
        raise HTTPException(404, "Contrat introuvable")
    c.date_debut    = data.date_debut
    c.date_fin      = data.date_fin
    c.caution       = data.caution
    c.montant_total = data.montant_total
    c.tenant_id     = data.tenant_id
    c.apartment_id  = data.apartment_id
    db.commit(); db.refresh(c)
    return c

@app.put("/contracts/{id}/renew")
async def renew_contract(id: int, data: RenewContractData, db: Session = Depends(get_db)):
    """
    Renouvelle un contrat :
    - date_debut = aujourd'hui
    - date_fin   = nouvelle date fournie
    - status     = actif
    """
    contract = db.query(models.Contract).get(id)
    if not contract:
        raise HTTPException(404, "Contrat introuvable")

    if contract.status == "termine":
        raise HTTPException(400, "Impossible de renouveler un contrat terminé")

    new_debut        = date.today().isoformat()
    contract.date_debut = new_debut
    contract.date_fin   = data.date_fin
    contract.status     = "actif"
    db.commit()

    # Notify locataire
    tenant = db.query(models.User).get(contract.tenant_id)
    if tenant:
        await notify(
            tenant.id,
            "✅ Contrat renouvelé",
            f"Votre contrat a été renouvelé jusqu'au {data.date_fin}.",
            "success"
        )
        send_contract_renewed_email(
            tenant.email, tenant.prenom, new_debut, data.date_fin
        )

    return contract
@app.put("/contracts/{id}/terminate")
async def terminate_contract(id: int, db: Session = Depends(get_db)):
    """
    Termine un contrat :
    - contract.status     → "termine"
    - locataire.statut    → "ancien"
    - locataire.apartment_id → None
    - apartment.status    → "libre"
    - email + WS to locataire
    """
    contract = db.query(models.Contract).get(id)
    if not contract:
        raise HTTPException(404, "Contrat introuvable")
    if contract.status == "termine":
        raise HTTPException(400, "Ce contrat est déjà terminé")

    contract.status = "termine"

    tenant    = db.query(models.User).get(contract.tenant_id)
    apartment = db.query(models.Apartment).get(contract.apartment_id)

    apt_nom = apartment.nom if apartment else "inconnu"

    if tenant:
        tenant.statut       = "ancien"
        tenant.apartment_id = None

    if apartment:
        apartment.status = "libre"

    db.commit()

    if tenant:
        await notify(
            tenant.id,
            "📄 Contrat terminé",
            f"Votre contrat pour l'appartement {apt_nom} a été terminé. Vous restez connecté et pouvez consulter vos documents.",
            "danger"
        )
        send_contract_terminated_email(tenant.email, tenant.prenom, apt_nom)

    return {"message": "Contrat terminé"}

@app.delete("/contracts/{id}")
def delete_contract(id: int, db: Session = Depends(get_db)):
    c = db.query(models.Contract).get(id)
    if not c:
        raise HTTPException(404, "Contrat introuvable")
    db.delete(c); db.commit()
    return {"message": "Contrat supprimé"}


# ─── FACTURES ─────────────────────────────────────────────────────────────────
@app.get("/factures")
def get_factures(owner_id: int, db: Session = Depends(get_db)):
    today = date.today().isoformat()
    db.query(models.Facture).filter(
        models.Facture.date_delai < today,
        models.Facture.status     != "payee"
    ).update({models.Facture.status: "en_retard"})
    db.commit()
        # Send reminder emails for late factures
    late = (
        db.query(models.Facture, models.User)
        .join(models.Contract, models.Facture.contract_id == models.Contract.id)
        .join(models.User, models.Contract.tenant_id == models.User.id)
        .filter(
            models.Facture.date_delai < today,
            models.Facture.status == "en_retard"
        )
        .all()
    )
    for facture, tenant in late:
        send_retard_email(
            to_email=tenant.email,
            prenom=tenant.prenom,
            montant=facture.montant,
            type_facture=facture.type,
            date_delai=facture.date_delai
        )
    

    rows = (
        db.query(models.Facture, models.User, models.Apartment)
        .join(models.Contract,   models.Facture.contract_id     == models.Contract.id)
        .join(models.User,       models.Contract.tenant_id      == models.User.id)
        .join(models.Apartment,  models.Contract.apartment_id   == models.Apartment.id)
        .join(models.Department, models.Apartment.department_id == models.Department.id)
        .filter(models.Department.owner_id == owner_id)
        .all()
    )
    result = []
    for facture, user, apartment in rows:
        result.append({
            "id":                   facture.id,
            "contract_id":          facture.contract_id,
            "type":                 facture.type,
            "montant":              facture.montant,
            "date_facture":         facture.date_facture,
            "status":               facture.status,
            "periode_consommation": facture.periode_consommation,
            "date_delai":           facture.date_delai,
            "tenant_name":          f"{user.prenom} {user.nom}",
            "apartment_name":       apartment.nom
        })
    return result

@app.get("/factures/user/{user_id}")
def get_factures_for_user(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Facture)
        .join(models.Contract)
        .filter(models.Contract.tenant_id == user_id)
        .all()
    )

@app.post("/factures")
async def add_facture(data: FactureData, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).get(data.contract_id)
    if not contract:
        raise HTTPException(404, "Contrat introuvable")
    facture = models.Facture(
        type=data.type, montant=data.montant,
        date_facture=data.date_facture,
        periode_consommation=data.periode_consommation,
        date_delai=data.date_delai,
        contract_id=data.contract_id, status="en_attente"
    )
    db.add(facture); db.commit(); db.refresh(facture)
    await notify(contract.tenant_id, "🧾 Nouvelle facture",
        f"Une facture de {data.montant} DT ({data.type}) a été ajoutée. Échéance : {data.date_delai}",
        "warning")
    return facture

@app.put("/factures/{id}/pay")
async def pay_facture(id: int, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(404, "Facture introuvable")
    if facture.status == "payee":
        raise HTTPException(400, "Cette facture est déjà payée")

    facture.status = "payee"
    db.commit()

    contract  = db.query(models.Contract).get(facture.contract_id)
    if contract:
        apartment = db.query(models.Apartment).get(contract.apartment_id)
        if apartment:
            dept = db.query(models.Department).get(apartment.department_id)
            if dept and dept.owner_id:
                tenant = db.query(models.User).get(contract.tenant_id)
                name   = f"{tenant.prenom} {tenant.nom}" if tenant else "Un locataire"
                # Notif propriétaire
                await notify(dept.owner_id, "✅ Paiement reçu",
                    f"{name} a payé {facture.montant} DT ({facture.type})", "success")
                # Confirmation locataire
                if tenant:
                    await notify(tenant.id, "✅ Paiement confirmé",
                        f"Votre paiement de {facture.montant} DT ({facture.type}) a été enregistré.",
                        "success")
    return {"message": "Facture payée"}

@app.put("/factures/{id}/status")
def update_facture_status(id: int, data: FactureStatusUpdate, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(404, "Facture introuvable")
    if data.status not in ["en_attente", "payee", "en_retard"]:
        raise HTTPException(400, "Status invalide")
    facture.status = data.status
    db.commit(); db.refresh(facture)
    return facture

@app.delete("/factures/{id}")
def delete_facture(id: int, db: Session = Depends(get_db)):
    facture = db.query(models.Facture).get(id)
    if not facture:
        raise HTTPException(404, "Facture introuvable")
    db.delete(facture); db.commit()
    return {"message": "Facture supprimée"}


# ─── MESSAGES (CHAT) ──────────────────────────────────────────────────────────
# ⚠️ IMPORTANT: contacts route MUST be before /{user1_id}/{user2_id}
# Otherwise FastAPI matches "contacts" as an integer → 422 error

@app.get("/messages/contacts/{user_id}")
def get_chat_contacts(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    if user.role == "proprietaire":
        contacts = (
            db.query(models.User)
            .join(models.Apartment, models.User.apartment_id == models.Apartment.id)
            .join(models.Department, models.Apartment.department_id == models.Department.id)
            .filter(
                models.Department.owner_id == user_id,
                models.User.role           == "locataire"
            )
            .all()
        )
    else:
        contacts = []
        if user.apartment_id:
            apt = db.query(models.Apartment).get(user.apartment_id)
            if apt:
                dept = db.query(models.Department).get(apt.department_id)
                if dept and dept.owner_id:
                    owner = db.query(models.User).get(dept.owner_id)
                    if owner:
                        contacts = [owner]

    return [user_response(c) for c in contacts]


@app.get("/messages/{user1_id}/{user2_id}")
def get_messages(user1_id: int, user2_id: int, db: Session = Depends(get_db)):
    messages = (
        db.query(models.Message)
        .filter(
            (
                (models.Message.sender_id   == user1_id) &
                (models.Message.receiver_id == user2_id)
            ) | (
                (models.Message.sender_id   == user2_id) &
                (models.Message.receiver_id == user1_id)
            )
        )
        .order_by(models.Message.created_at.asc())
        .all()
    )
    return [format_message(m) for m in messages]
