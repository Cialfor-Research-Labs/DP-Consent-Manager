import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const ScenarioBar = () => {
  const { scenarios, activeScenarioId, switchScenario, selectScenario, t } = useConsent();
  const handleSelect = selectScenario || switchScenario;

  return (
    <div className="scenario-bar">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="brand-title">{t('portalTitle')}</div>
          <div className="brand-subtitle">{t('portalSubtitle')}</div>
        </div>
      </div>

      <div className="scenario-pills">
        {scenarios.map(scen => (
          <button
            key={scen.id}
            className={`scenario-pill-btn ${activeScenarioId === scen.id ? 'active' : ''}`}
            onClick={() => handleSelect(scen.id)}
          >
            <span>{scen.fiduciaryLogo}</span>
            <span>{scen.title}</span>
            <ArrowRight size={12} style={{ opacity: 0.7 }} />
          </button>
        ))}
      </div>
    </div>
  );
};
