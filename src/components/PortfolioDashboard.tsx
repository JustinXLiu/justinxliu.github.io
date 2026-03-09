import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Holding {
  Type: string;
  Symbol: string;
  Cost: number;
  Actual: number;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#eab308',
];

const DATA_FILES = [
  { label: 'Sep 16, 2025', file: '/data/9_16_25.json' },
  { label: 'Jun 13, 2025', file: '/data/6_13_25.json' },
  { label: 'Mar 14, 2025', file: '/data/3_14_25.json' },
  { label: 'Dec 1, 2024', file: '/data/12_1_24.json' },
  { label: 'Dec 1, 2023', file: '/data/12_1_23.json' },
];

function formatDollar(value: number) {
  return `$${value.toLocaleString()}`;
}

function formatPercent(value: number, total: number) {
  return `${((value / total) * 100).toFixed(1)}%`;
}

const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
  if (percent < 0.03) return null;
  return `${name} ${(percent * 100).toFixed(1)}%`;
};

function PieSection({ title, data, valueKey }: { title: string; data: Holding[]; valueKey: 'Cost' | 'Actual' }) {
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  const pieData = data.map((d) => ({
    name: d.Symbol,
    value: d[valueKey],
    percent: formatPercent(d[valueKey], total),
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={renderCustomLabel}
            labelLine={true}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatDollar(value)}
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #fff)',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
        Total: {formatDollar(total)}
      </p>
    </div>
  );
}

function TypePieSection({ title, data, valueKey }: { title: string; data: Holding[]; valueKey: 'Cost' | 'Actual' }) {
  const grouped: Record<string, number> = {};
  data.forEach((d) => {
    grouped[d.Type] = (grouped[d.Type] || 0) + d[valueKey];
  });
  const total = Object.values(grouped).reduce((a, b) => a + b, 0);
  const pieData = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
    percent: formatPercent(value, total),
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={renderCustomLabel}
            labelLine={true}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatDollar(value)}
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #fff)',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HoldingsTable({ data }: { data: Holding[] }) {
  const totalCost = data.reduce((s, d) => s + d.Cost, 0);
  const totalActual = data.reduce((s, d) => s + d.Actual, 0);

  const rows = data
    .map((d) => ({
      ...d,
      costPct: (d.Cost / totalCost) * 100,
      actualPct: (d.Actual / totalActual) * 100,
      gainLoss: d.Actual - d.Cost,
      gainLossPct: ((d.Actual - d.Cost) / d.Cost) * 100,
    }))
    .sort((a, b) => b.Actual - a.Actual);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold">Holdings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-3 font-medium">Symbol</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium text-right">Cost</th>
              <th className="px-6 py-3 font-medium text-right">Market</th>
              <th className="px-6 py-3 font-medium text-right">Gain/Loss</th>
              <th className="px-6 py-3 font-medium text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.Symbol} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-3 font-medium">{r.Symbol}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                    r.Type === 'Index' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                    r.Type === 'Stock' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                    r.Type === 'Cash' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                    r.Type === 'Bond' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    {r.Type}
                  </span>
                </td>
                <td className="px-6 py-3 text-right tabular-nums">{formatDollar(r.Cost)}</td>
                <td className="px-6 py-3 text-right tabular-nums">{formatDollar(r.Actual)}</td>
                <td className={`px-6 py-3 text-right tabular-nums font-medium ${
                  r.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {r.gainLoss >= 0 ? '+' : ''}{formatDollar(r.gainLoss)} ({r.gainLossPct >= 0 ? '+' : ''}{r.gainLossPct.toFixed(1)}%)
                </td>
                <td className="px-6 py-3 text-right tabular-nums">{r.actualPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t border-gray-200 dark:border-gray-700">
              <td className="px-6 py-3" colSpan={2}>Total</td>
              <td className="px-6 py-3 text-right tabular-nums">{formatDollar(totalCost)}</td>
              <td className="px-6 py-3 text-right tabular-nums">{formatDollar(totalActual)}</td>
              <td className={`px-6 py-3 text-right tabular-nums ${
                totalActual - totalCost >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {totalActual - totalCost >= 0 ? '+' : ''}{formatDollar(totalActual - totalCost)} ({(((totalActual - totalCost) / totalCost) * 100).toFixed(1)}%)
              </td>
              <td className="px-6 py-3 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function PortfolioDashboard() {
  const [data, setData] = useState<Holding[]>([]);
  const [selectedFile, setSelectedFile] = useState(DATA_FILES[0].file);

  useEffect(() => {
    fetch(selectedFile)
      .then((r) => r.json())
      .then(setData);
  }, [selectedFile]);

  const indexData = data.filter((d) => d.Type === 'Index');
  const stockData = data.filter((d) => d.Type === 'Stock');

  return (
    <div className="space-y-8">
      {/* Header with date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Snapshot of holdings by cost basis and market value</p>
        </div>
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DATA_FILES.map((f) => (
            <option key={f.file} value={f.file}>{f.label}</option>
          ))}
        </select>
      </div>

      {data.length > 0 && (
        <>
          {/* Overall allocation by type */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Overall Allocation</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TypePieSection title="By Cost Basis" data={data} valueKey="Cost" />
              <TypePieSection title="By Market Value" data={data} valueKey="Actual" />
            </div>
          </section>

          {/* Index funds breakdown */}
          {indexData.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Index Funds</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieSection title="Cost Basis" data={indexData} valueKey="Cost" />
                <PieSection title="Market Value" data={indexData} valueKey="Actual" />
              </div>
            </section>
          )}

          {/* Individual stocks breakdown */}
          {stockData.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Individual Stocks</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieSection title="Cost Basis" data={stockData} valueKey="Cost" />
                <PieSection title="Market Value" data={stockData} valueKey="Actual" />
              </div>
            </section>
          )}

          {/* Holdings table */}
          <section>
            <HoldingsTable data={data} />
          </section>
        </>
      )}
    </div>
  );
}
