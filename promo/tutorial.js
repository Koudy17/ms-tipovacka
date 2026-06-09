const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// Instagram Stories formát: 9:16
pres.defineLayout({ name: 'STORY', width: 5.625, height: 10 });
pres.layout = 'STORY';

const C = {
  bg: '0F172A',
  card: '1E293B',
  cardBorder: '334155',
  green: '22C55E',
  greenDark: '14532D',
  yellow: 'EAB308',
  blue: '3B82F6',
  orange: 'F97316',
  white: 'FFFFFF',
  muted: '94A3B8',
  red: 'EF4444',
};

function stepCard(s, y, emoji, title, desc) {
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y, w: 5.1, h: 1.7,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y, w: 0.07, h: 1.7,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText(emoji, {
    x: 0.4, y: y + 0.15, w: 0.85, h: 0.7,
    fontSize: 28, align: 'center',
  });
  s.addText(title, {
    x: 1.35, y: y + 0.15, w: 3.8, h: 0.5,
    fontSize: 15, bold: true, color: C.white, margin: 0,
  });
  s.addText(desc, {
    x: 1.35, y: y + 0.65, w: 3.8, h: 0.85,
    fontSize: 12, color: C.muted, margin: 0,
  });
}

function slideHeader(s, text, sub) {
  s.addText(text, {
    x: 0.3, y: 0.45, w: 5.0, h: 0.7,
    fontSize: 26, bold: true, color: C.green,
    align: 'center', fontFace: 'Arial Black',
  });
  if (sub) {
    s.addText(sub, {
      x: 0.3, y: 1.1, w: 5.0, h: 0.45,
      fontSize: 13, color: C.muted, align: 'center',
    });
  }
}

function badge(s, x, y, label, color) {
  s.addShape(pres.shapes.OVAL, {
    x, y, w: 0.85, h: 0.85,
    fill: { color }, line: { color },
  });
  s.addText(label, {
    x, y, w: 0.85, h: 0.85,
    fontSize: label.length > 3 ? 13 : 17, bold: true, color: C.bg,
    align: 'center', valign: 'middle',
  });
}

function scoreRow(s, x, y, label, sub, color) {
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y, w: 5.1, h: 1.3,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  badge(s, 0.4, y + 0.22, label, color);
  s.addText(sub[0], {
    x: 1.45, y: y + 0.12, w: 3.7, h: 0.5,
    fontSize: 14, bold: true, color: C.white, margin: 0,
  });
  s.addText(sub[1], {
    x: 1.45, y: y + 0.62, w: 3.7, h: 0.5,
    fontSize: 12, color: C.muted, margin: 0,
  });
}

// ─────────────────────────────────────────────
// SLIDE 1 — Přihlášení
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // Hero pruh nahoře
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.625, h: 3.2, fill: { color: C.greenDark }, line: { color: C.greenDark } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 3.1, w: 5.625, h: 0.12, fill: { color: C.green }, line: { color: C.green } });

  s.addText('🔑', { x: 0, y: 0.4, w: 5.625, h: 1.7, fontSize: 85, align: 'center' });

  s.addText('PŘIHLÁŠENÍ', {
    x: 0.3, y: 2.05, w: 5.0, h: 0.8,
    fontSize: 36, bold: true, color: C.white,
    align: 'center', fontFace: 'Arial Black',
  });

  s.addText('Jak se dostat dovnitř', {
    x: 0.3, y: 3.4, w: 5.0, h: 0.45,
    fontSize: 14, color: C.muted, align: 'center',
  });

  stepCard(s, 4.0, '1️⃣', 'Zadej přezdívku + heslo', 'Heslo ti dá organizátor před startem. Bez účtu se nedostaneš.');
  stepCard(s, 5.85, '2️⃣', 'Nastav si vlastní heslo', 'Při prvním přihlášení tě aplikace vyzve ke změně dočasného hesla.');
  stepCard(s, 7.7, '3️⃣', 'A jsi uvnitř!', 'Příště se přihlásíš svou přezdívkou a svým heslem.');
}

