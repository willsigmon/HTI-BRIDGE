import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function FollowUps() {
  const { data: followUps, refetch } = trpc.followUps.list.useQuery({});
  const completeMutation = trpc.followUps.complete.useMutation();

  const handleComplete = async (followUpId: string) => {
    try {
      await completeMutation.mutateAsync({ followUpId });
      toast.success("Follow-up marked as complete!");
      refetch();
    } catch (error) {
      toast.error("Failed to complete follow-up");
    }
  };

  const pendingFollowUps = followUps?.filter(f => f.status === "pending") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Track and manage your email follow-ups</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending ({pendingFollowUps.length})
            </CardTitle>
            <CardDescription>Follow-ups that need your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFollowUps.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending follow-ups</p>
            ) : (
              pendingFollowUps.map((followUp) => (
                <div key={followUp.id} className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{followUp.subject}</h4>
                      <Badge variant={
                        followUp.priority === "urgent" ? "destructive" :
                        followUp.priority === "high" ? "default" :
                        "secondary"
                      }>
                        {followUp.priority}
                      </Badge>
                    </div>
                    {followUp.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{followUp.notes}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleComplete(followUp.id)}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Complete
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

