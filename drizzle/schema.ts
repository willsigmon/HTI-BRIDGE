import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean, json, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow
 */
export const users = mysqlTable("users", {
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
  notificationsEnabled: boolean("notificationsEnabled").default(true),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Email accounts connected by the user
 */
export const emailAccounts = mysqlTable("emailAccounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("gmail"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSyncedAt: timestamp("lastSyncedAt"),
}, (table) => ({
  userIdIdx: index("emailAccounts_userId_idx").on(table.userId),
}));

export type EmailAccount = typeof emailAccounts.$inferSelect;

/**
 * Personas for different communication styles
 */
export const personas = mysqlTable("personas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["work", "personal", "sales", "support", "networking", "custom"]).notNull(),
  description: text("description"),
  toneSettings: json("toneSettings").$type<{
    formality: number; // 0-100
    enthusiasm: number;
    brevity: number;
    empathy: number;
  }>(),
  writingStyleProfile: json("writingStyleProfile").$type<any>(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("personas_userId_idx").on(table.userId),
}));

export type Persona = typeof personas.$inferSelect;

/**
 * Email templates for quick composition
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  personaId: varchar("personaId", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }),
  variables: json("variables").$type<string[]>(), // e.g., ["firstName", "companyName"]
  usageCount: int("usageCount").default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("emailTemplates_userId_idx").on(table.userId),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;

/**
 * Contacts with enriched data
 */
export const contacts = mysqlTable("contacts", {
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
  relationshipScore: int("relationshipScore").default(50), // 0-100
  lastContactedAt: timestamp("lastContactedAt"),
  totalEmailsSent: int("totalEmailsSent").default(0),
  totalEmailsReceived: int("totalEmailsReceived").default(0),
  avgResponseTimeHours: int("avgResponseTimeHours"),
  
  // Metadata
  tags: json("tags").$type<string[]>(),
  notes: text("notes"),
  customFields: json("customFields").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("contacts_userId_idx").on(table.userId),
  emailIdx: index("contacts_email_idx").on(table.email),
}));

export type Contact = typeof contacts.$inferSelect;

/**
 * Email threads and messages
 */
export const emailThreads = mysqlTable("emailThreads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  threadId: varchar("threadId", { length: 200 }).notNull(), // Gmail thread ID
  subject: varchar("subject", { length: 1000 }),
  participants: json("participants").$type<string[]>(),
  lastMessageAt: timestamp("lastMessageAt"),
  messageCount: int("messageCount").default(0),
  isRead: boolean("isRead").default(false),
  isStarred: boolean("isStarred").default(false),
  isArchived: boolean("isArchived").default(false),
  labels: json("labels").$type<string[]>(),
  priority: int("priority").default(50), // AI-calculated priority 0-100
  sentiment: varchar("sentiment", { length: 50 }), // positive, neutral, negative
  category: varchar("category", { length: 100 }), // work, personal, sales, support, etc.
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("emailThreads_userId_idx").on(table.userId),
  accountIdIdx: index("emailThreads_accountId_idx").on(table.accountId),
}));

export type EmailThread = typeof emailThreads.$inferSelect;

/**
 * Individual email messages
 */
export const emailMessages = mysqlTable("emailMessages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  threadId: varchar("threadId", { length: 64 }).notNull(),
  messageId: varchar("messageId", { length: 200 }).notNull(), // Gmail message ID
  from: varchar("from", { length: 320 }).notNull(),
  to: json("to").$type<string[]>(),
  cc: json("cc").$type<string[]>(),
  bcc: json("bcc").$type<string[]>(),
  subject: varchar("subject", { length: 1000 }),
  body: text("body"),
  bodyPlain: text("bodyPlain"),
  snippet: varchar("snippet", { length: 500 }),
  hasAttachments: boolean("hasAttachments").default(false),
  attachments: json("attachments").$type<any[]>(),
  inReplyTo: varchar("inReplyTo", { length: 200 }),
  references: json("references").$type<string[]>(),
  receivedAt: timestamp("receivedAt"),
  sentAt: timestamp("sentAt"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  threadIdIdx: index("emailMessages_threadId_idx").on(table.threadId),
}));

export type EmailMessage = typeof emailMessages.$inferSelect;

/**
 * Follow-up reminders and tracking
 */
export const followUps = mysqlTable("followUps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  contactId: varchar("contactId", { length: 64 }),
  threadId: varchar("threadId", { length: 64 }),
  subject: varchar("subject", { length: 500 }),
  dueAt: timestamp("dueAt").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "snoozed", "cancelled"]).default("pending"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  notes: text("notes"),
  aiSuggestion: text("aiSuggestion"), // AI-generated follow-up suggestion
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("followUps_userId_idx").on(table.userId),
  dueAtIdx: index("followUps_dueAt_idx").on(table.dueAt),
}));

