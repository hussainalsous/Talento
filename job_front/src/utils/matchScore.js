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
