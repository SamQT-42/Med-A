import { ILLUSTRATIVE_COHORT } from '../data/fixtures';
import { useStore } from '../state/store';
import { Disclaimer } from '../components/ui';

/**
 * Organization overview.
 *
 * Reads only operational counts derived from SharedRequest and WorkTrial.
 * No diagnosis, medical history, private text, wellbeing score, ranking,
 * or per-employee drill-down exists in this view or in the data it reads.
 */
export function Organization() {
  const { state } = useStore();
  const visible = state.sharedRequests.filter((r) => !r.withdrawn);
  const trials = state.trials.filter((t) => visible.some((r) => r.id === t.requestId));

  const awaitingResponse = trials.filter((t) => t.state === 'pending_response').length;
  const delivered = trials.filter((t) =>
    ['delivered', 'review_due', 'keep', 'modify', 'stop'].includes(t.state),
  ).length;
  const awaitingReview = trials.filter((t) => t.state === 'review_due').length;

  const cohort = ILLUSTRATIVE_COHORT;
  const enoughParticipants = cohort.participants >= cohort.minimumForDisplay;

  return (
    <div className="main-inner main-wide">
      <h1>Organization overview</h1>
      <p className="muted">
        An illustrative operational summary of the fictional employer workflow. It shows how many requests
        are moving through the process — nothing about any individual.
      </p>

      <section className="card">
        <h2 className="small">Operational state</h2>
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-value">{awaitingResponse}</div>
            <div className="kpi-label">Requests awaiting response</div>
          </div>
          <div className="kpi">
            <div className="kpi-value">{delivered}</div>
            <div className="kpi-label">Trials delivered</div>
          </div>
          <div className="kpi">
            <div className="kpi-value">{awaitingReview}</div>
            <div className="kpi-label">Trials awaiting review</div>
          </div>
        </div>
        <Disclaimer>
          These counts come only from shareable operational state. Diagnoses, medical histories, private
          conversation text, wellbeing risk scores, employee rankings, and any form of “neurodivergent
          employee list” do not exist in this application's data model.
        </Disclaimer>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="small">{cohort.label}</h2>
          <span className="badge badge-proto">Synthetic fixture</span>
        </div>
        <p className="small muted">
          Separate illustrative data, unrelated to any individual's private records in this demo.
        </p>
        <p className="small">
          <strong>Period:</strong> {cohort.periodLabel} &nbsp;·&nbsp;
          <strong>Denominator:</strong> {cohort.participants} distinct opt-in participants
        </p>

        {enoughParticipants ? (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th scope="col">Outcome</th>
                <th scope="col">Count</th>
                <th scope="col">Of denominator</th>
              </tr>
            </thead>
            <tbody>
              {cohort.outcomes.map((o) => (
                <tr key={o.label}>
                  <td>{o.label}</td>
                  <td>{o.count}</td>
                  <td>{cohort.participants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="notice notice-info" style={{ marginTop: 12 }}>
            <strong>Not enough participants to display outcomes.</strong> This view needs at least{' '}
            {cohort.minimumForDisplay} distinct opt-in participants; there are {cohort.participants}.
          </div>
        )}

        <Disclaimer>
          Suppressing small counts is a prototype display rule, not an anonymity guarantee. There are no
          demographic slices and no employee drill-down. Aggregate clinical or screening data is never an
          employer input in this design.
        </Disclaimer>
      </section>
    </div>
  );
}
