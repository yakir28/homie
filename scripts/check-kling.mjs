import { createKlingClient } from "../lib/kling-client.mjs";
try {
  const client = createKlingClient({ apiKey: process.env.KLING_API_KEY, baseUrl: process.env.KLING_API_BASE_URL });
  await client.checkAccess();
  console.log("Kling authentication succeeded. No video was generated and no generation credits were spent.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
