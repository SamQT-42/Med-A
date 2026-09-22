import { copy } from '../content/copy';
import { PEOPLE } from '../data/fixtures';
import { approvalIsValidFor } from '../state/logic';
import { useStore } from '../state/store';
import { Disclaimer, Notice, SourceList } from './ui';

/**
 * Review screen. Everything the manager will receive is listed here
 * explicitly, and so is everything that stays behind.
 *
 * The confirm button is only enabled while the open preview still matches the
 * exact current draft version; editing the draft clears the preview, so an
 * earlier confirmation can never be applied to changed text.
 */
export function ConsentPreview({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useStore();
  const draft = state.draft;
  if (!draft) return null;

  const valid = approvalIsValidFor(state.pendingPreview, draft);

  return (
    <section className="card card-accent" aria-labelledby="consent-heading">
      <h2 id="consent-heading">{copy.consent.reviewHeading}</h2>
      <p className="small muted">
        Nothing has been sent yet. Your manager sees nothing until you confirm on this screen.
      </p>

      {!valid ? <Notice tone="warn">{copy.consent.invalidated}</Notice> : null}

      <dl className="consent-grid">
        <dt>{copy.consent.who}</dt>
        <dd>
          {PEOPLE.manager.name} — {PEOPLE.manager.role.toLowerCase()}
        </dd>

        <dt>{copy.consent.how}</dt>
        <dd>A shared work-adjustment request in Med-A.</dd>

        <dt>{copy.consent.when}</dt>
        <dd>
          Response requested within {draft.responseWithinWorkingDays} working day.{' '}
          <span className="xs muted">{copy.consent.policyNote}</span>
        </dd>

        <dt>{copy.consent.review}</dt>
        <dd>After {draft.trialDays} working days.</dd>
      </dl>

      <h3 style={{ marginTop: 24 }}>{copy.consent.whatShared}</h3>
      <p className="xs muted">This is version {draft.version} of your request — the exact text below.</p>
      <blockquote
        style={{
          margin: '8px 0 12px',
          padding: '12px 16px',
          background: 'var(--c-surface-muted)',
          borderLeft: '3px solid var(--c-accent)',
          borderRadius: 6,
        }}
      >
        {draft.requestText}
      </blockquote>
      <ul className="shared-list small">
        <li>Work barrier, in operational wording: “{draft.barrierLabel}”</li>
        <li>Suggested adjustment: {draft.suggestedAdjustment}</li>
        <li>Trial length: {draft.trialDays} working days</li>
        <li>Response expectation: within {draft.responseWithinWorkingDays} working day</li>
        <li>
          Reference material used to write the draft: <SourceList ids={draft.sourceIds} />
        </li>
      </ul>

      <h3 style={{ marginTop: 20 }}>{copy.consent.whatNotShared}</h3>
      <ul className="excluded-list small">
        <li>Your private chat and anything personal you wrote in it</li>
        <li>Any diagnosis, condition, or health information</li>
        <li>Any screening or assessment data</li>
        <li>Your private ratings and reflections, now or later</li>
        <li>Your task notes as written, beyond what is in the request above</li>
      </ul>

      <Disclaimer>
        {copy.disclaimers.notMedical} {copy.disclaimers.fiveDay}
      </Disclaimer>

      <details style={{ marginTop: 16 }}>
        <summary>Change the wording without leaving this screen</summary>
        <p className="xs muted">
          Editing here creates a new version. The earlier confirmation stops applying immediately and you
          will be asked to review the new version.
        </p>
        <label htmlFor="preview-edit">Request text (version {draft.version})</label>
        <textarea
          id="preview-edit"
          value={draft.requestText}
          onChange={(e) => dispatch({ type: 'editDraft', patch: { requestText: e.target.value } })}
        />
      </details>

      <div className="row" style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => dispatch({ type: 'confirmShare' })}
        >
          {copy.consent.shareButton}
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Back to edit
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: 'closePreview' });
            dispatch({ type: 'savePrivately' });
          }}
        >
          {copy.consent.savePrivately}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => dispatch({ type: 'cancelDraft' })}>
          {copy.consent.cancel}
        </button>
      </div>
      {!valid ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'openPreview' })}>
            Review version {draft.version} now
          </button>
          <span className="xs muted">
            Sharing stays disabled until the version on screen is the version you reviewed.
          </span>
        </div>
      ) : null}
    </section>
  );
}
