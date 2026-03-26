from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel





models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ allow all (good for dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Routes
#-------departments------
@app.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@app.post("/departments")
def add_department(dep: dict, db: Session = Depends(get_db)):
    new_dep = models.Department(name=dep["name"])
    db.add(new_dep)
    db.commit()
    db.refresh(new_dep)
    return new_dep

@app.delete("/departments/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    dep = db.query(models.Department).filter(models.Department.id == id).first()

    if not dep:
        return {"error": "Department not found"}

    db.delete(dep)
    db.commit()

    return {"message": "Deleted"}

@app.put("/departments/{id}")
def update_department(id: int, data: dict, db: Session = Depends(get_db)):
    dep = db.query(models.Department).filter(models.Department.id == id).first()

    if not dep:
        return {"error": "Department not found"}

    dep.name = data["name"]

    db.commit()
    db.refresh(dep)

    return dep

#----------Apartments-----------

@app.get("/apartments")
def get_apartments(db: Session = Depends(get_db)):
    return db.query(models.Apartment).all()

@app.post("/apartments")
def add_apartment(apartment: dict, db: Session = Depends(get_db)):
    new_ap = models.Apartment(
        name=apartment["name"],
        department_id=apartment["department_id"]
    )
    db.add(new_ap)
    db.commit()
    db.refresh(new_ap)
    return new_ap

@app.delete("/apartments/{id}")
def delete_apartment(id: int, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)

    if not ap:
        return {"error": "Apartment not found"}

    db.delete(ap)
    db.commit()

    return {"message": "deleted"}
@app.put("/apartments/{id}")
def update_apartment(id: int, data: dict, db: Session = Depends(get_db)):
    ap = db.query(models.Apartment).get(id)
    ap.name = data["name"]
    ap.department_id = data["department_id"]
    db.commit()
    db.refresh(ap)
    return ap

#-----contrats-------

@app.get("/contracts")
def get_contracts(db: Session = Depends(get_db)):
    return db.query(models.Contract).all()


@app.post("/contracts")
def add_contract(data: dict, db: Session = Depends(get_db)):
    new_contract = models.Contract(
        tenant_id=data["tenant_id"],
        apartment_id=data["apartment_id"]
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract

@app.delete("/contracts/{id}")
def delete_contract(id: int, db: Session = Depends(get_db)):
    c = db.query(models.Contract).get(id)
    db.delete(c)
    db.commit()
    return {"message": "deleted"}

#------users--------

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/users")
def add_user(data: dict, db: Session = Depends(get_db)):
    new_user = models.User(
        name=data["name"],
        role=data["role"]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()

    if not user:
        return {"error": "User not found"}

    try:
        db.delete(user)
        db.commit()
    except:
        db.rollback()
        return {"error": "User linked to contract"}

    return {"message": "Deleted"}