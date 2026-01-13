import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function fixUser() {
  const email = "ggimenez@vlozity.com";
  
  console.log(`Corrigiendo usuario ${email}...`);
  
  // Marcar como no verificado ya que el email rebotó
  const [updated] = await db
    .update(users)
    .set({ emailVerified: null })
    .where(eq(users.email, email))
    .returning();

  if (updated) {
    console.log("Usuario actualizado:");
    console.log(`  - Email: ${updated.email}`);
    console.log(`  - Email Verificado: ${updated.emailVerified || "NO (corregido)"}`);
  } else {
    console.log("Usuario no encontrado");
  }

  process.exit(0);
}

fixUser().catch(console.error);
