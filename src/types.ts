/**
 * Med-A data model.
 *
 * The important design rule of this file: the employee's private material and
 * the employer-visible material are SEPARATE TYPES, not two flags on one object.
 * A field can only reach the manager if it is literally listed in
 * SHARED_REQUEST_FIELDS and copied by buildSharedRequest(). There is no code
 * path that hands a PrivateConversation or PrivateFeedback to the manager view.
 */

export type Role = 'employee' | 'manager' | 'org';

export type BarrierId =
  | 'competing_priorities'
  | 'noise_interruptions'
  | 'unclear_instructions'
  | 'something_else';

export type AiMode = 'scripted' | 'live';

/** Which kind of workplace adjustment a draft proposes. */
export type DraftKind = 'priority_order' | 'focus_environment' | 'sensory_item';

/* ------------------------------------------------------------------ *
 * 1. PrivateConversation — employee messages and personal context.
 *    NEVER copied into SharedRequest, WorkTrial, or any manager AI input.
 * ------------------------------------------------------------------ */

export interface PrivateMessage {
  id: string;
  author: 'employee' | 'assistant' | 'system';
  text: string;
  at: string;
  /** How the assistant text was produced. Scripted is never labelled live. */
  origin?: AiMode;
}

export type PriorityAnswer = 'yes' | 'no' | 'not_sure';

export interface PrivateConversation {
  messages: PrivateMessage[];
  /** What the employee typed into "What is getting in the way?". Private. */
  inputText: string;
  /** Tentative FUNCTIONAL work barrier. The employee may correct it. */
  detectedBarrier: BarrierId | null;
  barrierConfirmed: boolean;
  managerSpecifiedPriorities: PriorityAnswer | null;
  /** Step within the Today flow. */
  step: TodayStep;
}

export type TodayStep =
  | 'intro'
  | 'barrier_check'
  | 'clarification'
  | 'options'
  | 'draft'
  | 'preview'
  | 'done';

/* ------------------------------------------------------------------ *
 * 2. Task notes + Quick recap (compact card inside Today).
 * ------------------------------------------------------------------ */

export interface TaskNote {
  id: string;
  /** Free text the employee keeps. Editable. */
  text: string;
}

export const NOT_SPECIFIED = 'Not specified' as const;
export const NEEDS_CLARIFICATION = 'Needs clarification' as const;

export interface RecapRow {
  taskId: string;
  task: string;
  nextAction: string;
  deadline: string;
  priorityStatus: string;
}

/* ------------------------------------------------------------------ *
 * 3. SupportDraft — the editable proposed work request.
 *    Lives in employee space until a ShareApproval exists.
 * ------------------------------------------------------------------ */

export type DraftStatus = 'private_draft' | 'shared' | 'cancelled';

