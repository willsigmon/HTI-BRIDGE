import { eq, and, desc, asc, sql, gte, lte, like, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  emailAccounts,
  personas,
  emailTemplates,
  contacts,
  emailThreads,
  emailMessages,
  followUps,
  emailSequences,
  sequenceEnrollments,
  emailAnalytics,
  insights,
  calendarEvents,
  integrations,
  activityLog,
  quickReplies,
  savedSearches,
  type EmailAccount,
  type Persona,
  type EmailTemplate,
  type Contact,
  type EmailThread,
  type EmailMessage,
  type FollowUp,
  type EmailSequence,
  type Insight,
  type CalendarEvent,
  type Integration,
  type QuickReply,
  type SavedSearch,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER MANAGEMENT =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) throw new Error("User ID is required");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { id: user.id };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "defaultPersona", "timezone"] as const;
    textFields.forEach((field) => {
      const value = user[field];
      if (value !== undefined) {
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (user.role === undefined && user.id === ENV.ownerId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== EMAIL ACCOUNTS =====

export async function createEmailAccount(account: Omit<EmailAccount, "createdAt" | "lastSyncedAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailAccounts).values(account);
  return account;
}

export async function getEmailAccounts(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailAccounts).where(eq(emailAccounts.userId, userId));
}

export async function getEmailAccount(accountId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(emailAccounts).where(eq(emailAccounts.id, accountId)).limit(1);
  return result[0] || null;
}

export async function updateEmailAccountTokens(accountId: string, tokens: { accessToken: string; refreshToken?: string; tokenExpiry?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailAccounts).set(tokens).where(eq(emailAccounts.id, accountId));
}

// ===== PERSONAS =====

export async function createPersona(persona: Omit<Persona, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(personas).values(persona);
  return persona;
}

export async function getPersonas(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(personas).where(eq(personas.userId, userId));
}

export async function getPersona(personaId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(personas).where(eq(personas.id, personaId)).limit(1);
  return result[0] || null;
}

export async function updatePersona(personaId: string, updates: Partial<Persona>) {
  const db = await getDb();
  if (!db) return;
  await db.update(personas).set(updates).where(eq(personas.id, personaId));
}

// ===== EMAIL TEMPLATES =====

export async function createTemplate(template: Omit<EmailTemplate, "createdAt" | "lastUsedAt" | "usageCount">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailTemplates).values(template);
  return template;
}

export async function getTemplates(userId: string, personaId?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (personaId) {
    return await db.select().from(emailTemplates)
      .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.personaId, personaId)))
      .orderBy(desc(emailTemplates.usageCount));
  }
  
  return await db.select().from(emailTemplates)
    .where(eq(emailTemplates.userId, userId))
    .orderBy(desc(emailTemplates.usageCount));
}

export async function getTemplate(templateId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1);
  return result[0] || null;
}

export async function incrementTemplateUsage(templateId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailTemplates)
    .set({ 
      usageCount: sql`${emailTemplates.usageCount} + 1`,
      lastUsedAt: new Date()
    })
    .where(eq(emailTemplates.id, templateId));
}

// ===== CONTACTS =====

export async function upsertContact(contact: Omit<Contact, "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select().from(contacts)
    .where(and(eq(contacts.userId, contact.userId), eq(contacts.email, contact.email)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(contacts.id, existing[0].id));
    return { ...existing[0], ...contact };
  }
  
  await db.insert(contacts).values({ ...contact, updatedAt: new Date() });
  return contact;
}

export async function getContacts(userId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(desc(contacts.lastContactedAt))
    .limit(limit);
}

export async function getContact(contactId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return result[0] || null;
}

export async function searchContacts(userId: string, query: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contacts)
    .where(and(
      eq(contacts.userId, userId),
      or(
        like(contacts.name, `%${query}%`),
        like(contacts.email, `%${query}%`),
        like(contacts.company, `%${query}%`)
      )
    ))
    .limit(50);
}

export async function updateContactRelationshipScore(contactId: string, score: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set({ relationshipScore: score }).where(eq(contacts.id, contactId));
}

// ===== EMAIL THREADS & MESSAGES =====

export async function createEmailThread(thread: Omit<EmailThread, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailThreads).values(thread);
  return thread;
}

export async function getEmailThreads(userId: string, accountId?: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(emailThreads.userId, userId)];
  if (accountId) conditions.push(eq(emailThreads.accountId, accountId));
  
  return await db.select().from(emailThreads)
    .where(and(...conditions))
    .orderBy(desc(emailThreads.lastMessageAt))
    .limit(limit);
}

