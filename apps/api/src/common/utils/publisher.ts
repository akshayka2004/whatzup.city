import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service';

const PLATFORM_PUBLISHERS = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);

export type Publisher = { id: string; role?: string | null };

export function isPlatformPublisher(user: Publisher): boolean {
  return !!user.role && PLATFORM_PUBLISHERS.has(user.role);
}

/**
 * Civic notices appear on the home page as official. Government and civic
 * accounts can be self-registered, so they may publish only once a platform
 * admin has approved their organisation (an APPROVED entity). Platform staff
 * and admins always can.
 */
export async function assertVerifiedPublisher(db: DatabaseService, user: Publisher) {
  if (isPlatformPublisher(user)) return;
  const approved = await db.entity.findFirst({
    where: { userId: user.id, status: 'APPROVED' },
    select: { id: true },
  });
  if (!approved) {
    throw new ForbiddenException(
      'Your organisation must be verified by Whtzup.city before you can publish notices.',
    );
  }
}

/** Only the publisher who created a notice (or platform staff/admins) may change it. */
export async function assertOwnsAnnouncement(db: DatabaseService, id: string, user: Publisher) {
  const row = await db.governmentAnnouncement.findUnique({
    where: { id },
    select: { agencyId: true },
  });
  if (!row) throw new NotFoundException('Announcement not found');
  if (isPlatformPublisher(user)) return;
  if (row.agencyId !== user.id)
    throw new ForbiddenException('You can only change your own notices');
}
