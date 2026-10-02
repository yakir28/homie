import { createHiggsfieldClient } from '../lib/higgsfield-api.mjs';
try {
  const client = createHiggsfieldClient({ keyId: process.env.HF_API_KEY_ID, keySecret: process.env.HF_API_KEY_SECRET });
  const result = await client.checkAccess();
  if (!result.upload_url || !result.public_url) throw new Error('Unexpected authentication check response.');
  console.log('Higgsfield API authentication verified. No media uploaded and no generation submitted.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
