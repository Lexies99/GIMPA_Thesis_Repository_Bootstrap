import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function CirculationDesk() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Circulation Desk</CardTitle>
          <CardDescription>Manage document circulation and requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Circulation desk management interface</p>
        </CardContent>
      </Card>
    </div>
  );
}
