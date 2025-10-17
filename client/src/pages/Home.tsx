import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Mail, Sparkles, Users, TrendingUp, Zap, Brain } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // User is authenticated, redirect handled by App.tsx
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 rounded-xl shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {APP_TITLE}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your AI-powered email assistant that writes, manages, and optimizes your communications.
            Work smarter, not harder.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => window.location.href = getLoginUrl()}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Get Started Free
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Composition</h3>
            <p className="text-muted-foreground">
              Write emails 10x faster with AI that understands context and your writing style.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Contact Management</h3>
            <p className="text-muted-foreground">
              Track relationships, enrichment data, and communication patterns automatically.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Automated Follow-ups</h3>
            <p className="text-muted-foreground">
              Never miss a follow-up again with intelligent reminders and suggestions.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
            <p className="text-muted-foreground">
              Save and reuse your best emails with customizable templates.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analytics & Insights</h3>
            <p className="text-muted-foreground">
              Track open rates, response times, and optimize your email strategy.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-Persona Mode</h3>
            <p className="text-muted-foreground">
              Switch between work and personal personas with different writing styles.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="inline-block p-8 rounded-2xl border bg-card shadow-xl">
            <h2 className="text-3xl font-bold mb-4">Ready to transform your email workflow?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl">
              Join thousands of professionals who are saving hours every week with AI-powered email management.
            </p>
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Start Using {APP_TITLE}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

