import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class DeviceLoginRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'deviceLogin');
  }

  async registerDevice(
    tenantId: string,
    userId: string,
    data: {
      deviceToken: string;
      deviceType: string;
      os?: string;
      browser?: string;
      ipAddress?: string;
    },
  ) {
    // If token already exists on another session or device, we can update or find and update it
    const existing = await this.model.findFirst({
      where: this.buildWhere(tenantId, { deviceToken: data.deviceToken }),
    });

    if (existing) {
      return this.model.update({
        where: { id: existing.id },
        data: {
          userId,
          deviceType: data.deviceType,
          os: data.os || existing.os,
          browser: data.browser || existing.browser,
          ipAddress: data.ipAddress || existing.ipAddress,
          lastLoginAt: new Date(),
        },
      });
    }

    return this.model.create({
      data: {
        tenantId,
        userId,
        deviceToken: data.deviceToken,
        deviceType: data.deviceType,
        os: data.os,
        browser: data.browser,
        ipAddress: data.ipAddress,
      },
    });
  }

  async removeDeviceToken(tenantId: string, deviceToken: string) {
    return this.model.updateMany({
      where: this.buildWhere(tenantId, { deviceToken }),
      data: {
        deviceToken: null,
      },
    });
  }
}
