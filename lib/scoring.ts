export function calcPoints(
  homeActual: number,
  awayActual: number,
  homeTip: number,
  awayTip: number
): number {
  const actualDiff = homeActual - awayActual;
  const tipDiff = homeTip - awayTip;
  const actualTotal = homeActual + awayActual;
  const tipTotal = homeTip + awayTip;
  const actualResult = Math.sign(actualDiff);
  const tipResult = Math.sign(tipDiff);

  // 10b – přesný výsledek
  if (homeTip === homeActual && awayTip === awayActual) return 10;

  // 6b – správná remíza (špatné číslo), nebo správný vítěz + správný rozdíl, nebo správný vítěz + správný celkový počet gólů
  if (actualResult === 0 && tipResult === 0) return 6;
  if (tipResult === actualResult && tipResult !== 0 && (tipDiff === actualDiff || tipTotal === actualTotal)) return 6;

  // 4b – správný vítěz
  if (tipResult === actualResult && tipResult !== 0) return 4;

  // 2b – správný celkový počet gólů, ale špatný vítěz
  if (tipTotal === actualTotal) return 2;

  return 0;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function calcScorerBonus(scorerTip: string | null, goalScorers: string[]): number {
  if (!scorerTip || !scorerTip.trim()) return 0;
  const tip = normalize(scorerTip);
  return goalScorers.some(s => normalize(s) === tip) ? 3 : 0;
}
