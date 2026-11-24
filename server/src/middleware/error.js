import mongoose from 'mongoose';
import multer from 'multer';
import { env } from '../config/env.js';
import { fail } from '../utils/api.js';

export function notFound(req, res) {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Something went wrong';
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Please check the submitted data';
    details = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if (error.code === 11000) {
    status = 409;
    message = 'That value is already in use';
  } else if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Images must be smaller than 5 MB' : error.message;
  }

  if (status >= 500 && env.isProduction) message = 'Something went wrong on our end';
  if (status >= 500) console.error(error);
  fail(res, status, message, details);
}
