
## 1) Architecture generale

- Frontend: Angular
  - Dossier: `frontend/src/app`
  - Service central API: `frontend/src/app/services/api.ts`
- Backend: FastAPI + SQLAlchemy
  - Endpoints: `backend/main.py`
  - Modeles DB: `backend/models.py`
  - Connexion DB: `backend/database.py`

Snippet backend DB:

```python
# backend/database.py
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3307/jorilina_db")
engine = create_engine(DATABASE_URL, connect_args={})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

## 2) Routing (Owner vs Tenant)

Les routes Angular sont declarees dans `frontend/src/app/app.routes.ts`.

Snippet:

```ts
// Proprietaire
{ path: 'contracts',   component: ContractsComponent },
{ path: 'factures',    component: FacturesComponent },
{ path: 'invitations', component: InvitationsComponent },

// Locataire
{ path: 'my-apartment', component: MyApartmentComponent },
{ path: 'my-contract',  component: MyContractComponent },
{ path: 'my-factures',  component: MyFacturesComponent },
```

Le menu lateral affiche ces liens selon le role dans `frontend/src/app/components/layout/layout.html` avec:
- `*ngIf="isOwner"`
- `*ngIf="isLocataire"`

## 3) Service API Angular (tous les calls)

Fichier: `frontend/src/app/services/api.ts`

Snippet:

```ts
private baseUrl = 'http://127.0.0.1:8000';
getContracts()             { return this.http.get<any[]>(this.baseUrl + '/contracts'); }
addContract(data: any)     { return this.http.post(this.baseUrl + '/contracts', data); }
deleteContract(id: number) { return this.http.delete(this.baseUrl + '/contracts/' + id); }

getFactures()              { return this.http.get<any[]>(this.baseUrl + '/factures'); }
addFacture(data: any)      { return this.http.post(this.baseUrl + '/factures', data); }
updateFactureStatus(id: number, status: string) {
  return this.http.put(this.baseUrl + '/factures/' + id + '/status', { status });
}

joinApartment(data: any)   { return this.http.post(this.baseUrl + '/join', data); }
getApartments(userId: number) { return this.http.get<any[]>(this.baseUrl + '/apartments/user/' + userId); }
updateApartment(id: number, data: any) { return this.http.put(this.baseUrl + '/apartments/' + id, data); }
```

## 4) Proprietaire - Onglet Invitations

Fichier principal: `frontend/src/app/components/invitations/invitations.ts`

### Logique
1. Charger les appartements du proprietaire:
   - `GET /apartments/user/{user_id}`
2. Generer un code local (format `APT-XXXX`)
3. Sauvegarder le code sur un appartement:
   - `PUT /apartments/{id}` avec objet appartement + `code`

Snippet:

```ts
ngOnInit() {
  this.api.getApartments(this.user.id).subscribe(res => this.apartments = res);
}

saveCode() {
  if (!this.selectedApartment) return;
  const apt = this.apartments.find(a => a.id == this.selectedApartment);
  this.api.updateApartment(+this.selectedApartment, {
    ...apt,
    code: this.currentCode
  }).subscribe(() => this.saved = true);
}
```

### Backend associe
- `GET /apartments/user/{user_id}` dans `backend/main.py`
- `PUT /apartments/{id}` dans `backend/main.py`
- Rejoint par code cote locataire via `POST /join`

Snippet `POST /join`:

```python
ap = db.query(models.Apartment).filter(models.Apartment.code == data.code).first()
user = db.query(models.User).get(data.user_id)
user.apartment_id = ap.id
ap.status = "occupe"
db.commit()
```

## 5) Proprietaire - Onglet Contrats

Fichier principal: `frontend/src/app/components/contracts/contracts.ts`

### Logique
1. Charger la liste des contrats:
   - `GET /contracts`
2. Charger les locataires (`GET /users`) pour le formulaire
3. Charger les appartements (`GET /apartments/user/{id}`) pour le formulaire
4. Ajouter contrat:
   - `POST /contracts`
5. Supprimer contrat:
   - `DELETE /contracts/{id}`
6. Upload fichier contrat:
   - `POST /upload-image`, puis URL stockee dans `contract_file`

Snippet:

```ts
loadContracts() {
  this.api.getContracts().subscribe((res: any[]) => {
    this.contracts = res.map(c => ({ ...c, status: this.computeStatus(c) }));
  });
}

add() {
  this.api.addContract(this.form).subscribe(() => {
    this.showAddModal = false;
    this.loadContracts();
  });
}
```

### Backend associe (`/contracts`)

Snippet:

```python
@app.get("/contracts")
def get_contracts(db: Session = Depends(get_db)):
    contracts = db.query(models.Contract) \
      .join(models.User, models.Contract.tenant_id == models.User.id) \
      .outerjoin(models.Apartment, models.Contract.apartment_id == models.Apartment.id) \
      .add_columns(
        models.User.nom.label('tenant_name'),
        models.User.prenom.label('tenant_prenom'),
        models.Apartment.nom.label('apartment_name')
      ).all()
