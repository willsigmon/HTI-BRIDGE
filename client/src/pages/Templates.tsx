import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Plus } from "lucide-react";

export default function Templates() {
  const { data: templates } = trpc.templates.list.useQuery({});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground mt-1">Reusable email templates for faster communication</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Templates ({templates?.length || 0})
            </CardTitle>
            <CardDescription>Your saved email templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!templates || templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No templates created yet</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.category && (
                          <Badge variant="outline">{template.category}</Badge>
                        )}
                      </div>
                      {template.subject && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Used {template.usageCount || 0} times
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Use Template
                    </Button>
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

