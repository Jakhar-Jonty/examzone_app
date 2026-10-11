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
  if (peerStats?.air) return peerStats.air;
  const marks = peerStats?.marks;
  if (!marks?.yourRank || !marks?.totalRanked) return null;
  const percentile = marks.betterThanPercent ?? 0;
  return {
    rank: marks.yourRank,
    total: marks.totalRanked,
    percentile,
    headline: `All India Rank #${marks.yourRank} of ${marks.totalRanked}`,
    subline: `${ordinalSuffix(percentile)} percentile`,
    full: `All India Rank #${marks.yourRank} of ${marks.totalRanked} · ${ordinalSuffix(percentile)} percentile`,
  };
}
