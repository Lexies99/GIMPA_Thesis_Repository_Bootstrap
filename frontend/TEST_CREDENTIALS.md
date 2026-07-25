# MURRS Test Credentials

## Quick Start Testing Guide

Use these credentials to test different user roles and features in the MURRS application.

---

## 👤 Member Accounts (Student Role)

### Account 1: John Smith
- **Email**: john.smith@student.edu
- **Password**: password123
- **University**: MIT
- **Department**: Computer Science
- **Features**: Can view catalog, search papers, download papers, upload documents, view dashboard

### Account 2: Sarah Jones
- **Email**: sarah.jones@student.edu
- **Password**: password123
- **University**: Harvard
- **Department**: Physics
- **Features**: Can view catalog, search papers, download papers, upload documents, view dashboard

---

## 👨‍💼 Staff Accounts

### Account 1: Ama Owusu
- **Email**: ama.owusu@university.edu
- **Password**: password123
- **University**: Stanford
- **Department**: Library Services
- **Features**: Member features + Approval workflow, can review submissions

### Account 2: Michael Brown
- **Email**: michael.brown@university.edu
- **Password**: password123
- **University**: Oxford
- **Department**: Research Administration
- **Features**: Member features + Approval workflow, can review submissions

---

## 🔐 Admin Account

### Super Admin
- **Email**: admin@murrs.edu
- **Password**: admin123
- **University**: MURRS Central
- **Department**: System Administration
- **Features**: All member/staff features + Account Management tab
  - Create new member and staff accounts
  - Delete accounts
  - View library statistics
  - Full system access

---

## 👻 Guest Access

- **Email**: Any email (not required)
- **Password**: Any password (not required)
- **Features**: 
  - Browse public catalog
  - Search papers and read abstracts
  - View download counts and ratings
  - **Cannot**: Download papers (redirects to login)

---

## 🧪 Testing Scenarios

### Scenario 1: Guest to Member Flow
1. Start as Guest (default or click "Continue as Guest")
2. Try to download a paper → Redirected to login
3. Login as Member (john.smith@student.edu / password123)
4. Download button now works

### Scenario 2: Admin Creates New Account
1. Login as Admin (admin@murrs.edu / admin123)
2. Click "Admin" tab
3. Click "Account Management"
4. Click "Create Account" button
5. Fill form with:
   - **Name**: Test User
   - **Email**: test@university.edu
   - **University**: MIT
   - **Role**: Member
6. New account is created and listed

### Scenario 3: Member Uploads Document
1. Login as Member (sarah.jones@student.edu / password123)
2. Click "Upload" tab
3. Drag & drop or select a file
4. Fill metadata form
5. Submit for review

### Scenario 4: Staff Reviews Submissions
1. Login as Staff (ama.owusu@university.edu / password123)
2. Click "Approval" tab
3. Click "Review Paper" button
4. See submission details
5. Make decision: Approve, Reject, or Request Revision

### Scenario 5: Admin Views Statistics
1. Login as Admin (admin@murrs.edu / admin123)
2. Click "Admin" tab
3. View:
   - Account Management interface
   - Library Statistics
   - System metrics

---

## 🔑 Quick Access Tips

### From Login Page
- Test credentials are displayed in a blue box on the login page
- Copy/paste emails and passwords directly
- Select the corresponding role (Member, Staff, or Admin)

### Create Custom Test Account
- Use **any** email and password combination
- System will auto-create an account with that email as the name
- Useful for testing multiple simultaneous sessions

### Testing Different Roles
1. **Guest**: Click "Continue as Guest" button
2. **Member**: Select "Member" role, use john.smith@student.edu / password123
3. **Staff**: Select "Staff" role, use ama.owusu@university.edu / password123
4. **Admin**: Select "Admin" role, use admin@murrs.edu / admin123

---

## 📝 What to Test

### ✅ Authentication Features
- [ ] Guest access without login
- [ ] Login with correct credentials
- [ ] Login with incorrect password (should fail)
- [ ] Logout functionality
- [ ] Session persistence (refresh page, user still logged in)
- [ ] Custom account creation

### ✅ Access Control
- [ ] Guest cannot download papers
- [ ] Member can download papers
- [ ] Staff can access approval workflow
- [ ] Admin can access account management
- [ ] Tabs show/hide based on role

### ✅ Download Protection
- [ ] Guest clicked download → redirects to login
- [ ] Member clicked download → saves file
- [ ] Staff can download from approval workflow
- [ ] Download buttons disabled for guests (visual)

### ✅ Admin Features
- [ ] Create member account
- [ ] Create staff account
- [ ] Cannot create admin account
- [ ] Delete created account
- [ ] View account statistics
- [ ] View library statistics

### ✅ UI/UX
- [ ] Header shows logged-in user name and role
- [ ] Logout button works
- [ ] Login page displays test credentials
- [ ] Role selection buttons work
- [ ] Navigation between tabs works
- [ ] Mobile responsive design

---

## 🐛 Troubleshooting

### Login not working
- Verify email and password are correct
- Check role matches the account type
- Try creating a custom account with any email/password

### Can't see Admin tab
- Make sure you're logged in as admin (admin@murrs.edu / admin123)
- Check browser console for errors
- Logout and login again

### Download still disabled after login
- Refresh the page to ensure session is loaded
- Check that localStorage has user data
- Try logging out and logging back in

### Can't create account as admin
- Verify you're logged in as admin
- All fields must be filled (Name, Email, University, Role)
- Email should be unique (not already created)

---

## 📞 Support

For issues with test credentials or testing environment:
1. Check the AUTHENTICATION_SETUP.md file for architecture details
2. Check AuthContext.tsx for test account definitions
3. Review login.tsx for UI implementation
4. Check browser console for JavaScript errors

---

**Last Updated**: January 21, 2026
**Test Environment**: Development (npm run dev)
