import { useState } from 'react';
import { copy } from '../content/copy';
import { PEOPLE, taskLabel } from '../data/fixtures';
import { DELIVERY_LABELS, TRIAL_STATE_LABELS } from '../state/logic';
import { useStore } from '../state/store';
import { Disclaimer, Notice, SourceList, StatusLine } from '../components/ui';
import type { DeliveryStatus, Happened, Helped, NextDecision, SharedRequest, WorkTrial } from '../types';

export function SupportPlan() {
  const { state, dispatch } = useStore();

  if (state.sharedRequests.length === 0) {
    return (
      <div className="main-inner">
        <h1>{copy.tabs.plan}</h1>
        {state.notice ? <Notice tone={state.notice.tone}>{state.notice.text}</Notice> : null}
        <section className="card">
          <h2>Nothing shared yet</h2>
          <p className="muted">
            {state.draft
              ? 'You have a private draft. It is visible only to you until you review and share it.'
              : 'When you share a support request, it will appear here with its status, owner, and review date.'}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'setTab', tab: 'today' })}>
              Go to Today
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="main-inner">
      <h1>{copy.tabs.plan}</h1>
      {state.notice ? <Notice tone={state.notice.tone}>{state.notice.text}</Notice> : null}
      {state.sharedRequests.map((r) => {
        const trial = state.trials.find((t) => t.requestId === r.id);
        return trial ? <PlanEntry key={r.id} request={r} trial={trial} /> : null;
      })}
    </div>
  );
}

