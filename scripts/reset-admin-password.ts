import "dotenv/config";
import { db } from "../src/db";
import { users, platformAdmins } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/password";

async function resetPassword() {
  const email = "german@napsix.ai";
  const newPassword = "Admin2026!";
  
  console.log(`Reseteando contraseña para ${email}...`);
  
  // Verificar que el usuario existe
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log("Usuario no encontrado. Creando...");
    
    const passwordHash = await hashPassword(newPassword);
    
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: "German Gimenez",
        passwordHash,
        emailVerified: new Date(),
        onboardingCompleted: true,
      })
      .returning();
    
    // Agregar como platform admin
    await db.insert(platformAdmins).values({
      userId: newUser.id,
      level: "super",
    });
    
    console.log("Usuario creado y agregado como super admin");
  } else {
    console.log("Usuario encontrado. Actualizando contraseña...");
    
    const passwordHash = await hashPassword(newPassword);
    
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));
    
    // Verificar si es platform admin
    const admin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, user.id),
    });
    
    if (!admin) {
      console.log("Agregando como super admin...");
      await db.insert(platformAdmins).values({
        userId: user.id,
        level: "super",
      });
    } else {
      console.log(`Ya es admin nivel: ${admin.level}`);
    }
  }

  console.log("\n✅ Contraseña actualizada:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${newPassword}`);
  
  process.exit(0);
}

resetPassword().catch(console.error);
