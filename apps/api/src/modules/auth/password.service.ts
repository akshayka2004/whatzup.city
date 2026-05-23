import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  /**
   * Hash password using Argon2id algorithm
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 32768, // 32 MB — faster on VPS, still OWASP-compliant
      timeCost: 2,
      parallelism: 4,
    });
  }

  /**
   * Verify password against hash
   */
  async compare(password: string, hash: string): Promise<boolean> {
    try {
      if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(password, hash);
      }
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Enforces strength requirements for user passwords
   */
  isStrongPassword(password: string): boolean {
    if (password.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
  }
}
