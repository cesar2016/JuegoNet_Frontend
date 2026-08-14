const STYLE = 'avataaars';
const BASE = 'https://api.dicebear.com/9.x';

export function avatarUrl(seed: string, customUrl?: string | null): string {
  if (customUrl) {
    if (customUrl.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return `https://${customUrl.slice(7)}`;
    }
    return customUrl;
  }
  return `${BASE}/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}
