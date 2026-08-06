const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

export function generateStrongPassword(length = 12): string {
  let result = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const values = new Uint32Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i += 1) {
      result += CHARS[values[i] % CHARS.length];
    }
    return result;
  }
  for (let i = 0; i < length; i += 1) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}
