from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class DecisionPayload(BaseModel):
    decision: str  # GRANTED or DENIED
    selected_attributes: Optional[List[str]] = []
    denied_attributes: Optional[List[str]] = []
    remark: Optional[str] = ""
    notice_id: Optional[str] = None
    consent_id: Optional[str] = None

class RevokePayload(BaseModel):
    reason: str
    revoked_at: Optional[str] = None

class DSRRequestPayload(BaseModel):
    dataPrincipalId: Optional[str] = None
    requestType: str  # ERASURE, CORRECTION, NOMINATION
    targetFiduciary: str
    details: Optional[Dict[str, Any]] = {}

class ConsentRequestCreatePayload(BaseModel):
    fiduciary_name: str
    fiduciary_category: Optional[str] = "Educational Institution"
    fiduciary_logo: Optional[str] = "🎓"
    fiduciary_email: str
    dpo_name: Optional[str] = "Data Protection Officer"
    dpo_email: Optional[str] = "dpo@example.com"
    principal_name: str
    principal_email: str
    purpose: str
    notice_id: Optional[str] = None
    legal_basis: Optional[str] = "Consent under DPDP Act 2023 (Section 6)"
    validity_period: Optional[str] = "12 Months"
    data_region: Optional[str] = "India"
    requested_attributes: List[Dict[str, Any]]
    email_subject: str
    email_body: str
    attachment_name: Optional[str] = "Statutory_Privacy_Notice.pdf"

class EmailIngestPayload(BaseModel):
    from_address: Optional[str] = "Prerna Pandey <prerna.p@cialfor.com>"
    to_address: str
    subject: str
    body_text: str
    purpose: Optional[str] = None
    fiduciary_name: Optional[str] = "Cialfor Research Labs Private Limited"