// ─────────────────────────────────────────────
// SLIDE 2 — Tipování skóre
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  slideHeader(s, 'JAK TIPOVAT?', 'Záložka 📅 Dnes — dnešní zápasy');

  // Mockup karty zápasu
  const cardY = 1.7;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.3, y: cardY, w: 5.0, h: 2.5,
    fill: { color: C.card }, line: { color: C.green }, rectRadius: 0.1,
  });

  // Čas
  s.addText('Čt 11.6. • 21:00', {
    x: 0.5, y: cardY + 0.15, w: 4.6, h: 0.35,
    fontSize: 11, color: C.muted, align: 'center',
  });

  // Týmy a inputy
  s.addText('Mexiko', {
    x: 0.4, y: cardY + 0.55, w: 1.4, h: 0.5,
    fontSize: 14, bold: true, color: C.white, align: 'right',
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.95, y: cardY + 0.55, w: 0.5, h: 0.5,
    fill: { color: '0F172A' }, line: { color: '22C55E' }, rectRadius: 0.06,
  });
  s.addText('2', {
    x: 1.95, y: cardY + 0.55, w: 0.5, h: 0.5,
    fontSize: 18, bold: true, color: C.green, align: 'center', valign: 'middle',
  });
  s.addText(':', {
    x: 2.5, y: cardY + 0.55, w: 0.3, h: 0.5,
    fontSize: 18, bold: true, color: C.muted, align: 'center', valign: 'middle',
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 2.85, y: cardY + 0.55, w: 0.5, h: 0.5,
    fill: { color: '0F172A' }, line: { color: '22C55E' }, rectRadius: 0.06,
  });
  s.addText('1', {
    x: 2.85, y: cardY + 0.55, w: 0.5, h: 0.5,
    fontSize: 18, bold: true, color: C.green, align: 'center', valign: 'middle',
  });
  s.addText('JAR', {
    x: 3.45, y: cardY + 0.55, w: 1.4, h: 0.5,
    fontSize: 14, bold: true, color: C.white,
  });

  // Střelec dropdown naznačení
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: cardY + 1.2, w: 4.1, h: 0.45,
    fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.06,
  });
  s.addText('⚽ Tip na střelce (+3b) — vyber ze soupisky', {
    x: 0.6, y: cardY + 1.2, w: 3.8, h: 0.45,
    fontSize: 10, color: C.muted, valign: 'middle',
  });
  s.addText('▼', {
    x: 4.2, y: cardY + 1.2, w: 0.35, h: 0.45,
    fontSize: 10, color: C.muted, align: 'center', valign: 'middle',
  });

  // Šipky s popisky
  s.addText('← Vyplň skóre pro každý tým', {
    x: 0.3, y: cardY + 2.6, w: 5.0, h: 0.4,
    fontSize: 12, color: C.green, align: 'center',
  });

  // Instrukce dole
  const steps2 = [
    { icon: '👆', text: 'Klikni na číslo a zadej tipované skóre' },
    { icon: '🔢', text: 'Každý tým zvlášť — levý domácí, pravý hosté' },
    { icon: '📋', text: 'Záložka Skupinová fáze má filtry podle skupin' },
  ];
  steps2.forEach((item, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.25, y: 4.55 + i * 1.65, w: 5.1, h: 1.45,
      fill: { color: C.card }, line: { color: C.cardBorder },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.25, y: 4.55 + i * 1.65, w: 0.07, h: 1.45,
      fill: { color: C.green }, line: { color: C.green },
    });
    s.addText(item.icon, {
      x: 0.4, y: 4.6 + i * 1.65, w: 0.8, h: 0.8,
      fontSize: 26, align: 'center',
    });
    s.addText(item.text, {
      x: 1.3, y: 4.65 + i * 1.65, w: 3.9, h: 1.0,
      fontSize: 13, color: C.white, margin: 0, valign: 'middle',
    });
  });
}

