import { stripHtml, sanitizeHtml } from '../utils/sanitizer';
import { MediaService } from '../../modules/media/media.service';
import { OcrProcessor } from '../../modules/ocr/ocr.processor';
import { PasswordService } from '../../modules/auth/password.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('Security and Hardening Tests', () => {
  describe('Input Sanitization & XSS Prevention', () => {
    it('stripHtml should strip all HTML tags completely', () => {
      const malicious = '<script>alert("XSS")</script><b>Hello</b> <img src="x" onerror="alert(1)">World';
      const clean = stripHtml(malicious);
      expect(clean).toBe('alert("XSS")Hello World');
    });

    it('sanitizeHtml should remove dangerous tags and scripts but allow safe text', () => {
      const malicious = '<script>alert("XSS")</script><iframe src="dangerous"></iframe><b>Hello</b> <a href="javascript:alert(1)">Click</a>';
      const clean = sanitizeHtml(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<iframe>');
      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('<b>Hello</b>');
    });
  });

  describe('SSRF Protection in OCR Processor', () => {
    let mockConfigService: any;
    let processor: any;

    beforeEach(() => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'R2_ENDPOINT') return 'https://my-bucket.r2.cloudflarestorage.com';
          return defaultValue;
        }),
      };
      processor = new OcrProcessor(
        {} as any, // ocrService
        {} as any, // verificationRepo
        {} as any, // billRepo
        {} as any, // auditService
        mockConfigService as any,
      );
    });

    it('should block local/loopback IP addresses', () => {
      expect(() => processor['validateImageUrl']('http://127.0.0.1/metadata')).toThrow();
      expect(() => processor['validateImageUrl']('http://localhost:4000/api')).toThrow();
    });

    it('should block AWS metadata IP address', () => {
      expect(() => processor['validateImageUrl']('http://169.254.169.254/latest/meta-data')).toThrow();
    });

    it('should block RFC 1918 private network IPs in production', () => {
      expect(() => processor['validateImageUrl']('http://192.168.1.1/image.png')).toThrow();
      expect(() => processor['validateImageUrl']('http://10.0.0.1/image.png')).toThrow();
    });

    it('should allow local IPs in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      });
      expect(() => processor['validateImageUrl']('http://127.0.0.1/image.png')).not.toThrow();
    });

    it('should restrict host to configured Cloudflare R2 bucket in production', () => {
      expect(() =>
        processor['validateImageUrl']('https://my-bucket.r2.cloudflarestorage.com/tenant/image.png'),
      ).not.toThrow();
      expect(() =>
        processor['validateImageUrl']('https://malicious-domain.com/tenant/image.png'),
      ).toThrow('Access is restricted to the configured storage bucket domain');
    });
  });

  describe('Media Upload BOLA Prevention & MIME matching', () => {
    let mockDb: any;
    let mediaService: any;

    beforeEach(() => {
      mockDb = {
        business: {
          findUnique: jest.fn(),
        },
        media: {
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
      };

      mediaService = new MediaService(mockDb as any, { get: jest.fn() } as any);
    });

    it('should block access if business belongs to different tenant', async () => {
      mockDb.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        tenantId: 'tenant-A',
        ownerId: 'user-1',
        staff: [],
      });

      await expect(
        mediaService.validateBusinessAccess('tenant-B', 'biz-1', 'user-1', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block access if user is not owner and not staff of business', async () => {
      mockDb.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        tenantId: 'tenant-A',
        ownerId: 'user-1',
        staff: [],
      });

      await expect(
        mediaService.validateBusinessAccess('tenant-A', 'biz-1', 'user-2', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if user is owner', async () => {
      mockDb.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        tenantId: 'tenant-A',
        ownerId: 'user-1',
        staff: [],
      });

      await expect(
        mediaService.validateBusinessAccess('tenant-A', 'biz-1', 'user-1', 'USER'),
      ).resolves.not.toThrow();
    });

    it('should allow access if user is active staff', async () => {
      mockDb.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        tenantId: 'tenant-A',
        ownerId: 'user-1',
        staff: [{ userId: 'user-2', isActive: true }],
      });

      await expect(
        mediaService.validateBusinessAccess('tenant-A', 'biz-1', 'user-2', 'USER'),
      ).resolves.not.toThrow();
    });

    it('should bypass owner/staff checks for SUPER_ADMIN or MASTER_ADMIN', async () => {
      mockDb.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        tenantId: 'tenant-A',
        ownerId: 'user-1',
        staff: [],
      });

      await expect(
        mediaService.validateBusinessAccess('tenant-A', 'biz-1', 'user-2', 'SUPER_ADMIN'),
      ).resolves.not.toThrow();
    });

    it('should validate extension matching to prevent MIME spoofing', () => {
      expect(() =>
        mediaService.validateFileExtension('photo.jpg', 'image/jpeg'),
      ).not.toThrow();

      expect(() =>
        mediaService.validateFileExtension('photo.exe', 'image/jpeg'),
      ).toThrow(BadRequestException);
    });
  });

  describe('Password Hashing & Verification Backward Compatibility', () => {
    let passwordService: PasswordService;

    beforeEach(() => {
      passwordService = new PasswordService();
    });

    it('should successfully hash and verify using Argon2', async () => {
      const password = 'mySecurePassword123!';
      const hash = await passwordService.hash(password);
      expect(hash).toContain('$argon2id$');
      
      const isValid = await passwordService.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await passwordService.compare('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should successfully verify legacy Bcrypt hashes (used in seed data)', async () => {
      // Bcrypt hash for "password123"
      const bcryptHash = '$2b$10$ZER0YeR.ODmqRlyHYgwXwexdnWI3crzzz49iU5MVxWg9ngGQZgZCW';
      
      const isValid = await passwordService.compare('password123', bcryptHash);
      expect(isValid).toBe(true);

      const isInvalid = await passwordService.compare('wrongPassword', bcryptHash);
      expect(isInvalid).toBe(false);
    });
  });
});
