import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'gray' | 'accent';
  children: ReactNode;
}

export default function Badge({ variant = 'gray', children }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    gray: 'bg-gray-100 text-gray-600',
    accent: 'bg-accent-100 text-accent-700',
  };

  return <span className={`badge ${variants[variant]}`}>{children}</span>;
}
