/**
 * Papeleo: campos de formulario con estética de instancia administrativa.
 * Sin estado propio (funcionan igual en Server y Client Components).
 */

import type { ComponentProps, ReactNode } from 'react';

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="etiqueta" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-tinta-tenue">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rojo-buzon" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`campo ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`campo ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={`campo ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Casilla grande, cómoda en móvil. */
export function Checkbox({
  label,
  hint,
  className = '',
  ...rest
}: ComponentProps<'input'> & { label: string; hint?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-6 w-6 flex-none accent-verde-portal"
        {...rest}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-tinta-suave">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Grupo de opciones tipo "tarjeta seleccionable" con radios reales debajo:
 * accesible con teclado y sin JavaScript.
 */
export function OptionCards({
  name,
  options,
  defaultValue,
  columns = 2,
}: {
  name: string;
  options: { value: string; label: string; description?: string; badge?: string }[];
  defaultValue?: string;
  columns?: 1 | 2 | 3;
}) {
  const columnClass =
    columns === 1 ? 'sm:grid-cols-1' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  return (
    <div className={`grid grid-cols-1 gap-2 ${columnClass}`} role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label
          key={option.value}
          className="group flex cursor-pointer items-start gap-3 border-2 border-linea-fuerte bg-papel p-3 transition-colors hover:border-tinta has-checked:border-tinta has-checked:bg-mostaza-claro"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={defaultValue === option.value}
            className="mt-0.5 h-5 w-5 flex-none accent-verde-portal"
          />
          <span className="min-w-0">
            <span className="texto-cartel block text-base leading-tight">{option.label}</span>
            {option.description ? (
              <span className="block text-xs text-tinta-suave">{option.description}</span>
            ) : null}
            {option.badge ? <span className="chip mt-1">{option.badge}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
