import { cn } from '@/lib/utils';
import { badgeTone } from '@/lib/format';

const tones = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

export function Badge({ children, tone, status, className }) {
  const color = tones[tone || badgeTone(status || children)] || tones.neutral;
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', color, className)}>{String(children).replaceAll('_', ' ')}</span>;
}
