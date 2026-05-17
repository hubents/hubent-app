-- Marketplace: portfolio de trabajos y reseñas por organización provider

CREATE TABLE "org_portfolio" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "thumbnail" text,
  "title" text,
  "description" text,
  "event_type" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "org_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "reviewer_org_id" integer REFERENCES "organizations"("id"),
  "reviewer_user_id" text REFERENCES "users"("id"),
  "event_id" integer REFERENCES "events"("id"),
  "rating" integer NOT NULL,
  "title" text,
  "content" text,
  "is_verified" boolean DEFAULT false,
  "is_public" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "org_portfolio_org_idx" ON "org_portfolio" ("organization_id");
CREATE INDEX "org_reviews_org_idx" ON "org_reviews" ("organization_id");
CREATE INDEX "org_reviews_rating_idx" ON "org_reviews" ("organization_id", "rating");
