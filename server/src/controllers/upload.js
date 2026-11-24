import { asyncHandler, ok } from '../utils/api.js';
import { uploadImage } from '../config/cloudinary.js';

export const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    return ok(res, [], 'No images uploaded');
  }
  const images = [];
  for (const file of req.files) {
    images.push(await uploadImage(file.buffer));
  }
  ok(res, images, `${images.length} image(s) uploaded`, 201);
});
