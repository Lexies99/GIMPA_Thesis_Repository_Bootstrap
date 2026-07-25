import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { User, Lock, Edit2, Mail, Building2, Eye, EyeOff } from 'lucide-react'

export function Profile() {
  const { user, changePassword, updateProfile } = useAuth()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editDepartment, setEditDepartment] = useState(user?.department || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [editError, setEditError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const handleEditProfile = async () => {
    setEditError('')
    setEditSuccess('')

    if (!editName.trim()) {
      setEditError('Name is required')
      return
    }

    const ok = await updateProfile(editName, editDepartment)
    if (ok) {
      setEditSuccess('Profile updated successfully!')
      setEditDialogOpen(false)
      setTimeout(() => setEditSuccess(''), 3000)
    } else {
      setEditError('Failed to update profile')
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$/.test(newPassword)
    if (!strongPassword) {
      setPasswordError('Password must be 12-128 chars with uppercase, lowercase, number, and special character')
      return
    }

    const ok = await changePassword(oldPassword, newPassword)
    if (ok) {
      setPasswordSuccess('Password changed successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordDialogOpen(false)
      setTimeout(() => setPasswordSuccess(''), 3000)
    } else {
      setPasswordError('Old password is incorrect')
    }
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Please log in to access your profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'librarian':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
      case 'member':
        return 'Student'
      case 'project_coordinator':
        return 'Project Coordinator'
      case 'hod':
        return 'HOD'
      case 'lecturer':
        return 'Lecturer'
      case 'staff':
        return 'Staff'
      case 'librarian':
        return 'Librarian'
      default:
        return role
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            My Profile
          </h2>
          <p className="text-muted-foreground mt-1">View and manage your account information</p>
        </div>
      </div>

      {editSuccess && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6 text-center text-green-700 dark:text-green-400">
            {editSuccess}
          </CardContent>
        </Card>
      )}

      {passwordSuccess && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6 text-center text-green-700 dark:text-green-400">
            {passwordSuccess}
          </CardContent>
        </Card>
      )}

      {user.mustChangePassword && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6 text-center text-amber-800 dark:text-amber-300">
            Your account uses a temporary password. Change it now before using other features.
          </CardContent>
        </Card>
      )}

      {/* Profile Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</Label>
              <p className="text-lg font-medium mt-1">{user.name}</p>
            </div>

            {/* Email */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email Address
              </Label>
              <p className="text-lg font-medium mt-1">{user.email}</p>
            </div>

            {/* Department */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Department
              </Label>
              <p className="text-lg font-medium mt-1">{user.department || 'Not specified'}</p>
            </div>

            {/* University */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">University</Label>
              <p className="text-lg font-medium mt-1">{user.university || 'Not specified'}</p>
            </div>

            {/* Role */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Account Type</Label>
              <div className="mt-1">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>

            {/* User ID */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">User ID</Label>
              <p className="text-sm font-mono mt-1 text-muted-foreground">{user.id}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {editError && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                      {editError}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder="e.g., Computer Science"
                      className="mt-1"
                    />
                  </div>

                  <Button onClick={handleEditProfile} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
                <Lock className="h-4 w-4" />
                Change Password
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="old-password">Current Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="old-password"
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Password must be 12-128 characters and include uppercase, lowercase, number, and special character.
                    </p>
                  </div>

                  <Button onClick={handleChangePassword} className="w-full">
                    Change Password
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use 12-128 characters with uppercase, lowercase, number, and special character</p>
          <p>• Change your password regularly</p>
          <p>• Do not share your credentials with others</p>
          <p>• Log out when using shared computers</p>
        </CardContent>
      </Card>
    </div>
  )
}