export async function createEmailMessage(message: Omit<EmailMessage, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailMessages).values(message);
  return message;
}

export async function getEmailMessages(threadId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailMessages)
    .where(eq(emailMessages.threadId, threadId))
    .orderBy(asc(emailMessages.sentAt));
}

// ===== FOLLOW-UPS =====

export async function createFollowUp(followUp: Omit<FollowUp, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(followUps).values(followUp);
  return followUp;
}

export async function getFollowUps(userId: string, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(followUps.userId, userId)];
  if (status) conditions.push(eq(followUps.status, status as any));
  
  return await db.select().from(followUps)
    .where(and(...conditions))
    .orderBy(asc(followUps.dueAt));
}

export async function getOverdueFollowUps(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(followUps)
    .where(and(
      eq(followUps.userId, userId),
      eq(followUps.status, "pending"),
      lte(followUps.dueAt, new Date())
    ))
    .orderBy(asc(followUps.dueAt));
}

export async function updateFollowUpStatus(followUpId: string, status: string, completedAt?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(followUps)
    .set({ status: status as any, completedAt })
    .where(eq(followUps.id, followUpId));
}

// ===== EMAIL SEQUENCES =====

export async function createEmailSequence(sequence: Omit<EmailSequence, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailSequences).values(sequence);
  return sequence;
}

export async function getEmailSequences(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailSequences)
    .where(eq(emailSequences.userId, userId))
    .orderBy(desc(emailSequences.createdAt));
}

export async function enrollInSequence(enrollment: Omit<typeof sequenceEnrollments.$inferInsert, "enrolledAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(sequenceEnrollments).values(enrollment);
  return enrollment;
}

// ===== ANALYTICS =====

export async function createEmailAnalytics(analytics: Omit<typeof emailAnalytics.$inferInsert, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailAnalytics).values(analytics);
  return analytics;
}

export async function getEmailAnalytics(userId: string, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return await db.select().from(emailAnalytics)
    .where(and(
      eq(emailAnalytics.userId, userId),
      gte(emailAnalytics.sentAt, since)
    ))
    .orderBy(desc(emailAnalytics.sentAt));
}

// ===== INSIGHTS =====

export async function createInsight(insight: Omit<Insight, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(insights).values(insight);
  return insight;
}

export async function getInsights(userId: string, dismissed = false) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(insights)
    .where(and(
      eq(insights.userId, userId),
      eq(insights.isDismissed, dismissed)
    ))
    .orderBy(desc(insights.priority), desc(insights.createdAt))
    .limit(50);
}

export async function dismissInsight(insightId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(insights).set({ isDismissed: true }).where(eq(insights.id, insightId));
}

// ===== CALENDAR EVENTS =====

export async function createCalendarEvent(event: Omit<CalendarEvent, "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(calendarEvents).values(event);
  return event;
}

export async function getUpcomingCalendarEvents(userId: string, days = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.startTime, now),
      lte(calendarEvents.startTime, future)
    ))
    .orderBy(asc(calendarEvents.startTime));
}

// ===== INTEGRATIONS =====

export async function upsertIntegration(integration: Omit<Integration, "createdAt" | "lastSyncedAt">) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select().from(integrations)
    .where(and(eq(integrations.userId, integration.userId), eq(integrations.service, integration.service)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(integrations)
      .set(integration)
      .where(eq(integrations.id, existing[0].id));
    return { ...existing[0], ...integration };
  }
  
  await db.insert(integrations).values(integration);
  return integration;
}

export async function getIntegrations(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(integrations)
    .where(eq(integrations.userId, userId));
}

export async function getIntegration(userId: string, service: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.service, service)))
    .limit(1);
  return result[0] || null;
}

// ===== QUICK REPLIES =====

export async function createQuickReply(reply: Omit<QuickReply, "createdAt" | "usageCount">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(quickReplies).values(reply);
  return reply;
}

export async function getQuickReplies(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quickReplies)
    .where(eq(quickReplies.userId, userId))
    .orderBy(desc(quickReplies.usageCount));
}

// ===== SAVED SEARCHES =====

export async function createSavedSearch(search: Omit<SavedSearch, "createdAt" | "usageCount">) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(savedSearches).values(search);
  return search;
}

export async function getSavedSearches(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.usageCount));
}

// ===== ACTIVITY LOG =====

export async function logActivity(log: Omit<typeof activityLog.$inferInsert, "createdAt">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(log);
}

export async function getActivityLog(userId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

