const STYLE = 'lorelei';
const BASE = 'https://api.dicebear.com/9.x';

export function avatarUrl(seed: string, customUrl?: string | null): string {
  if (customUrl) return customUrl;
  return `${BASE}/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}
