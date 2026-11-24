import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { ApiError } from '../utils/api.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export const cloudinaryReady = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

function requireCloudinary() {
  if (!cloudinaryReady) {
    throw new ApiError(503, 'Image uploads are not configured. Add Cloudinary credentials to server/.env.');
  }
}

export function uploadImage(buffer, folder = 'marketly/products') {
  requireCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }] },
      (error, result) => (error ? reject(new ApiError(502, 'Image upload failed', error.message)) : resolve({
        url: result.secure_url,
        publicId: result.public_id,
      })),
    );
    stream.end(buffer);
  });
}

export async function deleteImages(publicIds = []) {
  if (!publicIds.length) return;
  requireCloudinary();
  await cloudinary.api.delete_resources(publicIds);
}
