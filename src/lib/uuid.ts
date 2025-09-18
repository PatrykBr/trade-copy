/**
 * Safe UUID generator that works in all environments
 * Falls back to Math.random if crypto.randomUUID is not available
 */
export function safeRandomUUID(): string {
  // Try native crypto.randomUUID first
  if (typeof globalThis !== 'undefined') {
    const g: any = globalThis as any;
    try {
      if (g.crypto?.randomUUID) {
        return g.crypto.randomUUID();
      }
      // Try crypto.getRandomValues for better entropy
      if (g.crypto?.getRandomValues) {
        const bytes = new Uint8Array(16);
        g.crypto.getRandomValues(bytes);
        // RFC4122 v4 manual format
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
    } catch (error) {
      // Fallback to Math.random if crypto fails
      console.warn('crypto.randomUUID not available, falling back to Math.random');
    }
  }
  
  // Fallback using Math.random (not cryptographically strong but functional)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}