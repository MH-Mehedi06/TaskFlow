import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ITask } from '../models/Task';

const BASE_URL = env.CLIENT_URL;

// Lazily created so the transporter is only built when GMAIL_USER is set
let _transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter | null => {
  if (_transporter) return _transporter;
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return null;
  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });
  return _transporter;
};

const send = async (to: string, subject: string, html: string): Promise<void> => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`[Email mock] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"TaskFlow" <${env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error('Gmail SMTP error', err);
  }
};

const layout = (body: string) => `
  <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1D4ED8;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TaskFlow</h1>
    </div>
    <div style="padding:32px">${body}</div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280">
      © ${new Date().getFullYear()} TaskFlow. All rights reserved.
    </div>
  </div>`;

export const emailService = {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${BASE_URL}/verify-email?token=${token}`;
    await send(
      to,
      'Verify your email — TaskFlow',
      layout(`
        <h2 style="color:#111827">Welcome! Verify your email</h2>
        <p style="color:#374151">Click the button below to verify your email address.</p>
        <a href="${link}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Verify Email</a>
        <p style="color:#6b7280;font-size:14px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
      `)
    );
  },

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${BASE_URL}/reset-password?token=${token}`;
    await send(
      to,
      'Reset your password — TaskFlow',
      layout(`
        <h2 style="color:#111827">Reset your password</h2>
        <p style="color:#374151">Click the button below to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset Password</a>
        <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `)
    );
  },

  async sendBookingConfirmation(to: string, task: Partial<ITask>): Promise<void> {
    await send(
      to,
      'Booking Confirmed — TaskFlow',
      layout(`
        <h2 style="color:#111827">Your booking is confirmed!</h2>
        <p style="color:#374151"><strong>Task:</strong> ${task.title}</p>
        <p style="color:#374151"><strong>Address:</strong> ${task.address}</p>
        <p style="color:#374151"><strong>Scheduled:</strong> ${task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : 'TBD'}</p>
        <a href="${BASE_URL}/tasks/${task._id}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Task</a>
      `)
    );
  },

  async sendTaskCompletedEmail(to: string, task: Partial<ITask>): Promise<void> {
    await send(
      to,
      'Task Completed — Leave a Review',
      layout(`
        <h2 style="color:#111827">Your task is complete!</h2>
        <p style="color:#374151"><strong>${task.title}</strong> has been marked as completed.</p>
        <p style="color:#374151">How did it go? Leave a review to help others.</p>
        <a href="${BASE_URL}/tasks/${task._id}" style="display:inline-block;background:#FF6B35;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Leave a Review</a>
      `)
    );
  },

  async sendTaskerAssignedEmail(to: string, task: Partial<ITask>, taskerName: string): Promise<void> {
    await send(
      to,
      `${taskerName} accepted your task`,
      layout(`
        <h2 style="color:#111827">${taskerName} is on the way!</h2>
        <p style="color:#374151">Your tasker has accepted <strong>${task.title}</strong>.</p>
        <a href="${BASE_URL}/tasks/${task._id}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Task</a>
      `)
    );
  },

  // Generic HTML email used by the notification queue
  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    await send(to, subject, html);
  },
};
