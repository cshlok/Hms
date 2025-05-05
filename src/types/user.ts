// types/user.ts

export interface User {
  userId: number;
  username: string;
  email: string;
  fullName?: string | null;
  roleId: number;
  roleName: string; // Added for convenience in session/frontend
  isActive: boolean;
  permissions: string[]; // Added permissions property
}

