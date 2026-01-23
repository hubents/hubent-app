import "dotenv/config";
import { db } from "../src/db";
import { events, tasks, organizationMembers } from "../src/db/schema";
import { eq, and, count } from "drizzle-orm";

async function testStatsQuery() {
  console.log("Testing stats queries...\n");
  
  const testUserId = "cm5zqjqwp0000p7yrxzrxk1ky"; // Replace with actual user ID
  
  try {
    // Test 1: Find membership
    console.log("1. Testing organizationMembers query...");
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, testUserId),
    });
    console.log("✅ Membership found:", membership ? `orgId: ${membership.organizationId}` : "None");
    
    if (!membership) {
      console.log("No membership found, exiting...");
      process.exit(0);
    }
    
    const orgId = membership.organizationId;
    
    // Test 2: Count events
    console.log("\n2. Testing events count...");
    const eventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.organizationId, orgId));
    console.log("✅ Events count:", eventsResult[0]?.count);
    
    // Test 3: Count tasks
    console.log("\n3. Testing tasks count...");
    const tasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, orgId),
          eq(tasks.status, "pending")
        )
      );
    console.log("✅ Pending tasks count:", tasksResult[0]?.count);
    
    // Test 4: Recent events with db.query
    console.log("\n4. Testing db.query.events.findMany...");
    const recentEvents = await db.query.events.findMany({
      where: eq(events.organizationId, orgId),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
      limit: 5,
    });
    console.log("✅ Recent events:", recentEvents.length);
    
    console.log("\n🎉 All queries successful!");
    
  } catch (error) {
    console.error("❌ Query failed:", error);
  }
  
  process.exit(0);
}

testStatsQuery();
