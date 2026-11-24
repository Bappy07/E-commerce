'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Table, THead, TBody, TH, TD, TR } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/store/empty-state';

export function DataTable({ columns = [], rows = [], searchKeys = [], searchable = true, emptyTitle = 'Nothing here yet' }) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? rows.filter((row) => searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(query.toLowerCase())))
    : rows;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {searchable && searchKeys.length > 0 && (
        <div className="border-b border-border p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="pl-9" />
          </div>
        </div>
      )}
      {!filtered.length ? <div className="p-4"><EmptyState title={emptyTitle} description={query ? 'No results match your search.' : 'New records will appear here.'} /></div> : (
        <Table>
          <THead><tr>{columns.map((column) => <TH key={column.key}>{column.label}</TH>)}</tr></THead>
          <TBody>
            {filtered.map((row, index) => (
              <TR key={row.id || row._id || index}>
                {columns.map((column) => <TD key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</TD>)}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
