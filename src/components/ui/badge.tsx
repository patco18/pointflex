import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?:
    | 'primary'
    | 'accent'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'pending';
  children: ReactNode;
}

const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';

const colorStyles: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-800',
  secondary: 'bg-gray-200 text-gray-800',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export function Badge({ color = 'primary', children, className, ...props }: BadgeProps) {
  return (
    <span className={cn(baseStyles, colorStyles[color], className)} {...props}>
      {children}
    </span>
  );
}

export default Badge;
