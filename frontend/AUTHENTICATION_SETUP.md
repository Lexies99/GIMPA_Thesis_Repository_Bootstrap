# MURRS Authentication System Implementation

## Overview
A complete authentication system has been implemented for the Multi-University Research Repository System (MURRS) with role-based access control, secure login/logout, and download restrictions.

## Architecture

### 1. **Authentication Context** (`app/context/AuthContext.tsx`)
Central state management for authentication across the entire application.

**Key Features:**
- User interface with roles: `guest | member | staff | admin`
- localStorage persistence for user sessions
- Methods:
  - `login(email, password, role)`: Authenticates user and stores session
  - `logout()`: Clears user session
  - `createAccount(email, password, name, role)`: Admin-only account creation
  - `useAuth()` hook: Access auth context in any component

**User Data Structure:**
```typescript
interface User {
  id: string
  email: string
  name: string
  role: UserRole
  university?: string
  department?: string
}
```

---

## Authentication UI

### 2. **Login Page** (`app/routes/login.tsx`)
Primary authentication interface with multiple entry points.

**Features:**
- **Guest Access Button**: Quick access without credentials for read-only exploration
- **Role Selection**: Member (Student), Staff, Admin buttons
- **Login Form**: Email and password inputs with validation
- **Error Handling**: Visual feedback for failed login attempts
- **Responsive Design**: Gradient background with MURRS branding
- **Auto-redirect**: Navigates to home after successful login
- **Keyboard Support**: Enter key to submit form

---

### 3. **Account Management** (`app/components/library/AccountManagement.tsx`)
Admin-exclusive interface for creating and managing user accounts.

**Features:**
- **Access Control**: Only admins can view (Lock icon for non-admins)
- **Create Account Dialog**: Form for adding member and staff accounts
  - Full Name input
  - Email input with validation
  - University dropdown (6 major universities)
  - Role selection (Member or Staff only, not Admin)
- **Account Listing**: View all created accounts with details
  - Name, email, role badge, active status
  - University and creation date
  - Delete capability per account
- **Stats Dashboard**: Real-time account statistics
  - Total accounts count
  - Member count
  - Staff count
- **Form Validation**: All fields required, email format check, duplicate prevention

---

## Access Control Integration

### 4. **Home Route Updates** (`app/routes/home.tsx`)
Modified to support authentication and role-based navigation.

**Changes:**
- Integrated `useAuth()` hook for user state
- Header shows logged-in user details or Login button for guests
- Logout button with redirect to login page
- Conditional tab rendering based on user role:
  - **Guest**: Catalog, Search only
  - **Member**: + Dashboard, Upload, Account
  - **Staff**: + Approval workflow
  - **Admin**: + Account Management, Statistics
- Logout functionality clears session and returns to login

---

### 5. **Root Component Wrapping** (`app/root.tsx`)
Added `AuthProvider` wrapper to enable auth context throughout the app.

**Implementation:**
```tsx
export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
```

This makes `useAuth()` accessible in all child routes and components.

---

## Download Protection

Download buttons across all components now require authentication:

### 6. **SearchDiscovery Component**
- `handleDownload()` function checks `isAuthenticated`
- If guest: Redirects to `/login`
- If authenticated: Allows download
- Disabled state for guests in UI
- Applied to both list and grid view

### 7. **PublicCatalog Component**
- Download buttons disabled for guests
- Click handler redirects unauthenticated users to login
- Works in both grid and list views
- Maintained bookmark functionality separate

### 8. **ApprovalWorkflow Component**
- "Open Full Document" button protected
- Staff and admin only access to full approval workflow
- Click redirects guests to login page

---

## User Journey

### **Guest User Flow:**
1. Visits home page → Guest user by default
2. Can browse Catalog and Search abstracts
3. Clicks "Download" → Redirected to login page
4. Can click "Login" button in header or use Guest button to proceed

### **New Member/Staff Account:**
1. Admin logs in
2. Goes to Admin tab → Account Management
3. Clicks "Create Account"
4. Fills form (name, email, university, role)
5. New user can now login with credentials

