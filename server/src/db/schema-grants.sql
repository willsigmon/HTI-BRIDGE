-- Grant Discovery System Database Schema
-- BRIDGE CRM - HUBZone Technology Initiative

-- Grants table - stores all discovered grant opportunities
CREATE TABLE IF NOT EXISTS grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  funder_type TEXT CHECK(funder_type IN ('federal', 'state', 'foundation', 'corporate')) DEFAULT 'federal',
  amount_min INTEGER,
  amount_max INTEGER,
  deadline DATE,
  source TEXT NOT NULL, -- grants.gov, ncbroadband.gov, foundation, etc.
  source_id TEXT, -- external grant ID
  url TEXT,
  description TEXT,
  eligibility TEXT,
  geographic_focus TEXT,
  mission_keywords TEXT, -- JSON array
  cfda_number TEXT, -- Catalog of Federal Domestic Assistance
  match_score INTEGER DEFAULT 0, -- 0-100
  match_reasons TEXT, -- JSON array of reasons
  status TEXT CHECK(status IN ('prospecting', 'in_progress', 'submitted', 'awarded', 'declined', 'archived')) DEFAULT 'prospecting',
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant applications - tracks HTI's applications
CREATE TABLE IF NOT EXISTS grant_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('draft', 'submitted', 'under_review', 'awarded', 'declined', 'completed')) DEFAULT 'draft',
  amount_requested INTEGER,
  amount_awarded INTEGER,
  submitted_date DATE,
  decision_date DATE,
  award_start_date DATE,
  award_end_date DATE,
  assigned_to INTEGER REFERENCES users(id),
  project_title TEXT,
  project_description TEXT,
  notes TEXT,
  documents TEXT, -- JSON array of file paths
  progress INTEGER DEFAULT 0, -- 0-100%
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant tasks - application preparation tasks
CREATE TABLE IF NOT EXISTS grant_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES grant_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  due_date DATE,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant reports - funder reporting requirements
CREATE TABLE IF NOT EXISTS grant_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES grant_applications(id) ON DELETE CASCADE,
  report_type TEXT CHECK(report_type IN ('quarterly', 'semi_annual', 'annual', 'final')) NOT NULL,
  due_date DATE NOT NULL,
  submitted_date DATE,
  status TEXT CHECK(status IN ('pending', 'draft', 'submitted', 'approved', 'revision_requested')) DEFAULT 'pending',
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant documents - shared document library
CREATE TABLE IF NOT EXISTS grant_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT CHECK(document_type IN ('501c3', 'financial', 'board_resolution', 'letter_of_support', 'photo', 'video', 'impact_story', 'other')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  is_current BOOLEAN DEFAULT TRUE,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant notifications - deadline reminders and alerts
CREATE TABLE IF NOT EXISTS grant_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER REFERENCES grants(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES grant_applications(id) ON DELETE CASCADE,
  notification_type TEXT CHECK(notification_type IN ('new_grant', 'deadline_warning', 'status_change', 'report_due', 'renewal_opportunity')) NOT NULL,
  message TEXT NOT NULL,
  sent_to INTEGER REFERENCES users(id),
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);
CREATE INDEX IF NOT EXISTS idx_grants_match_score ON grants(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_grants_funder_type ON grants(funder_type);
CREATE INDEX IF NOT EXISTS idx_applications_status ON grant_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_grant ON grant_applications(grant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_application ON grant_tasks(application_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON grant_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_application ON grant_reports(application_id);
CREATE INDEX IF NOT EXISTS idx_reports_due_date ON grant_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_to ON grant_notifications(sent_to);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS grants_updated_at 
AFTER UPDATE ON grants
BEGIN
  UPDATE grants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS applications_updated_at 
AFTER UPDATE ON grant_applications
BEGIN
  UPDATE grant_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS reports_updated_at 
AFTER UPDATE ON grant_reports
BEGIN
  UPDATE grant_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

