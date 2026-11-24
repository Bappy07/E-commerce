import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('surface', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
export const CardTitle = ({ className, ...props }) => <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
export const CardDescription = ({ className, ...props }) => <p className={cn('text-sm text-muted', className)} {...props} />;
export const CardContent = ({ className, ...props }) => <div className={cn('p-5 pt-0', className)} {...props} />;
export const CardFooter = ({ className, ...props }) => <div className={cn('flex items-center gap-3 p-5 pt-0', className)} {...props} />;
