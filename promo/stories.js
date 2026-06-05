const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// Instagram Stories formát: 9:16 = 5.625" x 10"
pres.defineLayout({ name: 'STORY', width: 5.625, height: 10 });
pres.layout = 'STORY';

// Barvy
const C = {
  bg: '0F172A',        // slate-900
  card: '1E293B',      // slate-800
  green: '22C55E',     // green-500
  greenDark: '166534', // green-800
  yellow: 'EAB308',    // yellow-500
  white: 'FFFFFF',
  muted: '94A3B8',     // slate-400
  red: 'EF4444',
};

// ─────────────────────────────────────────────
// SLIDE 1 — Intro / Teaser
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // Zelený gradient nahoře
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.625, h: 3.5, fill: { color: '14532D' }, line: { color: '14532D' } });

  // Velký fotbalový emoji jako "hero"
  s.addText('⚽', { x: 0, y: 0.5, w: 5.625, h: 2, fontSize: 100, align: 'center', valign: 'middle' });

  // Zelená linka přechod
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 3.3, w: 5.625, h: 0.15, fill: { color: C.green }, line: { color: C.green } });

  // Nadpis
  s.addText('MS 2026\nTIPOVAČKA', {
    x: 0.3, y: 3.6, w: 5.0, h: 1.8,
    fontSize: 48, bold: true, color: C.white,
    align: 'center', fontFace: 'Arial Black',
    lineSpacingMultiple: 1.1,
  });

  // Podtitulek
  s.addText('Tipuj výsledky. Porovnej se s kamarády.\nVyhraj slavu. ⚽', {
    x: 0.3, y: 5.6, w: 5.0, h: 1.2,
    fontSize: 16, color: C.muted, align: 'center', fontFace: 'Arial',
  });

  // Featurky
  const features = ['🏆 Živá tabulka', '🎯 Střelci', '📊 Statistiky'];
  features.forEach((f, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.3 + i * 1.7, y: 7.0, w: 1.5, h: 0.55,
      fill: { color: C.card }, line: { color: '334155' }, rectRadius: 0.08,
    });
    s.addText(f, {
      x: 0.3 + i * 1.7, y: 7.0, w: 1.5, h: 0.55,
      fontSize: 11, color: C.white, align: 'center', valign: 'middle', bold: true,
    });
  });

  // URL
  s.addText('koudyho-tipovacka.vercel.app', {
    x: 0.3, y: 8.5, w: 5.0, h: 0.5,
    fontSize: 13, color: C.green, align: 'center', bold: true,
  });

  // CTA
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: 9.1, w: 3.8, h: 0.6,
    fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.1,
  });
  s.addText('PŘIDEJ SE →', {
    x: 0.9, y: 9.1, w: 3.8, h: 0.6,
    fontSize: 16, bold: true, color: C.bg, align: 'center', valign: 'middle',
  });
}