export interface SupportDraft {
  id: string;
  /** Bumped on every edit. An approval is only valid for one exact version. */
  version: number;
  kind: DraftKind;
  barrier: BarrierId;
  /** Functional wording shown to the manager. Never a diagnosis. */
  barrierLabel: string;
  /** The editable request body. This is what the manager reads. */
  requestText: string;
  suggestedAdjustment: string;
  trialDays: number;
  responseWithinWorkingDays: number;
  /** Library record ids that informed the draft. Allowlisted at validation. */
  sourceIds: string[];
  /** Optional sensory-pantry item id, for the secondary path. */
  pantryItemId: string | null;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * 4. ShareApproval — proof that this exact version was approved.
 * ------------------------------------------------------------------ */

export interface ShareApproval {
  id: string;
  draftId: string;
  /** The version the employee actually confirmed. */
  approvedVersion: number;
  /** Fingerprint of the approved content; a later edit changes it. */
  contentFingerprint: string;
  recipient: string;
  approvedAt: string;
  fieldsApproved: string[];
}

/** A preview the employee is looking at but has not yet confirmed. */
export interface PendingPreview {
  draftId: string;
  version: number;
  contentFingerprint: string;
  openedAt: string;
}

/* ------------------------------------------------------------------ *
 * 5. SharedRequest — allowlisted operational content, copied ONLY
 *    after an explicit ShareApproval. This is the manager's whole world.
 * ------------------------------------------------------------------ */

/** The exact allowlist. Nothing outside this reaches employer space. */
export const SHARED_REQUEST_FIELDS = [
  'barrierLabel',
  'requestText',
  'suggestedAdjustment',
  'trialDays',
  'responseWithinWorkingDays',
  'sourceIds',
  'pantryItemId',
] as const;

export type SharedRequestField = (typeof SHARED_REQUEST_FIELDS)[number];

export interface SharedRequest {
  id: string;
  draftId: string;
  approvalId: string;
  /** The version that was approved and copied. */
  version: number;
  kind: DraftKind;
  recipient: string;
  sharedAt: string;
  /** Allowlisted operational payload. */
  barrierLabel: string;
  requestText: string;
  suggestedAdjustment: string;
  trialDays: number;
  responseWithinWorkingDays: number;
  sourceIds: string[];
  pantryItemId: string | null;
  /** True once the employee withdraws in-app access. */
  withdrawn: boolean;
}

/* ------------------------------------------------------------------ *
 * 6. WorkTrial — the operational state machine.
 * ------------------------------------------------------------------ */

export type TrialState =
  | 'pending_response'
  | 'alternative_proposed'
  | 'cannot_implement'
  | 'agreed'
  | 'delivered'
  | 'review_due'
  | 'keep'
  | 'modify'
  | 'stop';

export type ManagerDecision = 'agree' | 'suggest_alternative' | 'cannot_implement';

/** Employee-confirmed delivery. "Agreed" is not "delivered". */
export type DeliveryStatus = 'not_confirmed' | 'delivered' | 'partly' | 'not_delivered';

export interface ManagerResponse {
  decision: ManagerDecision;
  /** Ordered task ids, the manager's operational decision. */
  priorityOrder: string[];
  note: string;
  /** For suggest_alternative / cannot_implement. */
  alternativeText: string;
  proposedNextStep: string;
  trialDays: number;
  respondedAt: string;
  /** Set when the employee has reviewed changed terms. */
  employeeAcceptedAlternative: boolean | null;
}

export interface WorkTrial {
  id: string;
  requestId: string;
  owner: string;
  state: TrialState;
  response: ManagerResponse | null;
  trialDays: number;
  reviewAfterWorkingDays: number;
  deliveryStatus: DeliveryStatus;
  /** Simulated demo clock, in working days. Never implies real time passed. */
  simulatedDaysElapsed: number;
  history: TrialEvent[];
}

export interface TrialEvent {
  at: string;
  /** Demo-clock day, not a real date. */
  simulatedDay: number;
  label: string;
}

/* ------------------------------------------------------------------ *
 * 7. PrivateFeedback — employee ratings. Private by default.
 *    Never rendered in Manager or Organization views.
 * ------------------------------------------------------------------ */

export type Happened = 'yes' | 'partly' | 'no';
export type Helped = 'better' | 'same' | 'worse' | 'unsure';
export type NextDecision = 'keep' | 'modify' | 'stop';

export interface PrivateFeedback {
  id: string;
  requestId: string;
  happened: Happened | null;
  helped: Helped | null;
  /** Optional 1-5 task-clarity rating. */
  clarityRating: number | null;
  decision: NextDecision | null;
  note: string;
  recordedAt: string | null;
}

/* ------------------------------------------------------------------ *
 * 8. IllustrativeCohort — separate synthetic fixture, unrelated to Alex.
 * ------------------------------------------------------------------ */

export interface IllustrativeCohort {
  label: string;
  periodLabel: string;
  /** Distinct opt-in participants. Below threshold => no outcome stats. */
  participants: number;
  minimumForDisplay: number;
  outcomes: { label: string; count: number }[];
}

/* ------------------------------------------------------------------ *
 * 9. Library + support options.
 * ------------------------------------------------------------------ */

export interface LibraryRecord {
  id: string;
  title: string;
  shortSummary: string;
  sourceTitle: string;
  sourceUrl: string;
  scopeNote: string;
  reviewStatus: string;
  barriers: BarrierId[];
}

export interface PantryItem {
  id: string;
  name: string;
  preferenceDescription: string;
  fictionalStock: string;
  fictionalLocation: string;
}

/* ------------------------------------------------------------------ *
 * 10. AI structured response contract.
 * ------------------------------------------------------------------ */

export interface AiSupportResponse {
  taskRecap: RecapRow[];
  barrier: BarrierId;
  barrierLabel: string;
  clarificationQuestion: string;
  draftRequest: string;
  sourceIds: string[];
}

export type AiStatus = 'idle' | 'loading' | 'ok' | 'error';

/* ------------------------------------------------------------------ *
 * Root state.
 * ------------------------------------------------------------------ */

export interface AppState {
  role: Role;
  employeeTab: EmployeeTab;
  aiMode: AiMode;
  /** Rehearsal switch: forces the next AI call to fail. */
  simulateAiFailure: boolean;
  aiStatus: AiStatus;
  aiError: string | null;
  liveAiAvailable: boolean | null;

  conversation: PrivateConversation;
  taskNotes: TaskNote[];
  recap: RecapRow[] | null;

  draft: SupportDraft | null;
  pendingPreview: PendingPreview | null;
  approvals: ShareApproval[];
  sharedRequests: SharedRequest[];
  trials: WorkTrial[];
  feedback: PrivateFeedback[];

  /** Demo clock, in working days. 0 = today. */
  simulatedDay: number;
  /** Transient UI notice. */
  notice: { tone: 'info' | 'warn' | 'success'; text: string } | null;
}

export type EmployeeTab = 'today' | 'plan' | 'library' | 'support';
