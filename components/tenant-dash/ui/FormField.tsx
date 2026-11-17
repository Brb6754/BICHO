import { Children, cloneElement, isValidElement, useId } from 'react';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';

// UN CAMPO DE FORMULARIO: etiqueta siempre visible, una ayuda corta y el
// error debajo, todos amarrados al control (htmlFor, aria-describedby,
// aria-invalid) sin que cada página tenga que inventar ids.
//
//   <FormField label="Duración" hint="En minutos. 30 si no sabes." error={err}>
//     <Input name="duration_minutes" type="number" defaultValue={30} />
//   </FormField>
//
// El hijo es UN control (Input, Select, textarea). El placeholder es un
// ejemplo, nunca la etiqueta: al escribir desaparece y la dueña ya no
// sabe qué le pedían.
export function FormField({
  label,
  hint,
  error,
  optional,
  className = '',
  children,
}: {
  label: string;
  /** Una línea: qué poner o por qué se pide. */
  hint?: string;
  error?: string | null;
  /** Marca "(opcional)"; lo normal es que todo lo que se pide sea necesario. */
  optional?: boolean;
  className?: string;
  children: React.ReactElement;
}) {
  const id = useId();
  const hintId = hint && !error ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control = Children.only(children);
  const props = (isValidElement(control) ? control.props : {}) as { id?: string };
  const controlId = props.id ?? id;

  return (
    <div className={className}>
      <Label htmlFor={controlId} className="text-[13px]">
        {label}
        {optional && <span className="font-normal"> (opcional)</span>}
      </Label>
      {cloneElement(control as React.ReactElement<Record<string, unknown>>, {
        id: controlId,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hintId && (
        <p id={hintId} className="mt-1 text-xs leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <div id={errorId} role="alert">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}
