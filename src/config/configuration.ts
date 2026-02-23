export default () => ({
  port: Number.parseInt(process.env.PORT, 10) || 11111,
  allowedOrigins: process.env.ALLOWED_ORIGINS || "*",
  crossOriginResourcePolicy:
    process.env.CROSS_ORIGIN_RESOURCE_POLICY || "same-site",
  saveMaxHeight: Number(process.env.SAVE_MAX_HEIGHT) || 1080,
  saveMaxWidth: Number(process.env.SAVE_MAX_WIDTH) || 1920,
  apiWindowMinDelay: Number(process.env.API_WINDOW_MIN_DELAY) || 15,
  apiLimitRequestsByWindowAndIp:
    Number(process.env.API_LIMIT_REQUESTS_BY_WINDOW_AND_IP) || 50,
  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  maxImagePixels: Number(process.env.MAX_IMAGE_PIXELS) || 50_000_000, // 50 megapixels default
  allowSvgUploads: process.env.ALLOW_SVG_UPLOADS === "true",
  uploadThrottle: {
    limit: Number(process.env.UPLOAD_THROTTLE_LIMIT) || 5,
    ttl: Number(process.env.UPLOAD_THROTTLE_TTL) || 60000, // 1 minute
  },
});
