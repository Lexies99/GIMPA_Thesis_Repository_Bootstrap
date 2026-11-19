import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Lock, Edit2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

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

    if (newPassword.length < 5) {
      setPasswordError('Password must not be less than 5 characters')
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
      <div className="fp-card text-center py-10">
        <p className="text-[#c93b2b] font-semibold">Please log in to access your profile</p>
      </div>
    )
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

  const initial = (user.name || user.email || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1a1d1a] mb-1">My Profile</h1>
        <p className="text-[14px] text-[#6e746b]">
          View and manage your institutional account details and security credentials.
        </p>
      </div>

      {editSuccess && (
        <div className="fp-card border-[#3b7a57]/30 bg-[#e6eedc]/60 text-[#3b7a57] text-[13px] font-semibold">
          {editSuccess}
        </div>
      )}

      {passwordSuccess && (
        <div className="fp-card border-[#3b7a57]/30 bg-[#e6eedc]/60 text-[#3b7a57] text-[13px] font-semibold">
          {passwordSuccess}
        </div>
      )}

      {user.mustChangePassword && (
        <div className="fp-card border-[#c93b2b]/30 bg-[#fbeae8]/50 text-[#c93b2b] text-[13px] font-semibold">
          Your account uses a temporary password. Please change it now before using other features.
        </div>
      )}

      {/* FinPlanner Image 11 Style Horizontal User Summary Row */}
      <div className="fp-entity-row flex-wrap gap-6">
        <div className="flex items-center gap-4 min-w-[220px]">
          <div className="fp-avatar">{initial}</div>
          <div>
            <div className="text-[15px] font-bold text-[#1a1d1a]">{user.name}</div>
            <div className="text-[12px] text-[#6e746b]">{user.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 flex-1">
          <div>
            <span className="text-[11px] text-[#6e746b] block">Department</span>
            <span className="text-[13px] font-bold text-[#1a1d1a]">
              {user.department || 'Not specified'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#6e746b] block">Position / Role</span>
            <span className="text-[13px] font-bold text-[#1a1d1a]">{getRoleLabel(user.role)}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#6e746b] block">School / Faculty</span>
            <span className="text-[13px] font-bold text-[#1a1d1a]">
              {user.university || 'GIMPA'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="size-3.5 mr-1" />
            Edit Profile
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <Lock className="size-3.5 mr-1" />
            Change Password
          </Button>
        </div>
      </div>

      {/* Detailed Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fp-card space-y-4">
          <h3 className="text-[16px] font-bold text-[#1a1d1a]">Account Details</h3>
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between py-2 border-b border-[#eaece4]">
              <span className="text-[#6e746b]">Full Name</span>
              <span className="font-bold text-[#1a1d1a]">{user.name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#eaece4]">
              <span className="text-[#6e746b]">Email Address</span>
              <span className="font-bold text-[#1a1d1a]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#eaece4]">
              <span className="text-[#6e746b]">Role Access</span>
              <Badge variant="default">{getRoleLabel(user.role)}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6e746b]">Account ID</span>
              <span className="font-mono text-[#6e746b]">{user.id}</span>
            </div>
          </div>
        </div>

        <div className="fp-card space-y-4">
          <h3 className="text-[16px] font-bold text-[#1a1d1a] flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#3b7a57]" />
            Security Guidelines
          </h3>
          <div className="space-y-2.5 text-[13px] text-[#6e746b] leading-relaxed">
            <p className="m-0">• Use a strong password with letters, numbers, and symbols.</p>
            <p className="m-0">• Update your password periodically to protect academic records.</p>
            <p className="m-0">• Never share your institutional credentials with others.</p>
            <p className="m-0">• Always sign out when finished on shared workstations.</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal (FinPlanner Image 2 style) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editError && (
              <div className="p-3 bg-[#fbeae8] text-[#c93b2b] rounded-lg text-[13px]">
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>

            <Button onClick={handleEditProfile} className="w-full h-11 font-bold">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal (FinPlanner Image 2 style) */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {passwordError && (
              <div className="p-3 bg-[#fbeae8] text-[#c93b2b] rounded-lg text-[13px]">
                {passwordError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="old-password">Current Password</Label>
              <div className="relative">
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
                  className="absolute inset-y-0 right-3 flex items-center text-[#6e746b] hover:text-[#1a1d1a]"
                >
                  {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
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
                  className="absolute inset-y-0 right-3 flex items-center text-[#6e746b] hover:text-[#1a1d1a]"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
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
                  className="absolute inset-y-0 right-3 flex items-center text-[#6e746b] hover:text-[#1a1d1a]"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[12px] text-[#6e746b]">
                Password must be at least 5 characters.
              </p>
            </div>

            <Button onClick={handleChangePassword} className="w-full h-11 font-bold">
              Save Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
