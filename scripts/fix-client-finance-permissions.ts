import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔧 Fixing client finance permissions...\n");

  // 1. Find the client role
  const clientRoles = await sql`
    SELECT id, slug, name FROM roles WHERE slug = 'client' AND is_system = true
  `;

  if (clientRoles.length === 0) {
    console.error("❌ Client role not found!");
    process.exit(1);
  }

  const clientRole = clientRoles[0];
  console.log(`Found client role: [${clientRole.id}] ${clientRole.name}`);

  // 2. Find the finance:read permission
  const financePerms = await sql`
    SELECT id, slug FROM permissions WHERE slug = 'finance:read'
  `;

  if (financePerms.length === 0) {
    console.error("❌ finance:read permission not found!");
    process.exit(1);
  }

  const financeReadPerm = financePerms[0];
  console.log(`Found permission: [${financeReadPerm.id}] ${financeReadPerm.slug}`);

  // 3. Check if client role already has finance:read
  const existing = await sql`
    SELECT role_id, permission_id FROM role_permissions 
    WHERE role_id = ${clientRole.id} AND permission_id = ${financeReadPerm.id}
  `;

  if (existing.length > 0) {
    console.log("✅ Client role already has finance:read — skipping");
  } else {
    await sql`
      INSERT INTO role_permissions (role_id, permission_id) 
      VALUES (${clientRole.id}, ${financeReadPerm.id})
    `;
    console.log("✅ Added finance:read to client role");
  }

  // 4. Update existing event_participants with finances: "none" to "view"
  // Only for participants that have explicit permissions JSON with finances:"none"
  const participants = await sql`
    SELECT id, type, permissions 
    FROM event_participants 
    WHERE permissions IS NOT NULL 
    AND permissions::text LIKE '%"finances":"none"%'
  `;

  console.log(`\nFound ${participants.length} participants with finances:"none"`);

  let updated = 0;
  for (const p of participants) {
    const perms = typeof p.permissions === "string" ? JSON.parse(p.permissions) : p.permissions;
    if (perms && perms.finances === "none") {
      perms.finances = "view";
      await sql`
        UPDATE event_participants 
        SET permissions = ${JSON.stringify(perms)}::jsonb
        WHERE id = ${p.id}
      `;
      updated++;
      console.log(`  Updated participant ${p.id} (type: ${p.type})`);
    }
  }

  console.log(`\n✅ Updated ${updated} participants`);

  // 5. Verify
  const verify = await sql`
    SELECT p.slug 
    FROM role_permissions rp 
    JOIN permissions p ON rp.permission_id = p.id 
    WHERE rp.role_id = ${clientRole.id}
    ORDER BY p.slug
  `;
  console.log(`\nClient role permissions after fix:`);
  for (const v of verify) {
    console.log(`  • ${v.slug}`);
  }

  const remainingNone = await sql`
    SELECT count(*) as cnt FROM event_participants 
    WHERE permissions IS NOT NULL 
    AND permissions::text LIKE '%"finances":"none"%'
  `;
  console.log(`\nParticipants still with finances:"none": ${remainingNone[0].cnt}`);
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
