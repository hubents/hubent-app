import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DATA TYPE jsonb USING to_jsonb("scopes")`;
    console.log("1/4 api_keys.scopes -> jsonb OK");
    await sql`ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DEFAULT '[]'::jsonb`;
    console.log("2/4 api_keys.scopes default OK");
    await sql`ALTER TABLE "webhooks" ALTER COLUMN "events" SET DATA TYPE jsonb USING to_jsonb("events")`;
    console.log("3/4 webhooks.events -> jsonb OK");
    await sql`ALTER TABLE "webhooks" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb`;
    console.log("4/4 webhooks.events default OK");
    console.log("Migration 0046 complete!");
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
}

run();
