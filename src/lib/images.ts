/**
 * Shrinks large photos before they are uploaded.
 *
 * A phone screen never shows more than about 1300 pixels across, so a 4000 pixel photo only costs
 * data, loading time and memory. At 1800 pixels and high JPEG quality the picture looks the same
 * and loads many times faster. Videos, GIFs and anything already small are left alone, and if
 * anything goes wrong the original file is used.
 */
export async function prepareImage(file: File, maxEdge = 1800, quality = 0.88): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900 * 1024) { bmp.close(); return file; }
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return file; }
    ctx.fillStyle = "#0b0b12"; // transparent PNGs get the app's dark background instead of black fringes
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}