import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class UserRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'user');
  }

  async findByEmail(tenantId: string, email: string): Promise<any | null> {
    return this.model.findFirst({
      where: this.buildWhere(tenantId, { email: email.toLowerCase() }),
    });
  }

  async updateRole(tenantId: string, userId: string, role: string): Promise<any> {
    return this.update(tenantId, userId, { role: role as any });
  }

  async findWithRoles(tenantId: string, id: string): Promise<any | null> {
    return this.findOne(tenantId, id, {
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
