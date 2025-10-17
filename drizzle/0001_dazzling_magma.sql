CREATE TABLE `activityLog` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50),
	`entityId` varchar(64),
	`metadata` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarEvents` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`accountId` varchar(64) NOT NULL,
	`eventId` varchar(200) NOT NULL,
	`title` varchar(500),
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`location` varchar(500),
	`attendees` json,
	`meetingLink` varchar(500),
	`relatedThreadId` varchar(64),
	`relatedContactId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200),
	`firstName` varchar(100),
	`lastName` varchar(100),
	`company` varchar(200),
	`jobTitle` varchar(200),
	`phone` varchar(50),
	`linkedinUrl` varchar(500),
	`companySize` varchar(50),
	`companyRevenue` varchar(50),
	`companyIndustry` varchar(100),
	`location` varchar(200),
	`timezone` varchar(100),
	`relationshipScore` int DEFAULT 50,
	`lastContactedAt` timestamp,
	`totalEmailsSent` int DEFAULT 0,
	`totalEmailsReceived` int DEFAULT 0,
	`avgResponseTimeHours` int,
	`tags` json,
	`notes` text,
	`customFields` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailAccounts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`provider` varchar(50) DEFAULT 'gmail',
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiry` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`lastSyncedAt` timestamp,
	CONSTRAINT `emailAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailAnalytics` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`messageId` varchar(64) NOT NULL,
	`sentAt` timestamp NOT NULL,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`repliedAt` timestamp,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`recipientEmail` varchar(320),
	`subject` varchar(500),
	`templateId` varchar(64),
	`personaId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `emailAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailMessages` (
	`id` varchar(64) NOT NULL,
	`threadId` varchar(64) NOT NULL,
	`messageId` varchar(200) NOT NULL,
	`from` varchar(320) NOT NULL,
	`to` json,
	`cc` json,
	`bcc` json,
	`subject` varchar(1000),
	`body` text,
	`bodyPlain` text,
	`snippet` varchar(500),
	`hasAttachments` boolean DEFAULT false,
	`attachments` json,
	`inReplyTo` varchar(200),
	`references` json,
	`receivedAt` timestamp,
	`sentAt` timestamp,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `emailMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSequences` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`isActive` boolean DEFAULT true,
	`steps` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `emailSequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailTemplates` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`personaId` varchar(64),
	`name` varchar(200) NOT NULL,
	`subject` varchar(500),
	`body` text NOT NULL,
	`category` varchar(100),
	`variables` json,
	`usageCount` int DEFAULT 0,
	`lastUsedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailThreads` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`accountId` varchar(64) NOT NULL,
	`threadId` varchar(200) NOT NULL,
	`subject` varchar(1000),
	`participants` json,
	`lastMessageAt` timestamp,
	`messageCount` int DEFAULT 0,
	`isRead` boolean DEFAULT false,
	`isStarred` boolean DEFAULT false,
	`isArchived` boolean DEFAULT false,
	`labels` json,
	`priority` int DEFAULT 50,
	`sentiment` varchar(50),
	`category` varchar(100),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `emailThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followUps` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`contactId` varchar(64),
	`threadId` varchar(64),
	`subject` varchar(500),
	`dueAt` timestamp NOT NULL,
	`status` enum('pending','completed','snoozed','cancelled') DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`notes` text,
	`aiSuggestion` text,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `followUps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`type` enum('relationship_health','follow_up_needed','best_time_to_send','tone_warning','opportunity','risk') NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`actionable` boolean DEFAULT true,
	`actionUrl` varchar(500),
	`priority` int DEFAULT 50,
	`relatedContactId` varchar(64),
	`relatedThreadId` varchar(64),
	`isDismissed` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`service` varchar(100) NOT NULL,
	`apiKey` text,
	`accessToken` text,
	`refreshToken` text,
	`config` json,
	`isActive` boolean DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('work','personal','sales','support','networking','custom') NOT NULL,
	`description` text,
	`toneSettings` json,
	`writingStyleProfile` json,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quickReplies` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`trigger` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `quickReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedSearches` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`query` text NOT NULL,
	`filters` json,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `savedSearches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequenceEnrollments` (
	`id` varchar(64) NOT NULL,
	`sequenceId` varchar(64) NOT NULL,
	`contactId` varchar(64) NOT NULL,
	`currentStep` int DEFAULT 0,
	`status` enum('active','paused','completed','unsubscribed') DEFAULT 'active',
	`nextSendAt` timestamp,
	`enrolledAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `sequenceEnrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `defaultPersona` varchar(50) DEFAULT 'work';--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(100) DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE `users` ADD `notificationsEnabled` boolean DEFAULT true;--> statement-breakpoint
CREATE INDEX `activityLog_userId_idx` ON `activityLog` (`userId`);--> statement-breakpoint
CREATE INDEX `activityLog_action_idx` ON `activityLog` (`action`);--> statement-breakpoint
CREATE INDEX `activityLog_createdAt_idx` ON `activityLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `calendarEvents_userId_idx` ON `calendarEvents` (`userId`);--> statement-breakpoint
CREATE INDEX `calendarEvents_startTime_idx` ON `calendarEvents` (`startTime`);--> statement-breakpoint
CREATE INDEX `contacts_userId_idx` ON `contacts` (`userId`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `emailAccounts_userId_idx` ON `emailAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `emailAnalytics_userId_idx` ON `emailAnalytics` (`userId`);--> statement-breakpoint
CREATE INDEX `emailAnalytics_messageId_idx` ON `emailAnalytics` (`messageId`);--> statement-breakpoint
CREATE INDEX `emailMessages_threadId_idx` ON `emailMessages` (`threadId`);--> statement-breakpoint
CREATE INDEX `emailSequences_userId_idx` ON `emailSequences` (`userId`);--> statement-breakpoint
CREATE INDEX `emailTemplates_userId_idx` ON `emailTemplates` (`userId`);--> statement-breakpoint
CREATE INDEX `emailThreads_userId_idx` ON `emailThreads` (`userId`);--> statement-breakpoint
CREATE INDEX `emailThreads_accountId_idx` ON `emailThreads` (`accountId`);--> statement-breakpoint
CREATE INDEX `followUps_userId_idx` ON `followUps` (`userId`);--> statement-breakpoint
CREATE INDEX `followUps_dueAt_idx` ON `followUps` (`dueAt`);--> statement-breakpoint
CREATE INDEX `insights_userId_idx` ON `insights` (`userId`);--> statement-breakpoint
CREATE INDEX `insights_type_idx` ON `insights` (`type`);--> statement-breakpoint
CREATE INDEX `integrations_userId_idx` ON `integrations` (`userId`);--> statement-breakpoint
CREATE INDEX `integrations_service_idx` ON `integrations` (`service`);--> statement-breakpoint
CREATE INDEX `personas_userId_idx` ON `personas` (`userId`);--> statement-breakpoint
CREATE INDEX `quickReplies_userId_idx` ON `quickReplies` (`userId`);--> statement-breakpoint
CREATE INDEX `savedSearches_userId_idx` ON `savedSearches` (`userId`);--> statement-breakpoint
CREATE INDEX `sequenceEnrollments_sequenceId_idx` ON `sequenceEnrollments` (`sequenceId`);--> statement-breakpoint
CREATE INDEX `sequenceEnrollments_contactId_idx` ON `sequenceEnrollments` (`contactId`);