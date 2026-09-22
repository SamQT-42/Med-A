import { useState } from 'react';
import { copy } from '../content/copy';
import { ALEX_EXAMPLE, HUMAN_SUPPORT_CONTACTS } from '../data/fixtures';
import { AiError, CLARIFICATION_QUESTION, liveSupport, scriptedSupport } from '../ai/provider';
import { BARRIER_LABELS, BARRIER_OPTIONS, DRAFT_TEMPLATES } from '../state/logic';
import { useStore } from '../state/store';
import { ConsentPreview } from '../components/ConsentPreview';
import { Disclaimer, LibraryCard, Notice, relatedLibrary } from '../components/ui';
import { QuickRecap } from './QuickRecap';
import type { BarrierId, PriorityAnswer } from '../types';

export function Today() {
  const { state, dispatch } = useStore();
  const conv = state.conversation;
  const [pendingDraftText, setPendingDraftText] = useState<string | null>(null);
  const [showHuman, setShowHuman] = useState(false);

  const busy = state.aiStatus === 'loading';

  /** Runs the support assistant. It only produces text; it decides nothing. */
  async function runAssistant(text: string) {
    dispatch({ type: 'setInput', text });
    dispatch({ type: 'addMessage', author: 'employee', text });
    dispatch({ type: 'setAiStatus', status: 'loading' });

    const req = { text, taskNotes: state.taskNotes };

    // Rehearsal switch: exercise the failure path on demand.
    if (state.simulateAiFailure) {
      dispatch({
        type: 'setAiStatus',
        status: 'error',
        error: 'Simulated AI failure (rehearsal control). Your draft and text are untouched.',
      });
      return;
    }

    try {
      const result =
        state.aiMode === 'live' ? await liveSupport(req) : scriptedSupport(req);

      dispatch({ type: 'setRecap', recap: result.taskRecap });
      dispatch({ type: 'setDetectedBarrier', barrier: result.barrier });
      dispatch({
        type: 'addMessage',
        author: 'assistant',
        origin: state.aiMode,
        text: `Thanks for telling me. That sounds like a work difficulty I can help you put into words: ${result.barrierLabel.toLowerCase()}. ${result.clarificationQuestion}`,
      });
      setPendingDraftText(result.draftRequest);
      dispatch({ type: 'setAiStatus', status: 'ok' });
      dispatch({ type: 'setStep', step: 'barrier_check' });
    } catch (err) {
      const message = err instanceof AiError ? err.message : 'The AI request failed.';
      // Nothing is sent and no draft is lost because an AI call failed.
      dispatch({ type: 'setAiStatus', status: 'error', error: message });
    }
  }

  function useScriptedFallback() {
    const result = scriptedSupport({ text: conv.inputText, taskNotes: state.taskNotes });
    dispatch({ type: 'setRecap', recap: result.taskRecap });
    dispatch({ type: 'setDetectedBarrier', barrier: result.barrier });
    dispatch({
      type: 'addMessage',
      author: 'assistant',
      origin: 'scripted',
      text: `Scripted example: that sounds like ${result.barrierLabel.toLowerCase()}. ${result.clarificationQuestion}`,
    });
    setPendingDraftText(result.draftRequest);
    dispatch({ type: 'setAiStatus', status: 'idle' });
    dispatch({ type: 'setStep', step: 'barrier_check' });
  }

  const barrier: BarrierId = conv.detectedBarrier ?? 'competing_priorities';
  const related = relatedLibrary(barrier);

  return (
    <div className="main-inner">
      <h1>{copy.today.heading}</h1>
      <p className="muted">{copy.promise}</p>

      {state.notice ? <Notice tone={state.notice.tone}>{state.notice.text}</Notice> : null}

      {/* ------- Step: intro ------- */}
      {conv.step === 'intro' ? (
        <>
          <section className="card card-accent" aria-labelledby="ask-heading">
            <h2 id="ask-heading">{copy.today.primaryAction}</h2>
            <p className="small muted">
              This conversation is private. Nothing reaches your manager unless you review it and choose
              to share it.
            </p>

            <h3 className="small" style={{ marginTop: 16 }}>
              {copy.today.quickOptions}
            </h3>
            <div>
              {BARRIER_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="btn-choice"
                  aria-pressed={conv.inputText === o.label}
                  onClick={() => dispatch({ type: 'setInput', text: o.label })}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="difficulty">{copy.today.typeInstead}</label>
              <p className="hint">You can use a quick option, type your own words, or both.</p>
              <textarea
                id="difficulty"
                value={conv.inputText}
                onChange={(e) => dispatch({ type: 'setInput', text: e.target.value })}
                placeholder="For example: three requests arrived at once and I do not know which to start."
              />
            </div>

            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || conv.inputText.trim().length === 0}
                onClick={() => void runAssistant(conv.inputText.trim())}
              >
                {busy ? 'Working…' : 'Continue'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => dispatch({ type: 'setInput', text: ALEX_EXAMPLE })}
              >
                {copy.today.loadExample}
              </button>
              <span className="xs muted">{copy.today.loadExampleHint}</span>
            </div>

            {state.aiStatus === 'error' ? (
              <div style={{ marginTop: 16 }}>
                <Notice tone="warn">
                  <strong>The AI step did not complete.</strong> {state.aiError} Nothing was sent and
                  your text is still here.
                </Notice>
                <div className="row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void runAssistant(conv.inputText.trim())}
                  >
                    Retry
                  </button>
                  <button type="button" className="btn btn-primary" onClick={useScriptedFallback}>
                    Use scripted example
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {/* Human route, reachable without chatting or any test. */}
          <section className="card" aria-labelledby="human-heading">
            <div className="card-head">
              <h2 id="human-heading" className="small">
                {copy.today.humanSupport}
              </h2>
              <button type="button" className="btn btn-sm" onClick={() => setShowHuman((v) => !v)}>
                {showHuman ? 'Hide' : 'Show options'}
              </button>
            </div>
            <p className="small muted" style={{ marginBottom: showHuman ? 12 : 0 }}>
              {copy.today.humanSupportHint}
            </p>
            {showHuman ? (
              <ul className="small" style={{ paddingLeft: 20, margin: 0 }}>
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
            ) : null}
          </section>

          <QuickRecap />
        </>
      ) : null}

      {/* ------- Step: barrier check + one question ------- */}
      {conv.step === 'barrier_check' ? (
        <>
          <section className="card card-private" aria-labelledby="assistant-heading">
            <div className="card-head">
              <h2 id="assistant-heading">Support conversation</h2>
              <span className="badge badge-private">Private to you</span>
            </div>
            <Transcript />

            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="barrier-correct">If that is not right, choose the better description</label>
              <p className="hint">
                This is a description of the work situation, not a description of you.
              </p>
              <select
                id="barrier-correct"
                value={barrier}
                onChange={(e) =>
                  dispatch({
                    type: 'setDetectedBarrier',
                    barrier: e.target.value as BarrierId,
                    confirmed: true,
                  })
                }
              >
                {BARRIER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {BARRIER_LABELS[o.id]}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend>{CLARIFICATION_QUESTION}</legend>
              <div className="row-tight">
                {(
                  [
                    { id: 'yes', label: 'Yes' },
                    { id: 'no', label: 'No' },
                    { id: 'not_sure', label: 'Not sure' },
                  ] as { id: PriorityAnswer; label: string }[]
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="btn"
                    onClick={() => dispatch({ type: 'answerPriorityQuestion', answer: o.id })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="row">
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'setStep', step: 'intro' })}>
                ← Back
              </button>
            </div>
          </section>
          <QuickRecap />
        </>
      ) : null}

      {/* ------- Step: options ------- */}
      {conv.step === 'options' ? (
        <>
          <section className="card" aria-labelledby="options-heading">
            <h2 id="options-heading">What would you like to do?</h2>
            {conv.managerSpecifiedPriorities === 'no' || conv.managerSpecifiedPriorities === 'not_sure' ? (
              <p>
                When nobody has said which request comes first, a clear written priority may help you
                start. You can ask for one, or keep this to yourself for now. Both are fine.
              </p>
            ) : (
              <p>
                Your manager has already set a priority. You can still ask for it in writing so it is easy
                to refer back to, or keep this private for now.
              </p>
            )}

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn-choice"
                onClick={() =>
                  dispatch({
                    type: 'startDraft',
                    kind: barrier === 'noise_interruptions' ? 'focus_environment' : 'priority_order',
                    barrier,
                    text:
                      pendingDraftText ??
                      DRAFT_TEMPLATES[barrier === 'noise_interruptions' ? 'focus_environment' : 'priority_order'].text,
                  })
                }
              >
                <strong>Prepare a request for clear priorities</strong>
                <br />
                <span className="small muted">
                  Creates an editable draft. Nothing is sent until you review and confirm it.
                </span>
              </button>
              <button
                type="button"
                className="btn-choice"
                onClick={() =>
                  dispatch({
                    type: 'setNotice',
                    tone: 'info',
                    text: 'Kept private. Nothing was shared. You can come back to this at any time.',
                  })
                }
              >
                <strong>Keep this private for now</strong>
                <br />
                <span className="small muted">Nothing leaves this screen.</span>
              </button>
            </div>

            {related ? (
              <div style={{ marginTop: 20 }}>
                <h3 className="small">Related reading (optional)</h3>
                <p className="xs muted">
                  Reading this is never required before you ask for something.
                </p>
                <LibraryCard record={related} compact />
              </div>
            ) : null}

            <div className="row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => dispatch({ type: 'setStep', step: 'barrier_check' })}
              >
                ← Back
              </button>
            </div>
          </section>
          <QuickRecap />
        </>
      ) : null}

      {/* ------- Step: editable draft ------- */}
      {conv.step === 'draft' && state.draft ? <DraftEditor /> : null}

      {/* ------- Step: consent preview ------- */}
      {conv.step === 'preview' && state.draft ? (
        <ConsentPreview onBack={() => dispatch({ type: 'closePreview' })} />
      ) : null}

      {/* ------- Step: done ------- */}
      {conv.step === 'done' ? (
        <section className="card card-accent">
          <h2>Request sent</h2>
          <p>
            Your request was shared with Sam. What happens next, and whether it actually changes anything,
            is tracked in <strong>My support plan</strong>.
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'setTab', tab: 'plan' })}>
              Go to my support plan
            </button>
          </div>
          <Disclaimer>
            Sending a request is not the same as the request being agreed or delivered. Those are tracked
            separately.
          </Disclaimer>
        </section>
      ) : null}
    </div>
  );
}

