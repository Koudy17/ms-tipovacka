// Forma týmu z posledních zápasů: V = výhra, R = remíza, P = prohra
export default function FormChips({ form }: { form: string | null }) {
  if (!form) return <span className="text-xs opacity-50">–</span>;
  const map: Record<string, { label: string; cls: string }> = {
    W: { label: 'V', cls: 'bg-green-600' },
    D: { label: 'R', cls: 'bg-slate-500' },
    L: { label: 'P', cls: 'bg-red-600' },
  };
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {form.split('').map((c, i) => {
        const m = map[c] ?? { label: '?', cls: 'bg-slate-600' };
        return (
          <span key={i} className={`h-4 w-4 rounded-sm text-[10px] leading-4 text-center font-bold text-white ${m.cls}`}>{m.label}</span>
        );
      })}
    </span>
  );
}
