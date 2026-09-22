import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  AiMode,
  AiStatus,
  AppState,
  BarrierId,
  DeliveryStatus,
  DraftKind,
  EmployeeTab,
  ManagerDecision,
  NextDecision,
  PriorityAnswer,
  PrivateFeedback,
  RecapRow,
  Role,
  SupportDraft,
  TodayStep,
} from '../types';
import { DEFAULT_TASK_NOTES, PEOPLE, SAMPLE_POLICY } from '../data/fixtures';
import {
  BARRIER_LABELS,
  approvalIsValidFor,
  buildApproval,
  buildRecap,
  buildSharedRequest,
  createDraft,
  createTrial,
  fingerprintDraft,
  newId,
  nowIso,
} from './logic';

const STORAGE_KEY = 'med-a.demo.v1';

export function initialState(): AppState {
  return {
    role: 'employee',
    employeeTab: 'today',
    aiMode: 'scripted',
    simulateAiFailure: false,
    aiStatus: 'idle',
    aiError: null,
    liveAiAvailable: null,
    conversation: {
      messages: [],
      inputText: '',
      detectedBarrier: null,
      barrierConfirmed: false,
      managerSpecifiedPriorities: null,
      step: 'intro',
    },
    taskNotes: DEFAULT_TASK_NOTES.map((n) => ({ ...n })),
    recap: null,
    draft: null,
    pendingPreview: null,
    approvals: [],
    sharedRequests: [],
    trials: [],
    feedback: [],
    simulatedDay: 0,
    notice: null,
  };
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export type Action =
  | { type: 'reset' }
  | { type: 'hydrate'; state: AppState }
  | { type: 'setRole'; role: Role }
  | { type: 'setTab'; tab: EmployeeTab }
  | { type: 'setAiMode'; mode: AiMode }
  | { type: 'setSimulateAiFailure'; value: boolean }
  | { type: 'setAiStatus'; status: AiStatus; error?: string | null }
  | { type: 'setLiveAiAvailable'; value: boolean }
  | { type: 'setNotice'; tone: 'info' | 'warn' | 'success'; text: string }
  | { type: 'clearNotice' }
  | { type: 'setInput'; text: string }
  | { type: 'setStep'; step: TodayStep }
  | { type: 'addMessage'; author: 'employee' | 'assistant' | 'system'; text: string; origin?: AiMode }
  | { type: 'setDetectedBarrier'; barrier: BarrierId; confirmed?: boolean }
  | { type: 'answerPriorityQuestion'; answer: PriorityAnswer }
  | { type: 'setTaskNote'; id: string; text: string }
  | { type: 'setRecap'; recap: RecapRow[] | null }
  | { type: 'buildRecapFromNotes' }
  | { type: 'startDraft'; kind: DraftKind; barrier: BarrierId; text?: string; sourceIds?: string[]; pantryItemId?: string | null }
  | { type: 'editDraft'; patch: Partial<Pick<SupportDraft, 'requestText' | 'suggestedAdjustment' | 'trialDays' | 'pantryItemId'>> }
  | { type: 'cancelDraft' }
  | { type: 'savePrivately' }
  | { type: 'openPreview' }
  | { type: 'closePreview' }
  | { type: 'confirmShare' }
  | { type: 'withdrawRequest'; requestId: string }
  | { type: 'managerRespond'; requestId: string; decision: ManagerDecision; priorityOrder: string[]; note: string; alternativeText: string; proposedNextStep: string; trialDays: number }
  | { type: 'employeeReviewAlternative'; trialId: string; accepted: boolean }
  | { type: 'confirmDelivery'; trialId: string; status: DeliveryStatus }
  | { type: 'advanceDays'; days: number }
  | { type: 'recordFeedback'; requestId: string; patch: Partial<PrivateFeedback> }
  | { type: 'shareReviewDecision'; trialId: string; decision: NextDecision };

/* ------------------------------------------------------------------ *
 * Reducer. All sharing and state transitions are deterministic here.
 * No AI code path can dispatch a share, an approval, or a role change.
 * ------------------------------------------------------------------ */

function touchDraft(draft: SupportDraft, patch: Partial<SupportDraft>): SupportDraft {
  return { ...draft, ...patch, version: draft.version + 1, updatedAt: nowIso() };
}

function logEvent(state: AppState, trialId: string, label: string): AppState {
  return {
    ...state,
    trials: state.trials.map((t) =>
      t.id === trialId
        ? { ...t, history: [...t.history, { at: nowIso(), simulatedDay: state.simulatedDay, label }] }
        : t,
    ),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'reset':
      return initialState();

    case 'hydrate':
      return action.state;

    case 'setRole':
      return { ...state, role: action.role, notice: null };

    case 'setTab':
      return { ...state, employeeTab: action.tab };

    case 'setAiMode':
      return { ...state, aiMode: action.mode, aiStatus: 'idle', aiError: null };

    case 'setSimulateAiFailure':
      return { ...state, simulateAiFailure: action.value };

    case 'setAiStatus':
      return { ...state, aiStatus: action.status, aiError: action.error ?? null };

    case 'setLiveAiAvailable':
      return { ...state, liveAiAvailable: action.value };

    case 'setNotice':
      return { ...state, notice: { tone: action.tone, text: action.text } };

    case 'clearNotice':
      return { ...state, notice: null };

    case 'setInput':
      return { ...state, conversation: { ...state.conversation, inputText: action.text } };

    case 'setStep':
      return { ...state, conversation: { ...state.conversation, step: action.step } };

    case 'addMessage':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          messages: [
            ...state.conversation.messages,
            {
              id: newId('msg'),
              author: action.author,
              text: action.text,
              at: nowIso(),
              origin: action.origin,
            },
          ],
        },
      };

    case 'setDetectedBarrier':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          detectedBarrier: action.barrier,
          barrierConfirmed: action.confirmed ?? state.conversation.barrierConfirmed,
        },
      };

    case 'answerPriorityQuestion':
      return {
        ...state,
        conversation: { ...state.conversation, managerSpecifiedPriorities: action.answer, step: 'options' },
      };

    case 'setTaskNote':
      return {
        ...state,
        taskNotes: state.taskNotes.map((n) => (n.id === action.id ? { ...n, text: action.text } : n)),
      };

    case 'setRecap':
      return { ...state, recap: action.recap };

    case 'buildRecapFromNotes':
      return { ...state, recap: buildRecap(state.taskNotes) };

    case 'startDraft': {
      const draft = createDraft({
        kind: action.kind,
        barrier: action.barrier,
        text: action.text,
        sourceIds: action.sourceIds,
        pantryItemId: action.pantryItemId,
      });
      return { ...state, draft, pendingPreview: null, conversation: { ...state.conversation, step: 'draft' } };
    }

    case 'editDraft': {
      if (!state.draft) return state;
      const next = touchDraft(state.draft, action.patch);
      // Any edit invalidates a preview the employee had open.
      const previewStillValid = approvalIsValidFor(state.pendingPreview, next);
      return {
        ...state,
        draft: next,
        pendingPreview: previewStillValid ? state.pendingPreview : null,
      };
    }

    case 'cancelDraft':
      return {
        ...state,
        draft: null,
        pendingPreview: null,
        conversation: { ...state.conversation, step: 'options' },
        notice: { tone: 'info', text: 'Draft cancelled. Nothing was shared.' },
      };

    case 'savePrivately':
      return {
        ...state,
        pendingPreview: null,
        conversation: { ...state.conversation, step: 'draft' },
        notice: {
          tone: 'info',
          text: 'Saved privately. This is visible only to you — your manager cannot see it.',
        },
      };

    case 'openPreview': {
      if (!state.draft) return state;
      return {
        ...state,
        conversation: { ...state.conversation, step: 'preview' },
        pendingPreview: {
          draftId: state.draft.id,
          version: state.draft.version,
          contentFingerprint: fingerprintDraft(state.draft),
          openedAt: nowIso(),
        },
      };
    }

    case 'closePreview':
      return { ...state, pendingPreview: null, conversation: { ...state.conversation, step: 'draft' } };

    case 'confirmShare': {
      const draft = state.draft;
      // Deterministic guard: the confirmation must match the exact current version.
      if (!draft || !approvalIsValidFor(state.pendingPreview, draft)) {
        return {
          ...state,
          pendingPreview: null,
          notice: {
            tone: 'warn',
            text: 'The request changed after the last preview, so that confirmation no longer applies. Please review the current version again.',
          },
        };
      }
      const approval = buildApproval(draft, PEOPLE.manager.name);
      const request = buildSharedRequest(draft, approval);
      const trial = createTrial(request, PEOPLE.manager.name, state.simulatedDay);
      return {
        ...state,
        draft: { ...draft, status: 'shared' },
        pendingPreview: null,
        approvals: [...state.approvals, approval],
        sharedRequests: [...state.sharedRequests, request],
        trials: [...state.trials, trial],
        feedback: [
          ...state.feedback,
          {
            id: newId('feedback'),
            requestId: request.id,
            happened: null,
            helped: null,
            clarityRating: null,
            decision: null,
            note: '',
            recordedAt: null,
          },
        ],
        conversation: { ...state.conversation, step: 'done' },
        employeeTab: 'plan',
        notice: {
          tone: 'success',
          text: `Version ${approval.approvedVersion} shared with ${approval.recipient}. Only the approved operational content was copied.`,
        },
      };
    }

    case 'withdrawRequest':
      return {
        ...state,
        sharedRequests: state.sharedRequests.map((r) =>
          r.id === action.requestId ? { ...r, withdrawn: true } : r,
        ),
        notice: {
          tone: 'info',
          text: 'In-app access withdrawn. A recipient may already have read or copied what was shared earlier.',
        },
      };

    case 'managerRespond': {
      const trial = state.trials.find((t) => t.requestId === action.requestId);
      if (!trial) return state;
      const response = {
        decision: action.decision,
        priorityOrder: action.priorityOrder,
        note: action.note,
        alternativeText: action.alternativeText,
        proposedNextStep: action.proposedNextStep,
        trialDays: action.trialDays,
        respondedAt: nowIso(),
        employeeAcceptedAlternative: action.decision === 'agree' ? null : false,
      };
      const nextState =
        action.decision === 'agree'
          ? 'agreed'
          : action.decision === 'suggest_alternative'
            ? 'alternative_proposed'
            : 'cannot_implement';
      const labels: Record<ManagerDecision, string> = {
        agree: `Manager agreed. Trial of ${action.trialDays} working days confirmed.`,
        suggest_alternative: 'Manager suggested alternative terms. Employee review required.',
        cannot_implement: 'Manager recorded "Cannot implement yet" with a proposed next step.',
      };
      const updated: AppState = {
        ...state,
        trials: state.trials.map((t) =>
          t.id === trial.id
            ? { ...t, response, state: nextState, trialDays: action.trialDays, reviewAfterWorkingDays: action.trialDays }
            : t,
        ),
      };
      return logEvent(updated, trial.id, labels[action.decision]);
    }

    case 'employeeReviewAlternative': {
      const trial = state.trials.find((t) => t.id === action.trialId);
      if (!trial || !trial.response) return state;
      const updated: AppState = {
        ...state,
        trials: state.trials.map((t) =>
          t.id === trial.id
            ? {
                ...t,
                response: { ...t.response!, employeeAcceptedAlternative: action.accepted },
                state: action.accepted ? 'agreed' : 'pending_response',
              }
            : t,
        ),
      };
      return logEvent(
        updated,
        trial.id,
        action.accepted
          ? 'Employee reviewed and accepted the changed terms. Trial is now agreed.'
          : 'Employee declined the changed terms. Back to waiting for a response.',
      );
    }

    case 'confirmDelivery': {
      const trial = state.trials.find((t) => t.id === action.trialId);
      if (!trial) return state;
      const updated: AppState = {
        ...state,
        trials: state.trials.map((t) =>
          t.id === trial.id
            ? {
                ...t,
                deliveryStatus: action.status,
                state: action.status === 'delivered' ? 'delivered' : t.state,
              }
            : t,
        ),
      };
      const labels: Record<DeliveryStatus, string> = {
        not_confirmed: 'Delivery confirmation cleared.',
        delivered: 'Employee confirmed the agreed priority information was actually available.',
        partly: 'Employee confirmed the adjustment happened only partly.',
        not_delivered: 'Employee confirmed the adjustment did not happen.',
      };
      return logEvent(updated, trial.id, labels[action.status]);
    }

    case 'advanceDays': {
      const day = state.simulatedDay + action.days;
      return {
        ...state,
        simulatedDay: day,
        trials: state.trials.map((t) => {
          const elapsed = t.simulatedDaysElapsed + action.days;
          const reached = elapsed >= t.reviewAfterWorkingDays;
          const reviewable = t.state === 'agreed' || t.state === 'delivered';
          return {
            ...t,
            simulatedDaysElapsed: elapsed,
            state: reached && reviewable ? 'review_due' : t.state,
            history: [
              ...t.history,
              {
                at: nowIso(),
                simulatedDay: day,
                label: `Demo timeline advanced by ${action.days} working days (simulated, not real time).`,
              },
            ],
          };
        }),
        notice: {
          tone: 'info',
          text: 'Demo timeline advanced. This is a presentation device — no real time has passed.',
        },
      };
    }

    case 'recordFeedback':
      return {
        ...state,
        feedback: state.feedback.map((f) =>
          f.requestId === action.requestId ? { ...f, ...action.patch, recordedAt: nowIso() } : f,
        ),
      };

    case 'shareReviewDecision': {
      // A new operational decision needs its own preview, so this only records
      // the decision on the trial; the private rating itself is never copied.
      const trial = state.trials.find((t) => t.id === action.trialId);
      if (!trial) return state;
      const updated: AppState = {
        ...state,
        trials: state.trials.map((t) => (t.id === trial.id ? { ...t, state: action.decision } : t)),
      };
      return logEvent(
        updated,
        trial.id,
        `Employee shared the operational decision: ${action.decision}. Private ratings were not included.`,
      );
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ *
 * Session persistence. sessionStorage only; cleared by Reset demo.
 * ------------------------------------------------------------------ */

function load(): AppState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    // Shallow shape check so an older fixture cannot break the demo.
    if (!parsed || typeof parsed !== 'object' || !('conversation' in parsed)) return null;
    return { ...initialState(), ...parsed };
  } catch {
    return null;
  }
}

interface Ctx {
  state: AppState;
  dispatch: (a: Action) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => load() ?? initialState());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Demo state is not critical; ignore quota or privacy-mode failures. */
    }
  }, [state]);

  const resetDemo = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo(() => ({ state, dispatch, resetDemo }), [state, resetDemo]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/* Convenience selectors. */
export function useTrialFor(requestId: string | undefined) {
  const { state } = useStore();
  return state.trials.find((t) => t.requestId === requestId);
}

export const DEFAULT_POLICY = SAMPLE_POLICY;
export { BARRIER_LABELS };
