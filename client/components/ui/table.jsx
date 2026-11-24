import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className, ...props }) => <div className="w-full overflow-x-auto"><table className={cn('w-full text-sm', className)} {...props} /></div>;
export const THead = ({ className, ...props }) => <thead className={cn('border-b border-border text-left text-xs uppercase tracking-wide text-muted', className)} {...props} />;
export const TBody = ({ className, ...props }) => <tbody className={cn('divide-y divide-border', className)} {...props} />;
export const TH = ({ className, ...props }) => <th className={cn('px-4 py-3 font-medium', className)} {...props} />;
export const TD = ({ className, ...props }) => <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
export const TR = ({ className, ...props }) => <tr className={cn('hover:bg-neutral-50/60', className)} {...props} />;
