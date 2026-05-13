import * as admin from 'firebase-admin';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (err) {
    logger.warn('Firebase Admin init failed — push notifications disabled');
  }
}

export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (!firebaseApp) {
    logger.info(`[PUSH MOCK] Token: ${fcmToken.slice(0, 12)}… | ${title}: ${body}`);
    return;
  }
  try {
    await admin.messaging(firebaseApp).send({ token: fcmToken, notification: { title, body }, data });
  } catch (err) {
    logger.error('FCM push error:', err);
  }
};
