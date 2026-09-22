import { useState } from 'react';
import { HUMAN_SUPPORT_CONTACTS, PANTRY, SUPPORT_PATHWAYS } from '../data/fixtures';
import { useStore } from '../state/store';
import { Disclaimer, Notice } from '../components/ui';
import { DRAFT_TEMPLATES } from '../state/logic';

export function SupportOptions() {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState<string | null>(state.draft?.pantryItemId ?? null);

  return (
    <div className="main-inner">
      <h1>Support options</h1>
      <p className="muted">
        None of these is a required step before asking for a work adjustment.
      </p>

      {state.notice ? <Notice tone={state.notice.tone}>{state.notice.text}</Notice> : null}

      {/* ---- Human support, reachable directly ---- */}
      <section className="card card-accent">
        <h2 className="small">Talk with a person</h2>
        <ul className="small" style={{ paddingLeft: 20 }}>
          {HUMAN_SUPPORT_CONTACTS.map((c) => (
            <li key={c.id} style={{ marginBottom: 8 }}>
              <strong>{c.name}</strong>
              {c.available ? '' : ' — not available in this prototype'}
              <br />
              <span className="muted">{c.purpose}</span>
              <br />
              <span className="xs muted">{c.note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Sensory pantry ---- */}
      <section className="card">
        <h2 className="small">Sensory pantry</h2>
        <p className="small muted">
          A small catalogue of workplace equipment. Choose what you think would suit how you like to work.
          Choosing something here says nothing about any condition and implies no diagnosis.
        </p>

        <div className="pantry-grid" style={{ marginTop: 12 }}>
          {PANTRY.map((item) => (
            <button
              key={item.id}
              type="button"
              className="btn-choice"
              aria-pressed={selected === item.id}
              style={{ marginBottom: 0, height: '100%' }}
              onClick={() => setSelected(selected === item.id ? null : item.id)}
            >
              <strong>{item.name}</strong>
              <br />
              <span className="small muted">{item.preferenceDescription}</span>
              <br />
              <span className="xs muted">
                {item.fictionalStock} · {item.fictionalLocation}
              </span>
            </button>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selected}
            onClick={() => {
              const item = PANTRY.find((p) => p.id === selected);
              if (!item) return;
              dispatch({
                type: 'startDraft',
                kind: 'sensory_item',
                barrier: 'noise_interruptions',
                text: `I would like to try ${item.name.toLowerCase()} at my work area to make it easier to concentrate. I would like to try this for five working days and review whether it helps.`,
                sourceIds: DRAFT_TEMPLATES.sensory_item.sourceIds,
                pantryItemId: item.id,
              });
              dispatch({ type: 'setTab', tab: 'today' });
            }}
          >
            Request this through my support plan
          </button>
          <button type="button" className="btn" onClick={() => setSelected(null)}>
            Choose none
          </button>
        </div>
        <Disclaimer>
          Stock levels and locations are fictional demo data. A facilities request made here is a request
          only — it is not a confirmed reservation, and it goes through the same preview and approval as any
          other sharing. No shared-room temperature, lighting, or humidity is changed by this app.
        </Disclaimer>
      </section>

      {/* ---- Future pathways ---- */}
      <section className="card">
        <h2 className="small">Future pathways</h2>
        {SUPPORT_PATHWAYS.map((p) => (
          <div key={p.id} className="card card-compact card-muted" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <h3 className="small">{p.title}</h3>
              <span className="badge badge-proto">{p.status}</span>
            </div>
            <p className="small">{p.body}</p>
            <p className="xs muted" style={{ marginBottom: 0 }}>
              {p.nextStep}
            </p>
          </div>
        ))}
        <Disclaimer>
          No provider, appointment slot, clinical test, screening score, or completed booking is shown
          anywhere in this prototype, because none has been verified.
        </Disclaimer>
      </section>
    </div>
  );
}
