/**
 * Regex para detectar URLs en texto (http/https).
 * Coincide con URLs completas para no capturar dominios sueltos sin protocolo.
 */
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Extrae todas las URLs de un mensaje de texto.
 * @param text - Texto del mensaje
 * @returns Array de URLs únicas en orden de aparición
 */
export function extractUrls(text: string): string[] {
  if (!text?.trim()) return [];
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches)];
}
