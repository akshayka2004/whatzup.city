import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class StorageSerializerInterceptor implements NestInterceptor {
  constructor(private readonly storageService: StorageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      switchMap((data) => from(this.serializeAsync(data))),
    );
  }

  private async serializeAsync(data: any): Promise<any> {
    return this.resolveStorageRefs(data);
  }

  private async resolveStorageRefs(data: any): Promise<any> {
    if (data === null || data === undefined) {
      return data;
    }

    const ref = this.parseStorageRef(data);
    if (ref) {
      const isPublic = [
        'business-media',
        'branch-media',
        'profile-media',
        'notification-media',
      ].includes(ref.bucket);
      if (isPublic) {
        return this.storageService.generatePublicUrl(ref.bucket, ref.path);
      } else {
        return await this.storageService.createSignedDownloadUrl(
          ref.bucket,
          ref.path,
        );
      }
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map((item) => this.resolveStorageRefs(item)));
    }

    if (this.isPlainObject(data)) {
      const resolvedObj: any = {};
      const keys = Object.keys(data);
      await Promise.all(
        keys.map(async (key) => {
          resolvedObj[key] = await this.resolveStorageRefs(data[key]);
        }),
      );
      return resolvedObj;
    }

    return data;
  }

  private isPlainObject(value: any): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
  }

  private parseStorageRef(val: any): { bucket: string; path: string } | null {
    if (!val) return null;
    if (typeof val === 'object') {
      if (typeof val.bucket === 'string' && typeof val.path === 'string') {
        return { bucket: val.bucket, path: val.path };
      }
      return null;
    }
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        if (
          parsed &&
          typeof parsed.bucket === 'string' &&
          typeof parsed.path === 'string'
        ) {
          return { bucket: parsed.bucket, path: parsed.path };
        }
      } catch {
        // Not a JSON string representing storage ref
      }
    }
    return null;
  }
}
