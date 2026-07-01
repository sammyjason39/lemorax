/** Realistic weekly absensi: aggregate attendance ~94–98% per cabang/employee. */

export function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

export function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Stable target rate 94–98% per cabang. */
export function getCabangTargetRate(cabang) {
  return 0.94 + seededRand(hashSeed(`cabang|${cabang}`))() * 0.04;
}

/**
 * With 5 work days/week, map target rate to hadir 4 or 5.
 * partialWeekProb is calibrated so expected weekly attendance equals `rate`.
 */
export function buildRealisticWeekValues(employeeId, cabang, periode, weekIndex) {
  const total = 5;
  const cabangRate = getCabangTargetRate(cabang);
  const empOffset = (seededRand(hashSeed(`emp|${employeeId}`))() - 0.5) * 0.008;
  const rate = Math.min(0.985, Math.max(0.94, cabangRate + empOffset));

  const weekRng = seededRand(hashSeed(`${employeeId}|${cabang}|${periode}|w${weekIndex}`));
  const partialWeekProb = Math.min(0.35, Math.max(0.05, (1 - rate) / 0.2));
  const hadir = weekRng() < partialWeekProb ? 4 : 5;
  const absent = total - hadir;

  let sakit = 0;
  let izin = 0;
  let alfa = 0;
  const absentRng = seededRand(hashSeed(`${employeeId}|${periode}|abs|${weekIndex}`));
  for (let i = 0; i < absent; i++) {
    const pick = randInt(absentRng, 0, 2);
    if (pick === 0) sakit++;
    else if (pick === 1) izin++;
    else alfa++;
  }

  const lateRng = seededRand(hashSeed(`${employeeId}|late|${periode}|${weekIndex}`));
  const terlambat = hadir > 0 ? randInt(lateRng, 0, Math.min(3, 1 + Math.floor(hadir * 0.1))) : 0;
  const wfhRng = seededRand(hashSeed(`${employeeId}|wfh|${periode}|${weekIndex}`));
  const wfh = hadir > 0 ? randInt(wfhRng, 0, Math.min(2, Math.floor(hadir * 0.12))) : 0;

  return { hadir, sakit, izin, alfa, terlambat, wfh, total_hari_kerja: total };
}