function PlanEntry({ request, trial }: { request: SharedRequest; trial: WorkTrial }) {
  const { state, dispatch } = useStore();
  const feedback = state.feedback.find((f) => f.requestId === request.id);
  const [reviewPreview, setReviewPreview] = useState(false);

  const response = trial.response;
  const agreedNotDelivered = trial.state === 'agreed';

  return (
    <section className="card" aria-labelledby={`plan-${request.id}`}>
      <div className="card-head">
        <h2 id={`plan-${request.id}`} className="small">
          {request.suggestedAdjustment}
        </h2>
        <span className="badge">Version {request.version} shared</span>
      </div>

      <StatusLine state={trial.state} label={TRIAL_STATE_LABELS[trial.state]} />
      <p className="small">
        <strong>Owner:</strong> {trial.owner} ({PEOPLE.manager.role.toLowerCase()}) &nbsp;·&nbsp;
        <strong>Trial:</strong> {trial.trialDays} working days &nbsp;·&nbsp;
        <strong>Review:</strong> after {trial.reviewAfterWorkingDays} working days
      </p>
      <p className="small">
        <strong>Delivery:</strong> {DELIVERY_LABELS[trial.deliveryStatus]}
      </p>

      <details>
        <summary>What was shared (exact approved version)</summary>
        <blockquote className="small" style={{ margin: '8px 0', paddingLeft: 12, borderLeft: '3px solid var(--c-border-strong)' }}>
          {request.requestText}
        </blockquote>
        <p className="xs muted" style={{ marginBottom: 4 }}>
          Work barrier shared as: “{request.barrierLabel}”
        </p>
        <div className="xs muted">
          Reference material: <SourceList ids={request.sourceIds} />
        </div>
      </details>

      {/* --- Waiting --- */}
      {trial.state === 'pending_response' ? (
        <p className="small muted" style={{ marginTop: 16 }}>
          Sent to {trial.owner}. A response is requested within {request.responseWithinWorkingDays} working
          day ({copy.consent.policyNote.toLowerCase()}). Sending a request does not mean it has been
          agreed.
        </p>
      ) : null}

      {/* --- Manager suggested different terms: employee must review --- */}
      {trial.state === 'alternative_proposed' && response ? (
        <div className="card card-compact card-muted" style={{ marginTop: 16 }}>
          <h3 className="small">Your manager suggested different terms</h3>
          <p className="small">{response.alternativeText || 'No detail provided.'}</p>
          <p className="small">
            <strong>Proposed trial length:</strong> {response.trialDays} working days
          </p>
          <p className="xs muted">
            These terms are not in effect. Nothing changes until you review and accept them.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'employeeReviewAlternative', trialId: trial.id, accepted: true })}
            >
              Accept the changed terms
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ type: 'employeeReviewAlternative', trialId: trial.id, accepted: false })}
            >
              Do not accept
            </button>
          </div>
        </div>
      ) : null}

      {/* --- Manager cannot implement yet --- */}
      {trial.state === 'cannot_implement' && response ? (
        <div className="card card-compact card-muted" style={{ marginTop: 16 }}>
          <h3 className="small">Cannot implement yet</h3>
          <p className="small">
            <strong>Reason given:</strong> {response.alternativeText || 'No reason recorded.'}
          </p>
          <p className="small">
            <strong>Proposed next step:</strong> {response.proposedNextStep || 'None recorded.'}
          </p>
          <p className="xs muted">This request has not been delivered and is not counted as successful.</p>
        </div>
      ) : null}

      {/* --- Agreed / delivered result --- */}
      {response && (trial.state === 'agreed' || trial.state === 'delivered' || trial.state === 'review_due' || trial.state === 'keep' || trial.state === 'modify' || trial.state === 'stop') ? (
        <div className="card card-compact card-muted" style={{ marginTop: 16 }}>
          <h3 className="small">What your manager decided</h3>
          {response.priorityOrder.length > 0 ? (
            <>
              <p className="xs muted">Agreed order of work:</p>
              <ol className="order-list">
                {response.priorityOrder.map((id, i) => (
                  <li key={id}>
                    <span className="order-pos">{i + 1}</span>
                    <span>{taskLabel(id)}</span>
                  </li>
                ))}
              </ol>
              <p className="small">
                <strong>Your first step:</strong> {taskLabel(response.priorityOrder[0])}
              </p>
            </>
          ) : null}
          {response.note ? (
            <p className="small">
              <strong>Note from {trial.owner}:</strong> {response.note}
            </p>
          ) : null}

          {agreedNotDelivered ? (
            <div style={{ marginTop: 12 }}>
              <p className="small">
                <strong>Manager agreed</strong> is not the same as <strong>adjustment delivered</strong>.
                Only you can confirm the agreed priority information was actually available to you.
              </p>
              <div className="row-tight">
                {(
                  [
                    { id: 'delivered', label: 'Yes, it was available' },
                    { id: 'partly', label: 'Only partly' },
                    { id: 'not_delivered', label: 'No, it was not' },
                  ] as { id: DeliveryStatus; label: string }[]
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => dispatch({ type: 'confirmDelivery', trialId: trial.id, status: o.id })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* --- Review after the simulated trial --- */}
      {trial.state === 'review_due' && feedback ? (
        <div className="card card-compact card-private" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3 className="small">Review — {trial.reviewAfterWorkingDays} working days later</h3>
            <span className="badge badge-private">Private by default</span>
          </div>
          <p className="xs muted">
            {copy.disclaimers.simulatedTime} Your answers below stay with you. They are not sent to your
            manager and they never appear in the organization view.
          </p>

          <fieldset>
            <legend>Did the adjustment happen?</legend>
            <div className="radio-row">
              {(
                [
                  { id: 'yes', label: 'Yes' },
                  { id: 'partly', label: 'Partly' },
                  { id: 'no', label: 'No' },
                ] as { id: Happened; label: string }[]
              ).map((o) => (
                <label key={o.id} htmlFor={`happened-${o.id}`}>
                  <input
                    id={`happened-${o.id}`}
                    type="radio"
                    name={`happened-${trial.id}`}
                    checked={feedback.happened === o.id}
                    onChange={() => dispatch({ type: 'recordFeedback', requestId: request.id, patch: { happened: o.id } })}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Did it help?</legend>
            <div className="radio-row">
              {(
                [
                  { id: 'better', label: 'Better' },
                  { id: 'same', label: 'Same' },
                  { id: 'worse', label: 'Worse' },
                  { id: 'unsure', label: 'Unsure' },
                ] as { id: Helped; label: string }[]
              ).map((o) => (
                <label key={o.id} htmlFor={`helped-${o.id}`}>
                  <input
                    id={`helped-${o.id}`}
                    type="radio"
                    name={`helped-${trial.id}`}
                    checked={feedback.helped === o.id}
                    onChange={() => dispatch({ type: 'recordFeedback', requestId: request.id, patch: { helped: o.id } })}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor={`clarity-${trial.id}`}>Task clarity, 1 to 5 (optional)</label>
            <select
              id={`clarity-${trial.id}`}
              value={feedback.clarityRating ?? ''}
              style={{ maxWidth: 240 }}
              onChange={(e) =>
                dispatch({
                  type: 'recordFeedback',
                  requestId: request.id,
                  patch: { clarityRating: e.target.value === '' ? null : Number(e.target.value) },
                })
              }
            >
              <option value="">Prefer not to say</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend>What next?</legend>
            <div className="radio-row">
              {(
                [
                  { id: 'keep', label: 'Keep' },
                  { id: 'modify', label: 'Modify' },
                  { id: 'stop', label: 'Stop' },
                ] as { id: NextDecision; label: string }[]
              ).map((o) => (
                <label key={o.id} htmlFor={`decision-${o.id}`}>
                  <input
                    id={`decision-${o.id}`}
                    type="radio"
                    name={`decision-${trial.id}`}
                    checked={feedback.decision === o.id}
                    onChange={() => dispatch({ type: 'recordFeedback', requestId: request.id, patch: { decision: o.id } })}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="small muted">
            Your answers are saved privately already. Telling your manager what happens next is a separate,
            optional decision with its own preview.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              disabled={!feedback.decision}
              onClick={() => setReviewPreview(true)}
            >
              Share only the decision with {trial.owner}…
            </button>
          </div>

          {reviewPreview && feedback.decision ? (
            <div className="card card-compact card-accent" style={{ marginTop: 12 }}>
              <h4>Review before sharing this decision</h4>
              <ul className="shared-list small">
                <li>
                  Your decision for this adjustment: <strong>{feedback.decision}</strong>
                </li>
              </ul>
              <ul className="excluded-list small">
                <li>Your “did it happen” and “did it help” answers</li>
                <li>Your task-clarity rating</li>
                <li>Any note you wrote</li>
              </ul>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    dispatch({ type: 'shareReviewDecision', trialId: trial.id, decision: feedback.decision! });
                    setReviewPreview(false);
                  }}
                >
                  Share this decision
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setReviewPreview(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* --- Completed loop --- */}
      {['keep', 'modify', 'stop'].includes(trial.state) ? (
        <div className="card card-compact card-muted" style={{ marginTop: 16 }}>
          <h3 className="small">Support loop complete</h3>
          <p className="small">
            Difficulty → request → consent → manager response → delivery confirmed by you → review →{' '}
            <strong>{trial.state}</strong>.
          </p>
          <Disclaimer>{copy.disclaimers.noEfficacy}</Disclaimer>
        </div>
      ) : null}

      <details style={{ marginTop: 16 }}>
        <summary>History ({trial.history.length})</summary>
        <ul className="steps">
          {trial.history.map((h, i) => (
            <li key={i}>
              <span className="step-day">Demo day {h.simulatedDay}</span>
              <span>{h.label}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="row" style={{ marginTop: 16 }}>
        {!request.withdrawn ? (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => dispatch({ type: 'withdrawRequest', requestId: request.id })}
          >
            Withdraw in-app access
          </button>
        ) : (
          <span className="badge">In-app access withdrawn</span>
        )}
        <span className="xs muted">{copy.disclaimers.withdrawal}</span>
      </div>
    </section>
  );
}