// ─────────────────────────────────────────────
// SLIDE 3 — Střelec & Uložení
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  slideHeader(s, 'STŘELEC & ULOŽENÍ', null);

  // Střelec sekce
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.3, w: 5.1, h: 3.4,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.3, w: 0.07, h: 3.4,
    fill: { color: C.orange }, line: { color: C.orange },
  });

  badge(s, 0.45, 1.45, '+3b', C.orange);

  s.addText('Tip na střelce', {
    x: 1.45, y: 1.45, w: 3.8, h: 0.5,
    fontSize: 16, bold: true, color: C.white, margin: 0,
  });
  s.addText('Vyber hráče z dropdownu. Pokud skóruje,\ndostaneš bonus +3 body navíc.', {
    x: 1.45, y: 1.95, w: 3.8, h: 0.7,
    fontSize: 12, color: C.muted, margin: 0,
  });

  // Dropdown mockup
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.45, y: 2.75, w: 4.7, h: 0.5,
    fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.06,
  });
  s.addText('⚽ Lozano (Ú)  —  Mexiko', {
    x: 0.6, y: 2.75, w: 4.0, h: 0.5,
    fontSize: 11, color: C.yellow, valign: 'middle',
  });
  s.addText('▼', {
    x: 4.7, y: 2.75, w: 0.35, h: 0.5,
    fontSize: 10, color: C.muted, align: 'center', valign: 'middle',
  });

  s.addText('Hráči jsou rozdělení podle pozice\na řazení domácí / hosté.', {
    x: 0.45, y: 3.35, w: 4.7, h: 0.65,
    fontSize: 12, color: C.muted,
  });

  // Tlačítko Uložit mockup
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 5.0, w: 5.1, h: 2.8,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 5.0, w: 0.07, h: 2.8,
    fill: { color: C.green }, line: { color: C.green },
  });

  s.addText('💾', { x: 0.4, y: 5.15, w: 0.8, h: 0.7, fontSize: 28, align: 'center' });
  s.addText('Uložit vše', {
    x: 1.35, y: 5.15, w: 3.8, h: 0.5,
    fontSize: 16, bold: true, color: C.white, margin: 0,
  });
  s.addText('Zelené tlačítko dole uloží najednou\nvšechny tipy na stránce.', {
    x: 1.35, y: 5.65, w: 3.8, h: 0.7,
    fontSize: 12, color: C.muted, margin: 0,
  });

  // Mockup uložit tlačítko
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: 6.5, w: 3.8, h: 0.55,
    fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.08,
  });
  s.addText('💾  Uložit vše', {
    x: 0.9, y: 6.5, w: 3.8, h: 0.55,
    fontSize: 14, bold: true, color: C.bg, align: 'center', valign: 'middle',
  });

  // Zamčení
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.3, y: 7.2, w: 5.0, h: 1.0,
    fill: { color: '1C1917' }, line: { color: 'EF4444' }, rectRadius: 0.08,
  });
  s.addText('🔒  Po výkopu zápas zamkne — tipy nelze měnit!', {
    x: 0.5, y: 7.2, w: 4.6, h: 1.0,
    fontSize: 13, bold: true, color: C.red, align: 'center', valign: 'middle',
  });

  s.addText('Tipuj včas. Dnes v 📅 vidíš jen dnešní zápasy.', {
    x: 0.3, y: 8.4, w: 5.0, h: 0.6,
    fontSize: 12, color: C.muted, align: 'center',
  });

  // Tip čas countdown naznačení
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: 9.1, w: 3.8, h: 0.6,
    fill: { color: C.greenDark }, line: { color: C.green }, rectRadius: 0.08,
  });
  s.addText('MS startuje 11. června 2026 🏆', {
    x: 0.9, y: 9.1, w: 3.8, h: 0.6,
    fontSize: 12, color: C.green, align: 'center', valign: 'middle', bold: true,
  });
}

// ─────────────────────────────────────────────
// SLIDE 4 — Bodování
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addText('BODOVÁNÍ', {
    x: 0.3, y: 0.35, w: 5.0, h: 0.7,
    fontSize: 30, bold: true, color: C.white, align: 'center', fontFace: 'Arial Black',
  });
  s.addText('Za každý zápas až 13 bodů', {
    x: 0.3, y: 1.0, w: 5.0, h: 0.45,
    fontSize: 13, color: C.muted, align: 'center',
  });

  const scoring = [
    { pts: '10b', label: 'Přesný výsledek', sub: 'Tip 2:1 → výsledek 2:1 ✨', color: C.yellow },
    { pts: '6b', label: 'Správný rozdíl', sub: 'Tip 3:1 → výsledek 2:0 (rozdíl +2)', color: C.blue },
    { pts: '4b', label: 'Správný vítěz', sub: 'Tipoval jsi výhru nebo remízu správně', color: C.green },
    { pts: '2b', label: 'Počet gólů', sub: 'Celkový počet gólů sedí', color: C.muted },
    { pts: '+3b', label: 'Střelec gól!', sub: 'Tvůj tipovaný hráč skóroval', color: C.orange },
  ];

  scoring.forEach((item, i) => {
    scoreRow(s, 0, 1.6 + i * 1.66, item.pts, [item.label, item.sub], item.color);
  });
}

