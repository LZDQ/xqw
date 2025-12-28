// Letter grade utilities mirrored from the base-game implementation.
// Keep thresholds aligned so the 3D overlay matches HUD semantics.
export function getLetterGrade(val: number): string {
  if (val < 8) return "E";
  if (val < 16) return "E+";
  if (val < 30) return "D";
  if (val < 40) return "D+";
  if (val < 50) return "C";
  if (val < 60) return "C+";
  if (val < 68) return "B";
  if (val < 76) return "B+";
  if (val < 82) return "A";
  if (val < 88) return "A+";
  if (val < 92) return "S";
  if (val < 96) return "S+";
  if (val < 99) return "SS";
  if (val < 100) return "SS+";
  const n = Math.floor(val);
  if (n === 100) return "SSS";
  if (n > 100) {
    const subs = ["e", "e+", "d", "d+", "c", "c+", "b", "b+", "a", "a+", "s", "s+", "ss", "ss+", "sss"];
    if (val > 100 && val < 110) {
      const offset = n - 101;
      const tier = Math.floor(offset / subs.length) + 1;
      const idx = offset % subs.length;
      return `U${tier}${subs[idx]}`;
    }
    if (val >= 110) {
      const tier = Math.floor((val - 110) / 100) + 1;
      const rangeStart = 110 + (tier - 1) * 100;
      const rel = (val - rangeStart) / 100.0;
      let idx = Math.floor(rel * subs.length);
      if (idx < 0) idx = 0;
      if (idx >= subs.length) idx = subs.length - 1;
      return `U${tier}${subs[idx]}`;
    }
    const offset = n - 101;
    const tier = Math.floor(offset / subs.length) + 1;
    const idx = offset % subs.length;
    return `U${tier}${subs[idx]}`;
  }
  return "SSS";
}

export function getLetterGradeAbility(val: number): string {
  return getLetterGrade(val / 2);
}
