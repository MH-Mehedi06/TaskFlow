import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

if (env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function saveLocally(buffer: Buffer, publicId: string): string {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${publicId.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

export const uploadBuffer = async (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<string> => {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    return saveLocally(buffer, publicId ?? `upload_${Date.now()}`);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image', overwrite: true },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId: string): Promise<void> => {
  if (!env.CLOUDINARY_CLOUD_NAME) return;
  await cloudinary.uploader.destroy(publicId);
};
