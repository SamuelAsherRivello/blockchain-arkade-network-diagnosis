export function StepComponent({ number, title, detail, status, children }) {
  const headingId = `step-${number}-heading`;
  return (
    <section className="step-component" aria-labelledby={headingId}>
      <div className="step-marker" aria-hidden="true">{number}</div>
      <div className="step-content">
        <div className="step-heading">
          <div>
            <h2 id={headingId}>{title}</h2>
            <p>{detail}</p>
          </div>
          {status ? <span className={`status ${status.tone}`}>{status.label}</span> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
