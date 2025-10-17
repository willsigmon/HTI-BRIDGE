import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== PERSONAS =====
  personas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPersonas(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["work", "personal", "sales", "support", "networking", "custom"]),
        description: z.string().optional(),
        toneSettings: z.object({
          formality: z.number().min(0).max(100),
          enthusiasm: z.number().min(0).max(100),
          brevity: z.number().min(0).max(100),
          empathy: z.number().min(0).max(100),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const persona = await db.createPersona({
          id: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          description: input.description || null,
          toneSettings: input.toneSettings || null,
          writingStyleProfile: null,
          isDefault: false,
        });
        return persona;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        toneSettings: z.object({
          formality: z.number().min(0).max(100),
          enthusiasm: z.number().min(0).max(100),
          brevity: z.number().min(0).max(100),
          empathy: z.number().min(0).max(100),
        }).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updatePersona(input.id, input);
        return { success: true };
      }),

    analyzeWritingStyle: protectedProcedure
      .input(z.object({
        personaId: z.string(),
        sampleEmails: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Analyze writing style using AI
        const analysis = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing writing style. Analyze the provided emails and extract key characteristics like tone, vocabulary, sentence structure, greetings, closings, and personality traits."
            },
            {
              role: "user",
              content: `Analyze these email samples and provide a detailed writing style profile:\n\n${input.sampleEmails.join("\n\n---\n\n")}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "writing_style",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tone: { type: "string" },
                  formality: { type: "number" },
                  enthusiasm: { type: "number" },
                  brevity: { type: "number" },
                  empathy: { type: "number" },
                  commonPhrases: { type: "array", items: { type: "string" } },
                  greetings: { type: "array", items: { type: "string" } },
                  closings: { type: "array", items: { type: "string" } },
                  vocabulary: { type: "array", items: { type: "string" } },
                  personality: { type: "string" },
                },
                required: ["tone", "formality", "enthusiasm", "brevity", "empathy"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = analysis.choices[0].message.content;
        const profile = JSON.parse(typeof content === 'string' ? content : '{}');
        
        // Update persona with writing style
        await db.updatePersona(input.personaId, {
          writingStyleProfile: profile,
          toneSettings: {
            formality: profile.formality,
            enthusiasm: profile.enthusiasm,
            brevity: profile.brevity,
            empathy: profile.empathy,
          },
        });

        return profile;
      }),
  }),

  // ===== EMAIL TEMPLATES =====
  templates: router({
    list: protectedProcedure
      .input(z.object({ personaId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getTemplates(ctx.user.id, input.personaId);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        subject: z.string().optional(),
        body: z.string(),
        category: z.string().optional(),
        personaId: z.string().optional(),
        variables: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.createTemplate({
          id: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          subject: input.subject || null,
          body: input.body,
          category: input.category || null,
          personaId: input.personaId || null,
          variables: input.variables || null,
        });
        return template;
      }),

    use: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        variables: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const template = await db.getTemplate(input.templateId);
        if (!template) throw new Error("Template not found");

        let body = template.body || "";
        let subject = template.subject || "";

        // Replace variables
        if (input.variables) {
          Object.entries(input.variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            body = body.replace(regex, String(value));
            subject = subject.replace(regex, String(value));
          });
        }

        await db.incrementTemplateUsage(input.templateId);

        return { subject, body };
      }),
  }),

  // ===== CONTACTS =====
  contacts: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getContacts(ctx.user.id, input.limit);
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.searchContacts(ctx.user.id, input.query);
      }),

    get: protectedProcedure
      .input(z.object({ contactId: z.string() }))
      .query(async ({ input }) => {
        return await db.getContact(input.contactId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        phone: z.string().optional(),
        linkedinUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const contact = await db.upsertContact({
          id: nanoid(),
          userId: ctx.user.id,
          email: input.email,
          name: input.name || null,
          firstName: null,
          lastName: null,
          company: input.company || null,
          jobTitle: input.jobTitle || null,
          phone: input.phone || null,
          linkedinUrl: input.linkedinUrl || null,
          companySize: null,
          companyRevenue: null,
          companyIndustry: null,
          location: null,
          timezone: null,
          relationshipScore: 50,
          lastContactedAt: null,
          totalEmailsSent: 0,
          totalEmailsReceived: 0,
          avgResponseTimeHours: null,
          tags: input.tags || null,
          notes: input.notes || null,
          customFields: null,
        });
        return contact;
      }),

    enrichFromLinkedIn: protectedProcedure
      .input(z.object({ contactId: z.string() }))
      .mutation(async ({ input }) => {
        const contact = await db.getContact(input.contactId);
        if (!contact || !contact.linkedinUrl) {
          throw new Error("Contact not found or no LinkedIn URL");
        }

        // TODO: Implement LinkedIn enrichment via API
        // For now, return mock data
        return {
          company: "Example Corp",
          jobTitle: "Senior Director",
          companySize: "1000-5000",
          companyIndustry: "Technology",
        };
      }),
  }),

  // ===== FOLLOW-UPS =====
  followUps: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getFollowUps(ctx.user.id, input.status);
      }),

    overdue: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOverdueFollowUps(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        contactId: z.string().optional(),
        threadId: z.string().optional(),
        subject: z.string(),
        dueAt: z.date(),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const followUp = await db.createFollowUp({
          id: nanoid(),
          userId: ctx.user.id,
          contactId: input.contactId || null,
          threadId: input.threadId || null,
          subject: input.subject,
          dueAt: input.dueAt,
          status: "pending",
          priority: input.priority,
          notes: input.notes || null,
          aiSuggestion: null,
          completedAt: null,
        });
        return followUp;
      }),

    complete: protectedProcedure
      .input(z.object({ followUpId: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateFollowUpStatus(input.followUpId, "completed", new Date());
        return { success: true };
      }),

    snooze: protectedProcedure
      .input(z.object({
        followUpId: z.string(),
        until: z.date(),
      }))
      .mutation(async ({ input }) => {
        await db.updateFollowUpStatus(input.followUpId, "snoozed");
        // TODO: Update dueAt to new time
        return { success: true };
      }),

    generateSuggestion: protectedProcedure
      .input(z.object({
        contactId: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const contact = await db.getContact(input.contactId);
        if (!contact) throw new Error("Contact not found");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates follow-up email suggestions based on contact information and context."
            },
            {
              role: "user",
              content: `Generate a follow-up email suggestion for ${contact.name} (${contact.email}) at ${contact.company}. Context: ${input.context || "General follow-up"}`
            }
          ],
        });

        return { suggestion: response.choices[0].message.content };
      }),
  }),

  // ===== EMAIL SEQUENCES =====
  sequences: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getEmailSequences(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        steps: z.array(z.object({
          order: z.number(),
          delayDays: z.number(),
          templateId: z.string(),
          subject: z.string(),
          body: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const sequence = await db.createEmailSequence({
          id: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          steps: input.steps,
          isActive: true,
        });
        return sequence;
      }),

    enroll: protectedProcedure
      .input(z.object({
        sequenceId: z.string(),
        contactId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const enrollment = await db.enrollInSequence({
          id: nanoid(),
          sequenceId: input.sequenceId,
          contactId: input.contactId,
          currentStep: 0,
          status: "active",
          nextSendAt: new Date(),
        });
        return enrollment;
      }),
  }),

  // ===== AI COMPOSITION =====
  ai: router({
    compose: protectedProcedure
      .input(z.object({
        instruction: z.string(),
        personaId: z.string().optional(),
        context: z.string().optional(),
        useSoundLikeMe: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let systemPrompt = "You are an expert email writer. Write professional, clear, and effective emails.";
        
        // Load persona if provided
        if (input.personaId) {
          const persona = await db.getPersona(input.personaId);
          if (persona && persona.writingStyleProfile) {
            systemPrompt += `\n\nWrite in this style: ${JSON.stringify(persona.writingStyleProfile)}`;
          }
          if (persona && persona.toneSettings) {
            systemPrompt += `\n\nTone settings: Formality: ${persona.toneSettings.formality}/100, Enthusiasm: ${persona.toneSettings.enthusiasm}/100, Brevity: ${persona.toneSettings.brevity}/100, Empathy: ${persona.toneSettings.empathy}/100`;
          }
        }

        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: input.instruction },
        ];

        if (input.context) {
          messages.push({
            role: "user" as const,
            content: `Additional context: ${input.context}`
          });
        }

        const response = await invokeLLM({ messages });
        
        await db.logActivity({
          id: nanoid(),
          userId: ctx.user.id,
          action: "ai_compose",
          entityType: "email",
          metadata: { instruction: input.instruction },
        });

        return { content: response.choices[0].message.content };
      }),

    refine: protectedProcedure
      .input(z.object({
        content: z.string(),
        instruction: z.string(),
        personaId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert email editor. Refine emails based on user instructions while maintaining the core message."
            },
            {
              role: "user",
              content: `Original email:\n\n${input.content}\n\nInstruction: ${input.instruction}`
            }
          ],
        });

        await db.logActivity({
          id: nanoid(),
          userId: ctx.user.id,
          action: "ai_refine",
          entityType: "email",
          metadata: { instruction: input.instruction },
        });

        return { content: response.choices[0].message.content };
      }),

    suggestSubject: protectedProcedure
      .input(z.object({ body: z.string() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Generate 3 compelling email subject lines for the given email body. Return only the subject lines, one per line."
            },
            {
              role: "user",
              content: input.body
            }
          ],
        });

        const content = response.choices[0].message.content;
        const subjects = (typeof content === 'string' ? content : '').split('\n').filter((s: string) => s.trim());
        return { suggestions: subjects };
      }),

    quickReply: protectedProcedure
      .input(z.object({
        emailContent: z.string(),
        tone: z.enum(["professional", "casual", "enthusiastic", "brief"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Generate 3 quick reply options for this email. Tone: ${input.tone || "professional"}`
            },
            {
              role: "user",
              content: input.emailContent
            }
          ],
        });

        const content2 = response.choices[0].message.content;
        const replies = (typeof content2 === 'string' ? content2 : '').split('\n\n').filter((r: string) => r.trim());
        return { suggestions: replies };
      }),
  }),

  // ===== ANALYTICS =====
  analytics: router({
    overview: protectedProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const analytics = await db.getEmailAnalytics(ctx.user.id, input.days || 30);
        
        const totalSent = analytics.length;
        const totalOpened = analytics.filter(a => a.openedAt).length;
        const totalClicked = analytics.filter(a => a.clickedAt).length;
        const totalReplied = analytics.filter(a => a.repliedAt).length;
        
        return {
          totalSent,
          openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
          clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
          replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
          analytics,
        };
      }),

    byTemplate: protectedProcedure.query(async ({ ctx }) => {
      const templates = await db.getTemplates(ctx.user.id);
      return templates.map(t => ({
        templateId: t.id,
        name: t.name,
        usageCount: t.usageCount,
        lastUsedAt: t.lastUsedAt,
      }));
    }),
  }),

  // ===== INSIGHTS =====
  insights: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getInsights(ctx.user.id, false);
    }),

    dismiss: protectedProcedure
      .input(z.object({ insightId: z.string() }))
      .mutation(async ({ input }) => {
        await db.dismissInsight(input.insightId);
        return { success: true };
      }),

    generate: protectedProcedure.mutation(async ({ ctx }) => {
      // Generate AI insights
      const contacts = await db.getContacts(ctx.user.id, 100);
      const followUps = await db.getOverdueFollowUps(ctx.user.id);
      
      const insights = [];

      // Check for overdue follow-ups
      if (followUps.length > 0) {
        insights.push(await db.createInsight({
          id: nanoid(),
          userId: ctx.user.id,
          type: "follow_up_needed",
          title: `You have ${followUps.length} overdue follow-ups`,
          description: "These contacts are waiting for your response",
          priority: 90,
          actionable: true,
          actionUrl: null,
          relatedContactId: null,
          relatedThreadId: null,
          isDismissed: false,
          expiresAt: null,
        }));
      }

      // Check for contacts with low relationship scores
      const coldContacts = contacts.filter(c => c.relationshipScore && c.relationshipScore < 30);
      if (coldContacts.length > 0) {
        insights.push(await db.createInsight({
          id: nanoid(),
          userId: ctx.user.id,
          type: "relationship_health",
          title: `${coldContacts.length} relationships need attention`,
          description: "These contacts haven't heard from you in a while",
          priority: 70,
          actionable: true,
          actionUrl: null,
          relatedContactId: null,
          relatedThreadId: null,
          isDismissed: false,
          expiresAt: null,
        }));
      }

      return insights;
    }),
  }),

  // ===== CALENDAR =====
  calendar: router({
    upcoming: protectedProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getUpcomingCalendarEvents(ctx.user.id, input.days || 7);
      }),

    create: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        location: z.string().optional(),
        attendees: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const event = await db.createCalendarEvent({
          id: nanoid(),
          userId: ctx.user.id,
          accountId: input.accountId,
          eventId: nanoid(),
          title: input.title,
          description: input.description || null,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location || null,
          attendees: input.attendees || null,
          meetingLink: null,
          relatedContactId: null,
          relatedThreadId: null,
        });
        return event;
      }),
  }),

  // ===== INTEGRATIONS =====
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const integrations = await db.getIntegrations(ctx.user.id);
      // Don't expose sensitive tokens
      return integrations.map(i => ({
        id: i.id,
        service: i.service,
        isActive: i.isActive,
        lastSyncedAt: i.lastSyncedAt,
      }));
    }),

    configure: protectedProcedure
      .input(z.object({
        service: z.string(),
        apiKey: z.string().optional(),
        config: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Encrypt API key before storing
        await db.upsertIntegration({
          id: nanoid(),
          userId: ctx.user.id,
          service: input.service,
          apiKey: input.apiKey || null,
          accessToken: null,
          refreshToken: null,
          config: input.config || null,
          isActive: true,
        });
        return { success: true };
      }),
  }),

  // ===== QUICK REPLIES =====
  quickReplies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getQuickReplies(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        trigger: z.string(),
        content: z.string(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const reply = await db.createQuickReply({
          id: nanoid(),
          userId: ctx.user.id,
          trigger: input.trigger,
          content: input.content,
          category: input.category || null,
        });
        return reply;
      }),
  }),
});

export type AppRouter = typeof appRouter;

