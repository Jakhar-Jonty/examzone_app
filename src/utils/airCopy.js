import { t as tr, isHindi } from '../i18n';

export function ordinalSuffix(n) {
  const v = Math.round(Math.abs(n));
  if (v % 100 >= 11 && v % 100 <= 13) return `${v}th`;
  const mod = v % 10;
  if (mod === 1) return `${v}st`;
  if (mod === 2) return `${v}nd`;
  if (mod === 3) return `${v}rd`;
  return `${v}th`;
}

export function buildAirCopyFromPeerStats(peerStats) {
  const air = peerStats?.air;
  const marks = peerStats?.marks;
  const rank = air?.rank ?? marks?.yourRank;
  const total = air?.total ?? marks?.totalRanked;
  if (!rank || !total) return air || null;
  const percentile = air?.percentile ?? marks?.betterThanPercent ?? 0;
  // built here (not taken from the server) so it follows the UI language
  const pct = isHindi() ? `${Math.round(percentile)}` : ordinalSuffix(percentile);
  const headline = tr('All India Rank #{0} of {1}', rank, total);
  const subline = tr('{0} percentile', pct);
  return { ...(air || {}), rank, total, percentile, headline, subline, full: `${headline} · ${subline}` };
}
