import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Repeat } from "lucide-react";

export default function Sequences() {
  const { data: sequences } = trpc.sequences.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Sequences</h1>
          <p className="text-muted-foreground mt-1">Automated email campaigns and follow-up sequences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Active Sequences ({sequences?.length || 0})
            </CardTitle>
            <CardDescription>Manage your automated email sequences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!sequences || sequences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sequences created yet</p>
            ) : (
              sequences.map((sequence) => (
                <div key={sequence.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{sequence.name}</h4>
                      {sequence.description && (
                        <p className="text-sm text-muted-foreground mt-1">{sequence.description}</p>
                      )}
                    </div>
                    <Badge variant={sequence.isActive ? "default" : "secondary"}>
                      {sequence.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

