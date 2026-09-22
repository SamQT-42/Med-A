import { useMemo, useState } from 'react';
import { MANAGER_TASKS, PEOPLE, taskLabel } from '../data/fixtures';
import { TRIAL_STATE_LABELS } from '../state/logic';
import { useStore } from '../state/store';
import { Disclaimer, Notice, SourceList, StatusLine } from '../components/ui';
import type { ManagerDecision, SharedRequest, WorkTrial } from '../types';

/**
 * Manager view.
 *
 * It reads ONLY state.sharedRequests and state.trials. It never touches
 * state.conversation or state.feedback, so the employee's private disclosure
 * has no route to this screen — or to a manager AI operation built from it.
 */
export function Manager() {
  const { state } = useStore();
  // Withdrawn requests lose in-app visibility.
  const visible = state.sharedRequests.filter((r) => !r.withdrawn);

  return (
    <div className="main-inner">
      <h1>Manager — {PEOPLE.manager.name}</h1>
      <p className="muted">
        You see work-adjustment requests that an employee has explicitly approved for sharing. You do not
        see their private conversation, any health information, or their private ratings.
      </p>

      {state.notice ? <Notice tone={state.notice.tone}>{state.notice.text}</Notice> : null}

      {visible.length === 0 ? (
        <section className="card">
          <h2>No requests</h2>
          <p className="muted">
            Nothing has been shared with you. Drafts an employee is still writing, has kept private, or has
            cancelled do not appear here at all.
          </p>
        </section>
      ) : (
        visible.map((r) => {
          const trial = state.trials.find((t) => t.requestId === r.id);
          return trial ? <RequestCard key={r.id} request={r} trial={trial} /> : null;
        })
      )}
    </div>
  );
}

