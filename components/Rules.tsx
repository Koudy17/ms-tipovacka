'use client';

// Pravidla hry – okno otevírané z hlavičky i z přihlašovací obrazovky.
// Texty vychází z toho, co appka skutečně dělá (lib/scoring.ts, tipování, double, bonus za střelce).
export default function Rules({ dark, onClose }: { dark: boolean; onClose: () => void }) {
  const d = {
    bg: dark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900',
    sub: dark ? 'text-slate-400' : 'text-gray-500',
    border: dark ? 'border-slate-700' : 'border-gray-200',
    card: dark ? 'bg-slate-800' : 'bg-gray-50',
    h: 'text-sm font-bold mb-1.5',
  };

  const points: { pts: string; color: string; title: string; text: string }[] = [
    { pts: '10', color: 'bg-yellow-400 text-black', title: 'Přesný výsledek', text: 'Trefíš skóre přesně.' },
    { pts: '6', color: 'bg-blue-500 text-white', title: 'Rozdíl, nebo remíza', text: 'Remíza s jiným skóre, nebo správný vítěz a zároveň správný rozdíl skóre či správný celkový počet gólů.' },
    { pts: '4', color: 'bg-emerald-600 text-white', title: 'Správný vítěz', text: 'Trefíš, kdo vyhraje.' },
    { pts: '2', color: 'bg-slate-500 text-white', title: 'Počet gólů', text: 'Špatný vítěz, ale správný celkový počet gólů v zápase.' },
    { pts: '0', color: 'bg-red-900 text-red-200', title: 'Nic', text: 'Nesedí nic z výše uvedeného.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ${d.bg}`} style={{ maxHeight: '90vh' }}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${d.border}`}>
          <h2 className="font-bold text-lg">📖 Pravidla hry</h2>
          <button onClick={onClose} className={`text-2xl leading-none ${d.sub} hover:text-red-400`} aria-label="Zavřít">×</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5 text-sm">
          <section>
            <h3 className={d.h}>Jak se hraje</h3>
            <ul className={`list-disc pl-5 space-y-1 ${d.sub}`}>
              <li>Tipuješ výsledky zápasů Premier League, tipovačka začíná <b>6. kolem</b> sezóny 2026/27.</li>
              <li>Tipuje se výsledek po <b>základní hrací době</b> (90 minut a nastavení).</li>
              <li>Tip můžeš měnit <b>až do výkopu</b> zápasu. Potom se zamkne a už ho nezměníš.</li>
              <li>Tipy ostatních uvidíš až po výkopu, aby od sebe nikdo nemohl opisovat.</li>
              <li>Nezapomeň na tlačítko <b>Uložit vše</b> dole, bez něj se tipy neuloží.</li>
            </ul>
          </section>

          <section>
            <h3 className={d.h}>Body za zápas</h3>
            <div className="space-y-1.5">
              {points.map(p => (
                <div key={p.pts} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${d.card}`}>
                  <span className={`shrink-0 w-9 text-center rounded-full text-xs font-bold py-0.5 ${p.color}`}>{p.pts} b</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{p.title}</span>
                    <span className={`block text-xs ${d.sub}`}>{p.text}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className={`text-xs mt-2 ${d.sub}`}>
              Příklad: zápas skončí <b>2:1</b>. Tip 2:1 = 10 b · tip 1:0 (stejný rozdíl) = 6 b · tip 4:0 (jen vítěz) = 4 b · tip 0:3 (stejný počet gólů, špatný vítěz) = 2 b · tip 0:0 = 0 b.
            </p>
          </section>

          <section>
            <h3 className={d.h}>⚽ Bonus za střelce (+3 b)</h3>
            <ul className={`list-disc pl-5 space-y-1 ${d.sub}`}>
              <li>U každého zápasu můžeš vybrat hráče, který podle tebe skóruje. Je to <b>nepovinné</b>.</li>
              <li>Pokud hráč v zápase opravdu vstřelí gól, dostaneš <b>+3 b</b>. Počítá se i gól z penalty, <b>vlastní gól ne</b>.</li>
              <li>Bonus se přidělí automaticky po skončení zápasu.</li>
            </ul>
          </section>

          <section>
            <h3 className={d.h}>×2 Double</h3>
            <ul className={`list-disc pl-5 space-y-1 ${d.sub}`}>
              <li>V <b>každém kole</b> můžeš jednou použít double na libovolný zápas. Všechny body za něj (včetně bonusu za střelce) se zdvojnásobí.</li>
              <li>Tlačítko <b>×2</b> je u zápasu a jde zapnout, až když tam máš zadaný tip.</li>
              <li>Double můžeš přesunout na jiný zápas kola, dokud zápas, na kterém ho máš, nezačne. Pak je zamčený.</li>
            </ul>
          </section>

          <section>
            <h3 className={d.h}>Tabulka</h3>
            <ul className={`list-disc pl-5 space-y-1 ${d.sub}`}>
              <li>Hráči se řadí podle součtu bodů. Při shodě bodů podle přezdívky.</li>
              <li>Body se připisují po skončení zápasu. U odloženého zápasu platí tvůj tip dál a zamkne se novým výkopem.</li>
            </ul>
          </section>

          <section>
            <h3 className={d.h}>🔔 Upozornění</h3>
            <p className={d.sub}>Přes zvoneček nahoře si můžeš zapnout upozornění: připomínku hodinu před zápasem, na který nemáš tip, a výsledek svého tipu po zápase. Na iPhonu to funguje po přidání appky na plochu.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
