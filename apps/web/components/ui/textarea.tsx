'use client';

import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={['sc-control sc-textarea', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    );
  },
);
