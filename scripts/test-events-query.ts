import "dotenv/config";
import { db } from "../src/db";
import { events, clients } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function testEventsQuery() {
  console.log("Testing events query...\n");
  
  try {
    // Simple query to get events
    const results = await db
      .select({
        id: events.id,
        name: events.name,
        type: events.type,
        status: events.status,
        date: events.date,
        organizationId: events.organizationId,
      })
      .from(events)
      .orderBy(desc(events.date))
      .limit(5);
    
    console.log("✅ Events query successful!");
    console.log("Found", results.length, "events:");
    console.table(results);
    
  } catch (error) {
    console.error("❌ Events query failed:", error);
  }
  
  process.exit(0);
}

testEventsQuery();
