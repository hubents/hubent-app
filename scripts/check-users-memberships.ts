import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function checkUsersMemberships() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("Checking users and memberships...\n");
  
  // Get all users with their memberships
  const results = await sql`
    SELECT 
      u.id as user_id,
      u.email,
      u.name,
      om.organization_id,
      o.name as org_name,
      r.slug as role
    FROM users u
    LEFT JOIN organization_members om ON u.id = om.user_id
    LEFT JOIN organizations o ON om.organization_id = o.id
    LEFT JOIN roles r ON om.role_id = r.id
    ORDER BY u.email
    LIMIT 20
  `;
  
  console.table(results);
  
  // Check if there are any users without memberships
  const usersWithoutMembership = await sql`
    SELECT u.id, u.email, u.name
    FROM users u
    LEFT JOIN organization_members om ON u.id = om.user_id
    WHERE om.id IS NULL
    LIMIT 10
  `;
  
  console.log("\nUsers WITHOUT membership:");
  console.table(usersWithoutMembership);
  
  process.exit(0);
}

checkUsersMemberships().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
