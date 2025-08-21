import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
};

const baseStyles =
  'inline-flex items-center justify-center rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none';

const colorStyles: Record<string, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-600',
  secondary: 'bg-gray-200 text-foreground hover:bg-gray-300 focus-visible:ring-gray-300',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 focus-visible:ring-accent-600',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  color = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseStyles, colorStyles[color], sizeStyles[size], className)}
      {...props}
    >
      {icon && <span className={children ? 'mr-2' : ''}>{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
