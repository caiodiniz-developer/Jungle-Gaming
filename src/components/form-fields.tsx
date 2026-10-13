import { EyeIcon } from "lucide-react";
import { useId, useState } from "react";
import chevronDownIcon from "@/assets/icons/chevron-down.svg";
import eyeOffIcon from "@/assets/icons/eye-off.svg";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const controlClass =
  "h-10 w-full min-w-0 rounded-sm border border-input bg-transparent px-3 text-sm text-foreground transition-colors outline-none placeholder:text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  /** Rótulo só para leitores de tela (campos do layout que usam apenas placeholder). */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

/** Rótulo, campo e mensagem de erro associados por `for`/`id` e `aria-describedby`. */
function FieldShell({ id, label, required, hideLabel, error, hint, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <label
        htmlFor={id}
        className={cn("flex min-h-[29px] items-center text-[15px] leading-none", hideLabel && "sr-only")}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[22px] leading-[29px] text-coral">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-4 text-sand">
          {hint}
        </p>
      )}
      {error && (
        // o ícone textual "Erro:" (só para leitores de tela) evita depender da cor
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs leading-4 text-coral">
          <span className="sr-only">Erro: </span>
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type CommonProps = Pick<FieldShellProps, "label" | "required" | "hideLabel" | "error" | "hint"> & {
  fieldClassName?: string;
};

type TextFieldProps = CommonProps &
  React.ComponentProps<"input"> & {
    /** Elemento fixo à esquerda do campo, na mesma linha (ex.: o sufixo ".eth"). */
    leading?: React.ReactNode;
  };

export function TextField({
  label,
  required,
  hideLabel,
  error,
  hint,
  fieldClassName,
  className,
  id,
  leading,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const input = (
    <input
      id={fieldId}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      className={cn(controlClass, className)}
      {...inputProps}
    />
  );
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      {leading ? <div className="flex gap-2.5">{leading}{input}</div> : input}
    </FieldShell>
  );
}

/** Campo de senha com botão para mostrar ou ocultar o valor. */
export function PasswordField({
  label,
  required,
  hideLabel,
  error,
  hint,
  fieldClassName,
  className,
  id,
  ...inputProps
}: Omit<TextFieldProps, "leading">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(controlClass, "pr-11", className)}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle transition-colors hover:text-highlight"
        >
          {visible ? <EyeIcon className="size-[18px]" /> : <Icon src={eyeOffIcon} className="size-[18px]" />}
        </button>
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = CommonProps &
  React.ComponentProps<"select"> & {
    placeholder: string;
    options: { value: string; label: string }[];
  };

export function SelectField({
  label,
  required,
  hideLabel,
  error,
  hint,
  fieldClassName,
  className,
  id,
  placeholder,
  options,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      <div className="relative">
        <select
          id={fieldId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(controlClass, "appearance-none pr-10 has-[option[value='']:checked]:text-subtle", className)}
          {...selectProps}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          src={chevronDownIcon}
          className="pointer-events-none absolute top-1/2 right-2.5 size-[18px] -translate-y-1/2 text-subtle"
        />
      </div>
    </FieldShell>
  );
}

/** Mensagem geral do formulário (erros que não pertencem a um campo). */
export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-sm border border-coral/60 bg-coral/10 px-3 py-2 text-sm leading-5 text-foreground">
      <span className="sr-only">Erro: </span>
      {message}
    </p>
  );
}
