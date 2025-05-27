import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => (
    <form
      ref={ref}
      className={cn("space-y-6", className)}
      {...props}
    />
  )
);
Form.displayName = "Form";

interface FormFieldProps {
  name: string;
  label?: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ name, label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={name}>{label}</Label>}
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

function FormInput({ label, name, error, className, ...props }: FormInputProps) {
  return (
    <FormField name={name || ''} label={label} error={error}>
      <Input 
        id={name} 
        name={name} 
        className={cn(error && "border-red-500", className)} 
        {...props} 
      />
    </FormField>
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

function FormTextarea({ label, name, error, className, ...props }: FormTextareaProps) {
  return (
    <FormField name={name || ''} label={label} error={error}>
      <Textarea 
        id={name} 
        name={name} 
        className={cn(error && "border-red-500", className)} 
        {...props} 
      />
    </FormField>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

function FormSelect({ label, name, error, options, className, ...props }: FormSelectProps) {
  return (
    <FormField name={name || ''} label={label} error={error}>
      <select
        id={name}
        name={name}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

function FormSubmit({ children, isLoading, className, ...props }: FormSubmitProps) {
  return (
    <Button
      type="submit"
      className={cn("w-full", className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </Button>
  );
}

export { Form, FormField, FormInput, FormTextarea, FormSelect, FormSubmit };
