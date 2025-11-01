/*
 * Copyright 2025 Daniel Nery Frangilo Paiva
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:bg-indigo-600/50',
  secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/80 shadow-sm disabled:opacity-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-600/50',
  ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80 disabled:opacity-50',
  link: 'text-indigo-600 dark:text-indigo-400 underline-offset-4 hover:underline disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-md text-sm',
  md: 'h-10 px-4 py-2 rounded-lg text-sm',
  lg: 'h-11 px-5 rounded-lg text-base',
  icon: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'div' : 'button';
    
    const combinedClassName = [
      'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
      'disabled:pointer-events-none',
      variantClasses[variant],
      sizeClasses[size],
      className
    ].filter(Boolean).join(' ');

    // A conversão para `any` é uma solução pragmática para um desafio de tipagem conhecido com componentes polimórficos e `forwardRef` em TypeScript.
    return <Comp className={combinedClassName} ref={ref as any} {...(props as any)} />;
  }
);
Button.displayName = 'Button';