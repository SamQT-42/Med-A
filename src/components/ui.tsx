import type { ReactNode } from 'react';
import { LIBRARY, libraryById } from '../data/library';
import type { LibraryRecord, TrialState } from '../types';

export function Card({
  children,
  className = '',
  as: As = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return <As className={`card ${className}`}>{children}</As>;
}

export function Notice({ tone, children }: { tone: 'info' | 'warn' | 'success'; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      {children}
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="disclaimer">{children}</p>;
}

/** Status is conveyed by text as well as colour. */
const STATE_TONE: Record<TrialState, string> = {
  pending_response: 'status-pending',
  alternative_proposed: 'status-review',
  cannot_implement: 'status-blocked',
  agreed: 'status-agreed',
  delivered: 'status-delivered',
  review_due: 'status-review',
  keep: 'status-delivered',
  modify: 'status-review',
  stop: 'status-blocked',
};

export function StatusLine({ state, label }: { state: TrialState; label: string }) {
  return (
    <p className={`status-line ${STATE_TONE[state]}`}>
      <span className="status-dot" aria-hidden="true" />
      <strong>Status:</strong> <span>{label}</span>
    </p>
  );
}

/** A compact library card with expandable source and applicability information. */
export function LibraryCard({ record, compact = false }: { record: LibraryRecord; compact?: boolean }) {
  return (
    <article className={`card card-compact card-muted${compact ? '' : ''}`} style={{ marginBottom: 0 }}>
      <h4>{record.title}</h4>
      <p className="small">{record.shortSummary}</p>
      <details>
        <summary>Source and how far it applies</summary>
        <p className="small" style={{ marginBottom: 8 }}>
          <strong>Source:</strong>{' '}
          <a href={record.sourceUrl} target="_blank" rel="noreferrer noopener">
            {record.sourceTitle}
          </a>
        </p>
        <p className="small" style={{ marginBottom: 8 }}>
          <strong>Scope:</strong> {record.scopeNote}
        </p>
        <p className="xs muted" style={{ marginBottom: 0 }}>
          <strong>Review status:</strong> {record.reviewStatus}
        </p>
      </details>
    </article>
  );
}

export function SourceList({ ids }: { ids: string[] }) {
  const records = ids.map(libraryById).filter((r): r is LibraryRecord => Boolean(r));
  if (records.length === 0) return <span className="muted">None referenced</span>;
  return (
    <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
      {records.map((r) => (
        <li key={r.id}>
          {r.title} — <span className="xs muted">{r.reviewStatus}</span>
        </li>
      ))}
    </ul>
  );
}

export function relatedLibrary(barrier: string): LibraryRecord | undefined {
  return LIBRARY.find((r) => r.barriers.includes(barrier as LibraryRecord['barriers'][number]));
}

/** Accessible one-question chooser. Buttons, never drag-only. */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  hint?: string;
  options: { id: T; label: string; description?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {hint ? <p className="xs muted">{hint}</p> : null}
      <div className="radio-row" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <label key={o.id} htmlFor={`${name}-${o.id}`}>
            <input
              type="radio"
              id={`${name}-${o.id}`}
              name={name}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
