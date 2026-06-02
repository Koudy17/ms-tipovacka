export function calcPoints(
  homeActual: number,
  awayActual: number,
  homeTip: number,
  awayTip: number
): number {
  // Přesný výsledek
  if (homeTip === homeActual && awayTip === awayActual) return 5;

  const actualDiff = homeActual - awayActual;
  const tipDiff = homeTip - awayTip;

  // Správný rozdíl gólů
  if (tipDiff === actualDiff) return 3;

  // Správný vítěz / remíza
  const actualResult = Math.sign(actualDiff);
  const tipResult = Math.sign(tipDiff);
  if (tipResult === actualResult) return 1;

  return 0;
}
