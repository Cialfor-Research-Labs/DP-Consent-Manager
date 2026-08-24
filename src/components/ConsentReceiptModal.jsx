import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { ShieldCheck, Download, ExternalLink, CheckCircle2, Copy } from 'lucide-react';

export const ConsentReceiptModal = () => {
  const { latestReceipt, setLatestReceipt, setActiveTab, t } = useConsent();

  if (!latestReceipt) return null;

  const downloadReceiptJSON = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(latestReceipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `consent-receipt-${latestReceipt.consentId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: '#34d399' }}>
            <ShieldCheck size={26} /> {t('receiptModalTitle')}
          </div>
          <button className="close-btn" onClick={() => setLatestReceipt(null)}>✕</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('receiptModalSub')}
          </div>
        </div>

        <div className="receipt-certificate">
          <div className="receipt-watermark">DPDP</div>
          
          <div className="receipt-row">
            <span className="receipt-key">Consent Artifact ID:</span>
            <span className="receipt-val" style={{ color: '#60a5fa' }}>{latestReceipt.consentId}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-key">Data Principal:</span>
            <span className="receipt-val">{latestReceipt.principalName} ({latestReceipt.principalId})</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-key">Data Fiduciary:</span>
            <span className="receipt-val">{latestReceipt.fiduciary}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-key">Notice ID & Legal Basis:</span>
            <span className="receipt-val">{latestReceipt.noticeId} • {latestReceipt.legalBasis}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-key">{t('grantedAttrs')} ({latestReceipt.grantedAttributes.length}):</span>
            <span className="receipt-val" style={{ color: '#34d399' }}>
              {latestReceipt.grantedAttributes.join(', ')}
            </span>
          </div>

          {latestReceipt.deniedAttributes.length > 0 && (
            <div className="receipt-row">
              <span className="receipt-key">{t('deniedAttrs')}:</span>
              <span className="receipt-val" style={{ color: '#f87171' }}>
                {latestReceipt.deniedAttributes.join(', ')}
              </span>
            </div>
          )}

          <div className="receipt-row">
            <span className="receipt-key">{t('grantedOn')}:</span>
            <span className="receipt-val">{new Date(latestReceipt.grantedOn).toLocaleString()}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-key">{t('expiresOn')}:</span>
            <span className="receipt-val">{new Date(latestReceipt.expiresOn).toLocaleDateString()} (1 Year)</span>
          </div>

          <div className="receipt-hash-box">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              CRYPTOGRAPHIC DIGITAL SIGNATURE HASH (SHA-256):
            </div>
            {latestReceipt.receiptHash}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-secondary"
            onClick={downloadReceiptJSON}
          >
            <Download size={16} />
            <span>{t('downloadJsonBtn')}</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => {
              setLatestReceipt(null);
              setActiveTab('active');
            }}
          >
            <CheckCircle2 size={16} />
            <span>{t('navActiveConsents')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
