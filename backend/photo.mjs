import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { ApiError } from './gemini.mjs';

// Decode, resize and strip metadata. Never fetch a user-supplied URL.
export async function preparePhoto(image) {
  if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType) ||
      typeof image.data !== 'string' || image.data.length > 5592408 ||
      image.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) {
    throw new ApiError(400, 'INVALID_PHOTO', 'Choose a JPEG, PNG or WebP food photo under 4 MB.');
  }
  const input = Buffer.from(image.data, 'base64');
  if (!input.length || input.length > 4 * 1024 * 1024) throw new ApiError(413, 'PHOTO_TOO_LARGE', 'Choose a smaller food photo.');
  try {
    const decoder = sharp(input, { limitInputPixels: 20000000, failOn: 'warning', animated: false });
    const meta = await decoder.metadata();
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[image.mimeType];
    if (meta.format !== expected || (meta.pages ?? 1) > 1) throw new Error('Invalid format');
    const clean = await decoder.rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return { mimeType: 'image/jpeg', data: clean.toString('base64'), hash: createHash('sha256').update(clean).digest('hex') };
  } catch { throw new ApiError(400, 'INVALID_PHOTO', 'This photo could not be read. Choose another JPEG, PNG or WebP image.'); }
}
