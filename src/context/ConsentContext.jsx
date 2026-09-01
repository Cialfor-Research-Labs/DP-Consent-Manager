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

export const formatBackendResponseToScenario = (res) => {
  if (!res) return null;
  const dp = res.dataPrincipal || {};
  const es = res.emailSnapshot || {};

  return {
    id: res.id,
    token: res.token || res.id,
    title: res.purpose || res.emailSubject || "Consent Request Notice",
    dataPrincipal: {
      id: dp.id || res.data_principal_id || "DP-2026-00000",
      name: dp.name || "Data Principal",
      email: dp.email || "principal@example.com",
      phone: dp.phone || "+91 98765 43210",
      rollNo: dp.roll_no || dp.rollNo || "DP-REF-2026",
      institution: dp.institution || "Cialfor Partner Institution",
      kycStatus: dp.kyc_status || dp.kycStatus || "Verified",
      registeredOn: dp.registered_on || dp.registeredOn || "2026-08-28"
    },
    fiduciary: res.fiduciary || res.fiduciary_name || "Data Fiduciary",
    fiduciaryCategory: res.fiduciaryCategory || res.fiduciary_category || "Corporate Entity",
    fiduciaryLogo: res.fiduciaryLogo || res.fiduciary_logo || "🏢",
    fiduciaryEmail: res.fiduciaryEmail || res.fiduciary_email || "dpo@fiduciary.com",
    dpoName: res.dpoName || res.dpo_name || "Data Protection Officer",
    dpoEmail: res.dpoEmail || res.dpo_email || "dpo@fiduciary.com",
    purpose: res.purpose || "Processing personal data for requested service",
    noticeId: res.noticeId || res.notice_id || "NTC-2026-GEN-001",
    legalBasis: res.legalBasis || res.legal_basis || "Consent under DPDP Act 2023 (Section 6)",
    validityPeriod: res.validityPeriod || res.validity_period || "12 Months",
    dataRegion: res.dataRegion || res.data_region || "India (MeitY Empanelled Cloud)",
    attributes: res.attributes || res.requestedAttributes || [
      { id: "attr_name", name: "Full Name", category: "Identity", required: true, description: "Official name of Data Principal", sensitive: false },
      { id: "attr_email", name: "Email Address", category: "Contact", required: true, description: "Contact email address", sensitive: false },
      { id: "attr_phone", name: "Mobile Phone Number", category: "Contact", required: false, description: "Contact phone number", sensitive: false }
    ],
    emailSnapshot: {
      from: es.from || es.from_address || `${res.fiduciary || "Data Fiduciary"} <${res.fiduciaryEmail || "fiduciary@example.com"}>`,
      to: es.to || es.to_address || `${dp.name || "Data Principal"} <${dp.email || "principal@example.com"}>`,
      subject: es.subject || res.emailSubject || "ACTION REQUIRED: Consent Request Notice",
      date: es.date || es.sent_date || "Monday, August 31, 2026",
      body: es.body || es.body_text || res.emailBody || "Please grant consent for processing your personal data.",
      attachments: es.attachments || [
        {
          name: es.attachment_name || `Statutory_Privacy_Notice_${res.noticeId || "NTC-2026"}.pdf`,
          size: es.attachment_size || "1.2 MB",
          type: "OFFICIAL DPDP NOTICE SNAPSHOT DOCUMENT"
        }
      ]
    }
  };
};

