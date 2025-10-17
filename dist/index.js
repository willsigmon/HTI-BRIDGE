// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, and, desc, asc, sql, gte, lte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean, json, index } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
  // User preferences
  defaultPersona: varchar("defaultPersona", { length: 50 }).default("work"),
  timezone: varchar("timezone", { length: 100 }).default("America/New_York"),
  notificationsEnabled: boolean("notificationsEnabled").default(true)
});
var emailAccounts = mysqlTable("emailAccounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("gmail"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSyncedAt: timestamp("lastSyncedAt")
}, (table) => ({
  userIdIdx: index("emailAccounts_userId_idx").on(table.userId)
}));
var personas = mysqlTable("personas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["work", "personal", "sales", "support", "networking", "custom"]).notNull(),
  description: text("description"),
  toneSettings: json("toneSettings").$type(),
  writingStyleProfile: json("writingStyleProfile").$type(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("personas_userId_idx").on(table.userId)
}));
var emailTemplates = mysqlTable("emailTemplates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  personaId: varchar("personaId", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }),
  variables: json("variables").$type(),
  // e.g., ["firstName", "companyName"]
  usageCount: int("usageCount").default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("emailTemplates_userId_idx").on(table.userId)
}));
var contacts = mysqlTable("contacts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  company: varchar("company", { length: 200 }),
  jobTitle: varchar("jobTitle", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  // Enriched data
  companySize: varchar("companySize", { length: 50 }),
  companyRevenue: varchar("companyRevenue", { length: 50 }),
  companyIndustry: varchar("companyIndustry", { length: 100 }),
  location: varchar("location", { length: 200 }),
  timezone: varchar("timezone", { length: 100 }),
  // Relationship metrics
  relationshipScore: int("relationshipScore").default(50),
  // 0-100
  lastContactedAt: timestamp("lastContactedAt"),
  totalEmailsSent: int("totalEmailsSent").default(0),
  totalEmailsReceived: int("totalEmailsReceived").default(0),
  avgResponseTimeHours: int("avgResponseTimeHours"),
  // Metadata
  tags: json("tags").$type(),
  notes: text("notes"),
  customFields: json("customFields").$type(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow()
}, (table) => ({
  userIdIdx: index("contacts_userId_idx").on(table.userId),
  emailIdx: index("contacts_email_idx").on(table.email)
}));
var emailThreads = mysqlTable("emailThreads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  threadId: varchar("threadId", { length: 200 }).notNull(),
  // Gmail thread ID
  subject: varchar("subject", { length: 1e3 }),
  participants: json("participants").$type(),
  lastMessageAt: timestamp("lastMessageAt"),
  messageCount: int("messageCount").default(0),
  isRead: boolean("isRead").default(false),
  isStarred: boolean("isStarred").default(false),
  isArchived: boolean("isArchived").default(false),
  labels: json("labels").$type(),
  priority: int("priority").default(50),
  // AI-calculated priority 0-100
  sentiment: varchar("sentiment", { length: 50 }),
  // positive, neutral, negative
  category: varchar("category", { length: 100 }),
  // work, personal, sales, support, etc.
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("emailThreads_userId_idx").on(table.userId),
  accountIdIdx: index("emailThreads_accountId_idx").on(table.accountId)
}));
var emailMessages = mysqlTable("emailMessages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  threadId: varchar("threadId", { length: 64 }).notNull(),
  messageId: varchar("messageId", { length: 200 }).notNull(),
  // Gmail message ID
  from: varchar("from", { length: 320 }).notNull(),
  to: json("to").$type(),
  cc: json("cc").$type(),
  bcc: json("bcc").$type(),
  subject: varchar("subject", { length: 1e3 }),
  body: text("body"),
  bodyPlain: text("bodyPlain"),
  snippet: varchar("snippet", { length: 500 }),
  hasAttachments: boolean("hasAttachments").default(false),
  attachments: json("attachments").$type(),
  inReplyTo: varchar("inReplyTo", { length: 200 }),
  references: json("references").$type(),
  receivedAt: timestamp("receivedAt"),
  sentAt: timestamp("sentAt"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  threadIdIdx: index("emailMessages_threadId_idx").on(table.threadId)
}));
var followUps = mysqlTable("followUps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  contactId: varchar("contactId", { length: 64 }),
  threadId: varchar("threadId", { length: 64 }),
  subject: varchar("subject", { length: 500 }),
  dueAt: timestamp("dueAt").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "snoozed", "cancelled"]).default("pending"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  notes: text("notes"),
  aiSuggestion: text("aiSuggestion"),
  // AI-generated follow-up suggestion
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("followUps_userId_idx").on(table.userId),
  dueAtIdx: index("followUps_dueAt_idx").on(table.dueAt)
}));
var emailSequences = mysqlTable("emailSequences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true),
  steps: json("steps").$type(),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("emailSequences_userId_idx").on(table.userId)
}));
var sequenceEnrollments = mysqlTable("sequenceEnrollments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 64 }).notNull(),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  currentStep: int("currentStep").default(0),
  status: mysqlEnum("status", ["active", "paused", "completed", "unsubscribed"]).default("active"),
  nextSendAt: timestamp("nextSendAt"),
  enrolledAt: timestamp("enrolledAt").defaultNow(),
  completedAt: timestamp("completedAt")
}, (table) => ({
  sequenceIdIdx: index("sequenceEnrollments_sequenceId_idx").on(table.sequenceId),
  contactIdIdx: index("sequenceEnrollments_contactId_idx").on(table.contactId)
}));
var emailAnalytics = mysqlTable("emailAnalytics", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  messageId: varchar("messageId", { length: 64 }).notNull(),
  sentAt: timestamp("sentAt").notNull(),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  repliedAt: timestamp("repliedAt"),
  openCount: int("openCount").default(0),
  clickCount: int("clickCount").default(0),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  subject: varchar("subject", { length: 500 }),
  templateId: varchar("templateId", { length: 64 }),
  personaId: varchar("personaId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("emailAnalytics_userId_idx").on(table.userId),
  messageIdIdx: index("emailAnalytics_messageId_idx").on(table.messageId)
}));
var insights = mysqlTable("insights", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["relationship_health", "follow_up_needed", "best_time_to_send", "tone_warning", "opportunity", "risk"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  actionable: boolean("actionable").default(true),
  actionUrl: varchar("actionUrl", { length: 500 }),
  priority: int("priority").default(50),
  relatedContactId: varchar("relatedContactId", { length: 64 }),
  relatedThreadId: varchar("relatedThreadId", { length: 64 }),
  isDismissed: boolean("isDismissed").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  expiresAt: timestamp("expiresAt")
}, (table) => ({
  userIdIdx: index("insights_userId_idx").on(table.userId),
  typeIdx: index("insights_type_idx").on(table.type)
}));
var calendarEvents = mysqlTable("calendarEvents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  eventId: varchar("eventId", { length: 200 }).notNull(),
  // Google Calendar event ID
  title: varchar("title", { length: 500 }),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  location: varchar("location", { length: 500 }),
  attendees: json("attendees").$type(),
  meetingLink: varchar("meetingLink", { length: 500 }),
  relatedThreadId: varchar("relatedThreadId", { length: 64 }),
  relatedContactId: varchar("relatedContactId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("calendarEvents_userId_idx").on(table.userId),
  startTimeIdx: index("calendarEvents_startTime_idx").on(table.startTime)
}));
var integrations = mysqlTable("integrations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  service: varchar("service", { length: 100 }).notNull(),
  // openai, anthropic, slack, etc.
  apiKey: text("apiKey"),
  // Encrypted
  accessToken: text("accessToken"),
  // Encrypted
  refreshToken: text("refreshToken"),
  // Encrypted
  config: json("config").$type(),
  isActive: boolean("isActive").default(true),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("integrations_userId_idx").on(table.userId),
  serviceIdx: index("integrations_service_idx").on(table.service)
}));
var activityLog = mysqlTable("activityLog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  // email_sent, email_opened, template_used, etc.
  entityType: varchar("entityType", { length: 50 }),
  // email, contact, template, etc.
  entityId: varchar("entityId", { length: 64 }),
  metadata: json("metadata").$type(),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("activityLog_userId_idx").on(table.userId),
  actionIdx: index("activityLog_action_idx").on(table.action),
  createdAtIdx: index("activityLog_createdAt_idx").on(table.createdAt)
}));
var quickReplies = mysqlTable("quickReplies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  trigger: varchar("trigger", { length: 100 }).notNull(),
  // shortcut like "/thanks"
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("quickReplies_userId_idx").on(table.userId)
}));
var savedSearches = mysqlTable("savedSearches", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  query: text("query").notNull(),
  filters: json("filters").$type(),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdIdx: index("savedSearches_userId_idx").on(table.userId)
}));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.id) throw new Error("User ID is required");
  const db = await getDb();
  if (!db) return;
  try {
    const values = { id: user.id };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod", "defaultPersona", "timezone"];
    textFields.forEach((field) => {
      const value = user[field];
      if (value !== void 0) {
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      }
    });
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === void 0 && user.id === ENV.ownerId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUser(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createPersona(persona) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(personas).values(persona);
  return persona;
}
async function getPersonas(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(personas).where(eq(personas.userId, userId));
}
async function getPersona(personaId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(personas).where(eq(personas.id, personaId)).limit(1);
  return result[0] || null;
}
async function updatePersona(personaId, updates) {
  const db = await getDb();
  if (!db) return;
  await db.update(personas).set(updates).where(eq(personas.id, personaId));
}
async function createTemplate(template) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailTemplates).values(template);
  return template;
}
async function getTemplates(userId, personaId) {
  const db = await getDb();
  if (!db) return [];
  if (personaId) {
    return await db.select().from(emailTemplates).where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.personaId, personaId))).orderBy(desc(emailTemplates.usageCount));
  }
  return await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId)).orderBy(desc(emailTemplates.usageCount));
}
async function getTemplate(templateId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1);
  return result[0] || null;
}
async function incrementTemplateUsage(templateId) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailTemplates).set({
    usageCount: sql`${emailTemplates.usageCount} + 1`,
    lastUsedAt: /* @__PURE__ */ new Date()
  }).where(eq(emailTemplates.id, templateId));
}
async function upsertContact(contact) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(contacts).where(and(eq(contacts.userId, contact.userId), eq(contacts.email, contact.email))).limit(1);
  if (existing.length > 0) {
    await db.update(contacts).set({ ...contact, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contacts.id, existing[0].id));
    return { ...existing[0], ...contact };
  }
  await db.insert(contacts).values({ ...contact, updatedAt: /* @__PURE__ */ new Date() });
  return contact;
}
async function getContacts(userId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.lastContactedAt)).limit(limit);
}
async function getContact(contactId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return result[0] || null;
}
async function searchContacts(userId, query) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contacts).where(and(
    eq(contacts.userId, userId),
    or(
      like(contacts.name, `%${query}%`),
      like(contacts.email, `%${query}%`),
      like(contacts.company, `%${query}%`)
    )
  )).limit(50);
}
async function createFollowUp(followUp) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(followUps).values(followUp);
  return followUp;
}
async function getFollowUps(userId, status) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(followUps.userId, userId)];
  if (status) conditions.push(eq(followUps.status, status));
  return await db.select().from(followUps).where(and(...conditions)).orderBy(asc(followUps.dueAt));
}
async function getOverdueFollowUps(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(followUps).where(and(
    eq(followUps.userId, userId),
    eq(followUps.status, "pending"),
    lte(followUps.dueAt, /* @__PURE__ */ new Date())
  )).orderBy(asc(followUps.dueAt));
}
async function updateFollowUpStatus(followUpId, status, completedAt) {
  const db = await getDb();
  if (!db) return;
  await db.update(followUps).set({ status, completedAt }).where(eq(followUps.id, followUpId));
}
async function createEmailSequence(sequence) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(emailSequences).values(sequence);
  return sequence;
}
async function getEmailSequences(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailSequences).where(eq(emailSequences.userId, userId)).orderBy(desc(emailSequences.createdAt));
}
async function enrollInSequence(enrollment) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(sequenceEnrollments).values(enrollment);
  return enrollment;
}
async function getEmailAnalytics(userId, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  return await db.select().from(emailAnalytics).where(and(
    eq(emailAnalytics.userId, userId),
    gte(emailAnalytics.sentAt, since)
  )).orderBy(desc(emailAnalytics.sentAt));
}
async function createInsight(insight) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(insights).values(insight);
  return insight;
}
async function getInsights(userId, dismissed = false) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(insights).where(and(
    eq(insights.userId, userId),
    eq(insights.isDismissed, dismissed)
  )).orderBy(desc(insights.priority), desc(insights.createdAt)).limit(50);
}
async function dismissInsight(insightId) {
  const db = await getDb();
  if (!db) return;
  await db.update(insights).set({ isDismissed: true }).where(eq(insights.id, insightId));
}
async function createCalendarEvent(event) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(calendarEvents).values(event);
  return event;
}
async function getUpcomingCalendarEvents(userId, days = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const future = /* @__PURE__ */ new Date();
  future.setDate(future.getDate() + days);
  return await db.select().from(calendarEvents).where(and(
    eq(calendarEvents.userId, userId),
    gte(calendarEvents.startTime, now),
    lte(calendarEvents.startTime, future)
  )).orderBy(asc(calendarEvents.startTime));
}
async function upsertIntegration(integration) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(integrations).where(and(eq(integrations.userId, integration.userId), eq(integrations.service, integration.service))).limit(1);
  if (existing.length > 0) {
    await db.update(integrations).set(integration).where(eq(integrations.id, existing[0].id));
    return { ...existing[0], ...integration };
  }
  await db.insert(integrations).values(integration);
  return integration;
}
async function getIntegrations(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(integrations).where(eq(integrations.userId, userId));
}
async function createQuickReply(reply) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(quickReplies).values(reply);
  return reply;
}
async function getQuickReplies(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quickReplies).where(eq(quickReplies.userId, userId)).orderBy(desc(quickReplies.usageCount));
}
async function logActivity(log) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(log);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a user ID
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.id);
   */
  async createSessionToken(userId, options = {}) {
    return this.signSession(
      {
        openId: userId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUser(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          id: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUser(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      id: user.id,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        id: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
import { nanoid } from "nanoid";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ===== PERSONAS =====
  personas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getPersonas(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string(),
      type: z2.enum(["work", "personal", "sales", "support", "networking", "custom"]),
      description: z2.string().optional(),
      toneSettings: z2.object({
        formality: z2.number().min(0).max(100),
        enthusiasm: z2.number().min(0).max(100),
        brevity: z2.number().min(0).max(100),
        empathy: z2.number().min(0).max(100)
      }).optional()
    })).mutation(async ({ ctx, input }) => {
      const persona = await createPersona({
        id: nanoid(),
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        description: input.description || null,
        toneSettings: input.toneSettings || null,
        writingStyleProfile: null,
        isDefault: false
      });
      return persona;
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.string(),
      name: z2.string().optional(),
      description: z2.string().optional(),
      toneSettings: z2.object({
        formality: z2.number().min(0).max(100),
        enthusiasm: z2.number().min(0).max(100),
        brevity: z2.number().min(0).max(100),
        empathy: z2.number().min(0).max(100)
      }).optional(),
      isDefault: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      await updatePersona(input.id, input);
      return { success: true };
    }),
    analyzeWritingStyle: protectedProcedure.input(z2.object({
      personaId: z2.string(),
      sampleEmails: z2.array(z2.string())
    })).mutation(async ({ ctx, input }) => {
      const analysis = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing writing style. Analyze the provided emails and extract key characteristics like tone, vocabulary, sentence structure, greetings, closings, and personality traits."
          },
          {
            role: "user",
            content: `Analyze these email samples and provide a detailed writing style profile:

${input.sampleEmails.join("\n\n---\n\n")}`
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
                personality: { type: "string" }
              },
              required: ["tone", "formality", "enthusiasm", "brevity", "empathy"],
              additionalProperties: false
            }
          }
        }
      });
      const content = analysis.choices[0].message.content;
      const profile = JSON.parse(typeof content === "string" ? content : "{}");
      await updatePersona(input.personaId, {
        writingStyleProfile: profile,
        toneSettings: {
          formality: profile.formality,
          enthusiasm: profile.enthusiasm,
          brevity: profile.brevity,
          empathy: profile.empathy
        }
      });
      return profile;
    })
  }),
  // ===== EMAIL TEMPLATES =====
  templates: router({
    list: protectedProcedure.input(z2.object({ personaId: z2.string().optional() })).query(async ({ ctx, input }) => {
      return await getTemplates(ctx.user.id, input.personaId);
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string(),
      subject: z2.string().optional(),
      body: z2.string(),
      category: z2.string().optional(),
      personaId: z2.string().optional(),
      variables: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const template = await createTemplate({
        id: nanoid(),
        userId: ctx.user.id,
        name: input.name,
        subject: input.subject || null,
        body: input.body,
        category: input.category || null,
        personaId: input.personaId || null,
        variables: input.variables || null
      });
      return template;
    }),
    use: protectedProcedure.input(z2.object({
      templateId: z2.string(),
      variables: z2.record(z2.string(), z2.string()).optional()
    })).mutation(async ({ input }) => {
      const template = await getTemplate(input.templateId);
      if (!template) throw new Error("Template not found");
      let body = template.body || "";
      let subject = template.subject || "";
      if (input.variables) {
        Object.entries(input.variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, "g");
          body = body.replace(regex, String(value));
          subject = subject.replace(regex, String(value));
        });
      }
      await incrementTemplateUsage(input.templateId);
      return { subject, body };
    })
  }),
  // ===== CONTACTS =====
  contacts: router({
    list: protectedProcedure.input(z2.object({ limit: z2.number().optional() })).query(async ({ ctx, input }) => {
      return await getContacts(ctx.user.id, input.limit);
    }),
    search: protectedProcedure.input(z2.object({ query: z2.string() })).query(async ({ ctx, input }) => {
      return await searchContacts(ctx.user.id, input.query);
    }),
    get: protectedProcedure.input(z2.object({ contactId: z2.string() })).query(async ({ input }) => {
      return await getContact(input.contactId);
    }),
    upsert: protectedProcedure.input(z2.object({
      email: z2.string().email(),
      name: z2.string().optional(),
      company: z2.string().optional(),
      jobTitle: z2.string().optional(),
      phone: z2.string().optional(),
      linkedinUrl: z2.string().optional(),
      tags: z2.array(z2.string()).optional(),
      notes: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const contact = await upsertContact({
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
        customFields: null
      });
      return contact;
    }),
    enrichFromLinkedIn: protectedProcedure.input(z2.object({ contactId: z2.string() })).mutation(async ({ input }) => {
      const contact = await getContact(input.contactId);
      if (!contact || !contact.linkedinUrl) {
        throw new Error("Contact not found or no LinkedIn URL");
      }
      return {
        company: "Example Corp",
        jobTitle: "Senior Director",
        companySize: "1000-5000",
        companyIndustry: "Technology"
      };
    })
  }),
  // ===== FOLLOW-UPS =====
  followUps: router({
    list: protectedProcedure.input(z2.object({ status: z2.string().optional() })).query(async ({ ctx, input }) => {
      return await getFollowUps(ctx.user.id, input.status);
    }),
    overdue: protectedProcedure.query(async ({ ctx }) => {
      return await getOverdueFollowUps(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      contactId: z2.string().optional(),
      threadId: z2.string().optional(),
      subject: z2.string(),
      dueAt: z2.date(),
      priority: z2.enum(["low", "medium", "high", "urgent"]),
      notes: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const followUp = await createFollowUp({
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
        completedAt: null
      });
      return followUp;
    }),
    complete: protectedProcedure.input(z2.object({ followUpId: z2.string() })).mutation(async ({ input }) => {
      await updateFollowUpStatus(input.followUpId, "completed", /* @__PURE__ */ new Date());
      return { success: true };
    }),
    snooze: protectedProcedure.input(z2.object({
      followUpId: z2.string(),
      until: z2.date()
    })).mutation(async ({ input }) => {
      await updateFollowUpStatus(input.followUpId, "snoozed");
      return { success: true };
    }),
    generateSuggestion: protectedProcedure.input(z2.object({
      contactId: z2.string(),
      context: z2.string().optional()
    })).mutation(async ({ input }) => {
      const contact = await getContact(input.contactId);
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
        ]
      });
      return { suggestion: response.choices[0].message.content };
    })
  }),
  // ===== EMAIL SEQUENCES =====
  sequences: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getEmailSequences(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string(),
      description: z2.string().optional(),
      steps: z2.array(z2.object({
        order: z2.number(),
        delayDays: z2.number(),
        templateId: z2.string(),
        subject: z2.string(),
        body: z2.string()
      }))
    })).mutation(async ({ ctx, input }) => {
      const sequence = await createEmailSequence({
        id: nanoid(),
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        steps: input.steps,
        isActive: true
      });
      return sequence;
    }),
    enroll: protectedProcedure.input(z2.object({
      sequenceId: z2.string(),
      contactId: z2.string()
    })).mutation(async ({ input }) => {
      const enrollment = await enrollInSequence({
        id: nanoid(),
        sequenceId: input.sequenceId,
        contactId: input.contactId,
        currentStep: 0,
        status: "active",
        nextSendAt: /* @__PURE__ */ new Date()
      });
      return enrollment;
    })
  }),
  // ===== AI COMPOSITION =====
  ai: router({
    compose: protectedProcedure.input(z2.object({
      instruction: z2.string(),
      personaId: z2.string().optional(),
      context: z2.string().optional(),
      useSoundLikeMe: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      let systemPrompt = "You are an expert email writer. Write professional, clear, and effective emails.";
      if (input.personaId) {
        const persona = await getPersona(input.personaId);
        if (persona && persona.writingStyleProfile) {
          systemPrompt += `

Write in this style: ${JSON.stringify(persona.writingStyleProfile)}`;
        }
        if (persona && persona.toneSettings) {
          systemPrompt += `

Tone settings: Formality: ${persona.toneSettings.formality}/100, Enthusiasm: ${persona.toneSettings.enthusiasm}/100, Brevity: ${persona.toneSettings.brevity}/100, Empathy: ${persona.toneSettings.empathy}/100`;
        }
      }
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.instruction }
      ];
      if (input.context) {
        messages.push({
          role: "user",
          content: `Additional context: ${input.context}`
        });
      }
      const response = await invokeLLM({ messages });
      await logActivity({
        id: nanoid(),
        userId: ctx.user.id,
        action: "ai_compose",
        entityType: "email",
        metadata: { instruction: input.instruction }
      });
      return { content: response.choices[0].message.content };
    }),
    refine: protectedProcedure.input(z2.object({
      content: z2.string(),
      instruction: z2.string(),
      personaId: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are an expert email editor. Refine emails based on user instructions while maintaining the core message."
          },
          {
            role: "user",
            content: `Original email:

${input.content}

Instruction: ${input.instruction}`
          }
        ]
      });
      await logActivity({
        id: nanoid(),
        userId: ctx.user.id,
        action: "ai_refine",
        entityType: "email",
        metadata: { instruction: input.instruction }
      });
      return { content: response.choices[0].message.content };
    }),
    suggestSubject: protectedProcedure.input(z2.object({ body: z2.string() })).mutation(async ({ input }) => {
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
        ]
      });
      const content = response.choices[0].message.content;
      const subjects = (typeof content === "string" ? content : "").split("\n").filter((s) => s.trim());
      return { suggestions: subjects };
    }),
    quickReply: protectedProcedure.input(z2.object({
      emailContent: z2.string(),
      tone: z2.enum(["professional", "casual", "enthusiastic", "brief"]).optional()
    })).mutation(async ({ input }) => {
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
        ]
      });
      const content2 = response.choices[0].message.content;
      const replies = (typeof content2 === "string" ? content2 : "").split("\n\n").filter((r) => r.trim());
      return { suggestions: replies };
    })
  }),
  // ===== ANALYTICS =====
  analytics: router({
    overview: protectedProcedure.input(z2.object({ days: z2.number().optional() })).query(async ({ ctx, input }) => {
      const analytics = await getEmailAnalytics(ctx.user.id, input.days || 30);
      const totalSent = analytics.length;
      const totalOpened = analytics.filter((a) => a.openedAt).length;
      const totalClicked = analytics.filter((a) => a.clickedAt).length;
      const totalReplied = analytics.filter((a) => a.repliedAt).length;
      return {
        totalSent,
        openRate: totalSent > 0 ? totalOpened / totalSent * 100 : 0,
        clickRate: totalSent > 0 ? totalClicked / totalSent * 100 : 0,
        replyRate: totalSent > 0 ? totalReplied / totalSent * 100 : 0,
        analytics
      };
    }),
    byTemplate: protectedProcedure.query(async ({ ctx }) => {
      const templates = await getTemplates(ctx.user.id);
      return templates.map((t2) => ({
        templateId: t2.id,
        name: t2.name,
        usageCount: t2.usageCount,
        lastUsedAt: t2.lastUsedAt
      }));
    })
  }),
  // ===== INSIGHTS =====
  insights: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getInsights(ctx.user.id, false);
    }),
    dismiss: protectedProcedure.input(z2.object({ insightId: z2.string() })).mutation(async ({ input }) => {
      await dismissInsight(input.insightId);
      return { success: true };
    }),
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const contacts2 = await getContacts(ctx.user.id, 100);
      const followUps2 = await getOverdueFollowUps(ctx.user.id);
      const insights2 = [];
      if (followUps2.length > 0) {
        insights2.push(await createInsight({
          id: nanoid(),
          userId: ctx.user.id,
          type: "follow_up_needed",
          title: `You have ${followUps2.length} overdue follow-ups`,
          description: "These contacts are waiting for your response",
          priority: 90,
          actionable: true,
          actionUrl: null,
          relatedContactId: null,
          relatedThreadId: null,
          isDismissed: false,
          expiresAt: null
        }));
      }
      const coldContacts = contacts2.filter((c) => c.relationshipScore && c.relationshipScore < 30);
      if (coldContacts.length > 0) {
        insights2.push(await createInsight({
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
          expiresAt: null
        }));
      }
      return insights2;
    })
  }),
  // ===== CALENDAR =====
  calendar: router({
    upcoming: protectedProcedure.input(z2.object({ days: z2.number().optional() })).query(async ({ ctx, input }) => {
      return await getUpcomingCalendarEvents(ctx.user.id, input.days || 7);
    }),
    create: protectedProcedure.input(z2.object({
      accountId: z2.string(),
      title: z2.string(),
      description: z2.string().optional(),
      startTime: z2.date(),
      endTime: z2.date(),
      location: z2.string().optional(),
      attendees: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const event = await createCalendarEvent({
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
        relatedThreadId: null
      });
      return event;
    })
  }),
  // ===== INTEGRATIONS =====
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const integrations2 = await getIntegrations(ctx.user.id);
      return integrations2.map((i) => ({
        id: i.id,
        service: i.service,
        isActive: i.isActive,
        lastSyncedAt: i.lastSyncedAt
      }));
    }),
    configure: protectedProcedure.input(z2.object({
      service: z2.string(),
      apiKey: z2.string().optional(),
      config: z2.record(z2.string(), z2.any()).optional()
    })).mutation(async ({ ctx, input }) => {
      await upsertIntegration({
        id: nanoid(),
        userId: ctx.user.id,
        service: input.service,
        apiKey: input.apiKey || null,
        accessToken: null,
        refreshToken: null,
        config: input.config || null,
        isActive: true
      });
      return { success: true };
    })
  }),
  // ===== QUICK REPLIES =====
  quickReplies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getQuickReplies(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      trigger: z2.string(),
      content: z2.string(),
      category: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const reply = await createQuickReply({
        id: nanoid(),
        userId: ctx.user.id,
        trigger: input.trigger,
        content: input.content,
        category: input.category || null
      });
      return reply;
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
