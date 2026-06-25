/**
 * Shared helpers for AI match scores.
 * `match_score` arrives as a STRING (e.g. "0.8180") — always parse it.
 */

/** Parse a raw match_score (string|number) to a 0..1 float. */
export function parseScore(raw) {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Format a raw match_score as an integer percentage string, e.g. "82%". */
export function formatScorePercent(raw) {
  return `${Math.round(parseScore(raw) * 100)}%`;
}

/**
 * Resolve the score tier.
 *   >= 0.80 → "top"        (green / success)
 *   >= 0.60 → "suggested"  (blue / info)
 *   <  0.60 → "low"
 * Returns { tier, badgeStatus }.
 */
export function scoreTier(raw) {
  const n = parseScore(raw);
  if (n >= 0.8) return { tier: 'top',       badgeStatus: 'success' };
  if (n >= 0.6) return { tier: 'suggested', badgeStatus: 'info' };
  return { tier: 'low', badgeStatus: 'inactive' };
}

/** Badge variant for a match status value. */
export const MATCH_STATUS_BADGE = {
  new:              'info',
  viewed:           'inactive',
  shortlisted:      'success',
  auto_shortlisted: 'success',
  rejected:         'danger',
};

/**
 * The four CV chunk dimensions the matcher scores, in display order, with the
 * weight each contributes to the overall score. `i18nKey` resolves the label.
 */
export const CHUNK_META = [
  { key: 'skills',     weight: 40, i18nKey: 'matchBreakdown.skills' },
  { key: 'experience', weight: 35, i18nKey: 'matchBreakdown.experience' },
  { key: 'education',  weight: 15, i18nKey: 'matchBreakdown.education' },
  { key: 'additional', weight: 10, i18nKey: 'matchBreakdown.additional' },
];

/**
 * Normalize a raw `score_breakdown` (whatever n8n wrote) into an ordered list of
 * the chunk dimensions that are actually present with a numeric value.
 *
 * The backend stores this JSON verbatim with no shape guarantee — it may be
 * `{ overall: 0.81 }` (no per-chunk data), the full four-chunk set, or anything
 * in between. We ignore `overall` (already shown as the headline score) and only
 * surface known chunk keys, so the UI degrades gracefully to an empty array.
 *
 * @returns {Array<{ key, weight, i18nKey, value }>}  value is a 0..1 float
 */
export function normalizeBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return [];
  return CHUNK_META
    .filter((c) => breakdown[c.key] != null && Number.isFinite(parseFloat(breakdown[c.key])))
    .map((c) => ({ ...c, value: parseScore(breakdown[c.key]) }));
}
