import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';

export const AuditLogView = () => {
  const { auditLogs, t } = useConsent();

  return (
    <div className="audit-log-container">
      <div className="page-banner">
        <div className="banner-content">
          <h1>{t('auditTrailTitle')}</h1>
          <p>{t('auditTrailSub')}</p>
        </div>

        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', padding: '10px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Registry Integrity</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 700 }}>Tamper-Evident Hash Chain</div>
          </div>
        </div>
      </div>

      <div className="glass-card table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>{t('timestampHeader')}</th>
              <th>{t('actionHeader')}</th>
              <th>{t('fiduciaryHeader')}</th>
              <th>Consent ID</th>
              <th>{t('detailsHeader')}</th>
              <th>{t('ipAddressHeader')}</th>
              <th>{t('statusHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => {
              let badgeColor = 'badge-verified';
              let icon = <CheckCircle2 size={12} />;

              if (log.action === 'CONSENT_REVOKED' || log.action === 'CONSENT_DENIED') {
                badgeColor = 'badge-revoked';
                icon = <XCircle size={12} />;
              } else if (log.action === 'GRIEVANCE_FILED') {
                badgeColor = 'badge-notice';
                icon = <AlertTriangle size={12} />;
              }

              return (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${badgeColor}`}>
                      {icon}
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.fiduciary}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem', color: '#60a5fa' }}>{log.consentId}</code>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    {log.details}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {log.ipAddress}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: log.status === 'SUCCESS' ? '#34d399' : '#f87171' }}>
                      ● {log.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
