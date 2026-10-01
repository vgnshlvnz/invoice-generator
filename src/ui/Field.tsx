/**
 * Field — shared form field primitive with label and error display.
 */
import './Field.css';
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
}

/**
 * Wraps a form control with a label and optional error message.
 * Uses aria-describedby to link the input to its error for accessibility.
 */
export function Field({ label, error, id, children }: FieldProps) {
  const errorId = `${id}-error`;

  const errorProps: Record<string, string | undefined> = {};
  if (error) {
    errorProps['aria-describedby'] = errorId;
  }

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {children}
      {error && (
        <span id={errorId} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
