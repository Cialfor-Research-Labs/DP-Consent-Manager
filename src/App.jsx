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
  const { activeTab, toastMessage } = useConsent();

  return (
    <div className="app-container">
      <ScenarioBar />
      <Header />

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
