import type { AiSupportResponse, BarrierId, RecapRow, TaskNote } from '../types';
import { ALLOWED_SOURCE_IDS } from '../data/library';
import { BARRIER_LABELS, DRAFT_TEMPLATES, buildRecap, detectBarrier } from '../state/logic';

/**
 * Two providers behind one interface.
 *
 * - scripted: deterministic, always available, clearly labelled "Scripted demo".
 * - live:     optional, narrow, server-side only. Its output is validated
 *             against the same contract before anything reaches the UI.
 *
 * Neither provider can share, approve, authorize, delete, or decide anything.
 * They return text for a human to edit; every state transition is in the reducer.
 */

export const CLARIFICATION_QUESTION = 'Has your manager specified which request comes first?';

export interface AiRequest {
  text: string;
  taskNotes: TaskNote[];
}

export class AiError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'AiError';
    this.retryable = retryable;
  }
}

/* ---------------------------------------------------------------- *
 * Scripted provider
 * ---------------------------------------------------------------- */

export function scriptedSupport(req: AiRequest): AiSupportResponse {
  const barrier = detectBarrier(req.text);
  const kind = barrier === 'noise_interruptions' ? 'focus_environment' : 'priority_order';
  return {
    taskRecap: buildRecap(req.taskNotes),
    barrier,
    barrierLabel: BARRIER_LABELS[barrier],
    clarificationQuestion: CLARIFICATION_QUESTION,
    draftRequest: DRAFT_TEMPLATES[kind].text,
    sourceIds: DRAFT_TEMPLATES[kind].sourceIds,
  };
}

/* ---------------------------------------------------------------- *
 * Validation of any structured response, live or scripted.
 * ---------------------------------------------------------------- */

const VALID_BARRIERS: BarrierId[] = [
  'competing_priorities',
  'noise_interruptions',
  'unclear_instructions',
  'something_else',
];

/** Phrases a workplace draft must never contain. Cheap, explicit guard. */
const DISALLOWED = [
  'you have adhd',
  'diagnos',
  'disorder',
  'medication',
  'prescri',
  'symptom',
  'treatment',
  'therapy',
  'patient',
];

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/**
 * Validates types, lengths, allowed source ids, and missing fields.
 * Recap rows are rebuilt from the user's OWN notes, so a model cannot
 * invent a task fact: anything it returns for the recap is discarded.
 */
export function validateAiResponse(raw: unknown, ownNotes: TaskNote[]): AiSupportResponse {
  if (!raw || typeof raw !== 'object') throw new AiError('The AI response was not an object.');
  const o = raw as Record<string, unknown>;

  const barrier = o.barrier;
  if (!isString(barrier) || !VALID_BARRIERS.includes(barrier as BarrierId)) {
    throw new AiError('The AI response did not contain a recognised work barrier.');
  }

  const draftRequest = o.draftRequest;
  if (!isString(draftRequest) || draftRequest.trim().length < 40 || draftRequest.length > 900) {
    throw new AiError('The AI draft request was missing or an unusable length.');
  }

  const lower = draftRequest.toLowerCase();
  const hit = DISALLOWED.find((w) => lower.includes(w));
  if (hit) {
    throw new AiError('The AI draft contained clinical language, so it was rejected.', false);
  }

  const question = isString(o.clarificationQuestion) && o.clarificationQuestion.trim().length > 5
    ? o.clarificationQuestion.trim()
    : CLARIFICATION_QUESTION;
  if (question.length > 200) throw new AiError('The AI clarification question was too long.');

  const rawSources = Array.isArray(o.sourceIds) ? o.sourceIds : [];
  // Allowlist: unknown ids are dropped, never rendered as a citation.
  const sourceIds = rawSources.filter((s): s is string => isString(s) && ALLOWED_SOURCE_IDS.includes(s));

  // Task facts always come from the employee's own notes, never from the model.
  const taskRecap: RecapRow[] = buildRecap(ownNotes);

  return {
    taskRecap,
    barrier: barrier as BarrierId,
    barrierLabel: BARRIER_LABELS[barrier as BarrierId],
    clarificationQuestion: question,
    draftRequest: draftRequest.trim(),
    sourceIds,
  };
}

/* ---------------------------------------------------------------- *
 * Live provider (optional). Talks only to our own narrow endpoint.
 * ---------------------------------------------------------------- */

const TIMEOUT_MS = 12000;

export async function liveSupport(req: AiRequest): Promise<AiSupportResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/support-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Pasted user text is sent as data. The server treats it as data too.
      body: JSON.stringify({ text: req.text, taskNotes: req.taskNotes.map((n) => n.text) }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new AiError(`The AI service replied with status ${res.status}.`);
    }
    const json: unknown = await res.json();
    return validateAiResponse(json, req.taskNotes);
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiError('The AI request timed out.');
    }
    throw new AiError('The AI service could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLiveAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) return false;
    const json = (await res.json()) as { configured?: boolean };
    return json.configured === true;
  } catch {
    return false;
  }
}
