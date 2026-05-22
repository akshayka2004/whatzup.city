import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isEnabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isEnabled = true;
        this.logger.log('Firebase Admin SDK initialized.');
      } catch (error) {
        this.logger.error('Firebase init failed', error);
      }
    } else {
      this.logger.warn(
        'Firebase config missing — push notifications disabled (graceful degradation).',
      );
    }
  }

  async sendToDevice(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled) {
      this.logger.debug('FCM disabled, skipping push');
      return { success: false, error: 'FCM_DISABLED' };
    }

    try {
      const messageId = await admin.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`Push to ${token.slice(0, 10)}... failed: ${error.message}`);
      return { success: false, error: error.code || error.message };
    }
  }

  async sendToMultipleDevices(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (!this.isEnabled || tokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }

    const failedTokens: string[] = [];
    let successCount = 0;

    // Send individually to track per-token failures (batch of 500 max per FCM)
    const chunks = this.chunkArray(tokens, 500);
    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((token) => this.sendToDevice(token, payload)),
      );
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          failedTokens.push(chunk[i]);
        }
      });
    }

    return {
      successCount,
      failureCount: failedTokens.length,
      failedTokens,
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