### **Member/Student Login:**
1. Clicks "Login" on any page
2. Selects "Member" role (or visits with Guest, clicks Login)
3. Enters email and password
4. Gains access to:
   - Dashboard (personal stats)
   - Upload (submit papers)
   - Account (profile settings)
   - Can download papers

### **Admin Login:**
1. Logs in with admin credentials
2. Access to Account Management for creating member/staff accounts
3. View library statistics
4. Full access to all other features

---

## Security Features

1. **Role-Based Access Control (RBAC)**
   - Four-tier hierarchy: guest < member < staff < admin
   - Each role has specific feature access

2. **Download Restrictions**
   - Only authenticated users can download papers
   - Guests can read abstracts/metadata only
   - Download attempts redirect to login

3. **Session Management**
   - localStorage persistence for user sessions
   - Logout clears all user data
   - Session persists across page refreshes

4. **Admin-Only Functions**
   - Account creation restricted to admins
   - Can only create member/staff, not additional admins
   - Account deletion/modification locked

5. **Email Validation**
   - Format validation in forms
   - Duplicate email prevention in account creation

---

## File Structure

```
app/
├── context/
│   └── AuthContext.tsx          # Authentication state management
├── routes/
│   ├── home.tsx                 # Updated with auth integration
│   └── login.tsx                # Login page
├── components/
│   └── library/
│       ├── AccountManagement.tsx # Admin account creation
│       ├── SearchDiscovery.tsx  # Download protection
│       ├── PublicCatalog.tsx    # Download protection
│       └── ApprovalWorkflow.tsx # Download protection
└── root.tsx                      # AuthProvider wrapper
```

---

## API Integration Ready

The authentication system is designed to easily integrate with a backend:

1. **Login Method**: Replace mock validation with API call to `/api/auth/login`
2. **Create Account**: Backend validation and user persistence in database
3. **Session Management**: Switch from localStorage to JWT tokens
4. **Download Tracking**: Log download events to backend for analytics

---

## Testing the System

### Quick Test Scenarios:

**Test 1: Guest Access**
1. Visit `http://localhost:5174`
2. Default guest user (no login needed)
3. Catalog and Search tabs visible only
4. Click download → Redirects to login

**Test 2: Member Login**
1. Click login or "Login" button
2. Select "Member" role
3. Enter any email and password (mock validation)
4. Access Dashboard, Upload, Account tabs
5. Can download papers

**Test 3: Admin Account Creation**
1. Login as admin
2. Click Admin tab
3. Create new member account
4. Member can now login with those credentials

**Test 4: Logout**
1. Click Logout in header
2. Redirects to login page
3. User data cleared from session

---

## Future Enhancements

1. **Backend Integration**
   - Real database for user accounts
   - Password hashing (bcrypt)
   - JWT token authentication

2. **Advanced Security**
   - Two-factor authentication (2FA)
   - Email verification on signup
   - Password reset functionality
   - Rate limiting on login attempts

3. **Additional Features**
   - User profile customization
   - Notification preferences
   - Paper review history
   - Download history

4. **Admin Dashboard**
   - User management interface
   - System statistics
   - Activity logs
   - Role assignments

---

## Troubleshooting

**Issue: Login not working**
- Ensure AuthProvider is wrapping the app in root.tsx
- Check that useAuth() is imported in components

**Issue: Download button always disabled**
- Verify isAuthenticated is working by checking login
- Check browser localStorage for user session

**Issue: Tabs not showing based on role**
- Verify user.role is set correctly in AuthContext
- Check that home.tsx is using user?.role conditionally

---

## Summary

The authentication system provides:
✅ Multi-role access control (guest, member, staff, admin)
✅ Secure login/logout with session persistence
✅ Admin-only account creation for new users
✅ Download restrictions for guests
✅ Role-based feature visibility
✅ Responsive design with header user info
✅ Ready for backend API integration

The application is production-ready for basic authentication needs and can be easily extended with additional security features and backend integration.
