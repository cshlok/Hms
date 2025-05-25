-- Initial Schema Setup for HMS System Infrastructure & Security Module

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) NOT NULL,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_login TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  created_at TIMESTAMP NOT NULL,
  created_by UUID REFERENCES users(id),
  PRIMARY KEY(user_id, role_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource_type VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(resource_type, action)
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY(role_id, permission_id)
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_reason VARCHAR(255)
);

-- Create mfa_devices table
CREATE TABLE IF NOT EXISTS mfa_devices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_type VARCHAR(50) NOT NULL,
  device_identifier VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  last_used TIMESTAMP,
  UNIQUE(user_id, device_type, device_identifier)
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL
);

-- Create user_attributes table
CREATE TABLE IF NOT EXISTS user_attributes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  attribute_key VARCHAR(100) NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, attribute_key)
);

-- Create audit_events table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_subtype VARCHAR(100),
  event_action VARCHAR(20) NOT NULL,
  event_outcome VARCHAR(20) NOT NULL,
  event_outcome_desc TEXT,
  recorded_at TIMESTAMP NOT NULL,
  occurred_at TIMESTAMP NOT NULL
);

-- Create audit_agents table
CREATE TABLE IF NOT EXISTS audit_agents (
  id UUID PRIMARY KEY,
  audit_event_id UUID REFERENCES audit_events(id),
  agent_type VARCHAR(50) NOT NULL,
  agent_id VARCHAR(255),
  agent_name VARCHAR(255),
  agent_role VARCHAR(100),
  network_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL
);

-- Create audit_entities table
CREATE TABLE IF NOT EXISTS audit_entities (
  id UUID PRIMARY KEY,
  audit_event_id UUID REFERENCES audit_events(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_name VARCHAR(255),
  entity_role VARCHAR(100),
  entity_lifecycle VARCHAR(50),
  entity_detail JSONB,
  created_at TIMESTAMP NOT NULL
);

-- Create default roles
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin', 'Administrator role with full system access', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'user', 'Standard user role with basic access', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'doctor', 'Medical doctor role with clinical access', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'nurse', 'Nurse role with patient care access', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'receptionist', 'Receptionist role with scheduling access', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create default permissions
INSERT INTO permissions (id, name, description, resource_type, action, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user:create', 'Create users', 'user', 'create', NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user:read', 'Read user information', 'user', 'read', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user:update', 'Update user information', 'user', 'update', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'user:delete', 'Delete users', 'user', 'delete', NOW(), NOW()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'role:manage', 'Manage roles', 'role', 'manage', NOW(), NOW())
ON CONFLICT (resource_type, action) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id,
  NOW()
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign read permission to user role
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES (
  (SELECT id FROM roles WHERE name = 'user'),
  (SELECT id FROM permissions WHERE name = 'user:read'),
  NOW()
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create admin user (password: admin123)
INSERT INTO users (
  id, username, email, password, first_name, last_name, 
  status, mfa_enabled, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin',
  'admin@example.com',
  '$2b$10$3euPcmQFCiblsZeEu5s7p.9wVsruv1ju0hkz9n1fHGw8eqTACCLNi',
  'System',
  'Administrator',
  'active',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id, created_at, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM roles WHERE name = 'admin'),
  NOW(),
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (user_id, role_id) DO NOTHING;
