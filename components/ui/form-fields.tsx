"use client";

import { forwardRef, ReactNode } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ============================================
// TYPES COMMUNS
// ============================================

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// INPUT TEXT FIELD
// ============================================

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: "text" | "email" | "tel" | "url";
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  className,
  type = "text",
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// PASSWORD FIELD
// ============================================

interface PasswordFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  showToggle?: boolean;
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "••••••••",
  disabled,
  className,
  showToggle = true,
}: PasswordFieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={placeholder}
                disabled={disabled}
                className="pr-10"
                {...field}
                value={field.value ?? ""}
              />
              {showToggle && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={disabled}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// NUMBER FIELD
// ============================================

interface NumberFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  className,
  min,
  max,
  step,
}: NumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              {...field}
              value={field.value ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value === "" ? "" : Number(value));
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// TEXTAREA FIELD
// ============================================

interface TextareaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  rows?: number;
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  className,
  rows = 3,
}: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// SELECT FIELD
// ============================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: SelectOption[];
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Sélectionner...",
  disabled,
  className,
  options,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// DATE FIELD
// ============================================

interface DateFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  minDate?: Date;
  maxDate?: Date;
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Sélectionner une date",
  disabled,
  className,
  minDate,
  maxDate,
}: DateFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  {field.value ? (
                    format(field.value, "PPP", { locale: fr })
                  ) : (
                    <span>{placeholder}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// CHECKBOX FIELD
// ============================================

interface CheckboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  checkboxLabel: string;
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  checkboxLabel,
}: CheckboxFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-row items-start space-x-3 space-y-0", className)}>
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="cursor-pointer">{checkboxLabel}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// RADIO GROUP FIELD
// ============================================

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RadioFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string }[];
  orientation?: "horizontal" | "vertical";
}

export function RadioField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  options,
  orientation = "vertical",
}: RadioFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className={cn(
                orientation === "horizontal"
                  ? "flex flex-row gap-4"
                  : "flex flex-col gap-2"
              )}
              disabled={disabled}
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                  <label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// FORM SECTION
// ============================================

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

// ============================================
// FORM ROW (pour aligner plusieurs champs)
// ============================================

export function FormRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
  );
}
