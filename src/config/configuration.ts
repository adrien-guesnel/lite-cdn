export default () => ({
  port: parseInt(process.env.PORT, 10) || 11111,
  allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  saveMaxHeight: Number(process.env.SAVE_MAX_HEIGHT) || 1080,
  saveMaxWidth: Number(process.env.SAVE_MAX_WIDTH) || 1920,
  apiWindowMinDelay: Number(process.env.API_WINDOW_MIN_DELAY) || 15,
  apiLimitRequestsByWindowAndIp:
    Number(process.env.API_LIMIT_REQUESTS_BY_WINDOW_AND_IP) || 50,
});