export const ConsentProvider = ({ children }) => {
  const [scenarios, setScenarios] = useState(MOCK_SCENARIOS);
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
  const currentScenario = scenarios.find(s => s.id === activeScenarioId || s.token === activeScenarioId || s.noticeId === activeScenarioId) || scenarios[0];

  // Dynamic Data Principal derived directly from the active consent request email
  const dataPrincipal = currentScenario?.dataPrincipal || {
    id: "DP-2026-DYNAMIC",
    name: "Data Principal",
    email: "principal@example.com"
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
        setAuditLogs(fetchedAudit);
      }

      // Fetch Data Rights Requests
      const fetchedDsr = await consentApi.fetchDataRightsRequests(dataPrincipal.id);
      if (fetchedDsr && Array.isArray(fetchedDsr) && fetchedDsr.length > 0) {
        setDsrRequests(fetchedDsr);
      }

      // Fetch all Consent Requests from Backend and hydrate scenarios list
      const fetchedRequests = await consentApi.fetchConsentRequests();
      if (fetchedRequests && Array.isArray(fetchedRequests) && fetchedRequests.length > 0) {
        const formattedList = fetchedRequests.map(formatBackendResponseToScenario).filter(Boolean);
        setScenarios(prev => {
          const combined = [...prev];
          formattedList.forEach(item => {
            const idx = combined.findIndex(s => s.id === item.id || s.token === item.token || s.noticeId === item.noticeId);
            if (idx >= 0) {
              combined[idx] = item;
            } else {
              combined.unshift(item);
            }
          });
          return combined;
        });
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
    const toEmailParam = params.get('to') || params.get('to_email') || params.get('email') || params.get('principal_email');
    const toNameParam = params.get('to_name') || params.get('name') || params.get('principal_name');
    const subjectParam = params.get('subject') || params.get('title');
    const bodyParam = params.get('body') || params.get('text');
    const purposeParam = params.get('purpose');
    const fiduciaryParam = params.get('fiduciary') || params.get('from_name');

    const queryObj = {};
    if (toEmailParam) queryObj.to_email = toEmailParam;
    if (toNameParam) queryObj.to_name = toNameParam;
    if (subjectParam) queryObj.subject = subjectParam;
    if (bodyParam) queryObj.body = bodyParam;
    if (purposeParam) queryObj.purpose = purposeParam;
    if (fiduciaryParam) queryObj.fiduciary = fiduciaryParam;

    const targetToken = tokenParam || 'tok_pf_account';

    consentApi.getConsentRequestByToken(targetToken, queryObj).then((res) => {
      if (res && (res.id || res.token)) {
        const formatted = formatBackendResponseToScenario(res);
        if (formatted) {
          setScenarios(prev => {
            const idx = prev.findIndex(s => s.id === formatted.id || s.token === formatted.token || s.noticeId === formatted.noticeId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = formatted;
              return copy;
            }
            return [formatted, ...prev];
          });
          setActiveScenarioId(formatted.id);
        }
      }
    }).catch(err => {
      console.warn("Failed to fetch token request from API:", err);
    });
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
        if (attr.required) {
          initialMap[attr.id] = true;
        } else {
          initialMap[attr.id] = attr.defaultGranted !== false;
        }
      });
      setSelectedAttributes(initialMap);
    }
  }, [currentScenario]);

  // Toggle individual attribute selection
  const toggleAttribute = (attrId) => {
    setSelectedAttributes(prev => {
      // Required attributes cannot be un-toggled
      const attrObj = currentScenario.attributes.find(a => a.id === attrId);
      if (attrObj && attrObj.required) return prev;
      return {
        ...prev,
        [attrId]: !prev[attrId]
      };
    });
  };

  // Switch active scenario
  const switchScenario = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    setActiveTab('incoming');
  };

  // Grant Consent API trigger
  const grantCurrentConsent = async (customNote = '') => {
    setLoading(true);
    const selectedAttrList = currentScenario.attributes
      .filter(a => selectedAttributes[a.id])
      .map(a => a.id);
      
    const deniedAttrList = currentScenario.attributes
      .filter(a => !selectedAttributes[a.id])
      .map(a => a.id);

    try {
      const payload = {
        decision: 'GRANTED',
        selected_attributes: selectedAttrList,
        denied_attributes: deniedAttrList,
        remark: customNote
      };

      const res = await consentApi.submitConsentDecision(currentScenario.id || currentScenario.noticeId, payload);
      
      let consentRecord = res.consent;
      if (!consentRecord) {
        consentRecord = {
          consentId: `CNST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          fiduciary: currentScenario.fiduciary,
          fiduciaryCategory: currentScenario.fiduciaryCategory,
          fiduciaryLogo: currentScenario.fiduciaryLogo,
          purpose: currentScenario.purpose,
          noticeId: currentScenario.noticeId,
          status: 'ACTIVE',
          grantedOn: new Date().toISOString(),
          expiresOn: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
          grantedAttributes: selectedAttrList,
          deniedAttributes: deniedAttrList,
          dpoContact: currentScenario.dpoEmail,
          dataRegion: currentScenario.dataRegion,
          receiptHash: `0x${Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
          customNote: customNote
        };
      }

      setLatestReceipt(consentRecord);
      
      // Sync state and refetch from backend
      await refetchBackendData();

      setToastMessage({
        type: 'success',
        text: `Consent GRANTED to ${currentScenario.fiduciary}. Receipt generated!`
      });

      return consentRecord;
    } catch (err) {
      console.error('Grant consent failed:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to submit consent decision to server.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Deny Consent API trigger
  const denyCurrentConsent = async (reason = '') => {
    setLoading(true);
    const allAttrIds = currentScenario.attributes.map(a => a.id);
    try {
      const payload = {
        decision: 'DENIED',
        selected_attributes: [],
        denied_attributes: allAttrIds,
        remark: reason
      };

      await consentApi.submitConsentDecision(currentScenario.id || currentScenario.noticeId, payload);
      await refetchBackendData();

      setToastMessage({
        type: 'info',
        text: `Consent DENIED to ${currentScenario.fiduciary}. Logged in Audit Trail.`
      });
    } catch (err) {
      console.error('Deny consent failed:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to submit denial decision.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Revoke Consent API trigger
  const revokeConsent = async (consentId, reason = '') => {
    setLoading(true);
    try {
      await consentApi.revokeConsent(consentId, reason);
      await refetchBackendData();

      setToastMessage({
        type: 'warning',
        text: `Consent ${consentId} has been REVOKED under DPDP Sec 6(4).`
      });
    } catch (err) {
      console.error('Revoke consent failed:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to revoke consent.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update Nominee
  const updateNominee = (newNomineeData) => {
    setNomineeState(newNomineeData);
    setToastMessage({
      type: 'success',
      text: 'Legal Nominee details updated under DPDP Act Section 14.'
    });
  };

  // Submit DSR Request API trigger
  const submitDsrRequest = async (requestType, targetFiduciary, details) => {
    setLoading(true);
    try {
      const res = await consentApi.submitDataRightsRequest({
        dataPrincipalId: dataPrincipal.id,
        requestType,
        targetFiduciary,
        details
      });

      await refetchBackendData();

      setToastMessage({
        type: 'success',
        text: `Statutory ${requestType} request submitted! Ticket ID: ${res.id || 'DSR-2026-NEW'}`
      });

      return res;
    } catch (err) {
      console.error('DSR submission failed:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to submit statutory request.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    localStorage.removeItem('dp_active_consents');
    localStorage.removeItem('dp_audit_logs');
    localStorage.removeItem('dp_nominee');
    localStorage.removeItem('dp_dsr_requests');
    localStorage.removeItem('dp_lang');
    window.location.reload();
  };

  const value = {
    scenarios,
    activeScenarioId,
    currentScenario,
    dataPrincipal,
    activeTab,
    setActiveTab,
    switchScenario,
    selectScenario: switchScenario,
    language,
    setLanguage,
    INDIC_LANGUAGES,
    t,
    selectedAttributes,
    toggleAttribute,
    activeConsents,
    auditLogs,
    nominee,
    updateNominee,
    dsrRequests,
    submitDsrRequest,
    grantCurrentConsent,
    denyCurrentConsent,
    revokeConsent,
    resetToDefaults,
    nominationModalOpen,
    setNominationModalOpen,
    latestReceipt,
    setLatestReceipt,
    grievanceModalOpen,
    setGrievanceModalOpen,
    grievanceTarget,
    setGrievanceTarget,
    toastMessage,
    setToastMessage,
    loading,
    apiError,
    refetchBackendData
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
};
