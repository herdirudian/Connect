export const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  
  // Booking & Operations
  MANAGE_BOOKINGS: 'MANAGE_BOOKINGS',
  SCAN_TICKETS: 'SCAN_TICKETS',
  
  // Content Management
  MANAGE_ATTRACTIONS: 'MANAGE_ATTRACTIONS',
  MANAGE_FOOD: 'MANAGE_FOOD',
  MANAGE_STAY: 'MANAGE_STAY',
  MANAGE_REWARDS: 'MANAGE_REWARDS',
  MANAGE_PROMOS: 'MANAGE_PROMOS',
  
  // System
  MANAGE_TIERS: 'MANAGE_TIERS',
  MANAGE_REFERRALS: 'MANAGE_REFERRALS',
  VIEW_REPORTS: 'VIEW_REPORTS',
};

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.MANAGE_USERS]: 'Kelola Member',
  [PERMISSIONS.MANAGE_ROLES]: 'Kelola Akses & Role',
  [PERMISSIONS.MANAGE_BOOKINGS]: 'Kelola Booking',
  [PERMISSIONS.SCAN_TICKETS]: 'Scan Tiket/Voucher',
  [PERMISSIONS.MANAGE_ATTRACTIONS]: 'Kelola Wahana',
  [PERMISSIONS.MANAGE_FOOD]: 'Kelola F&B',
  [PERMISSIONS.MANAGE_STAY]: 'Kelola Penginapan',
  [PERMISSIONS.MANAGE_REWARDS]: 'Kelola Reward',
  [PERMISSIONS.MANAGE_PROMOS]: 'Kelola Promo Partner',
  [PERMISSIONS.MANAGE_TIERS]: 'Setting Membership Tier',
  [PERMISSIONS.MANAGE_REFERRALS]: 'Setting Referral',
  [PERMISSIONS.VIEW_REPORTS]: 'Lihat Laporan/Dashboard',
};

export const ROLE_DEFAULT_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  STAFF: [
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.SCAN_TICKETS,
    PERMISSIONS.MANAGE_FOOD,
  ],
  VERIFICATOR: [
    PERMISSIONS.SCAN_TICKETS,
  ],
  MEMBER: [],
};

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(userPermissions: string[] | string | null, permission: string): boolean {
  if (!userPermissions) return false;
  
  let permissions: string[] = [];
  
  if (Array.isArray(userPermissions)) {
    permissions = userPermissions;
  } else if (typeof userPermissions === 'string') {
    try {
      permissions = JSON.parse(userPermissions);
    } catch {
      return false;
    }
  }
  
  return permissions.includes(permission);
}
