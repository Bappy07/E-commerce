import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function StatCard({ label, value, hint, icon: Icon, accent = false }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
        </div>
        {Icon && <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? 'bg-orange-50 text-accent' : 'bg-secondary text-muted'}`}><Icon className="h-4 w-4" /></span>}
      </div>
    </Card>
  );
}
