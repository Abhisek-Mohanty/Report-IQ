from typing import Optional

from pydantic import BaseModel, EmailStr, HttpUrl

from app.models.domain.db import User
from app.models.schemas.rwschema import RWSchema

class ApplicationFilter(RWSchema):
    applicationNumber: str
    loanAmount: int
    loanTenure: int
    loanType: int
    loanUsage: int
    status: int

class Application(BaseModel):
    emailId: Optional[EmailStr] = None
    password: Optional[str] = None
    applicationNumber: Optional[str] = None
    loanAmount: Optional[str] = None
    loanTenure: Optional[int] = None
    loanType: Optional[int] = None
    loanUsage: Optional[int] = None
    status: Optional[int] = None
    subStatus: Optional[int] = None
    loggedBy: Optional[int] = None
    loggedAt: Optional[str] = None
    roi: Optional[float] = None
    revisedAmount: Optional[int] = None
    revisedTenure: Optional[int] = None
    eligibleAmount: Optional[int] = None
    approverComment: Optional[str] = None
    approvedBy: Optional[int] = None
    finApproverComment: Optional[str] = None
    finApprovedBy: Optional[int] = None
    techApproverComment: Optional[str] = None
    rechApproverBy: Optional[int] = None
    legalApproverComment: Optional[str] = None
    legalApprovedBy: Optional[int] = None
    rejectReason: Optional[str] = None
    rejectedBy: Optional[int] = None
    upgradeComment: Optional[str] = None
    upgradeBy: Optional[int] = None
    createdAt: Optional[str] = None
    createdBy: Optional[str] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None


class ApplicationInApproval(BaseModel):
    approverComment: Optional[str] = None
    approvedBy: Optional[int] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None

class ApplicationInLegalApproval(BaseModel):
    legalApproverComment: Optional[str] = None
    legalApprovedBy: Optional[int] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None

class ApplicationInLegalApproval(BaseModel):
    legalApproverComment: Optional[str] = None
    legalApprovedBy: Optional[int] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None
