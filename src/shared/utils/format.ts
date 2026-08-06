/** DUI salvadoreno: 8 digitos + digito verificador -> 00000000-0 */
export function formatDui(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 8) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}

/** Telefono salvadoreno: 8 digitos -> 0000-0000 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** NIT salvadoreno: 14 digitos -> 0000-000000-000-0 */
export function formatNit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let result = digits.slice(0, 4);
  if (digits.length > 4) result += `-${digits.slice(4, 10)}`;
  if (digits.length > 10) result += `-${digits.slice(10, 13)}`;
  if (digits.length > 13) result += `-${digits.slice(13, 14)}`;
  return result;
}
