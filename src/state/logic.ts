import {
  NEEDS_CLARIFICATION,
  NOT_SPECIFIED,
  SHARED_REQUEST_FIELDS,
  type BarrierId,
  type DraftKind,
  type PendingPreview,
  type RecapRow,
  type ShareApproval,
  type SharedRequest,
  type SupportDraft,
  type TaskNote,
  type WorkTrial,
} from '../types';
import { SAMPLE_POLICY } from '../data/fixtures';

/* ---------------------------------------------------------------- *
 * Small deterministic helpers.
 * ---------------------------------------------------------------- */

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Content fingerprint for an approval. Deterministic, order-stable, and
 * derived only from the fields that are actually shared, so editing any
 * shared field invalidates an earlier approval.
 */
export function fingerprintDraft(draft: SupportDraft): string {
  const payload = SHARED_REQUEST_FIELDS.map((f) => `${f}=${JSON.stringify(draft[f])}`).join('|');
  let h = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  }
  return `v${draft.version}:${(h >>> 0).toString(36)}`;
}

/* ---------------------------------------------------------------- *
 * Barrier detection. Functional and tentative; never clinical.
 * ---------------------------------------------------------------- */

export const BARRIER_LABELS: Record<BarrierId, string> = {
  competing_priorities: 'Several urgent requests arrived at the same time',
  noise_interruptions: 'Noise and interruptions in the work area',
  unclear_instructions: 'Instructions for a task are not clear',
  something_else: 'A work difficulty that needs clarifying',
};

export const BARRIER_OPTIONS: { id: BarrierId; label: string }[] = [
  { id: 'competing_priorities', label: 'Competing priorities' },
  { id: 'noise_interruptions', label: 'Noise and interruptions' },
  { id: 'unclear_instructions', label: 'Unclear instructions' },
  { id: 'something_else', label: 'Something else' },
];

const BARRIER_KEYWORDS: { id: BarrierId; words: string[] }[] = [
  {
    id: 'competing_priorities',
    words: ['priorit', 'at once', 'three urgent', 'urgent request', 'which task', 'competing', 'all at the same time', 'deadlines'],
  },
  { id: 'noise_interruptions', words: ['noise', 'noisy', 'loud', 'interrupt', 'distract', 'open plan', 'focus'] },
  { id: 'unclear_instructions', words: ['unclear', 'not clear', 'do not understand', "don't understand", 'vague', 'ambiguous', 'what is expected'] },
];

/** Tentative functional barrier detection. Deterministic keyword match. */
export function detectBarrier(text: string): BarrierId {
  const lower = text.toLowerCase();
  let best: { id: BarrierId; score: number } = { id: 'something_else', score: 0 };
  for (const entry of BARRIER_KEYWORDS) {
    const score = entry.words.reduce((n, w) => (lower.includes(w) ? n + 1 : n), 0);
    if (score > best.score) best = { id: entry.id, score };
  }
  return best.id;
}

/* ---------------------------------------------------------------- *
 * Quick recap. Extracts only what the note actually says.
 * Anything absent is "Not specified" — never invented.
 * ---------------------------------------------------------------- */

const DEADLINE_PATTERNS = [
  /\bby\s+([^,.;]+)/i,
  /\bdue\s+(?:on\s+)?([^,.;]+)/i,
  /\bbefore\s+([^,.;]+)/i,
  /\bdeadline[:\s]+([^,.;]+)/i,
];

const NEXT_ACTION_PATTERNS = [
  /\bnext[:\s]+([^,.;]+)/i,
  /\bthen\s+([^,.;]+)/i,
  /\bstart(?:ing)?\s+(?:by|with)\s+([^,.;]+)/i,
  /\bneed(?:s)?\s+to\s+([^,.;]+)/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
  }
  return null;
}

/** The task title is the note text up to the first clause marker. */
function taskTitle(text: string): string {
  const cut = text.split(/\s+(?:by|due|before|next:|then)\b/i)[0];
  return (cut || text).trim().replace(/[.;,]$/, '');
}

export function buildRecap(notes: TaskNote[]): RecapRow[] {
  return notes
    .filter((n) => n.text.trim().length > 0)
    .map((n) => ({
      taskId: n.id,
      task: taskTitle(n.text),
      nextAction: firstMatch(n.text, NEXT_ACTION_PATTERNS) ?? NOT_SPECIFIED,
      deadline: firstMatch(n.text, DEADLINE_PATTERNS) ?? NOT_SPECIFIED,
      // Every priority stays "Needs clarification" until the manager decides.
      priorityStatus: NEEDS_CLARIFICATION,
    }));
}

/* ---------------------------------------------------------------- *
 * Draft construction. Deterministic templates.
 * ---------------------------------------------------------------- */

