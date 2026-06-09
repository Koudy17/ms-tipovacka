const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// IG Post / Carousel formát: 4:5 = 5.625" x 7.03"
pres.defineLayout({ name: 'POST', width: 5.625, height: 7.03 });
pres.layout = 'POST';

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

function card(s, y, h, icon, title, desc) {
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y, w: 5.1, h,
    fill: { color: C.card }, line: { color: C.cardBorder },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y, w: 0.07, h,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText(icon, {
    x: 0.38, y: y + 0.08, w: 0.85, h: 0.6,
    fontSize: 24, align: 'center',
  });
  s.addText(title, {
    x: 1.3, y: y + 0.1, w: 3.9, h: 0.38,
    fontSize: 14, bold: true, color: C.white, margin: 0,
  });
  s.addText(desc, {
    x: 1.3, y: y + 0.48, w: 3.9, h: h - 0.55,
    fontSize: 11, color: C.muted, margin: 0,
  });
}

function header(s, title, sub, titleColor) {
  s.addText(title, {
    x: 0.3, y: 0.3, w: 5.0, h: 0.6,
    fontSize: 24, bold: true, color: titleColor ?? C.green,
    align: 'center', fontFace: 'Arial Black',
  });
  if (sub) s.addText(sub, {
    x: 0.3, y: 0.88, w: 5.0, h: 0.38,
    fontSize: 12, color: C.muted, align: 'center',
  });
}

function ctaBar(s) {
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 6.25, w: 5.625, h: 0.78,
    fill: { color: C.greenDark }, line: { color: C.greenDark },
  });
  s.addText('koudyho-tipovacka.vercel.app', {
    x: 0.3, y: 6.27, w: 5.0, h: 0.35,
    fontSize: 12, bold: true, color: C.green, align: 'center',
  });
  s.addText('TIPOVAT TEĎ →', {
    x: 0.3, y: 6.6, w: 5.0, h: 0.35,
    fontSize: 11, bold: true, color: C.white, align: 'center',
  });
}

// ─────────────────────────────────────────────
// SLIDE 1 — Přihlášení
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.625, h: 2.1, fill: { color: C.greenDark }, line: { color: C.greenDark } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 2.0, w: 5.625, h: 0.1, fill: { color: C.green }, line: { color: C.green } });

  s.addText('🔑', { x: 0, y: 0.15, w: 5.625, h: 1.2, fontSize: 60, align: 'center' });
  s.addText('PŘIHLÁŠENÍ', {
    x: 0.3, y: 1.35, w: 5.0, h: 0.6,
    fontSize: 30, bold: true, color: C.white, align: 'center', fontFace: 'Arial Black',
  });

  card(s, 2.25, 1.22, '1️⃣', 'Zadej přezdívku + heslo', 'Heslo ti dá organizátor. Bez účtu se nedostaneš dovnitř.');
  card(s, 3.57, 1.22, '2️⃣', 'Nastav si vlastní heslo', 'Při prvním přihlášení tě aplikace vyzve ke změně.');
  card(s, 4.89, 1.22, '3️⃣', 'A jsi uvnitř!', 'Příště: přezdívka + tvoje heslo.');

  ctaBar(s);
}

// ─────────────────────────────────────────────
// SLIDE 2 — Jak tipovat
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  header(s, 'JAK TIPOVAT?', '📅 Dnes — dnešní zápasy');

  // Karta zápasu mockup
  const cy = 1.4;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.3, y: cy, w: 5.0, h: 2.1,
    fill: { color: C.card }, line: { color: C.green }, rectRadius: 0.1,
  });
  s.addText('Čt 11.6.  •  21:00', {
    x: 0.5, y: cy + 0.12, w: 4.6, h: 0.3,
    fontSize: 10, color: C.muted, align: 'center',
  });
  // Týmy + inputy
  s.addText('Mexiko', { x: 0.35, y: cy + 0.48, w: 1.35, h: 0.45, fontSize: 13, bold: true, color: C.white, align: 'right' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.82, y: cy + 0.48, w: 0.46, h: 0.45, fill: { color: '0F172A' }, line: { color: C.green }, rectRadius: 0.05 });
  s.addText('2', { x: 1.82, y: cy + 0.48, w: 0.46, h: 0.45, fontSize: 16, bold: true, color: C.green, align: 'center', valign: 'middle' });
  s.addText(':', { x: 2.32, y: cy + 0.48, w: 0.28, h: 0.45, fontSize: 16, bold: true, color: C.muted, align: 'center', valign: 'middle' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.64, y: cy + 0.48, w: 0.46, h: 0.45, fill: { color: '0F172A' }, line: { color: C.green }, rectRadius: 0.05 });
  s.addText('1', { x: 2.64, y: cy + 0.48, w: 0.46, h: 0.45, fontSize: 16, bold: true, color: C.green, align: 'center', valign: 'middle' });
  s.addText('JAR', { x: 3.18, y: cy + 0.48, w: 1.9, h: 0.45, fontSize: 13, bold: true, color: C.white });
  // Střelec dropdown
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: cy + 1.03, w: 4.15, h: 0.38, fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.05 });
  s.addText('⚽ Tip na střelce (+3b) — vyber ze soupisky ▼', {
    x: 0.55, y: cy + 1.03, w: 4.0, h: 0.38,
    fontSize: 10, color: C.muted, valign: 'middle',
  });
  s.addText('← skóre pro každý tým zvlášť', {
    x: 0.3, y: cy + 1.52, w: 5.0, h: 0.35,
    fontSize: 11, color: C.green, align: 'center',
  });

  card(s, 3.65, 1.05, '👆', 'Klikni na číslo, zadej skóre', 'Každý tým zvlášť. Levý = domácí, pravý = hosté.');
  card(s, 4.8, 1.05, '📋', 'Skupinová fáze má filtry', 'Přepínej skupiny A–L nebo zobraz všechny.');

  ctaBar(s);
}