// ─────────────────────────────────────────────
// SLIDE 2 — Jak to funguje
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addText('JAK TO FUNGUJE?', {
    x: 0.3, y: 0.5, w: 5.0, h: 0.7,
    fontSize: 24, bold: true, color: C.green, align: 'center', fontFace: 'Arial Black',
  });

  const steps = [
    { emoji: '1️⃣', title: 'Zadej přezdívku', desc: 'Registrace bez hesla — prostě napiš jméno a jsi uvnitř.' },
    { emoji: '2️⃣', title: 'Tipuj výsledky', desc: 'Před každým zápasem vyplň skóre a vyber střelce.' },
    { emoji: '3️⃣', title: 'Sleduj tabulku', desc: 'Po zápase se body připíší automaticky. Kdo vede?' },
    { emoji: '4️⃣', title: 'Statistiky', desc: 'Klikni na kamaráda a vidíš všechny jeho tipy.' },
  ];

  steps.forEach((step, i) => {
    const y = 1.4 + i * 1.95;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.25, y, w: 5.1, h: 1.7,
      fill: { color: C.card }, line: { color: '334155' },
    });
    // Barevná linka vlevo
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.25, y, w: 0.07, h: 1.7,
      fill: { color: C.green }, line: { color: C.green },
    });
    s.addText(step.emoji, {
      x: 0.4, y: y + 0.1, w: 0.9, h: 0.7,
      fontSize: 30, align: 'center',
    });
    s.addText(step.title, {
      x: 1.35, y: y + 0.1, w: 3.8, h: 0.5,
      fontSize: 15, bold: true, color: C.white, margin: 0,
    });
    s.addText(step.desc, {
      x: 1.35, y: y + 0.6, w: 3.8, h: 0.9,
      fontSize: 12, color: C.muted, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────
// SLIDE 3 — Bodování
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addText('BODOVÁNÍ', {
    x: 0.3, y: 0.4, w: 5.0, h: 0.7,
    fontSize: 30, bold: true, color: C.white, align: 'center', fontFace: 'Arial Black',
  });
  s.addText('Za každý zápas můžeš získat až 13 bodů', {
    x: 0.3, y: 1.1, w: 5.0, h: 0.5,
    fontSize: 13, color: C.muted, align: 'center',
  });

  const scoring = [
    { pts: '10', label: 'Přesný výsledek', sub: 'Např. tip 2:1 → výsledek 2:1', color: 'EAB308' },
    { pts: '6', label: 'Správný rozdíl', sub: 'Tip 3:1 → výsledek 2:0 (rozdíl +2)', color: '3B82F6' },
    { pts: '4', label: 'Správný vítěz', sub: 'Tipoval jsi výhru nebo remízu', color: '22C55E' },
    { pts: '2', label: 'Počet gólů', sub: 'Celkový počet gólů sedí', color: '94A3B8' },
    { pts: '+3', label: 'Střelec gól!', sub: 'Tvůj tipovaný střelec skóroval', color: 'F97316' },
  ];

  scoring.forEach((item, i) => {
    const y = 1.8 + i * 1.55;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.25, y, w: 5.1, h: 1.35,
      fill: { color: C.card }, line: { color: '334155' },
    });
    // Bodový badge
    s.addShape(pres.shapes.OVAL, {
      x: 0.4, y: y + 0.25, w: 0.85, h: 0.85,
      fill: { color: item.color }, line: { color: item.color },
    });
    s.addText(item.pts + 'b', {
      x: 0.4, y: y + 0.25, w: 0.85, h: 0.85,
      fontSize: item.pts.length > 2 ? 14 : 18, bold: true, color: C.bg,
      align: 'center', valign: 'middle',
    });
    s.addText(item.label, {
      x: 1.45, y: y + 0.15, w: 3.7, h: 0.5,
      fontSize: 15, bold: true, color: C.white, margin: 0,
    });
    s.addText(item.sub, {
      x: 1.45, y: y + 0.65, w: 3.7, h: 0.5,
      fontSize: 12, color: C.muted, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────
// SLIDE 4 — CTA závěrečný
// ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // Tmavě zelené pozadí nahoře
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.625, h: 5, fill: { color: '052E16' }, line: { color: '052E16' } });

  s.addText('⚽', { x: 0, y: 0.6, w: 5.625, h: 1.8, fontSize: 90, align: 'center' });

  s.addText('MS 2026\nZačíná 11. června', {
    x: 0.3, y: 2.6, w: 5.0, h: 1.5,
    fontSize: 32, bold: true, color: C.white, align: 'center',
    fontFace: 'Arial Black', lineSpacingMultiple: 1.2,
  });

  // Odpočítávání textu
  s.addText('Máš čas zatipovat!', {
    x: 0.3, y: 4.2, w: 5.0, h: 0.5,
    fontSize: 16, color: C.green, align: 'center', bold: true,
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5, w: 5.625, h: 5, fill: { color: C.bg }, line: { color: C.bg } });

  // Velká URL
  s.addText('koudyho-tipovacka\n.vercel.app', {
    x: 0.3, y: 5.5, w: 5.0, h: 1.5,
    fontSize: 28, bold: true, color: C.green, align: 'center',
    fontFace: 'Arial Black', lineSpacingMultiple: 1.1,
  });

  s.addText('Zaregistruj se zdarma\na tipuj s námi!', {
    x: 0.3, y: 7.2, w: 5.0, h: 1.0,
    fontSize: 16, color: C.muted, align: 'center',
  });

  // Velké CTA tlačítko
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 8.4, w: 4.4, h: 0.8,
    fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.12,
  });
  s.addText('TIPOVAT TEĎ →', {
    x: 0.6, y: 8.4, w: 4.4, h: 0.8,
    fontSize: 20, bold: true, color: '052E16',
    align: 'center', valign: 'middle', fontFace: 'Arial Black',
  });
}

pres.writeFile({ fileName: 'C:/Users/Admin/ms-tipovacka/promo/stories.pptx' });
console.log('✅ stories.pptx vytvořeno!');
