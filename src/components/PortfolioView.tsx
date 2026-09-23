import { useState, useEffect } from 'react';
import {
  Area, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Holding {
  Type: string;
  Symbol: string;
  Cost: number;
  Actual: number;
}

const SNAPSHOTS = [
  // spx: S&P 500 close on the snapshot date (nearest trading day; price return, dividends excluded)
  { label: 'Dec 2023', file: '/data/12_1_23.json', ts: new Date(2023, 11, 1).getTime(), spx: 4594.63 },
  { label: 'Dec 2024', file: '/data/12_1_24.json', ts: new Date(2024, 11, 1).getTime(), spx: 6032.38 },
  { label: 'Mar 2025', file: '/data/3_14_25.json', ts: new Date(2025, 2, 14).getTime(), spx: 5638.94 },
  { label: 'Jun 2025', file: '/data/6_13_25.json', ts: new Date(2025, 5, 13).getTime(), spx: 5976.97 },
  { label: 'Sep 2025', file: '/data/9_16_25.json', ts: new Date(2025, 8, 16).getTime(), spx: 6606.76 },
  { label: 'Mar 2026', file: '/data/3_14_26.json', ts: new Date(2026, 2, 14).getTime(), spx: 6632.19 },
  { label: 'Sep 2026', file: '/data/9_15_26.json', ts: new Date(2026, 8, 15).getTime(), spx: 7585.73 },
];

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

// Money-weighted annualized return (XIRR) via bisection.
// flows: [timeInYears, amount][] — outflows negative, terminal value positive.
function xnpv(rate: number, flows: [number, number][]): number {
  return flows.reduce((s, [t, amt]) => s + amt / Math.pow(1 + rate, t), 0);
}
function xirr(flows: [number, number][]): number {
  let lo = -0.9999, hi = 10;
  let fLo = xnpv(lo, flows), fHi = xnpv(hi, flows);
  let guard = 0;
  while (fLo * fHi > 0 && guard++ < 60) { hi *= 2; fHi = xnpv(hi, flows); }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = xnpv(mid, flows);
    if (Math.abs(fMid) < 1e-12) return mid;
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

const ACCENT = '#10b981'; // emerald — terminal green
const ROI_COLOR = '#38bdf8'; // sky
const SPX_COLOR = '#f59e0b'; // amber — benchmark line

// Neutral units: raw scaled figures, no $ sign (scale is private)
const fmtN = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const tooltipStyle = {
  backgroundColor: 'var(--tooltip-bg, #fff)',
  border: '1px solid var(--tooltip-border, #e5e7eb)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
};

const tickStyle = { fontSize: 11, fill: 'var(--axis-color, #6b7280)', fontFamily: 'inherit' };

function Card({ cmd, children }: { cmd: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
      <header className="px-4 py-2.5 border-b border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-500">
        <span className="text-emerald-600 dark:text-emerald-400">$</span> {cmd}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-600">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${
        positive === undefined ? '' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function TimeXAxis({ ticks, labels }: { ticks: number[]; labels: string[] }) {
  return (
    <XAxis
      dataKey="ts"
      type="number"
      scale="time"
      domain={['dataMin', 'dataMax']}
      ticks={ticks}
      tickFormatter={(ts: number) => {
        const idx = ticks.indexOf(ts);
        return idx >= 0 ? labels[idx] : '';
      }}
      tick={tickStyle}
      tickLine={false}
      axisLine={{ stroke: 'var(--grid-color, #e5e7eb)' }}
    />
  );
}

export default function PortfolioView() {
  const [dataArrays, setDataArrays] = useState<Holding[][]>([]);

  useEffect(() => {
    Promise.all(SNAPSHOTS.map((s) => fetch(s.file).then((r) => r.json()))).then(setDataArrays);
  }, []);

  if (dataArrays.length === 0) {
    return <div className="py-24 text-center text-sm text-gray-400 dark:text-gray-600">loading data…</div>;
  }

  const ticks = SNAPSHOTS.map((s) => s.ts);
  const labels = SNAPSHOTS.map((s) => s.label);

  // Time series: net worth + total ROI per snapshot
  const totals = dataArrays.map((arr) => ({
    cost: arr.reduce((s, d) => s + d.Cost, 0),
    actual: arr.reduce((s, d) => s + d.Actual, 0),
  }));
  const series = totals.map((t, i) => ({
    ts: SNAPSHOTS[i].ts,
    netWorth: t.actual,
    roi: t.cost > 0 ? ((t.actual - t.cost) / t.cost) * 100 : 0,
  }));

  // Annualized returns since inception: your money-weighted return (XIRR,
  // treating cost-basis increases as dated deposits) vs S&P 500 CAGR
  const t0 = SNAPSHOTS[0].ts;
  const yrs = (i: number) => (SNAPSHOTS[i].ts - t0) / MS_PER_YEAR;
  const annSeries = totals.slice(1).map((t, k) => {
    const i = k + 1;
    const flows: [number, number][] = [[0, -totals[0].cost]];
    for (let j = 1; j <= i; j++) {
      flows.push([yrs(j), -(totals[j].cost - totals[j - 1].cost)]);
    }
    flows.push([yrs(i), t.actual]);
    return {
      label: labels[i],
      you: xirr(flows) * 100,
      spx: (Math.pow(SNAPSHOTS[i].spx / SNAPSHOTS[0].spx, 1 / yrs(i)) - 1) * 100,
    };
  });
  const annReturn = annSeries[annSeries.length - 1].you;

  // Combined chart data: net worth (left axis, private units) + annualized returns (right axis, %).
  // Return lines start at the second snapshot (null at inception, connected through).
  const combined = series.map((s, i) => ({
    ts: s.ts,
    netWorth: s.netWorth,
    you: i > 0 ? annSeries[i - 1].you : null,
    spx: i > 0 ? annSeries[i - 1].spx : null,
  }));

  const latest = dataArrays[dataArrays.length - 1];
  const latestActual = latest.reduce((s, d) => s + d.Actual, 0);
  const firstActual = dataArrays[0].reduce((s, d) => s + d.Actual, 0);
  const nwGrowth = ((latestActual - firstActual) / firstActual) * 100;

  // Per-category growth indexed to 100 at inception, flow-adjusted:
  // deposits/withdrawals are backed out from cost-basis changes (same
  // approximation as the XIRR calc). BRK-B counts as Index per the data.
  const CATEGORIES = ['Index', 'Stock', 'Cash', 'Bond'];
  const CAT_COLORS: Record<string, string> = {
    Index: ACCENT, // emerald
    Stock: ROI_COLOR, // sky
    Cash: '#9ca3af', // gray
    Bond: '#a78bfa', // violet
  };
  const catState: Record<string, { indexed: number; prevCost: number; prevValue: number }> = {};
  const catCombined = SNAPSHOTS.map((s, i) => {
    const row: { ts: number; [k: string]: number } = { ts: s.ts };
    for (const cat of CATEGORIES) {
      const cost = dataArrays[i].filter((d) => d.Type === cat).reduce((t, d) => t + d.Cost, 0);
      const value = dataArrays[i].filter((d) => d.Type === cat).reduce((t, d) => t + d.Actual, 0);
      const st = catState[cat];
      if (!st) {
        catState[cat] = { indexed: 100, prevCost: cost, prevValue: value };
        row[cat] = 100;
      } else {
        const flow = cost - st.prevCost;
        const denom = st.prevValue + flow;
        if (denom > 0) st.indexed = (st.indexed * value) / denom;
        st.prevCost = cost;
        st.prevValue = value;
        row[cat] = st.indexed;
      }
    }
    return row;
  });

  // Holdings detail (latest snapshot): cost, market value, weight, ROI
  const latestTotal = latest.reduce((s, d) => s + d.Actual, 0);
  const holdings = [...latest]
    .sort((a, b) => b.Actual - a.Actual)
    .map((d) => ({
      symbol: d.Symbol,
      type: d.Type,
      cost: d.Cost,
      value: d.Actual,
      weight: (d.Actual / latestTotal) * 100,
      roi: d.Cost > 0 ? ((d.Actual - d.Cost) / d.Cost) * 100 : 0,
    }));

  // Activity inferred from snapshot diffs (stocks only).
  // buy = new position, sell = removed (amount = last tracked value),
  // add/trim = cost-basis change. Intra-period trades aren't visible.
  interface Activity { period: string; action: 'buy' | 'add' | 'trim' | 'sell'; symbol: string; pct: number | null }
  const activities: Activity[] = [];
  for (let i = 1; i < dataArrays.length; i++) {
    const prev = new Map(dataArrays[i - 1].filter((d) => d.Type === 'Stock').map((d) => [d.Symbol, d]));
    const period = `${labels[i - 1]} → ${labels[i]}`;
    dataArrays[i].filter((d) => d.Type === 'Stock').forEach((d) => {
      const p = prev.get(d.Symbol);
      if (!p) activities.push({ period, action: 'buy', symbol: d.Symbol, pct: null });
      else if (d.Cost - p.Cost > 1) activities.push({ period, action: 'add', symbol: d.Symbol, pct: ((d.Cost - p.Cost) / p.Cost) * 100 });
      else if (p.Cost - d.Cost > 1) activities.push({ period, action: 'trim', symbol: d.Symbol, pct: (-(p.Cost - d.Cost) / p.Cost) * 100 });
      prev.delete(d.Symbol);
    });
    prev.forEach((p, sym) => activities.push({ period, action: 'sell', symbol: sym, pct: -100 }));
  }
  activities.reverse(); // most recent first

  const ACTION_STYLE: Record<Activity['action'], string> = {
    buy: 'text-emerald-600 dark:text-emerald-400',
    add: 'text-sky-600 dark:text-sky-400',
    trim: 'text-amber-600 dark:text-amber-400',
    sell: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          <span className="text-emerald-600 dark:text-emerald-400">$</span> ./portfolio --all
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-2">portfolio</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Stat label="net_worth" value={fmtN(latestActual)} sub={`${fmtPct(nwGrowth)} since ${labels[0]}`} positive={nwGrowth >= 0} />
        <Stat label="ann_return" value={`${fmtPct(annReturn)}/yr`} sub={`XIRR since ${labels[0]}`} positive={annReturn >= 0} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600 -mt-2">{'// figures in private units · not dollar amounts'}</p>

      {/* Net worth + annualized returns vs S&P 500 */}
      <Card cmd="portfolio --net-worth --returns">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={combined} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e5e7eb)" vertical={false} />
            <TimeXAxis ticks={ticks} labels={labels} />
            <YAxis yAxisId="left" tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtN(v)} width={56} />
            <YAxis yAxisId="right" orientation="right" tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={52} />
            <Tooltip
              labelFormatter={(ts) => labels[ticks.indexOf(ts as number)] ?? ''}
              formatter={(v: number, name: string) => (name === 'net worth' ? [fmtN(v ?? 0), name] : [fmtPct(v ?? 0), name])}
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="netWorth" name="net worth" stroke={ACCENT} strokeWidth={2} fill="url(#nwFill)" dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="you" name="you (ann.)" stroke={ROI_COLOR} strokeWidth={2} dot={{ r: 4, fill: ROI_COLOR, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="spx" name="S&P 500 (ann.)" stroke={SPX_COLOR} strokeWidth={2} dot={{ r: 4, fill: SPX_COLOR, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">
          {'// net worth on the left axis · annualized returns on the right · you = XIRR (money-weighted) · S&P 500 = CAGR price return, dividends excluded'}
        </p>
      </Card>

      {/* Index vs stock: flow-adjusted growth, Dec 2023 = 100 */}
      <Card cmd="portfolio --by-category">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={catCombined} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e5e7eb)" vertical={false} />
            <TimeXAxis ticks={ticks} labels={labels} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v)}`} domain={['auto', 'auto']} width={44} />
            <Tooltip
              labelFormatter={(ts) => labels[ticks.indexOf(ts as number)] ?? ''}
              formatter={(v: number, name: string) => [`${Number(v ?? 0).toFixed(1)}`, name]}
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {CATEGORIES.map((cat) => (
              <Line key={cat} type="monotone" dataKey={cat} name={cat.toLowerCase()} stroke={CAT_COLORS[cat]} strokeWidth={2} dot={{ r: 3, fill: CAT_COLORS[cat], strokeWidth: 0 }} activeDot={{ r: 5 }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">
          {'// growth of 100 invested per category, Dec 2023 = 100 · deposits/withdrawals backed out from cost-basis changes · BRK-B counts as index'}
        </p>
      </Card>

      {/* Holdings */}
      <Card cmd="holdings --all">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-600 border-b border-gray-200 dark:border-white/10">
                <th className="py-2 pr-4 font-normal">holding</th>
                <th className="py-2 pr-4 font-normal text-right">cost</th>
                <th className="py-2 pr-4 font-normal text-right">value</th>
                <th className="py-2 pr-4 font-normal text-right">weight</th>
                <th className="py-2 font-normal text-right">roi</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <td className="py-2 pr-4 font-bold whitespace-nowrap">
                    {h.symbol}
                    <span className="ml-2 font-normal text-gray-400 dark:text-gray-600">{h.type.toLowerCase()}</span>
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-400 dark:text-gray-600">{fmtN(h.cost)}</td>
                  <td className="py-2 pr-4 text-right">{fmtN(h.value)}</td>
                  <td className="py-2 pr-4 text-right">{h.weight.toFixed(1)}%</td>
                  <td className={`py-2 text-right font-bold ${h.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {fmtPct(h.roi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">
          {'// latest snapshot · weight = % of portfolio value · roi = (value − cost) / cost, not annualized'}
        </p>
      </Card>

      {/* Activity */}
      <Card cmd="activity --stocks --inferred">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-600 border-b border-gray-200 dark:border-white/10">
                <th className="py-2 pr-4 font-normal">period</th>
                <th className="py-2 pr-4 font-normal">action</th>
                <th className="py-2 pr-4 font-normal">symbol</th>
                <th className="py-2 font-normal text-right">chg%</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, idx) => {
                const newPeriod = idx === 0 || activities[idx - 1].period !== a.period;
                return (
                  <tr key={idx} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">{newPeriod ? a.period : ''}</td>
                    <td className={`py-2 pr-4 font-bold ${ACTION_STYLE[a.action]}`}>{a.action}</td>
                    <td className="py-2 pr-4">{a.symbol}</td>
                    <td className={`py-2 text-right ${ACTION_STYLE[a.action]}`}>{a.pct === null ? '—' : `${a.pct > 0 ? '+' : ''}${a.pct.toFixed(1)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">
          {'// inferred from snapshot diffs · chg% = position size change vs prior snapshot'}
        </p>
      </Card>
    </div>
  );
}
