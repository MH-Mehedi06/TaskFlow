import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed (JPEG, PNG, WebP)') as unknown as null, false);
    }
  },
});
