import express from 'express';
import { db } from '../db/schema.js';

const router = express.Router();

// GET /api/consent-requests/resolve?token={token}
router.get('/consent-requests/resolve', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing required query parameter: token' });
  }

  const consentRequest = db.getConsentRequestByToken(token);
  if (!consentRequest) {
    return res.status(404).json({ error: 'Consent request not found for provided token' });
  }

  return res.json(consentRequest);
});

// GET /api/consent-requests/notice/:noticeId
router.get('/consent-requests/notice/:noticeId', (req, res) => {
  const { noticeId } = req.params;
  const consentRequest = db.getConsentRequestByNoticeId(noticeId);
  if (!consentRequest) {
    return res.status(404).json({ error: 'Consent request not found for notice ID' });
  }
  return res.json(consentRequest);
});

// GET /api/consent-requests
router.get('/consent-requests', (req, res) => {
  const requests = db.getAllConsentRequests();
  return res.json(requests);
});

// POST /api/consent-requests/:requestId/decision
router.post('/consent-requests/:requestId/decision', (req, res) => {
  const { requestId } = req.params;
  const { decision, selected_attributes, denied_attributes, remark, consent_id } = req.body;

  if (!decision || !['GRANTED', 'DENIED'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid or missing decision (must be GRANTED or DENIED)' });
  }

  const result = db.recordConsentDecision(requestId, {
    decision,
    selected_attributes: selected_attributes || [],
    denied_attributes: denied_attributes || [],
    remark: remark || '',
    consent_id: consent_id
  });

  if (!result) {
    return res.status(404).json({ error: 'Consent request not found' });
  }

  return res.json({
    success: true,
    message: `Consent decision ${decision} recorded successfully.`,
    data: result
  });
});

// GET /api/consents
router.get('/consents', (req, res) => {
  const { principalId } = req.query;
  const consents = db.getActiveConsents(principalId);
  return res.json(consents);
});

// GET /api/consents/:consentId/receipt
router.get('/consents/:consentId/receipt', (req, res) => {
  const { consentId } = req.params;
  const consents = db.getActiveConsents();
  const consent = consents.find(c => c.consentId === consentId);
  if (!consent) {
    return res.status(404).json({ error: 'Consent record not found' });
  }
  const dp = db.getDataPrincipalById(consent.dataPrincipalId);

  return res.json({
    receipt: {
      ...consent,
      principalName: dp.name,
      principalEmail: dp.email,
      principalId: dp.id,
      verifiedSignature: consent.receiptHash
    }
  });
});

// POST /api/consents/:consentId/revoke
router.post('/consents/:consentId/revoke', (req, res) => {
  const { consentId } = req.params;
  const { reason } = req.body;

  const result = db.revokeConsent(consentId, {
    reason: reason || 'User exercised right to withdraw consent under DPDP Act'
  });

  if (!result) {
    return res.status(404).json({ error: 'Active consent record not found' });
  }

  return res.json({
    success: true,
    message: `Consent ${consentId} successfully revoked. Notice dispatched to Data Fiduciary.`,
    data: result
  });
});

// GET /api/audit-logs
router.get('/audit-logs', (req, res) => {
  const { principalId } = req.query;
  const logs = db.getAuditEvents(principalId);
  return res.json(logs);
});

// POST /api/data-rights/request
router.post('/data-rights/request', (req, res) => {
  const { dataPrincipalId, requestType, targetFiduciary, details } = req.body;
  if (!requestType || !targetFiduciary) {
    return res.status(400).json({ error: 'Missing required fields: requestType, targetFiduciary' });
  }

  const dsrRecord = db.createDataRightsRequest({
    dataPrincipalId: dataPrincipalId || 'DP-2026-88491',
    requestType,
    targetFiduciary,
    details: details || {}
  });

  return res.json({
    success: true,
    message: `Statutory ${requestType} request submitted successfully.`,
    data: dsrRecord
  });
});

// GET /api/data-rights
router.get('/data-rights', (req, res) => {
  const { principalId } = req.query;
  const requests = db.getDataRightsRequests(principalId);
  return res.json(requests);
});

export default router;
