import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/lib/http";

/**
 * Leva os erros da API aos campos do formulário. Devolve a mensagem geral
 * quando o erro não aponta um campo conhecido (falha de rede, 5xx…).
 */
export function applyApiError<Values extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<Values>,
  knownFields: readonly Path<Values>[],
): string | null {
  let applied = false;
  for (const [field, message] of Object.entries(error.fields)) {
    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<Values>, { type: "server", message }, { shouldFocus: !applied });
      applied = true;
    }
  }
  return applied ? null : error.message;
}
