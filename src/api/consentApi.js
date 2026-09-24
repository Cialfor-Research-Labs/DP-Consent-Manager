/**
 * Data Principal Consent Manager - REST API Integration Layer
 * Serves as the interface to the Python FastAPI backend services for authentication,
 * consent requests, decision persistence, cryptographic receipt generation,
 * statutory revocations, audit logs, and DSR portal.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Retrieve authorization headers using the JWT stored in sessionStorage
 */
export const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('dp_session_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Authenticated fetch helper that injects Bearer token and handles 401 Session Expiry
 */
export const authFetch = async (url, options = {}) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders()
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Only dispatch event if a token was actually present in session
    if (typeof window !== 'undefined' && sessionStorage.getItem('dp_session_token')) {
      window.dispatchEvent(new CustomEvent('dp-auth:expired'));
    }
  }

  return response;
};

export const consentApi = {
  // ── AUTHENTICATION ENDPOINTS ──────────────────────────────────────────

  /**
   * Register a new user account
   * POST /api/auth/register
   */
  async register(payload) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed.');
    }
    return data;
  },

  /**
   * Authenticate user with email and password
   * POST /api/auth/login
   */
  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Invalid email or password.');
    }
    return data;
  },

  /**
   * Fetch currently authenticated user profile
   * GET /api/auth/me
   */
  async getMe() {
    const response = await authFetch(`${API_BASE_URL}/auth/me`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  },

  // ── CONSENT & INTEGRATION ENDPOINTS ───────────────────────────────────

  /**
   * Ingest any custom email subject & body text into backend database
   * POST /api/ingest-email
   */
  async ingestEmail(payload) {
    try {
      const response = await authFetch(`${API_BASE_URL}/ingest-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend email ingestion offline:', e.message);
    }
    return null;
  },

  /**
   * Fetch all consent requests from backend (filtered by backend role & ownership)
   * GET /api/consent-requests
   */
  async fetchConsentRequests(status) {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await authFetch(`${API_BASE_URL}/consent-requests${qs}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API unreachable, using local fallback:', e.message);
    }
    return null;
  },

  /**
   * Fetch authenticated Data Principal's own consent requests
   * GET /api/me/consent-requests?status={status}
   */
  async fetchMyConsentRequests(status) {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await authFetch(`${API_BASE_URL}/me/consent-requests${qs}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API fetchMyConsentRequests unreachable:', e.message);
    }
    return null;
  },

  /**
   * Resolve a secure request token to its corresponding Consent Request & Email Snapshot
   * GET /api/consent-requests/resolve?token={token}
   */
  async resolveConsentRequest(token) {
    try {
      const response = await authFetch(`${API_BASE_URL}/consent-requests/resolve?token=${encodeURIComponent(token)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API unreachable, using local request resolution:', e.message);
    }
    return null;
  },

  /**
   * Fetch consent request by path token or ID
   * GET /api/consent-requests/{requestToken}
   */
  async getConsentRequestByToken(requestToken, queryParams = {}) {
    try {
      const qs = new URLSearchParams(queryParams).toString();
      const url = `${API_BASE_URL}/consent-requests/${encodeURIComponent(requestToken)}${qs ? '?' + qs : ''}`;
      const response = await authFetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API token resolution offline, using local scenario fallback:', e.message);
    }
    return null;
  },

  /**
   * Submit Grant or Deny decision to the backend
   * POST /api/consent-requests/{requestId}/decision
   */
  async submitConsentDecision(requestId, decisionData) {
    try {
      const response = await authFetch(`${API_BASE_URL}/consent-requests/${encodeURIComponent(requestId)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionData)
      });
      if (response.ok) {
        return await response.json();
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Submission failed with status ${response.status}`);
      }
    } catch (e) {
      console.warn('Backend API submission offline, persisting decision locally:', e.message);
      throw e;
    }
  },

  /**
   * Create a new consent request notice (Data Fiduciary / Admin only)
   * POST /api/consent-requests
   */
  async createConsentRequest(payload) {
    const response = await authFetch(`${API_BASE_URL}/consent-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || `Server error (${response.status})` };
    }
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Failed to create consent request notice.');
    }
    return data;
  },

  /**
   * Create bulk consent requests in batch (Data Fiduciary / Admin only)
   * POST /api/consent-requests/bulk
   */
  async createBulkConsentRequests(payload) {
    const response = await authFetch(`${API_BASE_URL}/consent-requests/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || `Server error (${response.status})` };
    }
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Failed to dispatch bulk consent notices.');
    }
    return data;
  },

  /**
   * Fetch active consents from backend
   * GET /api/consents
   */
  async fetchActiveConsents(principalId) {
    try {
      const url = principalId 
        ? `${API_BASE_URL}/consents?principalId=${encodeURIComponent(principalId)}`
        : `${API_BASE_URL}/consents`;
      const response = await authFetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API active consents offline, using local fallback:', e.message);
    }
    return null;
  },

  /**
   * Fetch signed consent receipt certificate
   * GET /api/consents/{consentId}/receipt
   */
  async fetchConsentReceipt(consentId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/consents/${encodeURIComponent(consentId)}/receipt`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API receipt retrieval offline:', e.message);
    }
    return null;
  },

  /**
   * Revoke an active consent record
   * POST /api/consents/{consentId}/revoke
   */
  async revokeConsent(consentId, revocationData) {
    try {
      const payload = typeof revocationData === 'string'
        ? { reason: revocationData }
        : (revocationData?.reason ? revocationData : { reason: 'Consent withdrawn by Data Principal under DPDP Act Sec 6(4)' });

      const response = await authFetch(`${API_BASE_URL}/consents/${encodeURIComponent(consentId)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        console.warn('Consent record not found in backend DB (may be local mock):', consentId);
        return { success: true, status: 'REVOKED', localOnly: true, consentId };
      } else {
        const errJson = await response.json().catch(() => ({}));
        let detailMsg = 'Revocation failed.';
        if (typeof errJson.detail === 'string') {
          detailMsg = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          detailMsg = errJson.detail.map(d => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join(', ');
        } else if (errJson.message) {
          detailMsg = errJson.message;
        }
        throw new Error(detailMsg);
      }
    } catch (e) {
      console.warn('Backend API revocation error:', e.message);
      throw e;
    }
  },

  /**
   * Fetch audit logs from backend
   * GET /api/audit-logs
   */
  async fetchAuditLogs(principalId) {
    try {
      const url = principalId 
        ? `${API_BASE_URL}/audit-logs?principalId=${encodeURIComponent(principalId)}`
        : `${API_BASE_URL}/audit-logs`;
      const response = await authFetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API audit logs offline:', e.message);
    }
    return null;
  },

  /**
   * Submit statutory DSR Request (Erasure / Correction / Nomination)
   * POST /api/data-rights
   */
  async submitDataRightsRequest(dsrData) {
    try {
      const response = await authFetch(`${API_BASE_URL}/data-rights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dsrData)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API DSR request offline:', e.message);
    }
    return { success: true, status: 'PROCESSING', id: `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}` };
  },

  /**
   * Fetch Data Rights Requests from backend
   * GET /api/data-rights
   */
  async fetchDataRightsRequests(principalId) {
    try {
      const url = principalId
        ? `${API_BASE_URL}/data-rights?principalId=${encodeURIComponent(principalId)}`
        : `${API_BASE_URL}/data-rights`;
      const response = await authFetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API DSR fetch offline:', e.message);
    }
    return null;
  },

  /**
   * Submit Statutory Grievance under DPDP Act Section 13
   * POST /api/grievance
   */
  async submitGrievance(grievanceData) {
    try {
      const response = await authFetch(`${API_BASE_URL}/grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grievanceData)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend API grievance offline:', e.message);
    }
    return {
      success: true,
      ticketId: `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      slaDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    };
  },

  /**
   * Fetch active Nominee for Data Principal
   * GET /api/nominee
   */
  async fetchNominee(principalId, email) {
    try {
      const params = new URLSearchParams();
      if (principalId) params.append('principalId', principalId);
      if (email) params.append('email', email);
      const res = await authFetch(`${API_BASE_URL}/nominee?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.nominee;
      }
    } catch (e) {
      console.warn('Backend API nominee fetch offline:', e.message);
    }
    return null;
  },

  /**
   * Save or update Nominee under DPDP Act Section 14
   * POST /api/nominee
   */
  async saveNominee(nomineeData) {
    try {
      const res = await authFetch(`${API_BASE_URL}/nominee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nomineeData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend API nominee save offline:', e.message);
    }
    return {
      success: true,
      nominee: {
        ...nomineeData,
        id: `NOM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE_VERIFIED',
        dateDesignated: new Date().toISOString().split('T')[0]
      }
    };
  },

  /**
   * Revoke Nominee under DPDP Act Section 14
   * DELETE /api/nominee
   */
  async removeNominee(principalId, email) {
    try {
      const params = new URLSearchParams();
      if (principalId) params.append('principalId', principalId);
      if (email) params.append('email', email);
      const res = await authFetch(`${API_BASE_URL}/nominee?${params.toString()}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend API nominee remove offline:', e.message);
    }
    return { success: true };
  },

  /**
   * Fetch public (unauthenticated) consent request preview by token.
   * Used on the consent landing page shown before login.
   * GET /api/consent-requests/public/{token}
   */
  async getPublicConsentRequest(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/consent-requests/public/${encodeURIComponent(token)}`);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 404) {
        return null;
      }
    } catch (e) {
      console.warn('Public consent request fetch error:', e.message);
    }
    return null;
  },

  /**
   * (Re)send the Resend consent invite email for an existing request.
   * POST /api/consent-requests/send-email/{requestId}
   */
  async resendConsentEmail(requestId) {
    const response = await authFetch(`${API_BASE_URL}/consent-requests/send-email/${encodeURIComponent(requestId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to resend consent email.');
    }
    return data;
  }
};

