/**
 * Button — shared button primitive.
 */
import './Button.css';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * A styled button with multiple visual variants and sizes.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} button--${size} ${className}`.trim()}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
