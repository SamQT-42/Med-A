/**
 * Centralised UI copy. The team can rewrite wording here without touching logic.
 */

export const copy = {
  appName: 'Med-A',
  promise: 'Understand your work difficulty. Choose support. See what changes.',
  prototypeBadge: 'Prototype · fictional data',
  scriptedBadge: 'Scripted demo',
  liveBadge: 'Live AI',
  demoViewLabel: 'Demo view',

  roles: {
    employee: 'Employee — Alex',
    manager: 'Manager — Sam',
    org: 'Organization — overview',
  },

  tabs: {
    today: 'Today',
    plan: 'My support plan',
    library: 'Library',
    support: 'Support options',
  },

  today: {
    heading: 'Today',
    primaryAction: 'What is getting in the way?',
    humanSupport: 'Talk with a person',
    humanSupportHint:
      'You can reach a person directly. You do not need to chat first or complete any test.',
    quickOptions: 'Quick options',
    typeInstead: 'Or describe it in your own words',
    loadExample: 'Load Alex example',
    loadExampleHint: 'Fills the box with a fictional example. It does not send anything.',
    recapHeading: 'Quick recap (optional)',
    recapHint:
      'A compact summary of your own task notes. Facts that are not written down stay marked "Not specified".',
  },

  consent: {
    reviewHeading: 'Review before sharing',
    who: 'WHO',
    how: 'HOW',
    when: 'WHEN',
    review: 'REVIEW',
    whatShared: 'WHAT IS SHARED',
    whatNotShared: 'WHAT IS NOT SHARED',
    policyNote: 'Sample company policy for this demo.',
    shareButton: 'Share this request with Sam',
    savePrivately: 'Save privately',
    cancel: 'Cancel',
    invalidated:
      'You changed the request after the last preview, so the earlier confirmation no longer applies. Please review the current version again.',
  },

  disclaimers: {
    notMedical:
      'This is a proposed workplace experiment, not a medical prescription or a diagnosis.',
    fiveDay:
      'The five working day trial is our product design choice, not a clinically validated duration.',
    withdrawal:
      'Withdrawing removes in-app access for the recipient. It cannot undo what someone has already read or copied.',
    simulatedTime:
      'This advances the demo timeline only. No real time has passed.',
    noEfficacy:
      'One fictional response does not demonstrate efficacy, reduced burnout, or productivity return on investment.',
  },
} as const;
