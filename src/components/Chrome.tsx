import { useState } from 'react';
import { copy } from '../content/copy';
import { useStore } from '../state/store';
import { checkLiveAvailable } from '../ai/provider';
import type { EmployeeTab, Role } from '../types';

const ROLE_OPTIONS: { id: Role; label: string }[] = [
  { id: 'employee', label: copy.roles.employee },
  { id: 'manager', label: copy.roles.manager },
  { id: 'org', label: copy.roles.org },
];

const TABS: { id: EmployeeTab; label: string }[] = [
  { id: 'today', label: copy.tabs.today },
  { id: 'plan', label: copy.tabs.plan },
  { id: 'library', label: copy.tabs.library },
  { id: 'support', label: copy.tabs.support },
];

export function TopBar() {
  const { state } = useStore();
  const live = state.aiMode === 'live';
  return (
    <header className="topbar">
      <div className="brand">
        <span>{copy.appName}</span>
        <span className="brand-promise">{copy.promise}</span>
      </div>
      <div className="topbar-badges">
        <span className="badge badge-proto">{copy.prototypeBadge}</span>
        <span className={`badge ${live ? 'badge-live' : 'badge-scripted'}`}>
          {live ? copy.liveBadge : copy.scriptedBadge}
        </span>
        {state.simulatedDay > 0 ? (
          <span className="badge badge-sim">
            Simulated day {state.simulatedDay} (demo timeline)
          </span>
        ) : null}
      </div>
      <div className="topbar-spacer" />
    </header>
  );
}

export function Sidebar() {
  const { state, dispatch, resetDemo } = useStore();
  const [probing, setProbing] = useState(false);

  /**
   * The live provider is probed only when someone actually selects it, so a
   * demo machine with no AI server running makes no failing network request
   * on load. Scripted stays the default and always works.
   */
  async function chooseProvider(value: string) {
    if (value !== 'live') {
      dispatch({ type: 'setAiMode', mode: 'scripted' });
      return;
    }
    setProbing(true);
    const ok = await checkLiveAvailable();
    setProbing(false);
    dispatch({ type: 'setLiveAiAvailable', value: ok });
    if (ok) {
      dispatch({ type: 'setAiMode', mode: 'live' });
      dispatch({ type: 'setNotice', tone: 'success', text: 'Live AI is configured and selected. Responses will be labelled "Live AI".' });
    } else {
      dispatch({ type: 'setAiMode', mode: 'scripted' });
      dispatch({
        type: 'setNotice',
        tone: 'warn',
        text: 'Live AI is not available, so the demo stays on the scripted provider. Start the optional AI server with credentials to enable it.',
      });
    }
  }

  return (
    <nav className="sidebar" aria-label="Main">
      <div>
        <h2 id="demo-view-label">{copy.demoViewLabel}</h2>
        <div className="nav role-switch" role="group" aria-labelledby="demo-view-label">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-current={state.role === r.id ? 'page' : undefined}
              onClick={() => dispatch({ type: 'setRole', role: r.id })}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="xs muted" style={{ marginTop: 8 }}>
          A presentation device, not a login.
        </p>
      </div>

      {state.role === 'employee' ? (
        <div>
          <h2 id="sections-label">Sections</h2>
          <div className="nav" role="group" aria-labelledby="sections-label">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-current={state.employeeTab === t.id ? 'page' : undefined}
                onClick={() => dispatch({ type: 'setTab', tab: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="demo-controls">
        <h2>Presentation controls</h2>
        <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'advanceDays', days: 5 })}>
          Simulate five working days later
        </button>
        <button type="button" className="btn btn-sm" onClick={resetDemo}>
          Reset demo
        </button>
        <label htmlFor="ai-mode" style={{ marginTop: 12 }}>
          AI provider
        </label>
        <select id="ai-mode" value={state.aiMode} disabled={probing} onChange={(e) => void chooseProvider(e.target.value)}>
          <option value="scripted">Scripted demo (always available)</option>
          <option value="live">Live AI (checks on selection)</option>
        </select>
        <p className="xs muted" style={{ marginTop: 4 }}>
          {probing
            ? 'Checking for a configured AI server…'
            : state.liveAiAvailable === false
              ? 'Last check: no AI server configured.'
              : 'Scripted responses are always labelled as scripted.'}
        </p>
        <label htmlFor="sim-fail" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="sim-fail"
            type="checkbox"
            checked={state.simulateAiFailure}
            onChange={(e) => dispatch({ type: 'setSimulateAiFailure', value: e.target.checked })}
          />
          <span>Simulate AI failure</span>
        </label>
      </div>
    </nav>
  );
}