function RequestCard({ request, trial }: { request: SharedRequest; trial: WorkTrial }) {
  const { dispatch } = useStore();
  const alreadyResponded = trial.state !== 'pending_response';

  const [order, setOrder] = useState<string[]>(
    trial.response?.priorityOrder.length ? trial.response.priorityOrder : MANAGER_TASKS.map((t) => t.id),
  );
  const [decision, setDecision] = useState<ManagerDecision>('agree');
  const [note, setNote] = useState('');
  const [alternativeText, setAlternativeText] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [trialDays, setTrialDays] = useState(request.trialDays);

  const suggestedNote = 'Start with the client report; I will resolve competing deadlines.';

  function move(id: string, delta: number) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function setPosition(id: string, position: number) {
    setOrder((prev) => {
      const without = prev.filter((x) => x !== id);
      without.splice(position, 0, id);
      return without;
    });
  }

  const orderSummary = useMemo(() => order.map((id) => taskLabel(id).split(' — ')[0]).join(' → '), [order]);

  return (
    <section className="card" aria-labelledby={`req-${request.id}`}>
      <div className="card-head">
        <h2 id={`req-${request.id}`} className="small">
          Work-adjustment request from an employee
        </h2>
        <span className="badge">Version {request.version}</span>
      </div>

      <StatusLine state={trial.state} label={TRIAL_STATE_LABELS[trial.state]} />
      <p className="small">
        <strong>Response requested within:</strong> {request.responseWithinWorkingDays} working day
        &nbsp;·&nbsp; <span className="xs muted">Sample company policy for this demo.</span>
      </p>

      <h3 className="small" style={{ marginTop: 16 }}>
        The request
      </h3>
      <blockquote
        style={{
          margin: '8px 0 12px',
          padding: '12px 16px',
          background: 'var(--c-surface-muted)',
          borderLeft: '3px solid var(--c-accent)',
          borderRadius: 6,
        }}
      >
        {request.requestText}
      </blockquote>
      <p className="small">
        <strong>Work barrier:</strong> {request.barrierLabel}
      </p>
      <p className="small">
        <strong>Suggested adjustment:</strong> {request.suggestedAdjustment} &nbsp;·&nbsp;
        <strong>Proposed trial:</strong> {request.trialDays} working days
      </p>
      <details>
        <summary>Reference material the employee used</summary>
        <SourceList ids={request.sourceIds} />
      </details>

      <p className="xs muted" style={{ marginTop: 12 }}>
        Not included in this request, by design: the employee's private conversation, any health or
        diagnosis information, any screening data, and any private rating they record later.
      </p>

      {!alreadyResponded ? (
        <>
          <h3 style={{ marginTop: 24 }}>Set the order of work</h3>
          <p className="small muted">
            These are your business priorities to decide. Med-A does not choose them for you and does not
            invent deadlines.
          </p>
          <ol className="order-list">
            {order.map((id, i) => (
              <li key={id}>
                <span className="order-pos">{i + 1}</span>
                <span className="grow">{taskLabel(id)}</span>
                <label htmlFor={`pos-${request.id}-${id}`} className="xs" style={{ margin: 0 }}>
                  Position
                </label>
                <select
                  id={`pos-${request.id}-${id}`}
                  value={i}
                  style={{ width: 70 }}
                  onChange={(e) => setPosition(id, Number(e.target.value))}
                >
                  {order.map((_, n) => (
                    <option key={n} value={n}>
                      {n + 1}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={i === 0}
                  aria-label={`Move ${taskLabel(id)} up`}
                  onClick={() => move(id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={i === order.length - 1}
                  aria-label={`Move ${taskLabel(id)} down`}
                  onClick={() => move(id, 1)}
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
          <p className="small" aria-live="polite">
            <strong>Current order:</strong> {orderSummary}
          </p>

          <fieldset style={{ marginTop: 16 }}>
            <legend>Your response</legend>
            <div className="radio-row">
              {(
                [
                  { id: 'agree', label: 'Agree and confirm the trial' },
                  { id: 'suggest_alternative', label: 'Suggest alternative terms' },
                  { id: 'cannot_implement', label: 'Cannot implement yet' },
                ] as { id: ManagerDecision; label: string }[]
              ).map((o) => (
                <label key={o.id} htmlFor={`dec-${request.id}-${o.id}`}>
                  <input
                    id={`dec-${request.id}-${o.id}`}
                    type="radio"
                    name={`dec-${request.id}`}
                    checked={decision === o.id}
                    onChange={() => setDecision(o.id)}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor={`note-${request.id}`}>Note to the employee</label>
            <textarea
              id={`note-${request.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={suggestedNote}
              style={{ minHeight: 80 }}
            />
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => setNote(suggestedNote)}>
              Use the demo note
            </button>
          </div>

          {decision !== 'agree' ? (
            <>
              <div className="field">
                <label htmlFor={`alt-${request.id}`}>
                  {decision === 'suggest_alternative' ? 'Alternative terms' : 'Reason it cannot be done yet'}
                </label>
                <textarea
                  id={`alt-${request.id}`}
                  value={alternativeText}
                  onChange={(e) => setAlternativeText(e.target.value)}
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="field">
                <label htmlFor={`step-${request.id}`}>Proposed next step</label>
                <input
                  id={`step-${request.id}`}
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                />
              </div>
            </>
          ) : null}

          <div className="field">
            <label htmlFor={`days-${request.id}`}>Trial length to confirm (working days)</label>
            <select
              id={`days-${request.id}`}
              value={trialDays}
              style={{ maxWidth: 220 }}
              onChange={(e) => setTrialDays(Number(e.target.value))}
            >
              {[3, 5, 10].map((d) => (
                <option key={d} value={d}>
                  {d} working days
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              dispatch({
                type: 'managerRespond',
                requestId: request.id,
                decision,
                priorityOrder: order,
                note,
                alternativeText,
                proposedNextStep: nextStep,
                trialDays,
              })
            }
          >
            Record response
          </button>
          <Disclaimer>
            Recording a response does not mean the employee has received the information. They confirm that
            separately.
          </Disclaimer>
        </>
      ) : (
        <div className="card card-compact card-muted" style={{ marginTop: 16 }}>
          <h3 className="small">Your recorded response</h3>
          {trial.response?.priorityOrder.length ? (
            <p className="small">
              <strong>Order:</strong>{' '}
              {trial.response.priorityOrder.map((id) => taskLabel(id).split(' — ')[0]).join(' → ')}
            </p>
          ) : null}
          {trial.response?.note ? (
            <p className="small">
              <strong>Note:</strong> {trial.response.note}
            </p>
          ) : null}
          {trial.response?.alternativeText ? (
            <p className="small">
              <strong>Detail:</strong> {trial.response.alternativeText}
            </p>
          ) : null}
          <p className="small">
            <strong>Trial confirmed:</strong> {trial.trialDays} working days
          </p>
          <p className="small">
            <strong>Delivery:</strong>{' '}
            {trial.deliveryStatus === 'not_confirmed'
              ? 'Not yet confirmed by the employee'
              : 'Confirmed by the employee'}
          </p>
        </div>
      )}
    </section>
  );
}
