-- Lead todo-list items (one row per item, linked to a lead)
CREATE TABLE IF NOT EXISTS lead_todos (
  id            SERIAL PRIMARY KEY,
  lead_id       INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  done          BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Template todo items — define a default checklist that auto-applies to new leads
CREATE TABLE IF NOT EXISTS lead_todo_templates (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_todos_lead_id ON lead_todos(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_todo_templates_org ON lead_todo_templates(organization_id);