// ─────────────────────────────────────────────
// SLIDE 3 — Střelec & Uložení
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  header(s, 'STŘELEC & ULOŽENÍ', null);

  // Střelec
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 1.35, w: 5.1, h: 2.05, fill: { color: C.card }, line: { color: C.cardBorder } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 1.35, w: 0.07, h: 2.05, fill: { color: C.orange }, line: { color: C.orange } });
  s.addShape(pres.shapes.OVAL, { x: 0.42, y: 1.5, w: 0.75, h: 0.75, fill: { color: C.orange }, line: { color: C.orange } });
  s.addText('+3b', { x: 0.42, y: 1.5, w: 0.75, h: 0.75, fontSize: 13, bold: true, color: C.bg, align: 'center', valign: 'middle' });
  s.addText('Tip na střelce', { x: 1.3, y: 1.48, w: 3.9, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText('Vyber hráče z dropdownu. Pokud skóruje = +3b bonus.', { x: 1.3, y: 1.9, w: 3.9, h: 0.5, fontSize: 11, color: C.muted, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: 2.52, w: 4.7, h: 0.42, fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.05 });
  s.addText('⚽ Lozano (Ú)  —  Mexiko  ▼', { x: 0.6, y: 2.52, w: 4.4, h: 0.42, fontSize: 11, color: C.yellow, valign: 'middle' });

  // Uložit
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 3.55, w: 5.1, h: 1.5, fill: { color: C.card }, line: { color: C.cardBorder } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 3.55, w: 0.07, h: 1.5, fill: { color: C.green }, line: { color: C.green } });
  s.addText('💾', { x: 0.38, y: 3.65, w: 0.8, h: 0.6, fontSize: 26, align: 'center' });
  s.addText('Zelené tlačítko dole = Uložit vše', { x: 1.3, y: 3.65, w: 3.9, h: 0.4, fontSize: 13, bold: true, color: C.white, margin: 0 });
  s.addText('Uloží najednou všechny tipy na stránce.', { x: 1.3, y: 4.05, w: 3.9, h: 0.4, fontSize: 11, color: C.muted, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.1, y: 4.55, w: 3.4, h: 0.42, fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.07 });
  s.addText('💾  Uložit vše', { x: 1.1, y: 4.55, w: 3.4, h: 0.42, fontSize: 13, bold: true, color: C.bg, align: 'center', valign: 'middle' });

  // Varování zamčení
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.3, y: 5.2, w: 5.0, h: 0.85,
    fill: { color: '1C0A0A' }, line: { color: C.red }, rectRadius: 0.08,
  });
  s.addText('🔒  Po výkopu nelze tipy měnit!', {
    x: 0.5, y: 5.2, w: 4.6, h: 0.85,
    fontSize: 14, bold: true, color: C.red, align: 'center', valign: 'middle',
  });

  ctaBar(s);
}

// ─────────────────────────────────────────────
// SLIDE 4 — Bodování
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addText('BODOVÁNÍ', {
    x: 0.3, y: 0.25, w: 5.0, h: 0.6,
    fontSize: 28, bold: true, color: C.white, align: 'center', fontFace: 'Arial Black',
  });
  s.addText('Za každý zápas až 13 bodů', {
    x: 0.3, y: 0.83, w: 5.0, h: 0.38,
    fontSize: 12, color: C.muted, align: 'center',
  });

  const scoring = [
    { pts: '10b', label: 'Přesný výsledek', sub: 'Tip 2:1 → výsledek 2:1 ✨', color: C.yellow },
    { pts: '6b',  label: 'Správný rozdíl',  sub: 'Tip 3:1 → výsledek 2:0',    color: C.blue   },
    { pts: '4b',  label: 'Správný vítěz',   sub: 'Výhra nebo remíza správně', color: C.green  },
    { pts: '2b',  label: 'Počet gólů',      sub: 'Celkový počet gólů sedí',   color: C.muted  },
    { pts: '+3b', label: 'Střelec gól!',    sub: 'Tvůj tipovaný hráč skóroval', color: C.orange },
  ];

  scoring.forEach((item, i) => {
    const y = 1.33 + i * 1.07;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y, w: 5.1, h: 0.95, fill: { color: C.card }, line: { color: C.cardBorder } });
    s.addShape(pres.shapes.OVAL, { x: 0.38, y: y + 0.1, w: 0.72, h: 0.72, fill: { color: item.color }, line: { color: item.color } });
    s.addText(item.pts, { x: 0.38, y: y + 0.1, w: 0.72, h: 0.72, fontSize: item.pts.length > 3 ? 12 : 15, bold: true, color: C.bg, align: 'center', valign: 'middle' });
    s.addText(item.label, { x: 1.25, y: y + 0.1, w: 3.9, h: 0.38, fontSize: 13, bold: true, color: C.white, margin: 0 });
    s.addText(item.sub,   { x: 1.25, y: y + 0.5, w: 3.9, h: 0.35, fontSize: 11, color: C.muted, margin: 0 });
  });

  ctaBar(s);
}

