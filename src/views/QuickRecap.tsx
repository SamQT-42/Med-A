import { copy } from '../content/copy';
import { NEEDS_CLARIFICATION, NOT_SPECIFIED } from '../types';
import { useStore } from '../state/store';

/**
 * Compact recap card inside Today. Deliberately NOT a task-management module:
 * three editable notes in, one summary table out.
 *
 * It only reports what the note text actually says. A fact that is not written
 * down stays "Not specified" and priority stays "Needs clarification" until the
 * manager decides — the app never guesses a deadline or a business priority.
 */
export function QuickRecap() {
  const { state, dispatch } = useStore();

  return (
    <section className="card card-compact" aria-labelledby="recap-heading">
      <div className="card-head">
        <h2 id="recap-heading" className="small">
          {copy.today.recapHeading}
        </h2>
        <span className="badge badge-private">Private to you</span>
      </div>
      <p className="xs muted">{copy.today.recapHint}</p>

      <div className="stack">
        {state.taskNotes.map((n, i) => (
          <div key={n.id}>
            <label htmlFor={`note-${n.id}`} className="xs">
              Task note {i + 1}
            </label>
            <input
              id={`note-${n.id}`}
              type="text"
              value={n.text}
              onChange={(e) => dispatch({ type: 'setTaskNote', id: n.id, text: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => dispatch({ type: 'buildRecapFromNotes' })}
        >
          {state.recap ? 'Refresh recap' : 'Make a quick recap'}
        </button>
        {state.recap ? (
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => dispatch({ type: 'setRecap', recap: null })}>
            Hide recap
          </button>
        ) : null}
      </div>

      {state.recap && state.recap.length > 0 ? (
        <table style={{ marginTop: 12 }}>
          <caption className="xs muted" style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 6 }}>
            Facts come from your notes only. Nothing here is invented.
          </caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Next action</th>
              <th scope="col">Deadline</th>
              <th scope="col">Priority</th>
            </tr>
          </thead>
          <tbody>
            {state.recap.map((r) => (
              <tr key={r.taskId}>
                <td>{r.task}</td>
                <td className={r.nextAction === NOT_SPECIFIED ? 'not-specified' : undefined}>{r.nextAction}</td>
                <td className={r.deadline === NOT_SPECIFIED ? 'not-specified' : undefined}>{r.deadline}</td>
                <td className={r.priorityStatus === NEEDS_CLARIFICATION ? 'not-specified' : undefined}>
                  {r.priorityStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
