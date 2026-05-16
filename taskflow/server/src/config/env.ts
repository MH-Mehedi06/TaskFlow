import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key: string, defaultVal = ''): string => process.env[key] ?? defaultVal;

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  MONGODB_URI: optional('MONGODB_URI', 'mongodb://localhost:27017/taskflow'),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),
  JWT_SECRET: optional('NODE_ENV') === 'production' ? required('JWT_SECRET') : optional('JWT_SECRET', 'dev_jwt_secret_change_in_production'),
  JWT_REFRESH_SECRET: optional('NODE_ENV') === 'production' ? required('JWT_REFRESH_SECRET') : optional('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_in_production'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),
  GMAIL_USER: optional('GMAIL_USER'),         // e.g. yourapp@gmail.com
  GMAIL_APP_PASSWORD: optional('GMAIL_APP_PASSWORD'), // Gmail App Password (not your Google password)
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET'),
  OPENAI_API_KEY: optional('OPENAI_API_KEY'),
  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET'),
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  GOOGLE_MAPS_API_KEY: optional('GOOGLE_MAPS_API_KEY'),
  FIREBASE_PROJECT_ID: optional('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY: optional('FIREBASE_PRIVATE_KEY'),
  FIREBASE_CLIENT_EMAIL: optional('FIREBASE_CLIENT_EMAIL'),
  PLATFORM_FEE_PERCENT: parseInt(optional('PLATFORM_FEE_PERCENT', '20'), 10),
};
