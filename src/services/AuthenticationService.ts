import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, CreateUserDto, UserStatus } from '../models/User';

dotenv.config();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

export interface TokenPayload {
  userId: string;
  username: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthenticationService {
  /**
   * Hash a password using bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   * @param password Plain text password
   * @param hash Hashed password
   * @returns Boolean indicating if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens for a user
   * @param user User object
   * @returns Access token and refresh token
   */
  generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      roles: user.roles
    };

    // Calculate expiration in seconds
    const expiresIn = parseInt(JWT_EXPIRES_IN.replace(/\D/g, ''), 10) * 
      (JWT_EXPIRES_IN.includes('h') ? 3600 : 
       JWT_EXPIRES_IN.includes('d') ? 86400 : 60);

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify and decode a JWT token
   * @param token JWT token
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify a refresh token and generate new tokens
   * @param refreshToken Refresh token
   * @param user User object
   * @returns New access token and refresh token or null if invalid
   */
  refreshTokens(refreshToken: string, user: User): AuthTokens | null {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string };
      
      if (decoded.userId !== user.id) {
        return null;
      }
      
      return this.generateTokens(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Prepare user data for response (remove sensitive information)
   * @param user User object
   * @returns User object without sensitive information
   */
  prepareUserResponse(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create initial user object from DTO
   * @param createUserDto User creation data
   * @returns User object with default values
   */
  async prepareNewUser(createUserDto: CreateUserDto): Promise<Omit<User, 'id'>> {
    const hashedPassword = await this.hashPassword(createUserDto.password);
    
    return {
      username: createUserDto.username,
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phoneNumber: createUserDto.phoneNumber,
      status: UserStatus.ACTIVE,
      roles: createUserDto.roles || ['user'],
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
