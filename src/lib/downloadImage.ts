/**
 * Download an image to disk, working for both inline data URLs and
 * cross-origin signed storage URLs (where the anchor `download`
 * attribute is ignored by browsers).
 */
export async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    // Fallback: open in a new tab so the user can save it manually.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
