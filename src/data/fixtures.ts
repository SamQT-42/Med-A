import type { IllustrativeCohort, PantryItem, TaskNote } from '../types';

/** Fictional adult users. No real personal or health data anywhere in this app. */
export const PEOPLE = {
  employee: { name: 'Alex', role: 'Employee' },
  manager: { name: 'Sam', role: 'Direct manager' },
} as const;

/** The fictional example text. Loaded into the box on request; never auto-submitted. */
export const ALEX_EXAMPLE =
  'Three urgent requests arrived at once. I have ADHD and I am worried that asking for help will make me look incapable. I do not know which task to start.';

export const DEFAULT_TASK_NOTES: TaskNote[] = [
  { id: 'task-a', text: 'Prepare the client report' },
  { id: 'task-b', text: 'Revise the budget' },
  { id: 'task-c', text: 'Update the internal slides' },
];

/** Manager-side task labels. Deliberately the same three fictional tasks. */
export const MANAGER_TASKS = [
  { id: 'task-a', label: 'A — Client report' },
  { id: 'task-b', label: 'B — Budget revision' },
  { id: 'task-c', label: 'C — Internal slides' },
];

export function taskLabel(id: string): string {
  return MANAGER_TASKS.find((t) => t.id === id)?.label ?? id;
}

export const PANTRY: PantryItem[] = [
  {
    id: 'pantry-desk',
    name: 'Quieter desk',
    preferenceDescription: 'For people who prefer to work away from walkways and meeting areas.',
    fictionalStock: '2 available (fictional demo data)',
    fictionalLocation: 'Floor 3, north side (fictional demo data)',
  },
  {
    id: 'pantry-headphones',
    name: 'Noise-reducing headphones',
    preferenceDescription: 'For people who prefer a lower level of background sound while working.',
    fictionalStock: '5 available (fictional demo data)',
    fictionalLocation: 'Facilities desk, floor 1 (fictional demo data)',
  },
  {
    id: 'pantry-tactile',
    name: 'Tactile / fidget item',
    preferenceDescription: 'For people who prefer something to hold while thinking or listening.',
    fictionalStock: '8 available (fictional demo data)',
    fictionalLocation: 'Facilities desk, floor 1 (fictional demo data)',
  },
];

/** Support pathways. No provider, slot, test, score, or booking is invented. */
export const SUPPORT_PATHWAYS = [
  {
    id: 'pathway-assessment',
    title: 'Professional assessment',
    body: 'If you want a clinical assessment, this is where a verified partner clinic would appear. Med-A does not assess, screen, or diagnose.',
    status: 'Partner details to be added',
    nextStep:
      'Intended next step: the team confirms a clinic partnership, then real contact details and referral steps replace this placeholder.',
  },
  {
    id: 'pathway-peer',
    title: 'Peer / mentor support',
    body: 'A route to a trained peer or mentor, independent of your manager.',
    status: 'Partner details to be added',
    nextStep:
      'Intended next step: the team confirms who provides this support and how a request reaches them.',
  },
] as const;

export const HUMAN_SUPPORT_CONTACTS = [
  {
    id: 'contact-manager',
    name: 'Sam — your direct manager',
    purpose: 'Task clarification and work adjustments.',
    available: true,
    note: 'Anything you send to Sam still goes through the same preview and approval.',
  },
  {
    id: 'contact-independent',
    name: 'Independent support contact',
    purpose: 'Someone outside your reporting line.',
    available: false,
    note: 'Placeholder for the demo. No real clinician or mentor is available in this prototype.',
  },
] as const;

/**
 * Separate synthetic cohort fixture. Unrelated to Alex's private data.
 * Deliberately below the display threshold so the default view shows no statistics.
 */
export const ILLUSTRATIVE_COHORT: IllustrativeCohort = {
  label: 'Illustrative cohort (synthetic fixture — not real participants)',
  periodLabel: 'Fictional period: 1 – 30 September',
  participants: 4,
  minimumForDisplay: 10,
  outcomes: [
    { label: 'Reported the adjustment happened', count: 3 },
    { label: 'Reported things felt better', count: 2 },
  ],
};

export const SAMPLE_POLICY = {
  responseWithinWorkingDays: 1,
  trialDays: 5,
} as const;
