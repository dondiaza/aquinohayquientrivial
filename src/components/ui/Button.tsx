import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type ButtonTone = 'verde' | 'rojo' | 'mostaza' | 'papel' | 'fantasma';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const TONE_CLASS: Record<ButtonTone, string> = {
  verde: 'btn-verde',
  rojo: 'btn-rojo',
  mostaza: 'btn-mostaza',
  papel: 'btn-papel',
  fantasma: 'btn-fantasma',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  xl: 'btn-xl',
};

export function buttonClass(
  tone: ButtonTone = 'verde',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return ['btn', TONE_CLASS[tone], SIZE_CLASS[size], extra].filter(Boolean).join(' ');
}

type ButtonProps = ComponentProps<'button'> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({ tone = 'verde', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
};

export function LinkButton({
  tone = 'verde',
  size = 'md',
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </Link>
  );
}
