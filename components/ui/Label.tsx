import { LabelHTMLAttributes } from 'react';

export function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1 block text-xs font-medium text-muted ${className}`} {...props} />;
}
