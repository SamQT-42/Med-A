import type { LibraryRecord } from '../types';

/**
 * Prototype summaries written from named public guidance.
 * No medical reviewer, credential, partner logo, review date, certificate,
 * or quotation is claimed or invented.
 */
export const LIBRARY: LibraryRecord[] = [
  {
    id: 'lib-clear-instructions',
    title: 'Clear work instructions',
    shortSummary:
      'Written priorities and a named first step reduce the guesswork when several requests arrive together. Workplace adjustments are agreed case by case between an employee and their manager; what helps one person may not help another.',
    sourceTitle: 'Acas — Adjustments for neurodiversity',
    sourceUrl: 'https://www.acas.org.uk/reasonable-adjustments/adjustments-for-neurodiversity',
    scopeNote:
      'Workplace-adjustment examples only, and they vary by person. This is UK reference guidance and is not a statement of Vietnamese employment law.',
    reviewStatus: 'Public guidance summary; partner review pending',
    barriers: ['competing_priorities', 'unclear_instructions'],
  },
  {
    id: 'lib-reducing-distractions',
    title: 'Reducing distractions',
    shortSummary:
      'Agreed focus periods and a quieter place to work are common environmental adjustments. They are preferences to try and review, not treatments, and they do not require anyone to disclose a diagnosis.',
    sourceTitle: 'Acas — Adjustments for neurodiversity',
    sourceUrl: 'https://www.acas.org.uk/reasonable-adjustments/adjustments-for-neurodiversity',
    scopeNote:
      'Workplace-adjustment examples only, and they vary by person. This is UK reference guidance and is not a statement of Vietnamese employment law.',
    reviewStatus: 'Public guidance summary; partner review pending',
    barriers: ['noise_interruptions'],
  },
  {
    id: 'lib-professional-assessment',
    title: 'Understanding professional ADHD assessment',
    shortSummary:
      'A professional assessment is carried out by a qualified clinician and draws on history and functional impact across settings. A questionnaire or screening score on its own cannot establish a diagnosis, and this app does not perform any assessment.',
    sourceTitle: 'NICE NG87 recommendations; NIMH — ADHD: What You Need to Know',
    sourceUrl: 'https://www.nice.org.uk/guidance/ng87/chapter/recommendations',
    scopeNote:
      'Background information about how assessment works. It is not a screening tool, not a diagnosis, and not a referral.',
    reviewStatus: 'Public guidance summary; partner review pending',
    barriers: ['something_else'],
  },
];

export const LIBRARY_EXTRA_SOURCES = [
  {
    title: 'NIMH — ADHD: What You Need to Know',
    url: 'https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know',
  },
];

export const ALLOWED_SOURCE_IDS = LIBRARY.map((r) => r.id);

export function libraryById(id: string): LibraryRecord | undefined {
  return LIBRARY.find((r) => r.id === id);
}
