import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CURRENT_DATA_PRINCIPAL, 
  MOCK_SCENARIOS, 
  INITIAL_ACTIVE_CONSENTS, 
  INITIAL_AUDIT_LOGS 
} from '../mock/initialData';

const ConsentContext = createContext();

export const ConsentProvider = ({ children }) => {
  const [dataPrincipal] = useState(CURRENT_DATA_PRINCIPAL);
  const [scenarios] = useState(MOCK_SCENARIOS);
  const [activeScenarioId, setActiveScenarioId] = useState(MOCK_SCENARIOS[0].id);
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'email-sim', 'active', 'audit'

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

  // Current scenario object
  const currentScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

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
  const grantCurrentConsent = (customNote = "") => {
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

    // Add to active consents
    setActiveConsents(prev => [newConsentRecord, ...prev]);

    // Add to audit log
    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "CONSENT_GRANTED",
      fiduciary: currentScenario.fiduciary,
      consentId: newConsentId,
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
  const denyCurrentConsent = (reason = "Data Principal declined request") => {
    const now = new Date().toISOString();
    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      action: "CONSENT_DENIED",
      fiduciary: currentScenario.fiduciary,
      consentId: "N/A",
      details: `Consent request declined. Reason: ${reason}`,
      ipAddress: "103.21.124.88",
      status: "DENIED"
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    showToast(`Consent request declined for ${currentScenario.fiduciary}.`, 'info');
  };

  // Action: Revoke Active Consent
  const revokeConsent = (consentId, reason = "User exercised right to withdraw consent under DPDP Act") => {
    const consentToRevoke = activeConsents.find(c => c.consentId === consentId);
    if (!consentToRevoke) return;

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

  const resetToDefaults = () => {
    setActiveConsents(INITIAL_ACTIVE_CONSENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.removeItem('dp_active_consents');
    localStorage.removeItem('dp_audit_logs');
    showToast("Reset consent manager to demo default records.", "info");
  };

  return (
    <ConsentContext.Provider value={{
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
