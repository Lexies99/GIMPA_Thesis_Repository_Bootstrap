# 🚀 Quick Test Login Guide

## Test These Accounts Immediately

### 👤 Member - john.smith@student.edu
```
Email: john.smith@student.edu
Password: password123
Role: Member
Can: Download papers, Upload docs, View dashboard
```

### 👤 Member - sarah.jones@student.edu
```
Email: sarah.jones@student.edu
Password: password123
Role: Member
Can: Download papers, Upload docs, View dashboard
```

### 👨‍💼 Staff - ama.owusu@university.edu
```
Email: ama.owusu@university.edu
Password: password123
Role: Staff
Can: Everything Member can do + Review submissions
```

### 👨‍💼 Staff - michael.brown@university.edu
```
Email: michael.brown@university.edu
Password: password123
Role: Staff
Can: Everything Member can do + Review submissions
```

### 🔐 Admin - admin@murrs.edu
```
Email: admin@murrs.edu
Password: admin123
Role: Admin
Can: Everything + Create accounts, View statistics
```

### 👻 Guest
```
Click "Continue as Guest" button
Can: View catalog, Read abstracts, Search papers
Cannot: Download papers
```

---

## Test Flow Examples

### Test 1️⃣: Guest Download Redirect
1. Click "Continue as Guest"
2. Go to "Catalog" tab
3. Try to download a paper
4. ✓ Should redirect to login

### Test 2️⃣: Member Download
1. Login as: john.smith@student.edu / password123
2. Go to "Catalog" tab
3. Try to download a paper
4. ✓ Should work (show alert)

### Test 3️⃣: Admin Create Account
1. Login as: admin@murrs.edu / admin123
2. Click "Admin" tab
3. Click "Account Management"
4. Click "Create Account"
5. Fill form and submit
6. ✓ New account appears in list

### Test 4️⃣: Staff Approval Workflow
1. Login as: ama.owusu@university.edu / password123
2. Click "Approval" tab
3. Click "Review Paper"
4. Make decision (Approve/Reject/Revision)
5. ✓ Should show confirmation

---

## 🎯 Features by Role

| Feature | Guest | Member | Staff | Admin |
|---------|-------|--------|-------|-------|
| View Catalog | ✓ | ✓ | ✓ | ✓ |
| Search Papers | ✓ | ✓ | ✓ | ✓ |
| Download | ✗ | ✓ | ✓ | ✓ |
| Upload Papers | ✗ | ✓ | ✓ | ✓ |
| Dashboard | ✗ | ✓ | ✓ | ✓ |
| Review Queue | ✗ | ✗ | ✓ | ✓ |
| Create Accounts | ✗ | ✗ | ✗ | ✓ |
| View Stats | ✗ | ✗ | ✗ | ✓ |

---

## 💡 Pro Tips

- All test credentials are displayed on the login page
- You can also use any email/password to auto-create accounts
- Logout clears session from localStorage
- Session persists across page refreshes
- Check browser localStorage to verify user state

---

## 📍 App URL

```
http://localhost:5174
http://localhost:5174/login  (Direct to login)
http://localhost:5174/        (Home - default guest)
```
