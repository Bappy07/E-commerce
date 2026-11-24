import multer from 'multer';
import { ApiError } from '../utils/api.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new ApiError(400, 'Only image files are allowed'));
    cb(null, true);
  },
});

export const productImages = upload.array('images', 6);