function Transcript() {
  const { state } = useStore();
  return (
    <div className="stack">
      {state.conversation.messages.map((m) => (
        <div key={m.id}>
          <p className="xs muted" style={{ margin: 0 }}>
            {m.author === 'employee' ? 'You' : 'Support assistant'}
            {m.author === 'assistant' && m.origin ? (
              <span className={`badge ${m.origin === 'live' ? 'badge-live' : 'badge-scripted'}`} style={{ marginLeft: 6 }}>
                {m.origin === 'live' ? 'Live AI' : 'Scripted demo'}
              </span>
            ) : null}
          </p>
          <p style={{ margin: 0 }}>{m.text}</p>
        </div>
      ))}
    </div>
  );
}

function DraftEditor() {
  const { state, dispatch } = useStore();
  const draft = state.draft!;
  return (
    <section className="card card-private" aria-labelledby="draft-heading">
      <div className="card-head">
        <h2 id="draft-heading">Your draft request</h2>
        <span className="badge badge-private">Private draft · version {draft.version}</span>
      </div>
      <p className="small muted">
        This is yours to change. Your manager cannot see it and does not know it exists.
      </p>

      <div className="field">
        <label htmlFor="draft-text">Request</label>
        <p className="hint">Write it in your own words if you prefer.</p>
        <textarea
          id="draft-text"
          value={draft.requestText}
          onChange={(e) => dispatch({ type: 'editDraft', patch: { requestText: e.target.value } })}
          style={{ minHeight: 150 }}
        />
      </div>

      <div className="field">
        <label htmlFor="trial-days">Trial length (working days)</label>
        <p className="hint">{copy.disclaimers.fiveDay}</p>
        <select
          id="trial-days"
          value={draft.trialDays}
          onChange={(e) => dispatch({ type: 'editDraft', patch: { trialDays: Number(e.target.value) } })}
          style={{ maxWidth: 220 }}
        >
          {[3, 5, 10].map((d) => (
            <option key={d} value={d}>
              {d} working days
            </option>
          ))}
        </select>
      </div>

      <Disclaimer>{copy.disclaimers.notMedical}</Disclaimer>

      <div className="row" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'openPreview' })}>
          Continue to review
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'savePrivately' })}>
          {copy.consent.savePrivately}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'setStep', step: 'options' })}>
          ← Back
        </button>
        <button type="button" className="btn btn-danger" onClick={() => dispatch({ type: 'cancelDraft' })}>
          {copy.consent.cancel}
        </button>
      </div>
    </section>
  );
}
