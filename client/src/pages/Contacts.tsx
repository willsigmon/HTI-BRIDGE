import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Search } from "lucide-react";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: contacts } = trpc.contacts.list.useQuery({ limit: 100 });
  const { data: searchResults } = trpc.contacts.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const displayContacts = searchQuery.length > 2 ? searchResults : contacts;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your email contacts and relationships</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Contacts ({displayContacts?.length || 0})
            </CardTitle>
            <CardDescription>Your email contact database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!displayContacts || displayContacts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No contacts found</p>
            ) : (
              displayContacts.map((contact) => (
                <div key={contact.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{contact.name || contact.email}</h4>
                      {contact.company && (
                        <Badge variant="outline">{contact.company}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    {contact.jobTitle && (
                      <p className="text-xs text-muted-foreground mt-1">{contact.jobTitle}</p>
                    )}
                    {contact.relationshipScore !== null && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${contact.relationshipScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {contact.relationshipScore}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    View
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

