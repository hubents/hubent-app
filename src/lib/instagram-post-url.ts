/**
 * Instagram post/reel/TV URLs may include an optional username segment, e.g.
 * https://www.instagram.com/{user}/reel/{shortcode}/
 */
export const INSTAGRAM_POST_URL_REGEX =
  /^https?:\/\/(www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/[\w-]+\/?/;

export function isInstagramPostUrl(url: string): boolean {
  return INSTAGRAM_POST_URL_REGEX.test(url.trim());
}
