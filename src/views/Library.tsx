import { LIBRARY, LIBRARY_EXTRA_SOURCES } from '../data/library';
import { Disclaimer, LibraryCard } from '../components/ui';

export function Library() {
  return (
    <div className="main-inner">
      <h1>Library</h1>
      <p className="muted">
        Short prototype summaries written from named public guidance. Reading them is never required before
        asking for support.
      </p>

      <div className="stack">
        {LIBRARY.map((r) => (
          <LibraryCard key={r.id} record={r} />
        ))}
      </div>

      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="small">About these summaries</h2>
        <p className="small">
          Every card carries the status “Public guidance summary; partner review pending”. No medical
          reviewer, credential, partner logo, review date, certificate, or quotation is claimed. When the
          team supplies approved partner content, it replaces these summaries and the status changes.
        </p>
        <p className="small">
          <strong>Also referenced:</strong>{' '}
          {LIBRARY_EXTRA_SOURCES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" style={{ marginRight: 12 }}>
              {s.title}
            </a>
          ))}
        </p>
        <Disclaimer>
          Workplace-adjustment examples vary by person. A questionnaire alone cannot establish a diagnosis.
          UK guidance is reference material and is not a statement of Vietnamese employment law.
        </Disclaimer>
      </section>
    </div>
  );
}
