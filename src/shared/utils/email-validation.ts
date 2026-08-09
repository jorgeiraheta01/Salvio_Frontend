/**
 * El input type="email" del navegador rechaza caracteres no-ASCII (tildes,
 * ñ, etc.) en la parte local del correo (antes del @) -- es la regla del
 * validador nativo HTML5, no algo especifico de Salvio. Sin esta misma
 * validacion en el formulario de creacion, se podian crear cuentas (admin
 * o medico) con un correo que despues el propio login del navegador
 * rechazaba, dejando la cuenta inutilizable.
 */
const ASCII_LOCAL_PART = /^[\x21-\x7E]+@/;

export function emailValidationError(email: string): string | null {
  const value = email.trim();
  if (!value) return null;
  if (!ASCII_LOCAL_PART.test(value)) {
    return `El correo "${value}" no puede tener tildes ni "ñ" antes del @ (ej. usa "n" en vez de "ñ").`;
  }
  return null;
}
