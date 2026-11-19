import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, Globe, UserPlus } from 'lucide-react'
import type { ApiUserRole } from '../lib/api'

const SCHOOL_OPTIONS = [
  'Business School',
  'School of Public Service and Governance',
  'Faculty of Law',
  'School of Technology and Social Sciences (SOTSS)',
]

const DEPARTMENT_OPTIONS_BY_SCHOOL: Record<string, string[]> = {
  'Business School': [
    'Accounting',
    'Finance',
    'Marketing',
    'Human Resource Management',
    'Operations and Supply Chain',
  ],
  'School of Public Service and Governance': [
    'Public Administration',
    'Governance and Leadership',
    'Policy and Strategy',
  ],
  'Faculty of Law': [
    'Public Law',
    'Private Law',
    'International Law',
  ],
  'School of Technology and Social Sciences (SOTSS)': [
    'Computer Science',
    'Information Technology',
    'Information Systems',
    'Economics',
    'Social Sciences',
  ],
}

const DEFAULT_DEPARTMENT_OPTIONS = [
  'Administration',
  'Registry',
  'ICT',
  'Library Services',
]

const ACADEMIC_AREA_OPTIONS_BY_SCHOOL: Record<string, string[]> = {
  'Business School': [
    'Business Administration',
    'Accounting and Finance',
  ],
  'School of Public Service and Governance': [
    'Public Service and Governance',
  ],
  'Faculty of Law': [
    'Law',
  ],
  'School of Technology and Social Sciences (SOTSS)': [
    'Computer Science and Information Systems',
    'Information Systems and Innovation',
    'Economics and Hospitality Studies',
    'Liberal Arts and Communication Studies',
  ],
}

export default function SignupPage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState<ApiUserRole>('staff')
  const [schoolId, setSchoolId] = useState('')
  const [school, setSchool] = useState('')
  const [department, setDepartment] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { createAccount } = useAuth()
  const navigate = useNavigate()
  const academicAreaOptions = useMemo(
    () => ACADEMIC_AREA_OPTIONS_BY_SCHOOL[school] || [],
    [school],
  )

  const getInputValue = (id: string): string => {
    const el = document.getElementById(id) as HTMLInputElement | null
    return (el?.value || '').trim()
  }

  const handleCreateAccount = async () => {
    setError('')
    setSuccess('')

    const finalName = name.trim() || getInputValue('name')
    const finalRole = role
    const finalSchool = school.trim() || getInputValue('school')
    const finalSchoolId = schoolId.trim() || getInputValue('school-id')
    const finalDepartment = department.trim() || getInputValue('department')
    const finalSchoolEmail = schoolEmail.trim() || getInputValue('school-email')
    const finalPassword = password || getInputValue('password')
    const needsSchool = finalRole !== 'librarian'
    const needsSchoolId = false
    const needsDepartment =
      finalRole === 'lecturer' || finalRole === 'staff' || finalRole === 'project_coordinator' || finalRole === 'hod'

    if (!finalName || !finalSchoolEmail || !finalPassword) {
      setError('Please fill in all required fields')
      return
    }
    if (needsSchool && !finalSchool) {
      setError('Please fill in School')
      return
    }
    if (needsSchoolId && !finalSchoolId) {
      setError('Please fill in School ID')
      return
    }
    if (needsDepartment && !finalDepartment) {
      setError('Please fill in Department')
      return
    }
    const emailValue = finalSchoolEmail.toLowerCase().trim()
    const domain = emailValue.includes('@') ? emailValue.split('@')[1] : ''
    const isValidGimpaEmail = !!domain && (domain === 'gimpa.edu.gh' || domain.endsWith('.gimpa.edu.gh'))
    if (!isValidGimpaEmail) {
      setError('School email must be a GIMPA email (@gimpa.edu.gh or subdomains)')
      return
    }
    if (finalPassword.length < 5) {
      setError('Password must not be less than 5 characters')
      return
    }

    setLoading(true)
    const result = await createAccount(
      finalSchoolEmail,
      finalPassword,
      finalName,
      finalRole,
      needsSchoolId ? finalSchoolId : undefined,
      needsSchool ? finalSchool : undefined,
      needsDepartment ? finalDepartment : undefined,
    )
    setLoading(false)

    if (!result.ok) {
      setError(result.error || 'Account creation failed. Check School ID/email or try again.')
      return
    }

    setSuccess('Account submitted. A librarian will activate it before you can sign in.')
    setName('')
    setRole('lecturer')
    setSchoolId('')
    setSchool('')
    setDepartment('')
    setSchoolEmail('')
    setPassword('')
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-[#1a1d1a] font-sans">
      {/* Left Sage Panel */}
      <div className="w-full lg:w-[42%] bg-[#d8e5c7] flex flex-col justify-between p-8 lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#1a1d1a] text-[#1a1d1a]">
            <Globe className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[19px] font-bold tracking-tight text-[#1a1d1a]">
            GIMPA Repository
          </span>
        </div>

        <div className="my-auto py-8 max-w-sm">
          <h2 className="text-[28px] font-bold text-[#1a1d1a] leading-tight mb-4">
            Staff & Faculty Registration
          </h2>
          <p className="text-[14px] text-[#4a5446] leading-relaxed">
            Register with your official GIMPA institutional email address. Once submitted, a repository administrator or librarian will verify and activate your account.
          </p>
        </div>

        <div className="text-[12px] text-[#5a6552] font-medium hidden lg:block">
          Ghana Institute of Management and Public Administration
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 bg-white flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[440px]">
          <h1 className="text-[32px] font-bold text-[#1a1d1a] tracking-tight mb-2">
            Create account
          </h1>
          <p className="text-[14px] text-[#6e766b] mb-8">
            Requires verification by Librarian upon submission
          </p>

          <div className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-[#fdf2f0] border border-[#f5d0ca] text-[#c93b2b] rounded-xl text-[13px]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3.5 bg-[#dce7d0] text-[#1a1d1a] rounded-xl text-[13px] font-medium">
                {success}
              </div>
            )}

            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. John Mensah" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as ApiUserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role !== 'librarian' && (
                <div>
                  <Label htmlFor="school">School</Label>
                  <Select value={school} onValueChange={setSchool}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(role === 'lecturer' || role === 'project_coordinator' || role === 'hod') && (
              <div>
                <Label htmlFor="department">Academic Area</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic area" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicAreaOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === 'staff' && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(DEPARTMENT_OPTIONS_BY_SCHOOL[school] || DEFAULT_DEPARTMENT_OPTIONS).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="school-email">School Email</Label>
              <Input
                id="school-email"
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                placeholder="john.mensah@gimpa.edu.gh"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create your password"
              />
            </div>

            <div className="pt-2 space-y-3">
              <Button onClick={handleCreateAccount} className="w-full h-12 text-[14px] font-bold" disabled={loading}>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : 'Create Account'}
              </Button>

              <Button variant="outline" onClick={() => navigate('/login')} className="w-full h-11 text-[13px]">
                Back to Log in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
