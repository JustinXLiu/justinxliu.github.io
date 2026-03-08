import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Holding {
  Type: string;
  Symbol: string;
  Cost: number;
  Actual: number;
}

interface ProcessedRow {
  date: string;
  Index: number;
  Stock: number;
  'Cash+Bond': number;
}

const FILES = [
  '/data/12_1_23.json',
  '/data/12_1_24.json',
  '/data/3_14_25.json',
  '/data/6_13_25.json',
  '/data/9_16_25.json',
];

const LABELS = ['Dec 2023', 'Dec 2024', 'Mar 2025', 'Jun 2025', 'Sep 2025'];

const COLORS = {
  Index: '#3b82f6',
  Stock: '#8b5cf6',
  'Cash+Bond': '#10b981',
};

function processData(dataArrays: Holding[][], valueKey: 'Cost' | 'Actual'): ProcessedRow[] {
  return dataArrays.map((data, i) => {
    const total = data.reduce((s, d) => s + d[valueKey], 0);
    const categories: Record<string, number> = { Index: 0, Stock: 0, 'Cash+Bond': 0 };

    data.forEach((d) => {
      if (d.Type === 'Index' || d.Type === 'Stock') {
        categories[d.Type] += d[valueKey];
      } else {
        categories['Cash+Bond'] += d[valueKey];
      }
    });

    return {
      date: LABELS[i],
      Index: Math.round((categories.Index / total) * 100),
      Stock: Math.round((categories.Stock / total) * 100),
      'Cash+Bond': Math.round((categories['Cash+Bond'] / total) * 100),
    };
  });
}

function AllocationChart({ title, data, subtitle }: { title: string; data: ProcessedRow[]; subtitle: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e5e7eb)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'var(--axis-color, #6b7280)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--axis-color, #6b7280)' }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #fff)',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            }}
          />
          <Legend />
          <Bar dataKey="Index" stackId="a" fill={COLORS.Index} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Stock" stackId="a" fill={COLORS.Stock} />
          <Bar dataKey="Cash+Bond" stackId="a" fill={COLORS['Cash+Bond']} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AllocationDashboard() {
  const [dataArrays, setDataArrays] = useState<Holding[][]>([]);

  useEffect(() => {
    Promise.all(FILES.map((f) => fetch(f).then((r) => r.json())))
      .then(setDataArrays);
  }, []);

  if (dataArrays.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  const costData = processData(dataArrays, 'Cost');
  const actualData = processData(dataArrays, 'Actual');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allocation Trends</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          How portfolio allocation has shifted over time across snapshots
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AllocationChart
          title="Cost Basis Allocation"
          subtitle="Percentage of total cost by category"
          data={costData}
        />
        <AllocationChart
          title="Market Value Allocation"
          subtitle="Percentage of current market value by category"
          data={actualData}
        />
      </div>

      {/* Summary table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold">Market Value Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Index Funds</th>
                <th className="px-6 py-3 font-medium text-right">Stocks</th>
                <th className="px-6 py-3 font-medium text-right">Cash + Bond</th>
              </tr>
            </thead>
            <tbody>
              {actualData.map((row) => (
                <tr key={row.date} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3 font-medium">{row.date}</td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.Index }}></span>
                      {row.Index}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.Stock }}></span>
                      {row.Stock}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS['Cash+Bond'] }}></span>
                      {row['Cash+Bond']}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
