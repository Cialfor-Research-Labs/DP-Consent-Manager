import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { Mail, Sparkles, Copy, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { consentApi } from '../api/consentApi';

export const NoticeGeneratorModal = ({ isOpen, onClose }) => {
  const { refetchBackendData, switchScenario, setToastMessage } = useConsent();

  const [toAddress, setToAddress] = useState("pandeyprerna1407@gmail.com");
  const [fromAddress, setFromAddress] = useState("Prerna Pandey <prerna.p@cialfor.com>");
  const [fiduciaryName, setFiduciaryName] = useState("Cialfor Research Labs Private Limited");
  const [subject, setSubject] = useState("Action Required: Consent for PF Account Processing");
  const [bodyText, setBodyText] = useState(`Dear Employee,

As part of our PF (Provident Fund) account processing and related statutory requirements, we are required to collect and process certain personal information.

We request you to review the consent notice and provide your consent for the collection and processing of your personal data for the specified PF-related purposes.

Please click on the link below to access the Consent Manager and provide your consent:

Provide Consent for PF Account Processing

The Consent Manager will provide you with details regarding the personal data being requested, the purpose of processing, and the applicable consent options.

Kindly review the information carefully and provide your consent through the Consent Manager at your earliest convenience.

If you have any questions or concerns regarding the processing of your personal data, please contact HR.

Thanks & Regards,
Prerna Pandey
AI Specialist
Cialfor Research Labs Private Limited`);

  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleIngest = async () => {
    setLoading(true);
    try {
      const res = await consentApi.ingestEmail({
        from_address: fromAddress,
        to_address: toAddress,
        subject: subject,
        body_text: bodyText,
        purpose: subject,
        fiduciary_name: fiduciaryName
      });

      const token = res && res.token ? res.token : `tok_${Date.now()}`;
      const redirectUrl = `/request/${token}?to=${encodeURIComponent(toAddress)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}&fiduciary=${encodeURIComponent(fiduciaryName)}`;
      window.location.href = redirectUrl;
    } catch (e) {
      console.error("Ingest error:", e);
      const redirectUrl = `/request/tok_${Date.now()}?to=${encodeURIComponent(toAddress)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}&fiduciary=${encodeURIComponent(fiduciaryName)}`;
      window.location.href = redirectUrl;
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="modal-card" style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'white', fontWeight: 700 }}>
                Instant Email & Notice Ingestion Tool
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Ingest ANY custom email notice body and subject into the Consent Manager
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                To Email (Data Principal)
              </label>
              <input 
                type="text" 
                value={toAddress} 
                onChange={e => setToAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Fiduciary Name
              </label>
              <input 
                type="text" 
                value={fiduciaryName} 
                onChange={e => setFiduciaryName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Email Subject
            </label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#60a5fa', fontWeight: 600, fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Email Body Text
            </label>
            <textarea 
              rows={8}
              value={bodyText} 
              onChange={e => setBodyText(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.82rem', fontFamily: 'inherit', lineHeight: '1.4' }}
            />
          </div>

          <button 
            onClick={handleIngest}
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px'
            }}
          >
            <Sparkles size={18} />
            {loading ? 'Ingesting Notice...' : 'Ingest & Open Exact Consent Email'}
          </button>

          {generatedLink && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                Notice Link Generated & Ingested to Database!
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={generatedLink}
                  style={{ flex: 1, padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#a5b4fc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                />
                <button 
                  onClick={copyLink}
                  style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
