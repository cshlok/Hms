/**
 * User model for the HMS System Infrastructure & Security module
 */
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Hashed password
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: UserStatus;
  roles: string[];
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  PENDING = 'pending'
}

export interface UserAttributes {
  userId: string;
  attributeKey: string;
  attributeValue: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles?: string[];
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  status?: UserStatus;
  roles?: string[];
  mfaEnabled?: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: UserStatus;
  roles: string[];
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}
