import { useEffect } from 'react';
import { Sidebar, TopBar } from './components/Chrome';
import { StoreProvider, useStore } from './state/store';
import { Today } from './views/Today';
import { SupportPlan } from './views/SupportPlan';
import { Library } from './views/Library';
import { SupportOptions } from './views/SupportOptions';
import { Manager } from './views/Manager';
import { Organization } from './views/Organization';
import './styles/app.css';

function Main() {
  const { state, dispatch } = useStore();

  // A notice is transient: clear it when the view changes.
  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(() => dispatch({ type: 'clearNotice' }), 12000);
    return () => clearTimeout(t);
  }, [state.notice, dispatch]);

  if (state.role === 'manager') return <Manager />;
  if (state.role === 'org') return <Organization />;

  switch (state.employeeTab) {
    case 'plan':
      return <SupportPlan />;
    case 'library':
      return <Library />;
    case 'support':
      return <SupportOptions />;
    case 'today':
    default:
      return <Today />;
  }
}

function Shell() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <TopBar />
      <div className="body-row">
        <Sidebar />
        <main className="main" id="main" tabIndex={-1}>
          <Main />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
