import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { users, organizations, organizationMembers, roles } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  const email = "gimenez.ger@gmail.com";
  
  console.log("=== VERIFICACIÓN DE USUARIO ===\n");
  console.log(`Buscando usuario: ${email}\n`);

  // 1. Buscar usuario
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log("❌ Usuario NO encontrado en la base de datos");
    process.exit(1);
  }

  console.log("✅ Usuario encontrado:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nombre: ${user.name}`);
  console.log(`   Onboarding completado: ${user.onboardingCompleted}`);
  console.log("");

  // 2. Buscar membresías
  const memberships = await db
    .select({
      membershipId: organizationMembers.id,
      orgId: organizationMembers.organizationId,
      roleId: organizationMembers.roleId,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id));

  if (memberships.length === 0) {
    console.log("❌ Usuario NO tiene membresías en ninguna organización");
    
    // Verificar si es owner de alguna org
    const ownedOrgs = await db.query.organizations.findMany({
      where: eq(organizations.ownerId, user.id),
    });
    
    if (ownedOrgs.length > 0) {
      console.log("\n⚠️  Usuario es OWNER de organizaciones pero NO tiene membresía:");
      for (const org of ownedOrgs) {
        console.log(`   - ${org.name} (ID: ${org.id})`);
      }
      console.log("\n🔧 SOLUCIÓN: Crear membresía para el usuario");
    }
    process.exit(1);
  }

  console.log(`✅ Usuario tiene ${memberships.length} membresía(s):\n`);

  for (const membership of memberships) {
    // Obtener info de la organización
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.orgId),
    });

    // Obtener info del rol
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, membership.roleId),
    });

    console.log(`   Organización: ${org?.name || "DESCONOCIDA"} (ID: ${membership.orgId})`);
    console.log(`   Rol: ${role?.name || "DESCONOCIDO"} (slug: ${role?.slug || "N/A"}, ID: ${membership.roleId})`);
    console.log(`   Fecha de ingreso: ${membership.joinedAt}`);
    console.log("");
  }

  // 3. Verificar roles del sistema
  console.log("=== ROLES DEL SISTEMA ===\n");
  const systemRoles = await db.query.roles.findMany({
    where: eq(roles.isSystem, true),
  });

  if (systemRoles.length === 0) {
    console.log("❌ NO hay roles del sistema creados");
  } else {
    console.log(`✅ Roles del sistema (${systemRoles.length}):`);
    for (const role of systemRoles) {
      console.log(`   - ${role.name} (slug: ${role.slug}, ID: ${role.id})`);
    }
  }

  // 4. Verificar todas las organizaciones
  console.log("\n=== TODAS LAS ORGANIZACIONES ===\n");
  const allOrgs = await db.query.organizations.findMany();
  
  for (const org of allOrgs) {
    console.log(`   ${org.name} (ID: ${org.id}, slug: ${org.slug})`);
    console.log(`   Owner ID: ${org.ownerId}`);
    console.log(`   Status: ${org.status}`);
    console.log("");
  }

  console.log("=== FIN DE VERIFICACIÓN ===");
  process.exit(0);
}

checkUser().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
