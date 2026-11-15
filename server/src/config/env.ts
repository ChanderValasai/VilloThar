import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret:
    process.env.JWT_SECRET ||
    'villothar-local-dev-jwt-secret-change-in-production-2026',
  cnicEncryptionKey:
    process.env.CNIC_ENCRYPTION_KEY ||
    'villothar-local-dev-32byte-cnic-key!',
  mongodbUri: process.env.MONGODB_URI || '',
  nadra: {
    endpoint: process.env.NADRA_API_ENDPOINT || '',
    clientId: process.env.NADRA_CLIENT_ID || '',
    clientSecret: process.env.NADRA_CLIENT_SECRET || '',
    mode: process.env.NADRA_INTEGRATION_MODE || 'sandbox',
  },
  network: {
    controllerType: process.env.NETWORK_CONTROLLER_TYPE || 'none',
    controllerUrl: process.env.NETWORK_CONTROLLER_URL || '',
    controllerToken: process.env.NETWORK_CONTROLLER_TOKEN || '',
    radiusHost: process.env.RADIUS_HOST || '',
    radiusSecret: process.env.RADIUS_SECRET || '',
  },
  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL || 'operator@villothar.local',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD || 'VilloThar@NOC2026!',
  },
};
