'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';

export function RevenueChart({ data = [], label = 'Revenue over time' }) {
  return (
    <Card className="p-5">
      <p className="mb-5 text-sm font-medium">{label}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity={0.28} /><stop offset="100%" stopColor="#F97316" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#737373' }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} fill="url(#chartFill)" name="Amount (৳)" />
            <Area type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} fill="transparent" name="Revenue (৳)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
