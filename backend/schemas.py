from pydantic import BaseModel
from typing import Optional

class RegisterData(BaseModel):
    nom:       str
    prenom:    str
    email:     str
    password:  str
    telephone: Optional[str] = ""
    cin:       Optional[str] = ""
    role:      str

class LoginData(BaseModel):
    email:    str
    password: str
    role:     str

class ChangePasswordData(BaseModel):
    old_password: str
    new_password: str

class DepartmentData(BaseModel):
    nom:           str
    ville:         Optional[str] = ""
    code_postal:   Optional[str] = ""
    address:       Optional[str] = ""
    photo:         Optional[str] = ""
    titre_foncier: Optional[str] = None
    owner_id:      Optional[int] = None

class ApartmentData(BaseModel):
    nom:           str
    etage:         Optional[int] = 0
    price:         Optional[int] = 0
    description:   Optional[str] = ""
    photo:         Optional[str] = ""
    department_id: int
    status:        Optional[str] = "libre"
    code:          Optional[str] = None
    maintenance: Optional[int] = 0


class GenerateCodeData(BaseModel):
    apartment_id: int

class DeleteCodeData(BaseModel):
    apartment_id: int

class UserUpdateData(BaseModel):
    nom:       str
    prenom:    str
    email:     str
    telephone: Optional[str] = ""

class AddLocataireData(BaseModel):
    cin:          str
    nom:          Optional[str] = ""
    prenom:       Optional[str] = ""
    email:        Optional[str] = ""
    telephone:    Optional[str] = ""
    apartment_id: int

class JoinData(BaseModel):
    code:    str
    user_id: int


class ContractData(BaseModel):
    date_debut:    str
    date_fin:      str
    caution:       int
    montant_total: int
    tenant_id:     int
    apartment_id:  int
    contract_file: Optional[str] = ""

class FactureData(BaseModel):
    type:                 str
    montant:              int
    date_facture:         str
    periode_consommation: Optional[str] = ""
    date_delai:           Optional[str] = ""
    contract_id:          int

class FactureStatusUpdate(BaseModel):
    status: str

class MessageData(BaseModel):
    receiver_id: int
    content:     str
    
class RenewContractData(BaseModel):
    date_fin: str   # nouvelle date de fin

class TerminateContractData(BaseModel):
    reason: Optional[str] = ""  # optionnel, pour futur usage

class DeleteUserData(BaseModel):
    permanent: bool = False   # True = suppression définitive
    force:     bool = False   # True = ignore unpaid factures