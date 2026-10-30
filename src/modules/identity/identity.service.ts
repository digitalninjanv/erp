import { db } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyPassword, hashPassword } from "../../shared/kernel/security";

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  email?: string | null;
  assignedLocationId?: string | null;
  roles: string[];
  permissions: string[];
}

export class IdentityService {
  static async login(username: string, plainPassword: string): Promise<UserSession | null> {
    const [user] = await db
      .select()
      .from(s.users)
      .where(eq(s.users.username, username.trim()))
      .limit(1);

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return await this.buildSession(user.id);
  }

  static async buildSession(userId: string): Promise<UserSession> {
    const [user] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);
    if (!user) throw new Error("Pengguna tidak ditemukan");

    // Fetch user roles
    const userRoleRows = await db
      .select({ roleId: s.userRoles.roleId })
      .from(s.userRoles)
      .where(eq(s.userRoles.userId, userId));

    const roleIds = userRoleRows.map((r) => r.roleId);

    // If owner role is present, grant all permissions
    let permissions: string[] = [];
    if (roleIds.includes("owner")) {
      const allPerms = await db.select({ id: s.permissions.id }).from(s.permissions);
      permissions = allPerms.map((p) => p.id);
    } else if (roleIds.length > 0) {
      const rolePermRows = await db
        .select({ permId: s.rolePermissions.permissionId })
        .from(s.rolePermissions)
        .where(inArray(s.rolePermissions.roleId, roleIds));
      permissions = Array.from(new Set(rolePermRows.map((rp) => rp.permId)));
    }

    return {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      assignedLocationId: user.assignedLocationId,
      roles: roleIds,
      permissions,
    };
  }

  static async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const session = await this.buildSession(userId);
    if (session.roles.includes("owner")) return true;
    return session.permissions.includes(permissionKey);
  }

  static async recordAuditLog(params: {
    userId?: string | null;
    action: string;
    module: string;
    resourceType: string;
    resourceId?: string | null;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    await db.insert(s.auditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: params.userId || null,
      action: params.action,
      module: params.module,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
    });
  }

  static async listUsers() {
    return await db.select().from(s.users);
  }

  static async listRoles() {
    return await db.select().from(s.roles);
  }

  static async listPermissions() {
    return await db.select().from(s.permissions);
  }
}
