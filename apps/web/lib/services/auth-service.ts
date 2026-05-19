// Auth service - Mock implementation for SaaS platform roles
// Predefined credentials:
// 1. Public User: user@platform.com / password123
// 2. Business Owner: business@platform.com / password123
// 3. Admin Moderator: admin@platform.com / password123
// 4. Super Admin: superadmin@platform.com / password123

export type UserRole = 'user' | 'business' | 'admin' | 'super-admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export const MOCK_USERS: Record<UserRole, User> = {
  user: {
    id: 'u-01',
    email: 'user@platform.com',
    name: 'Jane Doe',
    role: 'user',
    createdAt: new Date('2024-05-01'),
  },
  business: {
    id: 'b-01',
    email: 'business@platform.com',
    name: 'John Business',
    role: 'business',
    createdAt: new Date('2024-03-15'),
  },
  admin: {
    id: 'a-01',
    email: 'admin@platform.com',
    name: 'Alex Moderator',
    role: 'admin',
    createdAt: new Date('2023-10-10'),
  },
  'super-admin': {
    id: 'sa-01',
    email: 'superadmin@platform.com',
    name: 'Sam Super',
    role: 'super-admin',
    createdAt: new Date('2023-06-20'),
  },
};

class AuthService {
  /**
   * Get current user from session/token
   */
  async getCurrentUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('user_session');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User | null> {
    if (password !== 'password123') return null;

    const matchedUser = Object.values(MOCK_USERS).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (matchedUser && typeof window !== 'undefined') {
      localStorage.setItem('user_session', JSON.stringify(matchedUser));
      return matchedUser;
    }

    return null;
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, name: string): Promise<User | null> {
    const newUser: User = {
      id: `u-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      role: 'user',
      createdAt: new Date(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('user_session', JSON.stringify(newUser));
      return newUser;
    }

    return null;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(user: User | null, requiredRole: UserRole): boolean {
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      business: 2,
      admin: 3,
      'super-admin': 4,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }
}

export const authService = new AuthService();
