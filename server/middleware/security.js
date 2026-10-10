import rateLimit from 'express-rate-limit';

// Standard API Rate Limiter: Maximum 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication Rate Limiter: Max 10 login/register trials per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Authentication Rate Limiter: Max 5 attempts per 15 minutes per IP
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom XSS Sanitizer: strips HTML elements and script tags recursively
export const xssSanitizer = (req, res, next) => {
  const sanitize = (data) => {
    if (typeof data === 'string') {
      return data
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
        .replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
    }
    if (Array.isArray(data)) {
      return data.map(sanitize);
    }
    if (data !== null && typeof data === 'object') {
      const clean = {};
      for (const [key, value] of Object.entries(data)) {
        clean[key] = sanitize(value);
      }
      return clean;
    }
    return data;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};
