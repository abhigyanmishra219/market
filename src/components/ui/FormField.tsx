import React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  helperText?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  optional,
  error,
  helperText,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={htmlFor} className="text-sm font-medium text-dark-text select-none">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {optional && <span className="text-xs text-muted-text font-normal">Optional</span>}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-text">{helperText}</p>
      ) : null}
    </div>
  );
}
