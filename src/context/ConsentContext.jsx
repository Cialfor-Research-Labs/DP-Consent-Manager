import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  MOCK_SCENARIOS, 
  INITIAL_ACTIVE_CONSENTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_NOMINEE,
  INITIAL_DSR_REQUESTS
} from '../mock/initialData';
import { INDIC_LANGUAGES, getTranslation } from '../i18n/translations';
import { consentApi } from '../api/consentApi';

const ConsentContext = createContext();

export const ConsentProvider = ({ children }) => {
  const [scenarios] = useState(MOCK_SCENARIOS);
  
  // Resolve active scenario / consent request dynamically from URL or default
  const [activeScenarioId, setActiveScenarioId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const noticeIdParam = params.get('noticeId');
    const tokenParam = params.get('token');
    if (noticeIdParam || tokenParam) {
      const found = MOCK_SCENARIOS.find(s => s.noticeId === noticeIdParam || s.token === tokenParam);
      if (found) return found.id;
    }
    return MOCK_SCENARIOS[0].id;
  });

  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'email-sim', 'active', 'audit', 'rights'

  // Current scenario object (source of truth for fiduciary, purpose & data principal)
  const currentScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  // Dynamic Data Principal derived directly from the active consent request email
  const dataPrincipal = currentScenario.dataPrincipal || {
    id: "DP-2026-88491",
    name: "Ananya Sharma",
    email: "ananya.sharma@delhiuniv.ac.in"
  };

  // Language State for DPDP Act Section 5(3) Multilingual Support
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('dp_lang') || 'en';
  });

  const setLanguage = (langCode) => {
    setLanguageState(langCode);
    localStorage.setItem('dp_lang', langCode);
  };

  const t = (key) => getTranslation(language, key);

  // Selected attributes map for the active scenario: { attr_id: boolean }
  const [selectedAttributes, setSelectedAttributes] = useState({});

  // Active given consents list
  const [activeConsents, setActiveConsents] = useState(() => {
    const saved = localStorage.getItem('dp_active_consents');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVE_CONSENTS;
  });

  // Audit logs list
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('dp_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Nominee state (Section 14)
  const [nominee, setNomineeState] = useState(() => {
    const saved = localStorage.getItem('dp_nominee');
    return saved ? JSON.parse(saved) : INITIAL_NOMINEE;
  });

  // DSR Requests List (Sections 11-14)
  const [dsrRequests, setDsrRequests] = useState(() => {
    const saved = localStorage.getItem('dp_dsr_requests');
    return saved ? JSON.parse(saved) : INITIAL_DSR_REQUESTS;
  });

  const [nominationModalOpen, setNominationModalOpen] = useState(false);

  // Current signed consent receipt artifact (for modal display)
  const [latestReceipt, setLatestReceipt] = useState(null);
  
  // Grievance modal state
  const [grievanceModalOpen, setGrievanceModalOpen] = useState(false);
  const [grievanceTarget, setGrievanceTarget] = useState(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState(null);

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('dp_active_consents', JSON.stringify(activeConsents));
  }, [activeConsents]);

  useEffect(() => {
    localStorage.setItem('dp_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('dp_nominee', JSON.stringify(nominee));
  }, [nominee]);

  useEffect(() => {
    localStorage.setItem('dp_dsr_requests', JSON.stringify(dsrRequests));
  }, [dsrRequests]);

  // Reset selected attributes whenever active scenario changes
  useEffect(() => {
    if (currentScenario && currentScenario.attributes) {
      const initialMap = {};
      currentScenario.attributes.forEach(attr => {
        // Required attributes are locked to true; optional attributes default based on template
        initialMap[attr.id] = attr.required ? true : (attr.defaultGranted !== false);
      });
      setSelectedAttributes(initialMap);
    }
  }, [activeScenarioId]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleAttribute = (attrId) => {
    const attr = currentScenario.attributes.find(a => a.id === attrId);
    if (attr && attr.required) return; // cannot toggle required attributes
    setSelectedAttributes(prev => ({
      ...prev,
      [attrId]: !prev[attrId]
    }));
  };

  const selectScenario = (scenarioId, switchTab = 'incoming') => {
    setActiveScenarioId(scenarioId);
    if (switchTab) setActiveTab(switchTab);
  };

  const generateHash = () => {
    return '0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
  };

  // Action: Grant Consent
  const grantCurrentConsent = async (customNote = "") => {
    const grantedAttrs = [];
    const deniedAttrs = [];

    currentScenario.attributes.forEach(attr => {
      if (selectedAttributes[attr.id]) {
        grantedAttrs.push(attr.name);
      } else {
        deniedAttrs.push(attr.name);
      }
    });

    const newConsentId = `CNST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const hash = generateHash();

    const newConsentRecord = {
      consentId: newConsentId,
      fiduciary: currentScenario.fiduciary,
      fiduciaryCategory: currentScenario.fiduciaryCategory,
      fiduciaryLogo: currentScenario.fiduciaryLogo,
      purpose: currentScenario.purpose,
      noticeId: currentScenario.noticeId,
      status: "ACTIVE",
      grantedOn: now,
      expiresOn: expiry,
      grantedAttributes: grantedAttrs,
      deniedAttributes: deniedAttrs,
      dpoContact: currentScenario.dpoEmail,
      dataRegion: currentScenario.dataRegion,
      receiptHash: hash,
      customNote: customNote
    };

    // Dispatch REST API decision payload
    await consentApi.submitConsentDecision(currentScenario.noticeId, {
      decision: "GRANTED",
      selected_attributes: Object.keys(selectedAttributes).filter(k => selectedAttributes[k]),
      remark: customNote,
      notice_id: currentScenario.noticeId,
      consent_id: newConsentId
    });

    // Add to active consents
    setActiveConsents(prev => [newConsentRecord, ...prev.filter(c => c.noticeId !== currentScenario.noticeId)]);

    // Add to audit log
    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "CONSENT_GRANTED",
      fiduciary: currentScenario.fiduciary,
      consentId: newConsentId,
      noticeId: currentScenario.noticeId,
      details: `Granted ${grantedAttrs.length} data attributes (${grantedAttrs.join(', ')}). Denied: ${deniedAttrs.length ? deniedAttrs.join(', ') : 'None'}.`,
      ipAddress: "103.21.124.88",
      status: "SUCCESS"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);

    // Set generated receipt for verification modal
    setLatestReceipt({
      ...newConsentRecord,
      principalName: dataPrincipal.name,
      principalEmail: dataPrincipal.email,
      principalId: dataPrincipal.id,
      legalBasis: currentScenario.legalBasis
    });

    showToast(`Consent granted successfully to ${currentScenario.fiduciary}! Receipt generated.`);
  };

  // Action: Deny Consent
  const denyCurrentConsent = async (reason = "Data Principal declined request") => {
    const now = new Date().toISOString();

    // Dispatch REST API decision payload
    await consentApi.submitConsentDecision(currentScenario.noticeId, {
      decision: "DENIED",
      selected_attributes: [],
      remark: reason,
      notice_id: currentScenario.noticeId
    });

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "CONSENT_DENIED",
      fiduciary: currentScenario.fiduciary,
      consentId: "N/A",
      noticeId: currentScenario.noticeId,
      details: `Consent request declined. Reason: ${reason}`,
      ipAddress: "103.21.124.88",
      status: "DENIED"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    showToast(`Consent request declined for ${currentScenario.fiduciary}.`, 'info');
  };

  // Action: Revoke Active Consent
  const revokeConsent = async (consentId, reason = "User exercised right to withdraw consent under DPDP Act") => {
    const consentToRevoke = activeConsents.find(c => c.consentId === consentId);
    if (!consentToRevoke) return;

    // Dispatch REST API revocation payload
    await consentApi.revokeConsent(consentId, {
      reason: reason,
      revoked_at: new Date().toISOString()
    });

    setActiveConsents(prev => prev.map(c => {
      if (c.consentId === consentId) {
        return { ...c, status: "REVOKED", revokedOn: new Date().toISOString(), revocationReason: reason };
      }
      return c;
    }));

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      action: "CONSENT_REVOKED",
      fiduciary: consentToRevoke.fiduciary,
      consentId: consentId,
      noticeId: consentToRevoke.noticeId,
      details: `Consent revoked. Reason: ${reason}`,
      ipAddress: "103.21.124.88",
      status: "REVOKED"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);

    showToast(`Consent ${consentId} for ${consentToRevoke.fiduciary} has been revoked. Notice dispatched to Data Fiduciary.`, 'warning');
  };

  // Action: Submit Grievance / Rights Request
  const submitGrievance = (grievanceData) => {
    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      action: "GRIEVANCE_FILED",
      fiduciary: grievanceData.fiduciary,
      consentId: grievanceData.consentId || "N/A",
      details: `Grievance type: ${grievanceData.type}. Description: ${grievanceData.description.substring(0, 60)}...`,
      ipAddress: "103.21.124.88",
      status: "PENDING_DPO_RESPONSE"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    setGrievanceModalOpen(false);
    showToast(`Grievance submitted to DPO (${grievanceData.dpoEmail}). Ticket ID: GRV-2026-${Math.floor(1000 + Math.random() * 9000)}.`);
  };

  // Action: Update Statutory Nominee (Section 14)
  const updateNominee = (updatedNomineeData) => {
    const newNominee = {
      ...updatedNomineeData,
      dateDesignated: new Date().toISOString().split('T')[0],
      status: "ACTIVE_VERIFIED"
    };
    setNomineeState(newNominee);

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      action: "NOMINEE_UPDATED",
      fiduciary: "Central Privacy Registry",
      consentId: "N/A",
      details: `Updated designated nominee to ${newNominee.nomineeName} (${newNominee.relationship}).`,
      ipAddress: "103.21.124.88",
      status: "SUCCESS"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    setNominationModalOpen(false);
    showToast(`Statutory Nominee updated to ${newNominee.nomineeName} (DPDP Sec 14).`);
  };

  // Action: Submit Right to Erasure / Data Deletion Request (Section 12)
  const submitErasureRequest = (erasureData) => {
    const ticketId = `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const slaDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newRequest = {
      ticketId,
      type: "RIGHT_TO_ERASURE",
      fiduciary: erasureData.fiduciary,
      consentId: erasureData.consentId || "N/A",
      details: erasureData.details || "Complete data erasure requested under DPDP Act Section 12.",
      submittedOn: now,
      status: "PROCESSING",
      slaDeadline,
      completionHash: "PENDING"
    };

    setDsrRequests(prev => [newRequest, ...prev]);

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "ERASURE_REQUESTED",
      fiduciary: erasureData.fiduciary,
      consentId: erasureData.consentId || "N/A",
      details: `Submitted Right to Erasure request under DPDP Act Sec 12. Ticket: ${ticketId}`,
      ipAddress: "103.21.124.88",
      status: "PROCESSING"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    showToast(`Erasure Request submitted to ${erasureData.fiduciary}. Ticket ID: ${ticketId}.`);
  };

  // Action: Submit Right to Data Correction Request (Section 11)
  const submitCorrectionRequest = (correctionData) => {
    const ticketId = `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const slaDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newRequest = {
      ticketId,
      type: "RIGHT_TO_CORRECTION",
      fiduciary: correctionData.fiduciary,
      consentId: "N/A",
      details: `Field: ${correctionData.fieldName}. Updated Value: ${correctionData.newValue}. Reason: ${correctionData.reason}`,
      submittedOn: now,
      status: "PROCESSING",
      slaDeadline,
      completionHash: "PENDING"
    };

    setDsrRequests(prev => [newRequest, ...prev]);

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "CORRECTION_REQUESTED",
      fiduciary: correctionData.fiduciary,
      consentId: "N/A",
      details: `Data Correction request for ${correctionData.fieldName}. Ticket: ${ticketId}`,
      ipAddress: "103.21.124.88",
      status: "PROCESSING"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    showToast(`Data Correction Request submitted to ${correctionData.fiduciary}. Ticket ID: ${ticketId}.`);
  };

  const resetToDefaults = () => {
    setActiveConsents(INITIAL_ACTIVE_CONSENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNomineeState(INITIAL_NOMINEE);
    setDsrRequests(INITIAL_DSR_REQUESTS);
    localStorage.removeItem('dp_active_consents');
    localStorage.removeItem('dp_audit_logs');
    localStorage.removeItem('dp_nominee');
    localStorage.removeItem('dp_dsr_requests');
    showToast("Reset consent manager to demo default records.", "info");
  };

  return (
    <ConsentContext.Provider value={{
      language,
      setLanguage,
      t,
      INDIC_LANGUAGES,
      dataPrincipal,
      scenarios,
      activeScenarioId,
      currentScenario,
      activeTab,
      setActiveTab,
      selectedAttributes,
      toggleAttribute,
      selectScenario,
      grantCurrentConsent,
      denyCurrentConsent,
      revokeConsent,
      activeConsents,
      auditLogs,
      nominee,
      updateNominee,
      dsrRequests,
      submitErasureRequest,
      submitCorrectionRequest,
      nominationModalOpen,
      setNominationModalOpen,
      latestReceipt,
      setLatestReceipt,
      grievanceModalOpen,
      setGrievanceModalOpen,
      grievanceTarget,
      setGrievanceTarget,
      submitGrievance,
      toastMessage,
      resetToDefaults
    }}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => useContext(ConsentContext);
