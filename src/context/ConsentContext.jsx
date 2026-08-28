import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Resolve active scenario / consent request dynamically from URL (/request/<secure-token> or ?token=...)
  const [activeScenarioId, setActiveScenarioId] = useState(() => {
    const pathname = window.location.pathname;
    const pathTokenMatch = pathname.match(/\/request\/([^/]+)/);
    const pathToken = pathTokenMatch ? pathTokenMatch[1] : null;

    const params = new URLSearchParams(window.location.search);
    const noticeIdParam = params.get('noticeId');
    const tokenParam = params.get('token') || pathToken;

    if (noticeIdParam || tokenParam) {
      const found = MOCK_SCENARIOS.find(s => s.noticeId === noticeIdParam || s.token === tokenParam || s.id === tokenParam);
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
  const [latestReceipt, setLatestReceipt] = useState(null);
  const [grievanceModalOpen, setGrievanceModalOpen] = useState(false);
  const [grievanceTarget, setGrievanceTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Function to refetch live data from Python FastAPI backend
  const refetchBackendData = useCallback(async () => {
    try {
      setApiError(null);
      // Fetch Active Consents
      const fetchedConsents = await consentApi.fetchActiveConsents(dataPrincipal.id);
      if (fetchedConsents && Array.isArray(fetchedConsents)) {
        setActiveConsents(fetchedConsents);
      }

      // Fetch Audit Logs
      const fetchedAudit = await consentApi.fetchAuditLogs(dataPrincipal.id);
      if (fetchedAudit && Array.isArray(fetchedAudit)) {
        setActiveConsents(prevConsents => {
          // Keep activeConsents synced
          return prevConsents;
        });
        setAuditLogs(fetchedAudit);
      }

      // Fetch Data Rights Requests
      const fetchedDsr = await consentApi.fetchDataRightsRequests(dataPrincipal.id);
      if (fetchedDsr && Array.isArray(fetchedDsr) && fetchedDsr.length > 0) {
        setDsrRequests(fetchedDsr);
      }
    } catch (err) {
      console.warn('Backend sync failed, using client state:', err);
      setApiError('Backend API unreachable. Using offline client state.');
    }
  }, [dataPrincipal.id]);

  // Initial sync with backend API
  useEffect(() => {
    refetchBackendData();
  }, [refetchBackendData]);

  // Async token resolution effect from backend Python REST API
  useEffect(() => {
    const pathname = window.location.pathname;
    const pathTokenMatch = pathname.match(/\/request\/([^/]+)/);
    const pathToken = pathTokenMatch ? pathTokenMatch[1] : null;

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || pathToken;

    if (tokenParam) {
      consentApi.getConsentRequestByToken(tokenParam).then((res) => {
        if (res && res.id) {
          const matchingScenario = MOCK_SCENARIOS.find(s => s.id === res.id || s.token === res.token || s.noticeId === res.notice_id);
          if (matchingScenario) {
            setActiveScenarioId(matchingScenario.id);
          }
        }
      });
    }
  }, []);

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
        initialMap[attr.id] = attr.required ? true : (attr.defaultGranted !== false);
      });
      setSelectedAttributes(initialMap);
    }
  }, [activeScenarioId, currentScenario]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleAttribute = (attrId) => {
    const attr = currentScenario.attributes.find(a => a.id === attrId);
    if (attr && attr.required) return;
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

  // Action: Grant Consent -> API
  const grantCurrentConsent = async (customNote = "") => {
    setLoading(true);
    setApiError(null);
    try {
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

      // Dispatch REST API decision payload to Python backend
      const apiResult = await consentApi.submitConsentDecision(currentScenario.noticeId, {
        decision: "GRANTED",
        selected_attributes: Object.keys(selectedAttributes).filter(k => selectedAttributes[k]),
        denied_attributes: Object.keys(selectedAttributes).filter(k => !selectedAttributes[k]),
        remark: customNote,
        notice_id: currentScenario.noticeId,
        consent_id: newConsentId
      });

      const newConsentRecord = apiResult?.data?.consent || {
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

      // Add to active consents state & refetch from backend
      setActiveConsents(prev => [newConsentRecord, ...prev.filter(c => c.noticeId !== currentScenario.noticeId)]);

      const auditEntry = {
        id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        action: "CONSENT_GRANTED",
        fiduciary: currentScenario.fiduciary,
        consentId: newConsentRecord.consentId,
        noticeId: currentScenario.noticeId,
        details: `Granted ${grantedAttrs.length} data attributes. Denied: ${deniedAttrs.length ? deniedAttrs.length : 0}.`,
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
      await refetchBackendData();
    } catch (err) {
      console.error('Error granting consent via API:', err);
      setApiError('Failed to record consent decision on backend.');
    } finally {
      setLoading(false);
    }
  };

  // Action: Deny Consent -> API
  const denyCurrentConsent = async (reason = "Data Principal declined request") => {
    setLoading(true);
    setApiError(null);
    try {
      const now = new Date().toISOString();

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
      await refetchBackendData();
    } catch (err) {
      console.error('Error denying consent via API:', err);
      setApiError('Failed to record denial decision on backend.');
    } finally {
      setLoading(false);
    }
  };

  // Action: Revoke Active Consent -> API
  const revokeConsent = async (consentId, reason = "User exercised right to withdraw consent under DPDP Act") => {
    setLoading(true);
    setApiError(null);
    try {
      const consentToRevoke = activeConsents.find(c => c.consentId === consentId);
      if (!consentToRevoke) return;

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
      await refetchBackendData();
    } catch (err) {
      console.error('Error revoking consent via API:', err);
      setApiError('Failed to dispatch consent revocation to backend.');
    } finally {
      setLoading(false);
    }
  };

  // Action: Submit Grievance
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

  // Action: Submit Right to Erasure / Data Deletion Request (Section 12) -> API
  const submitErasureRequest = async (erasureData) => {
    setLoading(true);
    try {
      const ticketId = `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const slaDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await consentApi.submitDataRightsRequest({
        dataPrincipalId: dataPrincipal.id,
        requestType: "ERASURE",
        targetFiduciary: erasureData.fiduciary,
        details: { scope: erasureData.details || "Complete data erasure requested under Sec 12." }
      });

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

      showToast(`Erasure Request submitted to ${erasureData.fiduciary}. Ticket ID: ${ticketId}.`);
      await refetchBackendData();
    } catch (err) {
      console.error('Error submitting erasure request:', err);
    } finally {
      setLoading(false);
    }
  };

  // Action: Submit Right to Data Correction Request (Section 11) -> API
  const submitCorrectionRequest = async (correctionData) => {
    setLoading(true);
    try {
      const ticketId = `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const slaDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await consentApi.submitDataRightsRequest({
        dataPrincipalId: dataPrincipal.id,
        requestType: "CORRECTION",
        targetFiduciary: correctionData.fiduciary,
        details: { fieldName: correctionData.fieldName, newValue: correctionData.newValue }
      });

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

      showToast(`Data Correction Request submitted to ${correctionData.fiduciary}. Ticket ID: ${ticketId}.`);
      await refetchBackendData();
    } catch (err) {
      console.error('Error submitting correction request:', err);
    } finally {
      setLoading(false);
    }
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
    refetchBackendData();
    showToast("Reset consent manager to demo default records.", "info");
  };

  return (
    <ConsentContext.Provider value={{
      loading,
      apiError,
      refetchBackendData,
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
