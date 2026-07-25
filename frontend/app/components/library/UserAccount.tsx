import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function UserAccount() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
          <CardDescription>Manage your profile and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <p className="text-muted-foreground">John Doe</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">john@university.edu</p>
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <p className="text-muted-foreground">Computer Science</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
