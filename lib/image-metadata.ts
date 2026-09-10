export type ImageMetadata = { mimeType: "image/png" | "image/jpeg"; width: number; height: number; extension: "png" | "jpg" };

const jpegStartOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function imageMetadata(bytes: Uint8Array): ImageMetadata {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { mimeType: "image/png", width: view.getUint32(16), height: view.getUint32(20), extension: "png" };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset < bytes.length) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0x00) continue;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (jpegStartOfFrameMarkers.has(marker)) {
        if (length < 7) break;
        const height = view.getUint16(offset + 3);
        const width = view.getUint16(offset + 5);
        if (width > 0 && height > 0) return { mimeType: "image/jpeg", width, height, extension: "jpg" };
        break;
      }
      offset += length;
    }
    throw new Error("JPEG starts correctly but has no valid supported start-of-frame marker with dimensions.");
  }
  throw new Error("Upload bytes must be a valid PNG or JPEG (JPEG must begin with SOI and a valid marker sequence).");
}
