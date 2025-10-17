# HEARTS (Knack) Integration Plan for HTI-BRIDGE CRM

## What is HEARTS?

**HEARTS** is HTI's internal operations system built on the **Knack** platform. Based on email evidence, HEARTS handles:

- **Reimbursement requests** (accounting@hubzonetech.org)
- **Marketing requests** (rtaylor@hubzonetech.org)
- **Internal workflows** and approvals
- **Staff operations** and administration

## Knack Platform Capabilities

### API Features
- **REST API** with full CRUD operations (Create, Read, Update, Delete)
- **Object-based requests** - Full access with API key
- **View-based requests** - Follows view permissions (no API key needed)
- **Authentication** via HTTP headers
- **Rate limits**: 10 requests/second, daily limit based on plan

### Integration Methods

1. **Direct API Integration**
   - Read records from HEARTS
   - Create new records in HEARTS
   - Update existing records
   - Delete records

2. **Webhooks** (mentioned in docs but limited documentation)
   - Real-time notifications when records change
   - Push data from HEARTS to HTI-BRIDGE automatically

3. **Knack Flows** (Native integrations)
   - No-code bi-directional sync
   - Pre-built connectors for popular apps

## Proposed HTI-BRIDGE ↔ HEARTS Integration

### Architecture

```
HTI-BRIDGE CRM (Donor Leads)  ←→  HEARTS (Operations)
     ↓                              ↓
  Scrapers                    Reimbursements
  Lead Swipe                  Marketing Requests
  Pipeline                    Staff Management
  Analytics                   Approvals
```

### Integration Scenarios

#### Scenario 1: One-Way Sync (HTI-BRIDGE → HEARTS)
**Use Case**: Push qualified leads from HTI-BRIDGE to HEARTS for fulfillment

**Flow**:
1. Lead is qualified in HTI-BRIDGE (marked as "Committed" or "Donated")
2. HTI-BRIDGE automatically creates a record in HEARTS
3. HEARTS tracks the donation fulfillment process
4. HTI staff use HEARTS for logistics, pickup scheduling, processing

**Benefits**:
- HTI-BRIDGE stays focused on donor acquisition
- HEARTS handles operations
- Clean separation of concerns

#### Scenario 2: Bi-Directional Sync
**Use Case**: Keep donor status synchronized between systems

**Flow**:
1. Lead qualified in HTI-BRIDGE → Creates donor record in HEARTS
2. Donation received in HEARTS → Updates lead status in HTI-BRIDGE
3. Chromebooks delivered in HEARTS → Updates grant progress in HTI-BRIDGE

**Benefits**:
- Real-time status updates
- Unified reporting
- Grant progress tracking

#### Scenario 3: HTI-BRIDGE as Dashboard for HEARTS Data
**Use Case**: Visualize HEARTS data in HTI-BRIDGE's analytics

**Flow**:
1. HTI-BRIDGE reads donation data from HEARTS via API
2. HTI-BRIDGE displays grant progress, impact metrics
3. HTI-BRIDGE shows recipient data, delivery stats
4. HTI-BRIDGE creates reports combining donor leads + fulfillment data

**Benefits**:
- Unified view of entire pipeline (lead → donation → delivery)
- Better analytics and reporting
- Grant compliance tracking

### Recommended Approach

**Phase 1: One-Way Sync (HTI-BRIDGE → HEARTS)**
- Simplest to implement
- Clear separation of concerns
- HTI-BRIDGE = donor acquisition, HEARTS = operations
- Low risk of data conflicts

**Phase 2: Read HEARTS Data for Analytics**
- Pull donation/delivery data from HEARTS
- Display in HTI-BRIDGE analytics dashboard
- Track progress toward 5,000 Chromebook goal
- Generate unified reports

**Phase 3: Bi-Directional Sync (if needed)**
- Only if real-time status updates are critical
- Requires webhook setup
- More complex error handling

## Technical Implementation

### Required Information
- [ ] HEARTS API credentials (API key)
- [ ] HEARTS app ID
- [ ] Object IDs for relevant tables (donors, donations, etc.)
- [ ] Field mappings (HTI-BRIDGE fields → HEARTS fields)
- [ ] Webhook URLs (if using webhooks)

### API Endpoints

**Base URL**: `https://api.knack.com/v1/`

**Authentication Headers**:
```
X-Knack-Application-Id: {app_id}
X-Knack-REST-API-Key: {api_key}
```

**Common Operations**:
```javascript
// Create record in HEARTS
POST /objects/{object_key}/records
Body: { field_1: "value", field_2: "value" }

// Read records from HEARTS
GET /objects/{object_key}/records

// Update record in HEARTS
PUT /objects/{object_key}/records/{record_id}
Body: { field_1: "new_value" }

// Delete record
DELETE /objects/{object_key}/records/{record_id}
```

### Data Mapping

**HTI-BRIDGE Lead → HEARTS Donor**:
```javascript
{
  // HTI-BRIDGE CRM fields
  company: "Smith Anderson Law Firm",
  contact: "John Smith",
  email: "jsmith@smithlaw.com",
  phone: "919-555-1234",
  status: "Committed",
  expectedChromebooks: 50,
  
  // Maps to HEARTS fields
  donor_name: company,
  contact_person: contact,
  contact_email: email,
  contact_phone: phone,
  donation_status: status,
  expected_units: expectedChromebooks,
  source: "HTI-BRIDGE CRM",
  date_qualified: new Date()
}
```

## Security Considerations

1. **API Key Storage**: Store Knack API keys in environment variables
2. **Rate Limiting**: Respect 10 req/sec limit, implement retry logic
3. **Error Handling**: Gracefully handle API failures
4. **Data Validation**: Validate data before sending to HEARTS
5. **Audit Logging**: Log all sync operations for troubleshooting

## Next Steps

1. **Get HEARTS credentials** from HTI admin
2. **Map data structures** between HTI-BRIDGE and HEARTS
3. **Build sync module** in HTI-BRIDGE server
4. **Test with staging data** before production
5. **Deploy and monitor** integration

## Questions for HTI Team

1. What data currently lives in HEARTS?
2. Do you want HTI-BRIDGE to push qualified leads to HEARTS?
3. Should HTI-BRIDGE read donation/delivery data from HEARTS?
4. Who manages HEARTS API credentials?
5. What's the daily API call limit on your Knack plan?
6. Are there any existing integrations with HEARTS we should know about?

---

**Status**: Research complete, ready to implement once credentials are provided
**Priority**: Medium (not blocking core HTI-BRIDGE CRM functionality)
**Estimated Effort**: 2-3 days for Phase 1 implementation

