import React from 'react';
import { ConsentProvider, useConsent } from './context/ConsentContext';
import { Header } from './components/Header';
import { ScenarioBar } from './components/ScenarioBar';
import { EmailSimulatorView } from './components/EmailSimulatorView';
import { ConsentDecisionHub } from './components/ConsentDecisionHub';
import { ActiveConsentsView } from './components/ActiveConsentsView';
import { AuditLogView } from './components/AuditLogView';
import { DataRightsView } from './components/DataRightsView';
import { ConsentReceiptModal } from './components/ConsentReceiptModal';
import { GrievanceModal } from './components/GrievanceModal';
import { NominationModal } from './components/NominationModal';
import './styles/main.css';

const MainAppContent = () => {
  const { activeTab, toastMessage, loading, apiError } = useConsent();

  return (
    <div className="app-container">
      <ScenarioBar />
      <Header />

      {loading && (
        <div style={{ background: 'rgba(99, 102, 241, 0.15)', borderBottom: '1px solid rgba(99, 102, 241, 0.3)', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#c084fc', fontSize: '0.84rem', fontWeight: 600 }}>
          <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(192, 132, 252, 0.3)', borderTopColor: '#c084fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span>Communicating with Python FastAPI Backend...</span>
        </div>
      )}

      {apiError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 24px', textAlign: 'center', color: '#f87171', fontSize: '0.84rem', fontWeight: 600 }}>
          ⚠️ {apiError}
        </div>
      )}

      <main className="main-wrapper">
        {activeTab === 'email-sim' && <EmailSimulatorView />}
        {activeTab === 'incoming' && <ConsentDecisionHub />}
        {activeTab === 'active' && <ActiveConsentsView />}
        {activeTab === 'audit' && <AuditLogView />}
        {activeTab === 'rights' && <DataRightsView />}
      </main>

      <ConsentReceiptModal />
      <GrievanceModal />
      <NominationModal />

      {toastMessage && (
        <div className="toast-container">
          <div className={`toast toast-${toastMessage.type}`}>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ConsentProvider>
      <MainAppContent />
    </ConsentProvider>
  );
}
