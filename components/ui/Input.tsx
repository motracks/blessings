import { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full min-h-[44px] rounded-none border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted outline-none focus:border-accent transition-all duration-300 ${className}`}
      {...props}
    />
  );
}
