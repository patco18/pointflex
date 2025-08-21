import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  color?: 'default' | 'accent';
  children: ReactNode;
}

const baseStyles = 'rounded-xl border border-border p-6 shadow-sm';

const colorStyles: Record<string, string> = {
  default: 'bg-white',
  accent: 'bg-accent-50',
};

export function Card({ color = 'default', children, className, ...props }: CardProps) {
  return (
    <div className={cn(baseStyles, colorStyles[color], className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
