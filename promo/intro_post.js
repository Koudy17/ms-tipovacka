const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// IG Post formát: 4:5 = 5.625" x 7.03"
pres.defineLayout({ name: 'POST', width: 5.625, height: 7.03 });
pres.layout = 'POST';

const C = {
  bg: '0F172A',
  card: '1E293B',
  green: '22C55E',
  greenDark: '14532D',
  white: 'FFFFFF',
  muted: '94A3B8',
};

const s = pres.addSlide();
s.background = { color: C.bg };

// Zelené pozadí nahoře
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.625, h: 2.6, fill: { color: C.greenDark }, line: { color: C.greenDark } });

// Fotbalový míč
s.addText('⚽', { x: 0, y: 0.3, w: 5.625, h: 1.7, fontSize: 100, align: 'center' });

// Zelená linka přechod
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 2.5, w: 5.625, h: 0.12, fill: { color: C.green }, line: { color: C.green } });

// Nadpis
s.addText('MS 2026\nTIPOVAČKA', {
  x: 0.3, y: 2.7, w: 5.0, h: 1.6,
  fontSize: 46, bold: true, color: C.white,
  align: 'center', fontFace: 'Arial Black',
  lineSpacingMultiple: 1.1,
});

// Podtitulek
s.addText('Tipuj výsledky. Porovnej se s kamarády.\nVyhraj slávu. ⚽', {
  x: 0.3, y: 4.4, w: 5.0, h: 0.9,
  fontSize: 15, color: C.muted, align: 'center',
});

// Featurky
const features = ['🏆 Živá tabulka', '🎯 Střelci', '📊 Statistiky'];
features.forEach((f, i) => {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.3 + i * 1.7, y: 5.45, w: 1.5, h: 0.52,
    fill: { color: C.card }, line: { color: '334155' }, rectRadius: 0.08,
  });
  s.addText(f, {
    x: 0.3 + i * 1.7, y: 5.45, w: 1.5, h: 0.52,
    fontSize: 11, color: C.white, align: 'center', valign: 'middle', bold: true,
  });
});

// URL
s.addText('koudyho-tipovacka.vercel.app', {
  x: 0.3, y: 6.1, w: 5.0, h: 0.4,
  fontSize: 13, color: C.green, align: 'center', bold: true,
});

// CTA tlačítko
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.9, y: 6.55, w: 3.8, h: 0.6,
  fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.1,
});
s.addText('PŘIDEJ SE →', {
  x: 0.9, y: 6.55, w: 3.8, h: 0.6,
  fontSize: 16, bold: true, color: C.greenDark,
  align: 'center', valign: 'middle', fontFace: 'Arial Black',
});

pres.writeFile({ fileName: 'C:/Users/Admin/ms-tipovacka/promo/stories2/intro_post.pptx' });
console.log('✅ intro_post.pptx vytvořeno ve stories2!');
