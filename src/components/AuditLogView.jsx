import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { History, ShieldCheck, FileText, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';

export const AuditLogView = () => {
  const { auditLogs, dataPrincipal } = useConsent();

  return (
    <div className="audit-log-container">
      <div className="page-banner">
        <div className="banner-content">
          <h1>DPDP Compliance Audit Registry</h1>
          <p>
            Immutable chronological log of all consent state transitions, revocations, and grievance filings recorded for Data Principal <strong>{dataPrincipal.name}</strong>.
          </p>
        </div>

        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-highlight)', padding: '12px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock size={20} style={{ color: '#818cf8' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 700 }}>Registry Integrity</div>
            <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>Tamper-Evident Hash Chain</div>
          </div>
        </div>
      </div>

      <div className="glass-card table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Data Fiduciary</th>
              <th>Consent ID</th>
              <th>Event Details</th>
              <th>IP Address</th>
              <th>Audit Status</th>
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
                  <td style={{ fontWeight: 600, color: 'white' }}>{log.fiduciary}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem', color: '#60a5fa' }}>{log.consentId}</code>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '300px' }}>
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
