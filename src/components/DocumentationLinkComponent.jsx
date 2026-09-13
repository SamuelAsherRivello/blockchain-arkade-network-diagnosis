export function DocumentationLinkComponent({ href, tooltip }) {
  return (
    <a className="operation-doc-link" href={href} target="_blank" rel="noreferrer" aria-label={tooltip} title={tooltip}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4.8A2.8 2.8 0 0 1 6.8 2H20v17.2H6.8A2.8 2.8 0 0 0 4 22V4.8Z" />
        <path d="M4 19.2A2.8 2.8 0 0 1 6.8 16.4H20" />
      </svg>
      <span className="sr-only">{tooltip}</span>
    </a>
  );
}
