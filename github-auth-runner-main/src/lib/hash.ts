/**
 * User Management Guide for Eduvanca Billing
 * 
 * IMPORTANT: For security, user creation is handled through Supabase Dashboard.
 * 
 * To create users manually (Admin only):
 * 1. Go to Supabase Dashboard -> Authentication -> Users
 * 2. Click "Add User" and enter email/password
 * 3. The user can then login with those credentials
 * 
 * To disable public signups:
 * 1. Go to Supabase Dashboard -> Authentication -> Providers
 * 2. Under Email provider settings
 * 3. Toggle "Enable email signups" to OFF
 * 
 * This ensures only admin-created users can access the system.
 */

export const USER_CREATION_GUIDE = `
Admin User Creation Guide:

1. Login to Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" button
4. Enter email and password
5. User can now login with these credentials

Security Note: 
- Disable public signups in Authentication settings
- Only create users through Supabase Dashboard
- Never share admin credentials
`;