```

Equivalent SQL logique:
- `SELECT contracts.*, users.nom, users.prenom, apartments.nom FROM contracts JOIN users ... LEFT JOIN apartments ...`

## 6) Proprietaire - Onglet Factures

Fichier principal: `frontend/src/app/components/factures/factures.ts`

### Logique
1. Charger les factures:
   - `GET /factures`
2. Charger les appartements:
   - Proprietaire: `GET /apartments`
3. Selection appartement -> charger contrats:
   - `GET /contracts`, filtre frontend sur `apartment_id`
4. Ajouter facture:
   - `POST /factures`
5. Modifier statut:
   - `PUT /factures/{id}/status`
6. Supprimer:
   - `DELETE /factures/{id}`

Snippet:

```ts
onApartmentChange() {
  this.api.getContracts().subscribe((res: any) => {
    this.contracts = res.filter((c: any) => c.apartment_id == this.addForm.apartment_id);
  });
}

addFacture() {
  const data = {
    type,
    montant: this.addForm.montant,
    date_facture: new Date().toISOString().split('T')[0],
    periode_start: this.addForm.periode_start,
    periode_end: this.addForm.periode_end,
    date_delai: this.addForm.date_delai,
    contract_id: parseInt(this.addForm.contract_id)
  };
  this.api.addFacture(data).subscribe(() => this.load());
}
```

### Backend associe (`/factures`)

Snippet:

```python
today = date.today().isoformat()
db.query(models.Facture).filter(
    models.Facture.date_delai < today,
    models.Facture.status != 'payee'
).update({models.Facture.status: 'en_retard'})
db.commit()
```

Puis lecture enrichie:

```python
factures = db.query(models.Facture) \
  .join(models.Contract, models.Facture.contract_id == models.Contract.id) \
  .join(models.User, models.Contract.tenant_id == models.User.id) \
  .outerjoin(models.Apartment, models.Contract.apartment_id == models.Apartment.id) \
  .add_columns(...)
```

Equivalent SQL logique:
- `UPDATE factures SET status='en_retard' WHERE date_delai < today AND status != 'payee'`
- `SELECT factures.*, users.nom, users.prenom, apartments.nom FROM factures JOIN contracts JOIN users LEFT JOIN apartments`

## 7) Locataire - Comment la data est lue

Fichiers:
- `frontend/src/app/components/my-apartment/my-apartment.ts`
- `frontend/src/app/components/my-contract/my-contract.ts`
- `frontend/src/app/components/my-factures/my-factures.ts`

### My Apartment
Snippet:

```ts
this.api.getApartments(this.user.id).subscribe(res => this.apartment = res[0] || null);
this.api.getContracts().subscribe(res => this.contract = res.find(c => c.tenant_id === this.user.id) || null);
this.api.getFactures().subscribe(res => {
  this.factures = res.filter(f => this.contract && f.contract_id === this.contract.id);
});
```

### My Contract
Snippet:

```ts
this.api.getContracts().subscribe((res: any[]) => {
  this.contract = res.find(c => c.tenant_id === this.user.id) || null;
});
```

### My Factures
Snippet:

```ts
this.api.getContracts().subscribe((contracts: any[]) => {
  const myContract = contracts.find(c => c.tenant_id === this.user.id);
  if (myContract) {
    this.api.getFactures().subscribe((res: any[]) => {
      this.factures = res.filter(f => f.contract_id === myContract.id);
    });
  }
});
```

## 8) Modeles DB et dependances relationnelles

Fichier: `backend/models.py`

Principales tables:
- `users` (role: `proprietaire` / `locataire`, `apartment_id`)
- `apartments` (`code`, `status`)
- `contracts` (`tenant_id`, `apartment_id`, `contract_file`)
- `factures` (`contract_id`, `status`, `date_delai`)

Snippets:

```python
class Contract(Base):
    __tablename__ = "contracts"
    tenant_id    = Column(Integer, ForeignKey("users.id"))
    apartment_id = Column(Integer, ForeignKey("apartments.id"))
```

```python
class Facture(Base):
    __tablename__ = "factures"
    contract_id  = Column(Integer, ForeignKey("contracts.id"))
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=True)
```

## 9) Dependances techniques importantes

- Connexion user:
  - `frontend/src/app/components/login/login.ts`
  - Sauvegarde `token` + `user` dans `localStorage` via `AuthService`
- Role UI:
  - `frontend/src/app/services/auth.service.ts` (`isProprietaire()`, `isLocataire()`)
  - `layout.html` affiche menu selon role
- Protection routes:
  - `auth.guard.ts` verifie presence token

Snippet login:

```ts
this.api.login({ email: this.email, password: this.password, role: this.role })
  .subscribe((res: any) => {
    this.auth.login(res);           // stocke token + user
    this.auth.redirectAfterLogin(); // redirection par role
  });
```

## 10) Sequence resumee (owner -> tenant)

1. Owner ouvre `Invitations`, genere code et sauvegarde sur appartement (`PUT /apartments/{id}`).
2. Tenant entre le code (`POST /join`), backend assigne `user.apartment_id` et met appartement `occupe`.
3. Owner cree contrat (`POST /contracts`) lie a `tenant_id` et `apartment_id`.
4. Owner cree factures (`POST /factures`) liees au `contract_id`.
5. Tenant lit son contrat/factures via endpoints globaux puis filtres frontend par `tenant_id` / `contract_id`.

## 11) Point d attention (securite/data access)

Actuellement:
- `GET /contracts` et `GET /factures` renvoient globalement toutes les donnees.
- Le locataire est filtre surtout cote frontend.

Impact:
- Si un client malicieux appelle l API directement, il peut lire plus que ses propres donnees (selon backend actuel).

Recommandation:
- Ajouter filtrage backend par utilisateur authentifie (JWT decode cote backend) pour retourner seulement les ressources autorisees.