// ─────────────────────────────────────────────
// SLIDE 5 — Tabulka & Odehrané
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  header(s, 'TABULKA & VÝSLEDKY', null);

  // Tabulka
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 1.35, w: 5.1, h: 2.2, fill: { color: C.card }, line: { color: C.cardBorder } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 1.35, w: 0.07, h: 2.2, fill: { color: C.yellow }, line: { color: C.yellow } });
  s.addText('🏆', { x: 0.38, y: 1.45, w: 0.8, h: 0.55, fontSize: 24, align: 'center' });
  s.addText('Živá tabulka', { x: 1.3, y: 1.45, w: 3.9, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText('Body se připíší automaticky po zadání výsledku.', { x: 1.3, y: 1.87, w: 3.9, h: 0.35, fontSize: 11, color: C.muted, margin: 0 });

  // Mini tabulka
  [['🥇','Koudy','47'], ['🥈','Marek','41'], ['🥉','Tomáš','38']].forEach(([pos, name, pts], i) => {
    const ry = 2.32 + i * 0.43;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: ry, w: 4.7, h: 0.4, fill: { color: i === 0 ? '1C2A1C' : '0F172A' }, line: { color: i === 0 ? C.green : '1E293B' } });
    s.addText(pos,  { x: 0.52, y: ry, w: 0.5,  h: 0.4, fontSize: 13, align: 'center', valign: 'middle' });
    s.addText(name, { x: 1.1,  y: ry, w: 2.5,  h: 0.4, fontSize: 12, bold: i===0, color: i===0 ? C.green : C.white, valign: 'middle' });
    s.addText(pts + ' b', { x: 3.8, y: ry, w: 1.2, h: 0.4, fontSize: 12, bold: true, color: C.green, align: 'right', valign: 'middle' });
  });
  s.addText('👆 Klikni na hráče → vidíš jeho tipy a statistiky', {
    x: 0.45, y: 3.63, w: 4.7, h: 0.38,
    fontSize: 10, color: C.muted, align: 'center',
  });

  // Odehrané
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 4.12, w: 5.1, h: 1.85, fill: { color: C.card }, line: { color: C.cardBorder } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 4.12, w: 0.07, h: 1.85, fill: { color: C.green }, line: { color: C.green } });
  s.addText('✅', { x: 0.38, y: 4.22, w: 0.8, h: 0.55, fontSize: 24, align: 'center' });
  s.addText('Záložka Odehrané', { x: 1.3, y: 4.22, w: 3.9, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText('Výsledky + tvůj tip + body za každý zápas.', { x: 1.3, y: 4.64, w: 3.9, h: 0.35, fontSize: 11, color: C.muted, margin: 0 });

  // Mockup odehraný zápas
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: 5.1, w: 4.7, h: 0.65, fill: { color: '0F172A' }, line: { color: '334155' }, rectRadius: 0.05 });
  s.addText('Mexiko', { x: 0.5,  y: 5.12, w: 1.2, h: 0.3, fontSize: 10, bold: true, color: C.white, align: 'right' });
  s.addText('2 : 1',  { x: 1.8,  y: 5.12, w: 0.9, h: 0.3, fontSize: 12, bold: true, color: C.white, align: 'center' });
  s.addText('JAR',    { x: 2.8,  y: 5.12, w: 1.0, h: 0.3, fontSize: 10, bold: true, color: C.white });
  s.addShape(pres.shapes.OVAL, { x: 4.1, y: 5.1, w: 0.75, h: 0.52, fill: { color: C.yellow }, line: { color: C.yellow } });
  s.addText('13b', { x: 4.1, y: 5.1, w: 0.75, h: 0.52, fontSize: 11, bold: true, color: C.bg, align: 'center', valign: 'middle' });
  s.addText('tip: 2:1  ⚽ Lozano', { x: 0.5, y: 5.43, w: 3.5, h: 0.28, fontSize: 9, color: C.muted });

  ctaBar(s);
}

pres.writeFile({ fileName: 'C:/Users/Admin/ms-tipovacka/promo/stories2/tutorial_post.pptx' });
console.log('✅ tutorial_post.pptx vytvořeno ve stories2!');
