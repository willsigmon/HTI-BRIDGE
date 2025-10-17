import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { User, Plus, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function Personas() {
  const [isCreating, setIsCreating] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: "",
    type: "work" as const,
    description: "",
    formality: 50,
    enthusiasm: 50,
    brevity: 50,
    empathy: 50,
  });

  const { data: personas, refetch } = trpc.personas.list.useQuery();
  const createMutation = trpc.personas.create.useMutation();
  const analyzeMutation = trpc.personas.analyzeWritingStyle.useMutation();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        name: newPersona.name,
        type: newPersona.type,
        description: newPersona.description,
        toneSettings: {
          formality: newPersona.formality,
          enthusiasm: newPersona.enthusiasm,
          brevity: newPersona.brevity,
          empathy: newPersona.empathy,
        },
      });
      toast.success("Persona created!");
      setIsCreating(false);
      setNewPersona({
        name: "",
        type: "work",
        description: "",
        formality: 50,
        enthusiasm: 50,
        brevity: 50,
        empathy: 50,
      });
      refetch();
    } catch (error) {
      toast.error("Failed to create persona");
    }
  };

  const handleAnalyzeWritingStyle = async (personaId: string) => {
    toast.info("Analyzing your writing style... This may take a moment.");
    try {
      // In a real implementation, we would fetch sample emails from the user's sent folder
      const sampleEmails = [
        "Sample email 1 content here...",
        "Sample email 2 content here...",
      ];
      
      const result = await analyzeMutation.mutateAsync({
        personaId,
        sampleEmails,
      });
      
      toast.success("Writing style analyzed and applied!");
      refetch();
    } catch (error) {
      toast.error("Failed to analyze writing style");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Personas</h1>
            <p className="text-muted-foreground mt-1">Manage your writing personas and styles</p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Persona</DialogTitle>
                <DialogDescription>
                  Define a new writing persona with custom tone settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Professional Work, Casual Personal"
                    value={newPersona.name}
                    onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newPersona.type}
                    onValueChange={(value: any) => setNewPersona({ ...newPersona, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe when to use this persona..."
                    value={newPersona.description}
                    onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Tone Settings</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Formality</Label>
                      <span className="text-sm text-muted-foreground">{newPersona.formality}%</span>
                    </div>
                    <Slider
                      value={[newPersona.formality]}
                      onValueChange={([value]) => setNewPersona({ ...newPersona, formality: value })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Casual ← → Formal</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Enthusiasm</Label>
                      <span className="text-sm text-muted-foreground">{newPersona.enthusiasm}%</span>
                    </div>
                    <Slider
                      value={[newPersona.enthusiasm]}
                      onValueChange={([value]) => setNewPersona({ ...newPersona, enthusiasm: value })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Reserved ← → Enthusiastic</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Brevity</Label>
                      <span className="text-sm text-muted-foreground">{newPersona.brevity}%</span>
                    </div>
                    <Slider
                      value={[newPersona.brevity]}
                      onValueChange={([value]) => setNewPersona({ ...newPersona, brevity: value })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Detailed ← → Concise</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Empathy</Label>
                      <span className="text-sm text-muted-foreground">{newPersona.empathy}%</span>
                    </div>
                    <Slider
                      value={[newPersona.empathy]}
                      onValueChange={([value]) => setNewPersona({ ...newPersona, empathy: value })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Direct ← → Empathetic</p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={!newPersona.name || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Persona"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Personas List */}
        <div className="grid gap-4 md:grid-cols-2">
          {personas?.map((persona) => (
            <Card key={persona.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {persona.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {persona.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant={persona.isDefault ? "default" : "outline"}>
                    {persona.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {persona.toneSettings && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Formality:</span>
                      <span>{persona.toneSettings.formality}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enthusiasm:</span>
                      <span>{persona.toneSettings.enthusiasm}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brevity:</span>
                      <span>{persona.toneSettings.brevity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Empathy:</span>
                      <span>{persona.toneSettings.empathy}%</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAnalyzeWritingStyle(persona.id)}
                    disabled={analyzeMutation.isPending}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {persona.writingStyleProfile ? "Re-analyze" : "Sound Like Me!"}
                  </Button>
                  {persona.writingStyleProfile && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wand2 className="h-3 w-3" />
                      Writing style learned
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!personas || personas.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No personas yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first persona to customize your writing style
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Persona
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

