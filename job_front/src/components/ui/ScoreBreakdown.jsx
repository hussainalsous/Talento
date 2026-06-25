import { useTranslation } from 'react-i18next';
import { normalizeBreakdown } from '../../utils/matchScore';

/**
 * Compact per-chunk match breakdown (skills / experience / education / additional).
 *
 * Renders mini progress bars for whichever dimensions the matcher actually
 * scored. If `score_breakdown` carried no per-chunk data (e.g. only `overall`),
 * this renders nothing — callers can show just the headline score.
 *
 * @param {object|null} breakdown  raw match.score_breakdown
 */
export function ScoreBreakdown({ breakdown }) {
  const { t } = useTranslation();
  const rows = normalizeBreakdown(breakdown);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1.5 w-44 max-w-full">
      {rows.map((row) => {
        const pct = Math.round(row.value * 100);
        return (
          <div key={row.key} className="flex items-center gap-2">
            <span
              className="text-[11px] shrink-0 w-16 truncate"
              style={{ color: 'var(--text-muted)' }}
              title={`${t(row.i18nKey)} · ${row.weight}%`}
            >
              {t(row.i18nKey)}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-hover)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'var(--primary)' }}
              />
            </div>
            <span
              className="text-[11px] tabular-nums shrink-0 w-8 text-right"
              style={{ color: 'var(--text-secondary)' }}
            >
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
