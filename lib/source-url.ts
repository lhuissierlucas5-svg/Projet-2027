/** Only pass an exact excerpt checked against the article, never an editorial summary. */
export function sourceUrl(value: string, excerpt?: string | null): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    const text = excerpt?.trim().replace(/\s+/g, " ");
    // PDF sources retain their verified page number: text-fragment support varies by viewer.
    if (!text || /\.pdf$/i.test(url.pathname)) return url.href;
    const anchor = url.hash.split(":~:")[0];
    const encoded = encodeURIComponent(text).replace(/-/g, "%2D");
    url.hash = `${anchor}:~:text=${encoded}`;
    return url.href;
  } catch { return undefined; }
}
export function sourceLinkTitle(excerpt?: string | null) {
  return excerpt?.trim() ? "Ouvrir le passage précis dans la source (selon navigateur et accès à l’article)" : "Ouvrir la source — passage précis non encore repéré";
}
