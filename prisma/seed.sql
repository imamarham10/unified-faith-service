-- Comprehensive Seed SQL for Auth Service Database
-- Run this in DBeaver or Aiven Query Editor
-- Make sure to run this in the 'faith' database (or your auth database)

-- 1. Insert Roles (using gen_random_uuid() for actual UUID generation)
INSERT INTO roles (id, name, slug, description, is_system_role, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'admin', 'admin', 'Full system access', true, NOW(), NOW()),
  (gen_random_uuid(), 'moderator', 'moderator', 'Content moderation access', true, NOW(), NOW()),
  (gen_random_uuid(), 'user', 'user', 'Basic authenticated user', true, NOW(), NOW()),
  (gen_random_uuid(), 'premium_user', 'premium_user', 'Premium subscription user', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Permissions (using gen_random_uuid() for actual UUID generation)
INSERT INTO permissions (id, name, slug, resource, action, description, created_at, updated_at)
VALUES 
  -- User permissions
  (gen_random_uuid(), 'users:read', 'users-read', 'users', 'read', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'users:create', 'users-create', 'users', 'create', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'users:update', 'users-update', 'users', 'update', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'users:delete', 'users-delete', 'users', 'delete', NULL, NOW(), NOW()),
  
  -- Content permissions
  (gen_random_uuid(), 'content:read', 'content-read', 'content', 'read', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'content:create', 'content-create', 'content', 'create', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'content:update', 'content-update', 'content', 'update', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'content:delete', 'content-delete', 'content', 'delete', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'content:moderate', 'content-moderate', 'content', 'moderate', NULL, NOW(), NOW()),
  
  -- Payment permissions
  (gen_random_uuid(), 'payments:read', 'payments-read', 'payments', 'read', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'payments:create', 'payments-create', 'payments', 'create', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'payments:update', 'payments-update', 'payments', 'update', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'payments:delete', 'payments-delete', 'payments', 'delete', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'payments:refund', 'payments-refund', 'payments', 'refund', NULL, NOW(), NOW()),
  
  -- Subscription permissions
  (gen_random_uuid(), 'subscriptions:read', 'subscriptions-read', 'subscriptions', 'read', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'subscriptions:create', 'subscriptions-create', 'subscriptions', 'create', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'subscriptions:update', 'subscriptions-update', 'subscriptions', 'update', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'subscriptions:delete', 'subscriptions-delete', 'subscriptions', 'delete', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'subscriptions:manage_family', 'subscriptions-manage-family', 'subscriptions', 'manage_family', NULL, NOW(), NOW()),
  
  -- AI Guru permissions
  (gen_random_uuid(), 'ai_guru:chat', 'ai-guru-chat', 'ai_guru', 'chat', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'ai_guru:unlimited', 'ai-guru-unlimited', 'ai_guru', 'unlimited', NULL, NOW(), NOW()),
  
  -- Admin permission (wildcard)
  (gen_random_uuid(), '*', 'admin-all', '*', '*', NULL, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 3. Assign ALL permissions to admin role
INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
SELECT gen_random_uuid(), r.id, p.id, NOW(), NOW()
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Assign permissions to moderator role
INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
SELECT gen_random_uuid(), r.id, p.id, NOW(), NOW()
FROM roles r, permissions p
WHERE r.name = 'moderator' AND p.name IN ('users:read', 'users:update', 'content:read', 'content:update', 'content:delete', 'content:moderate')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Assign permissions to premium_user role
INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
SELECT gen_random_uuid(), r.id, p.id, NOW(), NOW()
FROM roles r, permissions p
WHERE r.name = 'premium_user' AND p.name IN ('users:read', 'content:read', 'content:create', 'payments:read', 'subscriptions:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. Assign permissions to user role
INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
SELECT gen_random_uuid(), r.id, p.id, NOW(), NOW()
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN ('users:read', 'content:read', 'payments:read', 'subscriptions:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 7. Insert Admin User
-- Note: Password hash is for password: (you may want to change this)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active, is_verified, last_login_at, deleted_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'imamarham10@gmail.com',
  '$2b$10$D03wA.Pu1d7NAFy56ST2p.7j9OJqUrHOOeiSoURxmX9Olll2f2ZGC',
  'Arham',
  'Imam',
  '919454021277',
  true,
  false,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 8. Assign admin role to the admin user
INSERT INTO user_roles (id, user_id, role_id, assigned_at, assigned_by, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  u.id,
  r.id,
  NOW(),
  NULL,
  NOW(),
  NOW()
FROM users u, roles r
WHERE u.email = 'imamarham10@gmail.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify the data
SELECT 'Roles created:' as status, COUNT(*) as count FROM roles;
SELECT 'Permissions created:' as status, COUNT(*) as count FROM permissions;
SELECT 'Role permissions assigned:' as status, COUNT(*) as count FROM role_permissions;
SELECT 'Users created:' as status, COUNT(*) as count FROM users;
SELECT 'User roles assigned:' as status, COUNT(*) as count FROM user_roles;
