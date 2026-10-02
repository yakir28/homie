// Higgsfield's public API, separate from the legacy consumer CLI integration.
const origin = 'https://api.higgsfield.ai';
export const HIGGSFIELD_PROVIDER = 'higgsfield_api';
export function higgsfieldModel(resolution) {
  const tier = { '720p': 'std', '1080p': 'pro', '4k': '4k' }[resolution];
  if (!tier) throw new Error('Unsupported Higgsfield video resolution.');
  return `kling-video/v3.0/${tier}/image-to-video`;
}
export function higgsfieldInput(shot, first, last) {
  if (!first || !Number.isInteger(shot.duration) || shot.duration < 3 || shot.duration > 15) throw new Error('Invalid Higgsfield shot.');
  return { prompt: shot.prompt, image_url: first, ...(last ? { last_image_url: last } : {}), duration: shot.duration, sound: shot.generateAudio ? 'on' : 'off', multi_shots: Boolean(last), cfg_scale: 0.5 };
}
export function createHiggsfieldClient({ keyId, keySecret, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), pollMs = 10000, timeoutMs = 1800000 } = {}) {
  if (!keyId?.trim() || !keySecret?.trim()) throw new Error('Set HF_API_KEY_ID and HF_API_KEY_SECRET in video-worker.env.');
  function apiUrl(path) {
    const url = new URL(path, origin);
    if (url.origin !== origin || url.username || url.password) throw new Error('Invalid Higgsfield API URL.');
    return url;
  }
  async function request(path, body, idempotencyKey) {
    const url = apiUrl(path);
    let response;
    try { response = await fetchImpl(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Key ${keyId}:${keySecret}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(60000) }); }
    catch {
      const error = new Error('Higgsfield connection failed. Resume the saved request; do not create a duplicate.');
      // Polling is read-only and safe to retry; submission remains conservative.
      error.retryable = !body;
      throw error;
    }
    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        detail = typeof payload.detail === 'string' ? payload.detail : Array.isArray(payload.detail) ? payload.detail.map(item => item.msg ?? item.type ?? 'Invalid input').join('; ') : '';
      } catch { /* Preserve the HTTP error if the response is not JSON. */ }
      // Provider diagnostics can echo input; redact credentials and signed URLs.
      for (const secret of [keySecret, keyId]) detail = detail.split(secret).join('[redacted]');
      detail = detail.replace(/https?:\/\/[^\s"']+/g, '[url]').replace(/[\r\n]/g, ' ').slice(0, 350);
      const error = new Error(`Higgsfield API returned HTTP ${response.status}.${detail ? ` ${detail}` : ''}`);
      error.status = response.status;
      error.correlationId = response.headers.get('X-Correlation-ID');
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    try { return await response.json(); } catch { throw new Error('Higgsfield returned an unreadable response.'); }
  }
  const createUpload = () => request('/files/generate-upload-url', { content_type: 'image/jpeg' });
  async function upload(bytes) {
    const signed = await createUpload();
    if (!signed.upload_url?.startsWith('https://') || !signed.public_url?.startsWith('https://')) throw new Error('Invalid Higgsfield upload response.');
    // API credentials must never be forwarded to the storage service.
    const response = await fetchImpl(signed.upload_url, { method: 'PUT', body: bytes, headers: signed.upload_headers ?? { 'Content-Type': 'image/jpeg' }, signal: AbortSignal.timeout(60000), redirect: 'error' });
    if (!response.ok) throw new Error(`Higgsfield image upload failed (${response.status}).`);
    return signed.public_url;
  }
  async function run({ model, body, taskId, statusUrl, previouslySubmitted, idempotencyKey, onSubmitted }) {
    if (!(model === 'kling-video/o3/image-reference' || /^alibaba\/wan-3\.0(-prime)?\/reference-to-video$/.test(model) || /^kling-video\/v3\.0\/(std|pro|4k)\/image-to-video$/.test(model)) || !idempotencyKey || typeof onSubmitted !== 'function') throw new Error('Invalid Higgsfield job configuration.');
    // Even with an idempotency header, never blindly resubmit after its retention
    // window. Operators reconcile a lost response in the provider console.
    if (previouslySubmitted && !taskId) throw new Error('Previous Higgsfield submission has no saved ID. Reconcile it in the console before retrying.');
    let task = taskId ? await request(statusUrl || `/requests/${encodeURIComponent(taskId)}/status`) : await request(`/${model}`, body, idempotencyKey);
    const id = taskId || task.request_id;
    if (!id) throw new Error('Higgsfield did not return a request ID; reconcile before retrying.');
    const canonicalUrl = `${origin}/requests/${encodeURIComponent(id)}/status`;
    // Save the accepted request before inspecting optional provider links.
    // A malformed/cross-origin link must never orphan a paid generation.
    let url = canonicalUrl;
    if (task.status_url) {
      try { url = apiUrl(task.status_url).href; } catch { /* Poll the documented endpoint on our trusted origin. */ }
    }
    if (statusUrl) url = apiUrl(statusUrl).href;
    await onSubmitted(id, url);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (task.status === 'completed') {
        if (!task.video?.url?.startsWith('https://')) throw new Error('Higgsfield completed without a video.');
        return { jobId: id, outputUrl: task.video.url, raw: { provider: HIGGSFIELD_PROVIDER, status: task.status, status_url: url, model } };
      }
      if (!['queued', 'in_progress'].includes(task.status)) throw new Error(`Higgsfield generation ended (${['failed', 'nsfw', 'canceled'].includes(task.status) ? task.status : 'unknown status'}).`);
      if (Date.now() >= deadline) throw new Error('Higgsfield is still processing. Resume using the saved request ID.');
      await sleep(pollMs);
      try { task = await request(url); } catch (error) { if (!error.retryable) throw error; }
    }
  }
  return { upload, run, checkAccess: createUpload };
}