// ─────────────────────────────────────────────
// SLIDE 5 — Tabulka & Odehrané
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  slideHeader(s, 'TABULKA & VÝSLEDKY', null);

  // Tabulka sekce
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.3, w: 5.1, h: 3.7,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.3, w: 0.07, h: 3.7,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });

  s.addText('🏆', { x: 0.4, y: 1.45, w: 0.8, h: 0.7, fontSize: 28, align: 'center' });
  s.addText('Živá tabulka', {
    x: 1.35, y: 1.45, w: 3.8, h: 0.5,
    fontSize: 16, bold: true, color: C.white, margin: 0,
  });
  s.addText('Záložka Tabulka — body se připíší automaticky\npo zadání výsledku.', {
    x: 1.35, y: 1.95, w: 3.8, h: 0.7,
    fontSize: 12, color: C.muted, margin: 0,
  });

  // Mini tabulka mockup
  const rows = [
    { pos: '🥇', name: 'Koudy', pts: '47' },
    { pos: '🥈', name: 'Marek', pts: '41' },
    { pos: '🥉', name: 'Tomáš', pts: '38' },
  ];
  rows.forEach((r, i) => {
    const ry = 2.8 + i * 0.52;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.45, y: ry, w: 4.7, h: 0.48,
      fill: { color: i === 0 ? '1C2A1C' : '0F172A' }, line: { color: i === 0 ? '22C55E' : '1E293B' },
    });
    s.addText(r.pos, { x: 0.55, y: ry, w: 0.55, h: 0.48, fontSize: 14, align: 'center', valign: 'middle' });
    s.addText(r.name, { x: 1.15, y: ry, w: 2.5, h: 0.48, fontSize: 13, bold: i === 0, color: i === 0 ? C.green : C.white, valign: 'middle' });
    s.addText(r.pts + ' b', { x: 3.8, y: ry, w: 1.2, h: 0.48, fontSize: 13, bold: true, color: C.green, align: 'right', valign: 'middle' });
  });

  s.addText('👆 Klikni na jméno → vidíš všechny jeho tipy a statistiky', {
    x: 0.45, y: 4.48, w: 4.7, h: 0.45,
    fontSize: 11, color: C.muted, align: 'center',
  });

  // Odehrané sekce
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 5.15, w: 5.1, h: 2.8,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 5.15, w: 0.07, h: 2.8,
    fill: { color: C.green }, line: { color: C.green },
  });

  s.addText('✅', { x: 0.4, y: 5.3, w: 0.8, h: 0.7, fontSize: 28, align: 'center' });
  s.addText('Záložka Odehrané', {
    x: 1.35, y: 5.3, w: 3.8, h: 0.5,
    fontSize: 16, bold: true, color: C.white, margin: 0,
  });
  s.addText('Výsledky všech odehraných zápasů. Vidíš\nsvůj tip, výsledek a kolik bodů jsi dostal.', {
    x: 1.35, y: 5.82, w: 3.8, h: 0.7,
    fontSize: 12, color: C.muted, margin: 0,
  });

  // Mini odehraný zápas mockup
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.45, y: 6.6, w: 4.7, h: 0.75,
    fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.06,
  });
  s.addText('Mexiko', { x: 0.55, y: 6.62, w: 1.3, h: 0.35, fontSize: 11, bold: true, color: C.white, align: 'right' });
  s.addText('2 : 1', { x: 1.95, y: 6.6, w: 1.0, h: 0.35, fontSize: 13, bold: true, color: C.white, align: 'center' });
  s.addText('JAR', { x: 3.05, y: 6.62, w: 1.0, h: 0.35, fontSize: 11, bold: true, color: C.white });
  s.addText('tip: 2:1  ⚽ Lozano', { x: 0.55, y: 6.97, w: 3.0, h: 0.3, fontSize: 10, color: C.muted });
  s.addShape(pres.shapes.OVAL, {
    x: 4.05, y: 6.65, w: 0.8, h: 0.55,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });
  s.addText('13b', { x: 4.05, y: 6.65, w: 0.8, h: 0.55, fontSize: 11, bold: true, color: C.bg, align: 'center', valign: 'middle' });

  // Footer CTA
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 8.2, w: 5.625, h: 1.8, fill: { color: C.greenDark }, line: { color: C.greenDark } });
  s.addText('koudyho-tipovacka.vercel.app', {
    x: 0.3, y: 8.4, w: 5.0, h: 0.55,
    fontSize: 14, bold: true, color: C.green, align: 'center',
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: 9.1, w: 3.8, h: 0.65,
    fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.1,
  });
  s.addText('TIPOVAT TEĎ →', {
    x: 0.9, y: 9.1, w: 3.8, h: 0.65,
    fontSize: 16, bold: true, color: C.greenDark,
    align: 'center', valign: 'middle', fontFace: 'Arial Black',
  });
}

pres.writeFile({ fileName: 'C:/Users/Admin/ms-tipovacka/promo/tutorial.pptx' });
console.log('✅ tutorial.pptx vytvořeno!');
