/**
 * Minimal text input + textarea primitives on the app's design tokens.
 */

import { forwardRef } from 'react'
import { cn } from '@renderer/lib/utils'

const fieldClass =
  'w-full rounded-md border border-rule bg-bg px-2.5 py-1.5 text-note text-text-primary placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, 'h-9', className)} {...props} />
))
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, 'resize-none', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'
