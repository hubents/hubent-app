import "dotenv/config";

async function checkResend() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log("❌ RESEND_API_KEY not found in environment");
    process.exit(1);
  }

  console.log("🔍 Checking Resend configuration...\n");

  // Check domains
  try {
    const domainsRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const domains = await domainsRes.json();
    
    console.log("📧 Domains configured:");
    if (domains.data && domains.data.length > 0) {
      domains.data.forEach((d: { name: string; status: string; region: string }) => {
        const status = d.status === "verified" ? "✅" : "⚠️";
        console.log(`  ${status} ${d.name} (${d.status}) - Region: ${d.region}`);
      });
    } else {
      console.log("  ❌ No domains configured!");
      console.log("  → You can only send from onboarding@resend.dev");
    }
  } catch (e) {
    console.log("❌ Error fetching domains:", e);
  }

  // Check API keys info
  try {
    const keysRes = await fetch("https://api.resend.com/api-keys", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const keys = await keysRes.json();
    
    console.log("\n🔑 API Keys:");
    if (keys.data) {
      keys.data.forEach((k: { name: string; created_at: string }) => {
        console.log(`  - ${k.name} (created: ${k.created_at})`);
      });
    }
  } catch (e) {
    console.log("❌ Error fetching API keys:", e);
  }

  // Test sending an email (dry run info)
  console.log("\n📬 Email Configuration:");
  console.log(`  FROM: ${process.env.EMAIL_FROM || "Not set (will use default)"}`);
  console.log(`  APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || "Not set"}`);

  process.exit(0);
}

checkResend();
