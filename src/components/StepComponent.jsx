import { useState } from 'react';

export function StepComponent({ number, title, detail, status, children }) {
  const headingId = `step-${number}-heading`;
  const contentId = `step-${number}-content`;
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="step-component" data-step={number} aria-labelledby={headingId}>
      <h2 className="step-heading" id={headingId}>
        <button className="step-title-bar" type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((current) => !current)}>
          <svg className="step-title-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          <span className="step-marker" aria-hidden="true">{number}</span>
          <span className="step-title">{title}</span>
          {status ? <span className={`status step-title-status ${status.tone}`}>{status.label}</span> : null}
        </button>
      </h2>
      <div className="step-content" id={contentId} hidden={!expanded}>
        <p className="step-detail">{detail}</p>
        {children}
      </div>
    </section>
  );
}
