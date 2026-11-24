export class ApiError extends Error {
  constructor(status = 500, message = 'Something went wrong', details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function ok(res, data = null, message, status = 200, meta) {
  const body = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function fail(res, status, message, details) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

export function pagination(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
