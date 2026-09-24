// Copy the photo into a plain Blob (reliable in IndexedDB on iOS/Android) and shrink huge camera images
// to at most 2400px on the long side so they don't fill the phone's storage.
export async function preparePhoto(file: File, maxDim = 2400): Promise<Blob> {
  const raw = new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' });
  try {
    const bmp = await createImageBitmap(raw);
    const s = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (s === 1) return raw;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((r) => c.toBlob((b) => r(b || raw), 'image/jpeg', 0.88));
  } catch { return raw; }
}
