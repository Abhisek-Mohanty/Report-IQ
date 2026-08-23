from re import A
from app.models.domain.users import User
from app.models.domain.company import Company
from app.models.domain.project import Project
from app.models.domain.employee import Employee
from app.models.domain.invoice import Invoice
from app.models.domain.asset import Asset
from app.models.domain.maintainceLog import MaintainanceLog
from app.models.domain.assetAssgin import AssetAssign
from app.models.domain.assetInventory import AssetInventory
from app.models.domain.employeeDoc import EmployeeDoc
from app.models.domain.employeeKYC import EmployeeKYC
from app.models.domain.employeePAN import EmployeePAN
from app.models.domain.crimeCheck import CrimeCheck
from app.models.domain.assetDocs import AssetDocument


# Delcate Models
User            = User
Company         = Company
Project         = Project
Employee        = Employee
Invoice         = Invoice
MaintainanceLog = MaintainanceLog
AssetAssign     = AssetAssign
AssetInventory  = AssetInventory
Asset           = Asset
EmployeeDoc     = EmployeeDoc
EmployeeKYC     = EmployeeKYC
EmployeePAN     = EmployeePAN
CrimeCheck      = CrimeCheck
AssetDocument   = AssetDocument