export const DRAFT_TEMPLATES: Record<DraftKind, { text: string; adjustment: string; sourceIds: string[] }> = {
  priority_order: {
    text:
      'When several urgent tasks arrive together, a written priority order helps me get started. Could we agree which task comes first and what can wait? I would like to try this for five working days and review whether it helps.',
    adjustment: 'A written priority order when several urgent tasks arrive together',
    sourceIds: ['lib-clear-instructions'],
  },
  focus_environment: {
    text:
      'Noise and interruptions in my work area make it hard to start and stay on a task. Could we try either a quieter place to work or an agreed focus period each day? I would like to try this for five working days and review whether it helps.',
    adjustment: 'A quieter work area or an agreed daily focus period',
    sourceIds: ['lib-reducing-distractions'],
  },
  sensory_item: {
    text:
      'I would like to try one item from the workplace equipment catalogue to make my work area easier to work in. I would like to try this for five working days and review whether it helps.',
    adjustment: 'One item from the workplace equipment catalogue',
    sourceIds: ['lib-reducing-distractions'],
  },
};

export function createDraft(opts: {
  kind: DraftKind;
  barrier: BarrierId;
  text?: string;
  sourceIds?: string[];
  pantryItemId?: string | null;
}): SupportDraft {
  const template = DRAFT_TEMPLATES[opts.kind];
  const at = nowIso();
  return {
    id: newId('draft'),
    version: 1,
    kind: opts.kind,
    barrier: opts.barrier,
    barrierLabel: BARRIER_LABELS[opts.barrier],
    requestText: opts.text ?? template.text,
    suggestedAdjustment: template.adjustment,
    trialDays: SAMPLE_POLICY.trialDays,
    responseWithinWorkingDays: SAMPLE_POLICY.responseWithinWorkingDays,
    sourceIds: opts.sourceIds ?? template.sourceIds,
    pantryItemId: opts.pantryItemId ?? null,
    status: 'private_draft',
    createdAt: at,
    updatedAt: at,
  };
}

/* ---------------------------------------------------------------- *
 * The sharing boundary. This is the ONLY function that moves content
 * from employee space to employer space.
 * ---------------------------------------------------------------- */

export function approvalIsValidFor(
  approval: ShareApproval | PendingPreview | null,
  draft: SupportDraft | null,
): boolean {
  if (!approval || !draft) return false;
  const version = 'approvedVersion' in approval ? approval.approvedVersion : approval.version;
  return (
    approval.draftId === draft.id &&
    version === draft.version &&
    approval.contentFingerprint === fingerprintDraft(draft)
  );
}

export function buildApproval(draft: SupportDraft, recipient: string): ShareApproval {
  return {
    id: newId('approval'),
    draftId: draft.id,
    approvedVersion: draft.version,
    contentFingerprint: fingerprintDraft(draft),
    recipient,
    approvedAt: nowIso(),
    fieldsApproved: [...SHARED_REQUEST_FIELDS],
  };
}

/**
 * Copies ONLY the allowlisted fields. Written as an explicit field-by-field
 * copy rather than a spread so that adding a private field to SupportDraft
 * can never silently leak it into employer space.
 */
export function buildSharedRequest(draft: SupportDraft, approval: ShareApproval): SharedRequest {
  return {
    id: newId('shared'),
    draftId: draft.id,
    approvalId: approval.id,
    version: approval.approvedVersion,
    kind: draft.kind,
    recipient: approval.recipient,
    sharedAt: nowIso(),
    barrierLabel: draft.barrierLabel,
    requestText: draft.requestText,
    suggestedAdjustment: draft.suggestedAdjustment,
    trialDays: draft.trialDays,
    responseWithinWorkingDays: draft.responseWithinWorkingDays,
    sourceIds: [...draft.sourceIds],
    pantryItemId: draft.pantryItemId,
    withdrawn: false,
  };
}

export function createTrial(request: SharedRequest, owner: string, simulatedDay: number): WorkTrial {
  return {
    id: newId('trial'),
    requestId: request.id,
    owner,
    state: 'pending_response',
    response: null,
    trialDays: request.trialDays,
    reviewAfterWorkingDays: request.trialDays,
    deliveryStatus: 'not_confirmed',
    simulatedDaysElapsed: 0,
    history: [
      {
        at: nowIso(),
        simulatedDay,
        label: `Request shared with ${owner}. Response requested within ${request.responseWithinWorkingDays} working day.`,
      },
    ],
  };
}

/* ---------------------------------------------------------------- *
 * State machine labels. Text, not colour alone.
 * ---------------------------------------------------------------- */

export const TRIAL_STATE_LABELS: Record<WorkTrial['state'], string> = {
  pending_response: 'Sent — waiting for a response',
  alternative_proposed: 'Alternative suggested — your review needed',
  cannot_implement: 'Cannot implement yet — next step proposed',
  agreed: 'Manager agreed — not yet confirmed as delivered',
  delivered: 'Adjustment delivered — confirmed by you',
  review_due: 'Review due',
  keep: 'Reviewed — keeping this adjustment',
  modify: 'Reviewed — modifying this adjustment',
  stop: 'Reviewed — stopping this adjustment',
};

export const DELIVERY_LABELS: Record<WorkTrial['deliveryStatus'], string> = {
  not_confirmed: 'Not yet confirmed by you',
  delivered: 'You confirmed the information was available',
  partly: 'You confirmed it happened only partly',
  not_delivered: 'You confirmed it did not happen',
};
