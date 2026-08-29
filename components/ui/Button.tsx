import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'w-full min-h-[44px] rounded-none px-6 py-3 text-base font-normal transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white'
      : 'bg-surface text-text border border-border';

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
