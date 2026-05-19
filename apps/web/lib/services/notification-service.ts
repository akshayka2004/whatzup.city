// Notification service - Placeholder for toast/notification logic
// Integrate with Sonner or another notification library

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

class NotificationService {
  /**
   * Show a success notification
   */
  success(title: string, message?: string): void {
    console.log(`[Success] ${title}: ${message || ''}`);
    // TODO: Integrate with Sonner or toast library
    // toast.success(title, { description: message })
  }

  /**
   * Show an error notification
   */
  error(title: string, message?: string): void {
    console.error(`[Error] ${title}: ${message || ''}`);
    // TODO: Integrate with Sonner or toast library
    // toast.error(title, { description: message })
  }

  /**
   * Show an info notification
   */
  info(title: string, message?: string): void {
    console.info(`[Info] ${title}: ${message || ''}`);
    // TODO: Integrate with Sonner or toast library
    // toast.info(title, { description: message })
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message?: string): void {
    console.warn(`[Warning] ${title}: ${message || ''}`);
    // TODO: Integrate with Sonner or toast library
    // toast.warning(title, { description: message })
  }
}

export const notificationService = new NotificationService();
