/**
 * User Limit Service
 * Manages active user sessions and enforces user limits
 */

interface ActiveUserSession {
  email: string;
  lastActivity: number;
  sessionStart: number;
}

class UserLimitService {
  private activeSessions = new Map<string, ActiveUserSession>();
  private readonly maxUsers: number;
  private readonly sessionTimeoutMs: number = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.maxUsers = parseInt(process.env.MAX_ACTIVE_USERS || "0");

    // Start cleanup interval to remove inactive sessions
    this.startCleanupInterval();
  }

  /**
   * Check if a user can access the system
   * @param userEmail - User's email address
   * @returns {success: boolean, message?: string}
   */
  public canUserAccess(userEmail: string): {
    success: boolean;
    message?: string;
  } {
    const now = Date.now();

    // Update existing user's activity
    if (this.activeSessions.has(userEmail)) {
      const session = this.activeSessions.get(userEmail)!;
      session.lastActivity = now;
      this.activeSessions.set(userEmail, session);
      return { success: true };
    }

    // If unlimited users (maxUsers = 0), allow access
    if (this.maxUsers === 0) {
      this.addActiveUser(userEmail, now);
      return { success: true };
    }

    // Clean up inactive sessions before checking limit
    this.cleanupInactiveSessions();

    // Check if we're at the user limit
    if (this.activeSessions.size >= this.maxUsers) {
      return {
        success: false,
        message:
          "Thank you! Maximum user limit reached on system. Please wait, we are upgrading our services.",
      };
    }

    // Add new user
    this.addActiveUser(userEmail, now);
    return { success: true };
  }

  /**
   * Remove a user from active sessions
   * @param userEmail - User's email address
   */
  public removeUser(userEmail: string): void {
    this.activeSessions.delete(userEmail);
  }

  /**
   * Update user's last activity timestamp
   * @param userEmail - User's email address
   */
  public updateUserActivity(userEmail: string): void {
    const session = this.activeSessions.get(userEmail);
    if (session) {
      session.lastActivity = Date.now();
      this.activeSessions.set(userEmail, session);
    }
  }

  /**
   * Get current system statistics
   */
  public getStats(): {
    activeUsers: number;
    maxUsers: number;
    isLimited: boolean;
    utilizationPercent: number;
  } {
    this.cleanupInactiveSessions();

    return {
      activeUsers: this.activeSessions.size,
      maxUsers: this.maxUsers,
      isLimited: this.maxUsers > 0,
      utilizationPercent:
        this.maxUsers > 0
          ? (this.activeSessions.size / this.maxUsers) * 100
          : 0,
    };
  }

  /**
   * Get list of active users (admin only)
   */
  public getActiveUsers(): {
    email: string;
    sessionDuration: string;
    lastActivity: string;
  }[] {
    this.cleanupInactiveSessions();
    const now = Date.now();

    return Array.from(this.activeSessions.values()).map((session) => ({
      email: session.email,
      sessionDuration: this.formatDuration(now - session.sessionStart),
      lastActivity: this.formatDuration(now - session.lastActivity) + " ago",
    }));
  }

  private addActiveUser(userEmail: string, timestamp: number): void {
    this.activeSessions.set(userEmail, {
      email: userEmail,
      lastActivity: timestamp,
      sessionStart: timestamp,
    });
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [email, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeoutMs) {
        expiredSessions.push(email);
      }
    }

    expiredSessions.forEach((email) => {
      this.activeSessions.delete(email);
    });

    if (expiredSessions.length > 0) {
      console.log(
        `Cleaned up ${expiredSessions.length} inactive user sessions`
      );
    }
  }

  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.activeSessions.clear();
  }
}

// Create singleton instance
export const userLimitService = new UserLimitService();

// Cleanup on process exit
process.on("SIGTERM", () => userLimitService.destroy());
process.on("SIGINT", () => userLimitService.destroy());
