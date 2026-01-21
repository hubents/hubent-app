-- Task Checklist Items (To-Do List within tasks)
CREATE TABLE IF NOT EXISTS "task_checklist_items" (
  "id" serial PRIMARY KEY,
  "task_id" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "is_completed" boolean DEFAULT false,
  "due_date" timestamp,
  "sort_order" integer DEFAULT 0,
  "completed_at" timestamp,
  "completed_by" text REFERENCES "users"("id"),
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Task Checklist Assignees (N:N relationship with task_participants)
CREATE TABLE IF NOT EXISTS "task_checklist_assignees" (
  "id" serial PRIMARY KEY,
  "checklist_item_id" integer NOT NULL REFERENCES "task_checklist_items"("id") ON DELETE CASCADE,
  "participant_id" integer NOT NULL REFERENCES "task_participants"("id") ON DELETE CASCADE,
  "assigned_at" timestamp DEFAULT now(),
  "assigned_by" text REFERENCES "users"("id"),
  UNIQUE("checklist_item_id", "participant_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_task_checklist_items_task_id" ON "task_checklist_items"("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_checklist_items_completed" ON "task_checklist_items"("is_completed");
CREATE INDEX IF NOT EXISTS "idx_task_checklist_assignees_item_id" ON "task_checklist_assignees"("checklist_item_id");
CREATE INDEX IF NOT EXISTS "idx_task_checklist_assignees_participant_id" ON "task_checklist_assignees"("participant_id");
