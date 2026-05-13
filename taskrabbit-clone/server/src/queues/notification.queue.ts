import Bull from 'bull';
import { env } from '../config/env';
import { emailService } from '../services/email.service';

import { sendPushNotification } from '../services/push.service';
import { logger } from '../utils/logger';

export interface NotificationJobData {
  type: 'email' | 'push';
  // email
  emailTo?: string;
  emailSubject?: string;
  emailHtml?: string;
  // push
  fcmToken?: string;
  pushTitle?: string;
  pushBody?: string;
  pushData?: Record<string, string>;
}

export const notificationQueue = new Bull<NotificationJobData>('notifications', {
  redis: env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

notificationQueue.process(async (job) => {
  const d = job.data;
  try {
    if (d.type === 'email' && d.emailTo && d.emailSubject && d.emailHtml) {
      await emailService.sendRaw(d.emailTo, d.emailSubject, d.emailHtml);
    } else if (d.type === 'push' && d.fcmToken && d.pushTitle && d.pushBody) {
      await sendPushNotification(d.fcmToken, d.pushTitle, d.pushBody, d.pushData);
    }
  } catch (err) {
    logger.error(`Notification job ${job.id} failed:`, err);
    throw err;
  }
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job failed after all retries: ${job.id}`, err.message);
});
