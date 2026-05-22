import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class PreferencesService {
  constructor(private readonly db: DatabaseService) {}

  async getPreferences(tenantId: string, userId: string) {
    const prefs = await this.db.notificationPreference.findMany({
      where: { tenantId, userId, deletedAt: null },
    });

    // Return a structured map
    const structured: Record<string, Record<string, boolean>> = {};
    for (const pref of prefs) {
      if (!structured[pref.channel]) structured[pref.channel] = {};
      structured[pref.channel][pref.type] = pref.isEnabled;
    }

    return structured;
  }

  async updatePreference(
    tenantId: string,
    userId: string,
    channel: string,
    type: string,
    isEnabled: boolean,
  ) {
    return this.db.notificationPreference.upsert({
      where: {
        tenantId_userId_channel_type: { tenantId, userId, channel, type },
      },
      create: { tenantId, userId, channel, type, isEnabled },
      update: { isEnabled },
    });
  }

  async bulkUpdatePreferences(
    tenantId: string,
    userId: string,
    preferences: { channel: string; type: string; isEnabled: boolean }[],
  ) {
    const results = await Promise.all(
      preferences.map((pref) =>
        this.updatePreference(tenantId, userId, pref.channel, pref.type, pref.isEnabled),
      ),
    );
    return { updated: results.length };
  }

  /**
   * Check if a user has opted in for a specific notification type/channel
   */
  async isEnabled(
    tenantId: string,
    userId: string,
    channel: string,
    type: string,
  ): Promise<boolean> {
    const pref = await this.db.notificationPreference.findUnique({
      where: {
        tenantId_userId_channel_type: { tenantId, userId, channel, type },
      },
    });
    // Default to enabled if no preference is set
    return pref ? pref.isEnabled : true;
  }
}
