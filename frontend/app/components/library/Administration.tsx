import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function Administration() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>System administration and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Administration panel for system settings</p>
        </CardContent>
      </Card>
    </div>
  );
}
