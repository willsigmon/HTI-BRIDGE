import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Wand2, Send, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Compose() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string>("");

  const { data: personas } = trpc.personas.list.useQuery();
  const composeMutation = trpc.ai.compose.useMutation();
  const refineMutation = trpc.ai.refine.useMutation();
  const suggestSubjectMutation = trpc.ai.suggestSubject.useMutation();

  const handleAICompose = async () => {
    if (!instruction.trim()) {
      toast.error("Please enter what you want to write about");
      return;
    }

    try {
      const result = await composeMutation.mutateAsync({
        instruction,
        personaId: selectedPersona || undefined,
        useSoundLikeMe: true,
      });
      setBody(typeof result.content === 'string' ? result.content : '');
      toast.success("Email composed!");
    } catch (error) {
      toast.error("Failed to compose email");
    }
  };

  const handleRefine = async () => {
    if (!body.trim() || !instruction.trim()) {
      toast.error("Please enter both email content and refinement instruction");
      return;
    }

    try {
      const result = await refineMutation.mutateAsync({
        content: body,
        instruction,
        personaId: selectedPersona || undefined,
      });
      setBody(typeof result.content === 'string' ? result.content : '');
      toast.success("Email refined!");
    } catch (error) {
      toast.error("Failed to refine email");
    }
  };

  const handleSuggestSubject = async () => {
    if (!body.trim()) {
      toast.error("Please write the email body first");
      return;
    }

    try {
      const result = await suggestSubjectMutation.mutateAsync({ body });
      if (result.suggestions.length > 0) {
        setSubject(result.suggestions[0]);
        toast.success("Subject line suggested!");
      }
    } catch (error) {
      toast.error("Failed to suggest subject");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Compose Email</h1>
          <p className="text-muted-foreground mt-1">Write emails faster with AI assistance</p>
        </div>

        {/* Persona Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Writing Persona</CardTitle>
            <CardDescription>Choose how you want to sound</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedPersona} onValueChange={setSelectedPersona}>
              <SelectTrigger>
                <SelectValue placeholder="Select a persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                {personas?.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      <span>{persona.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {persona.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* AI Instruction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Composer
            </CardTitle>
            <CardDescription>Tell the AI what you want to write</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Textarea
                placeholder="e.g., Write a follow-up email to John about our meeting last week. Ask about the project timeline."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAICompose}
                disabled={composeMutation.isPending}
                className="flex-1"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {composeMutation.isPending ? "Composing..." : "Compose Email"}
              </Button>
              <Button
                onClick={handleRefine}
                disabled={refineMutation.isPending || !body}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refine
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Form */}
        <Card>
          <CardHeader>
            <CardTitle>Email Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSuggestSubject}
                  disabled={suggestSubjectMutation.isPending || !body}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Suggest
                </Button>
              </div>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your email here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" disabled={!to || !subject || !body}>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
              <Button variant="outline">Save as Draft</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