export type FollowUp = typeof followUps.$inferSelect;

/**
 * Email sequences (drip campaigns)
 */
export const emailSequences = mysqlTable("emailSequences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true),
  steps: json("steps").$type<Array<{
    order: number;
    delayDays: number;
    templateId: string;
    subject: string;
    body: string;
  }>>(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("emailSequences_userId_idx").on(table.userId),
}));

export type EmailSequence = typeof emailSequences.$inferSelect;

/**
 * Sequence enrollments (contacts in sequences)
 */
export const sequenceEnrollments = mysqlTable("sequenceEnrollments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 64 }).notNull(),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  currentStep: int("currentStep").default(0),
  status: mysqlEnum("status", ["active", "paused", "completed", "unsubscribed"]).default("active"),
  nextSendAt: timestamp("nextSendAt"),
  enrolledAt: timestamp("enrolledAt").defaultNow(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  sequenceIdIdx: index("sequenceEnrollments_sequenceId_idx").on(table.sequenceId),
  contactIdIdx: index("sequenceEnrollments_contactId_idx").on(table.contactId),
}));

export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;

/**
 * Email analytics and tracking
 */
export const emailAnalytics = mysqlTable("emailAnalytics", {
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
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("emailAnalytics_userId_idx").on(table.userId),
  messageIdIdx: index("emailAnalytics_messageId_idx").on(table.messageId),
}));

export type EmailAnalytics = typeof emailAnalytics.$inferSelect;

/**
 * AI-generated insights and suggestions
 */
export const insights = mysqlTable("insights", {
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
  expiresAt: timestamp("expiresAt"),
}, (table) => ({
  userIdIdx: index("insights_userId_idx").on(table.userId),
  typeIdx: index("insights_type_idx").on(table.type),
}));

export type Insight = typeof insights.$inferSelect;

/**
 * Calendar events integration
 */
export const calendarEvents = mysqlTable("calendarEvents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  eventId: varchar("eventId", { length: 200 }).notNull(), // Google Calendar event ID
  title: varchar("title", { length: 500 }),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  location: varchar("location", { length: 500 }),
  attendees: json("attendees").$type<string[]>(),
  meetingLink: varchar("meetingLink", { length: 500 }),
  relatedThreadId: varchar("relatedThreadId", { length: 64 }),
  relatedContactId: varchar("relatedContactId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("calendarEvents_userId_idx").on(table.userId),
  startTimeIdx: index("calendarEvents_startTime_idx").on(table.startTime),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;

/**
 * API keys and integrations
 */
export const integrations = mysqlTable("integrations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  service: varchar("service", { length: 100 }).notNull(), // openai, anthropic, slack, etc.
  apiKey: text("apiKey"), // Encrypted
  accessToken: text("accessToken"), // Encrypted
  refreshToken: text("refreshToken"), // Encrypted
  config: json("config").$type<Record<string, any>>(),
  isActive: boolean("isActive").default(true),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("integrations_userId_idx").on(table.userId),
  serviceIdx: index("integrations_service_idx").on(table.service),
}));

export type Integration = typeof integrations.$inferSelect;

/**
 * User activity log for analytics
 */
export const activityLog = mysqlTable("activityLog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // email_sent, email_opened, template_used, etc.
  entityType: varchar("entityType", { length: 50 }), // email, contact, template, etc.
  entityId: varchar("entityId", { length: 64 }),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("activityLog_userId_idx").on(table.userId),
  actionIdx: index("activityLog_action_idx").on(table.action),
  createdAtIdx: index("activityLog_createdAt_idx").on(table.createdAt),
}));

export type ActivityLog = typeof activityLog.$inferSelect;

/**
 * Quick replies and canned responses
 */
export const quickReplies = mysqlTable("quickReplies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  trigger: varchar("trigger", { length: 100 }).notNull(), // shortcut like "/thanks"
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("quickReplies_userId_idx").on(table.userId),
}));

export type QuickReply = typeof quickReplies.$inferSelect;

/**
 * Saved searches
 */
export const savedSearches = mysqlTable("savedSearches", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  query: text("query").notNull(),
  filters: json("filters").$type<Record<string, any>>(),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("savedSearches_userId_idx").on(table.userId),
}));

export type SavedSearch = typeof savedSearches.$inferSelect;

