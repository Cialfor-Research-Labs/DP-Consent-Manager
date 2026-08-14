import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export const ScenarioBar = () => {
  const { scenarios, activeScenarioId, selectScenario } = useConsent();

  return (
    <div className="scenario-bar">
      <div className="scenario-title-group">
        <Sparkles size={18} />
        <span>SIMULATION MODE: Select Incoming Consent Scenario</span>
        <span className="scenario-badge">Interactive Test</span>
      </div>

      <div className="scenario-pills">
        {scenarios.map(scen => (
          <button
            key={scen.id}
            className={`scenario-pill-btn ${activeScenarioId === scen.id ? 'active' : ''}`}
            onClick={() => selectScenario(scen.id, 'email-sim')}
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
