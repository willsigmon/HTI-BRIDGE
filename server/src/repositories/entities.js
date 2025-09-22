import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

function getContacts() {
  return db.data.contacts;
}

function getOrganizations() {
  return db.data.organizations;
}

function getHouseholds() {
  return db.data.households;
}

function getLeadAssignments() {
  return db.data.leadAssignments;
}

function toTitleCase(value) {
  if (!value) return value;
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

export function upsertOrganization(payload = {}, { actorId = 'system' } = {}) {
  const organizations = getOrganizations();
  const now = new Date().toISOString();
  const name = payload.name?.trim();
  const normalizedName = normalize(name || payload.legalName || payload.slug);
  if (!normalizedName) {
    throw new Error('Organization name is required for deduplication');
  }
  let organization = organizations.find((org) => org.normalizedName === normalizedName);

  if (!organization) {
    organization = {
      id: payload.id || crypto.randomUUID(),
      name: name || payload.legalName,
      normalizedName,
      legalName: payload.legalName || null,
      type: payload.type || 'Company',
      website: payload.website || null,
      industry: payload.industry || null,
      territory: payload.territory || null,
      address: payload.address || null,
      focusAreas: payload.focusAreas || [],
      givingCapacity: payload.givingCapacity || null,
      metrics: payload.metrics || {},
      tags: payload.tags || [],
      source: payload.source || 'manual',
      workspaceId: ensureWorkspaceId(payload.workspaceId),
      createdAt: now,
      updatedAt: now,
      leadIds: payload.leadIds ? [...new Set(payload.leadIds)] : []
    };
    organizations.push(organization);
    logAuditEvent({
      actorId,
      action: 'organization.created',
      entityType: 'organization',
      entityId: organization.id,
      after: { name: organization.name }
    });
  } else {
    organization.name = name || organization.name;
    organization.legalName = payload.legalName || organization.legalName;
    organization.type = payload.type || organization.type;
    organization.website = payload.website || organization.website;
    organization.industry = payload.industry || organization.industry;
    organization.territory = payload.territory || organization.territory;
    organization.address = payload.address || organization.address;
    organization.focusAreas = mergeUnique(organization.focusAreas, payload.focusAreas);
    organization.givingCapacity = payload.givingCapacity || organization.givingCapacity;
    organization.metrics = { ...organization.metrics, ...(payload.metrics || {}) };
    organization.tags = mergeUnique(organization.tags, payload.tags);
    organization.source = payload.source || organization.source;
    organization.workspaceId = ensureWorkspaceId(payload.workspaceId) || organization.workspaceId;
    organization.leadIds = mergeUnique(organization.leadIds, payload.leadIds);
    organization.updatedAt = now;
  }

  writeDb();
  return organization;
}

export function upsertContact(payload = {}, { actorId = 'system', linkLeadId } = {}) {
  const contacts = getContacts();
  const now = new Date().toISOString();
  const workspaceId = ensureWorkspaceId(payload.workspaceId);
  const email = payload.email?.toLowerCase();
  const normalizedName = normalize(`${payload.firstName || ''}-${payload.lastName || ''}-${payload.companyName || ''}`);
  const phone = payload.phone?.replace(/[^0-9+]/g, '');

  let contact = null;
  if (email) {
    contact = contacts.find((row) => row.emails?.some((value) => value === email));
  }
  if (!contact) {
    contact = contacts.find((row) => row.normalizedName === normalizedName && row.workspaceId === workspaceId);
  }

  const companyName = payload.companyName || payload.organizationName;
  const organization = companyName
    ? upsertOrganization(
        {
          name: companyName,
          address: payload.companyAddress || payload.address,
          industry: payload.industry,
          focusAreas: payload.focusAreas,
          workspaceId,
          leadIds: linkLeadId ? [linkLeadId] : undefined
        },
        { actorId }
      )
    : null;

  let householdId = payload.householdId || null;
  if (!householdId && payload.householdName) {
    const household = ensureHousehold({
      name: payload.householdName,
      address: payload.address,
      workspaceId
    });
    householdId = household.id;
  }

  if (!contact) {
    contact = {
      id: payload.id || crypto.randomUUID(),
      firstName: toTitleCase(payload.firstName || ''),
      lastName: toTitleCase(payload.lastName || ''),
      displayName: payload.displayName || buildDisplayName(payload),
      title: payload.title || null,
      normalizedName,
      emails: email ? [email] : [],
      phones: phone ? [phone] : [],
      mobile: payload.mobile || null,
      linkedin: payload.linkedin || null,
      householdId,
      organizationId: organization?.id || null,
      leadIds: linkLeadId ? [linkLeadId] : [],
      sources: payload.source ? [payload.source] : [],
      tags: payload.tags || [],
      workspaceId,
      status: payload.status || 'Active',
      notes: payload.notes || '',
      createdAt: now,
      updatedAt: now
    };
    contacts.push(contact);
    if (householdId) {
      attachContactToHousehold(contact.id, householdId);
    }
    logAuditEvent({
      actorId,
      action: 'contact.created',
      entityType: 'contact',
      entityId: contact.id,
      after: { displayName: contact.displayName }
    });
  } else {
    contact.firstName = toTitleCase(payload.firstName || contact.firstName);
    contact.lastName = toTitleCase(payload.lastName || contact.lastName);
    contact.displayName = payload.displayName || buildDisplayName(contact);
    contact.title = payload.title || contact.title;
    contact.emails = mergeUnique(contact.emails, email ? [email] : []);
    contact.phones = mergeUnique(contact.phones, phone ? [phone] : []);
    contact.mobile = payload.mobile || contact.mobile;
    contact.linkedin = payload.linkedin || contact.linkedin;
    contact.organizationId = organization?.id || contact.organizationId || null;
    contact.householdId = householdId || contact.householdId || null;
    contact.leadIds = mergeUnique(contact.leadIds, linkLeadId ? [linkLeadId] : payload.leadIds);
    contact.sources = mergeUnique(contact.sources, payload.source ? [payload.source] : []);
    contact.tags = mergeUnique(contact.tags, payload.tags);
    contact.status = payload.status || contact.status;
    contact.notes = payload.notes || contact.notes;
    contact.workspaceId = workspaceId || contact.workspaceId;
    contact.updatedAt = now;
    if (contact.householdId) {
      attachContactToHousehold(contact.id, contact.householdId);
    }
  }

  if (organization && !organization.leadIds.includes(linkLeadId) && linkLeadId) {
    organization.leadIds.push(linkLeadId);
  }

  writeDb();
  return { contact, organization };
}

export function ensureLeadAssignment({
  leadId,
  entityType,
  entityId,
  metadata
}) {
  const assignments = getLeadAssignments();
  const existing = assignments.find((row) => row.leadId === leadId && row.entityType === entityType);
  if (existing) {
    existing.entityId = entityId;
    existing.metadata = metadata || existing.metadata || null;
    existing.updatedAt = new Date().toISOString();
  } else {
    assignments.push({
      id: crypto.randomUUID(),
      leadId,
      entityType,
      entityId,
      metadata: metadata || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  writeDb();
}

export function listUnifiedRecords({
  search,
  type,
  workspaceId
} = {}) {
  const contacts = [...getContacts()];
  const organizations = [...getOrganizations()];
  const households = [...getHouseholds()];
  let results = [];

  if (!type || type === 'contact') {
    results = results.concat(contacts.map(expandContact));
  }
  if (!type || type === 'organization') {
    results = results.concat(organizations.map(expandOrganization));
  }
  if (!type || type === 'household') {
    results = results.concat(households.map(expandHousehold));
  }

  if (workspaceId) {
    results = results.filter((record) => record.workspaceId === workspaceId);
  }

  if (search) {
    const lowered = search.toLowerCase();
    results = results.filter((record) => {
      return (
        record.name?.toLowerCase().includes(lowered) ||
        record.displayName?.toLowerCase().includes(lowered) ||
        record.emails?.some((email) => email.toLowerCase().includes(lowered)) ||
        record.tags?.some((tag) => tag.toLowerCase().includes(lowered))
      );
    });
  }

  results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return results;
}

export function summarizeEntities() {
  const contacts = getContacts();
  const organizations = getOrganizations();
  const households = getHouseholds();

  const contactCount = contacts.length;
  const organizationCount = organizations.length;
  const householdCount = households.length;
  const activeContacts = contacts.filter((contact) => contact.status !== 'Archived').length;
  const dedupIndex = buildDedupIndex();

  return {
    contactCount,
    organizationCount,
    householdCount,
    activeContacts,
    duplicatesFlagged: dedupIndex.duplicates.length
  };
}

export function mergeContacts(primaryId, duplicateId, { actorId = 'system' } = {}) {
  if (primaryId === duplicateId) return getContacts().find((contact) => contact.id === primaryId) || null;
  const contacts = getContacts();
  const primary = contacts.find((contact) => contact.id === primaryId);
  const duplicate = contacts.find((contact) => contact.id === duplicateId);
  if (!primary || !duplicate) return null;
  const before = { primary: { ...primary }, duplicate: { ...duplicate } };

  primary.emails = mergeUnique(primary.emails, duplicate.emails);
  primary.phones = mergeUnique(primary.phones, duplicate.phones);
  primary.leadIds = mergeUnique(primary.leadIds, duplicate.leadIds);
  primary.sources = mergeUnique(primary.sources, duplicate.sources);
  primary.tags = mergeUnique(primary.tags, duplicate.tags);
  primary.updatedAt = new Date().toISOString();

  const contactsIndex = contacts.findIndex((contact) => contact.id === duplicateId);
  contacts.splice(contactsIndex, 1);
  writeDb();

  logAuditEvent({
    actorId,
    action: 'contact.merged',
    entityType: 'contact',
    entityId: primaryId,
    before,
    after: { ...primary }
  });

  return primary;
}

export function buildDedupIndex() {
  const contacts = getContacts();
  const organizations = getOrganizations();
  const duplicates = [];
  const keys = new Map();

  for (const contact of contacts) {
    for (const email of contact.emails || []) {
      const key = `email:${email}`;
      const existing = keys.get(key);
      if (existing) {
        duplicates.push({ key, ids: [existing.id, contact.id] });
      } else {
        keys.set(key, contact);
      }
    }
    const nameKey = `name:${contact.normalizedName}`;
    const existingName = keys.get(nameKey);
    if (existingName && existingName.id !== contact.id) {
      duplicates.push({ key: nameKey, ids: [existingName.id, contact.id] });
    } else {
      keys.set(nameKey, contact);
    }
  }

  for (const organization of organizations) {
    const key = `org:${organization.normalizedName}`;
    const existing = keys.get(key);
    if (existing) {
      duplicates.push({ key, ids: [existing.id, organization.id] });
    } else {
      keys.set(key, organization);
    }
  }

  return { duplicates, keys: [...keys.keys()] };
}

export function expandContact(contact) {
  if (!contact) return null;
  const organization = contact.organizationId
    ? getOrganizations().find((org) => org.id === contact.organizationId)
    : null;
  const household = contact.householdId
    ? getHouseholds().find((row) => row.id === contact.householdId)
    : null;
  return {
    ...contact,
    recordType: 'contact',
    name: contact.displayName,
    organizationName: organization?.name || null,
    householdName: household?.name || null,
    workspaceId: contact.workspaceId
  };
}

export function expandOrganization(organization) {
  if (!organization) return null;
  const contacts = getContacts().filter((contact) => contact.organizationId === organization.id);
  return {
    ...organization,
    recordType: 'organization',
    displayName: organization.name,
    contactCount: contacts.length,
    workspaceId: organization.workspaceId,
    contacts: contacts.map((contact) => contact.id)
  };
}

export function expandHousehold(household) {
  if (!household) return null;
  const contacts = getContacts().filter((contact) => contact.householdId === household.id);
  return {
    ...household,
    recordType: 'household',
    displayName: household.name,
    workspaceId: household.workspaceId,
    contactIds: contacts.map((contact) => contact.id)
  };
}

export function ensureEntitiesForLead(lead, { actorId = 'system' } = {}) {
  if (!lead) return null;
  const contactPayload = {
    firstName: lead.contact?.split(' ')[0] || null,
    lastName: lead.contact?.split(' ').slice(1).join(' ') || lead.company || 'Contact',
    displayName: lead.contact || lead.company,
    title: lead.contactTitle,
    email: lead.contactEmail,
    phone: lead.contactPhone,
    companyName: lead.company,
    industry: lead.industry,
    source: lead.source,
    leadIds: [lead.id],
    workspaceId: lead.workspaceId
  };

  const { contact, organization } = upsertContact(contactPayload, {
    actorId,
    linkLeadId: lead.id
  });

  ensureLeadAssignment({
    leadId: lead.id,
    entityType: 'contact',
    entityId: contact.id
  });

  if (organization) {
    ensureLeadAssignment({
      leadId: lead.id,
      entityType: 'organization',
      entityId: organization.id
    });
  }

  writeDb();
  return { contact, organization };
}

function ensureHousehold({ name, address, workspaceId }) {
  const households = getHouseholds();
  const normalizedName = normalize(name);
  let household = households.find((row) => row.normalizedName === normalizedName);
  if (!household) {
    const now = new Date().toISOString();
    household = {
      id: crypto.randomUUID(),
      name,
      normalizedName,
      address: address || null,
      workspaceId: ensureWorkspaceId(workspaceId),
      contactIds: [],
      createdAt: now,
      updatedAt: now
    };
    households.push(household);
  }
  return household;
}

function attachContactToHousehold(contactId, householdId) {
  const household = getHouseholds().find((row) => row.id === householdId);
  if (!household) return;
  if (!household.contactIds.includes(contactId)) {
    household.contactIds.push(contactId);
    household.updatedAt = new Date().toISOString();
  }
}

function mergeUnique(existing = [], incoming = []) {
  const set = new Set([...(existing || []), ...(incoming || [])].filter(Boolean));
  return [...set];
}

function buildDisplayName(payload) {
  const first = payload.firstName || '';
  const last = payload.lastName || '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (payload.displayName) return payload.displayName;
  return payload.companyName || 'Contact';
}
