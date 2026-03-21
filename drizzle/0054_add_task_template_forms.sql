CREATE TABLE IF NOT EXISTS "task_template_forms" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_template_id" integer NOT NULL REFERENCES "task_templates"("id") ON DELETE CASCADE,
  "form_id" integer NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0
);
