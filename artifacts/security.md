# Security & Compliance Checklist

## Identity & Access
- Enforce SSO (SAML/OIDC) and MFA prior to production go-live.
- Map least-privilege RBAC roles; review admin scopes quarterly.
- Enable audit logging and archive read-only copies for compliance.

## Data Protection
- Verify TLS 1.2+ in transit and encryption at rest for all storage layers.
- Rotate API keys/OAuth secrets; constrain scopes to least privilege.
- Validate webhook signatures and enable replay protection.

## Regulatory & Contractual Controls
- Collect SOC 2 Type II or ISO 27001 evidence; track renewal dates.
- Execute a DPA with clear residency commitments (US/EU as needed).
- Document retention policies and test backup restores regularly.

## Operational Safeguards
- Confirm incident response SLAs and named escalation contacts.
- Stream CRM access logs to the SIEM; alert on privileged actions.
- Run annual tabletops for breach, account takeover, and integration failure.

## Vendor Snapshots

- **HubSpot CRM** (score 91.80)
  - SSO: SAML/OIDC; MFA available: True
  - Noted attestations/certifications: SOC 2, ISO 27001, GDPR, CCPA
  - Data residency options: US, EU
- **Microsoft Dynamics 365 Sales** (score 88.60)
  - SSO: Azure AD; MFA available: True
  - Noted attestations/certifications: SOC 1, SOC 2, ISO 27001, FedRAMP, GDPR
  - Data residency options: global
- **Creatio** (score 83.60)
  - SSO: SAML; MFA available: True
  - Noted attestations/certifications: SOC 2, ISO 27001, GDPR
  - Data residency options: US, EU, APAC
- **SugarCRM** (score 81.20)
  - SSO: SAML; MFA available: True
  - Noted attestations/certifications: SOC 2, ISO 27001, GDPR
  - Data residency options: US, EU
- **Zoho CRM** (score 80.20)
  - SSO: SAML; MFA available: True
  - Noted attestations/certifications: SOC 2, ISO 27001, GDPR
  - Data residency options: US, EU, IN

## Verification Steps
- Request latest SOC 2/ISO reports and map controls to internal policies.
- Test SSO, MFA enforcement, and role provisioning in sandbox before production.
- Perform quarterly access reviews and webhook/API credential rotation.
