import "dotenv/config";
import { db } from "../src/db";
import { users, invitations, organizationMembers } from "../src/db/schema";
import { eq, like } from "drizzle-orm";

async function checkUser() {
  console.log("Buscando usuario con email vlozity...\n");

  // Buscar usuario
  const userResults = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(like(users.email, "%vlozity%"));

  if (userResults.length === 0) {
    console.log("No se encontró ningún usuario con 'vlozity' en el email");
  } else {
    console.log("Usuarios encontrados:");
    for (const user of userResults) {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Nombre: ${user.name}`);
      console.log(`    Email Verificado: ${user.emailVerified ? user.emailVerified.toISOString() : "NO"}`);
      console.log(`    Creado: ${user.createdAt?.toISOString()}`);
      console.log("");

      // Buscar membresías
      const memberships = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, user.id));

      if (memberships.length > 0) {
        console.log(`    Membresías: ${memberships.length}`);
        for (const m of memberships) {
          console.log(`      - Org ID: ${m.organizationId}, Role ID: ${m.roleId}`);
        }
      }
    }
  }

  // Buscar invitaciones
  console.log("\nBuscando invitaciones con email vlozity...\n");
  const invitationResults = await db
    .select()
    .from(invitations)
    .where(like(invitations.email, "%vlozity%"));

  if (invitationResults.length === 0) {
    console.log("No se encontraron invitaciones");
  } else {
    console.log("Invitaciones encontradas:");
    for (const inv of invitationResults) {
      console.log(`  - ID: ${inv.id}`);
      console.log(`    Email: ${inv.email}`);
      console.log(`    Status: ${inv.status}`);
      console.log(`    Org ID: ${inv.organizationId}`);
      console.log(`    Creado: ${inv.createdAt?.toISOString()}`);
      console.log(`    Expira: ${inv.expiresAt.toISOString()}`);
      console.log("");
    }
  }

  process.exit(0);
}

checkUser().catch(console.error);
