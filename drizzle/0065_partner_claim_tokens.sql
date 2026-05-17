-- Partner claim tokens: allow providers to claim profiles created for them by planners

CREATE TABLE "partner_claim_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "planner_org_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provider_name" text NOT NULL,
  "email" text NOT NULL,
  "email_domain" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "status" text DEFAULT 'pending',
  "claimed_by_user_id" text REFERENCES "users"("id"),
  "claimed_org_id" integer REFERENCES "organizations"("id"),
  "expires_at" timestamp NOT NULL,
  "claimed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "partner_claim_tokens_email_idx" ON "partner_claim_tokens" ("email");
CREATE INDEX "partner_claim_tokens_domain_idx" ON "partner_claim_tokens" ("email_domain");
CREATE INDEX "partner_claim_tokens_token_idx" ON "partner_claim_tokens" ("token");
