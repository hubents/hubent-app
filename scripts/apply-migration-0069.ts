import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0069: Create org_portfolio + org_reviews tables ===");

  await sql`
    CREATE TABLE IF NOT EXISTS org_portfolio (
      id              serial PRIMARY KEY,
      organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      url             text    NOT NULL,
      thumbnail       text,
      title           text,
      description     text,
      event_type      text,
      sort_order      integer DEFAULT 0,
      created_at      timestamp DEFAULT now()
    )
  `;
  console.log("  ✓ Tabla org_portfolio creada");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_org_portfolio_org
      ON org_portfolio(organization_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS org_reviews (
      id               serial PRIMARY KEY,
      organization_id  integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      reviewer_org_id  integer REFERENCES organizations(id),
      reviewer_user_id text    REFERENCES users(id),
      event_id         integer REFERENCES events(id),
      rating           integer NOT NULL,
      title            text,
      content          text,
      is_verified      boolean DEFAULT false,
      is_public        boolean DEFAULT true,
      created_at       timestamp DEFAULT now()
    )
  `;
  console.log("  ✓ Tabla org_reviews creada");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_org_reviews_org
      ON org_reviews(organization_id)
  `;

  console.log("\n✅ Migration 0069 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0069 FAILED:", err);
  process.exit(1);
});
