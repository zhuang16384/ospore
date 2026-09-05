/**
 * Minimal button primitive (cva variants) on the app's design tokens.
 * Hand-rolled instead of pulled from shadcn so variants stay small and local.
 */

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@renderer/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-bg hover:bg-accent/85',
        secondary: 'border border-rule bg-surface text-text-primary hover:accent-surface',
        ghost: 'text-text-secondary hover:accent-surface hover:text-text-primary',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/85'
      },
      size: {
        sm: 'h-7 px-2',
        md: 'h-8 px-3',
        icon: 'h-7 w-7 p-0'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'
