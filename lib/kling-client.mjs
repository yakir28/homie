// Current Kling API (Bearer key), not the legacy /v1 JWT protocol.
// https://kling.ai/document-api/api/video/3-0-omni/image-to-video
export class KlingError extends Error {
  constructor(message, { recoverable = false } = {}) { super(message); this.name = "KlingError"; this.recoverable = recoverable; }
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function createKlingClient({ apiKey, baseUrl = "https://api-singapore.klingai.com", fetchImpl = fetch, sleep = pause, pollMs = 10000, timeoutMs = 1800000 } = {}) {
  if (!apiKey?.trim()) throw new KlingError("Set KLING_API_KEY in the video worker environment.");
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:" || origin.hostname !== "api-singapore.klingai.com") throw new KlingError("Unsupported Kling API host.");
  async function request(path, body, { submission = false } = {}) {
    let response;
    try {
      response = await fetchImpl(new URL(path, origin), { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000), redirect: "error" });
    } catch {
      throw new KlingError(submission ? "Kling submission outcome is unknown. Resume this task to reconcile it; do not submit it again." : "Kling status check could not connect.", { recoverable: true });
    }
    // Do not surface arbitrary provider messages or request bodies (may contain credentials/photos).
    if (!response.ok) throw new KlingError(`Kling API returned HTTP ${response.status}${response.status === 401 || response.status === 403 ? ": check the API key and account access" : ""}.`, { recoverable: response.status === 429 || response.status >= 500 });
    let payload;
    try { payload = await response.json(); } catch { throw new KlingError("Kling returned an unreadable response.", { recoverable: true }); }
    if (payload.code !== 0) throw new KlingError(`Kling rejected the request (code ${Number.isFinite(Number(payload.code)) ? Number(payload.code) : "unknown"}).`);
    return payload.data;
  }
  async function query({ taskId, externalId }) {
    const params = new URLSearchParams(taskId ? { task_ids: taskId } : { external_task_ids: externalId });
    const tasks = await request(`/tasks?${params}`);
    if (!Array.isArray(tasks)) throw new KlingError("Kling returned an invalid task list.", { recoverable: true });
    return tasks.find((task) => taskId ? task.id === taskId : task.external_id === externalId) ?? null;
  }
  async function run({ body, externalId, taskId, previouslySubmitted = false, onSubmitted }) {
    if (!externalId || typeof onSubmitted !== "function") throw new KlingError("A durable task identifier and persistence callback are required.");
    let task = taskId || previouslySubmitted ? await query({ taskId, externalId }) : null;
    if (!task && (taskId || previouslySubmitted)) throw new KlingError("The previous Kling submission is not visible yet. Reconcile this task before retrying; no new generation was created.", { recoverable: true });
    if (!task) {
      task = await request("/image-to-video/kling-3.0", { ...body, options: { ...body.options, external_task_id: externalId, watermark_info: { enabled: false } } }, { submission: true });
      if (!task?.id) throw new KlingError("Kling did not return a task ID; reconcile using the saved external ID.", { recoverable: true });
    }
    await onSubmitted(task.id);
    const deadline = Date.now() + timeoutMs;
    while (true) {
      if (task.status === "succeeded") {
        const video = task.outputs?.find((output) => output.type === "video" && output.url);
        if (!video || !/^https:\/\//.test(video.url)) throw new KlingError("Kling completed without a valid video URL.");
        return { jobId: task.id, outputUrl: video.url, raw: { provider: "kling", status: task.status, external_id: externalId, billing: task.billing ?? [], duration: video.duration } };
      }
      if (task.status === "failed") throw new KlingError("Kling could not generate this shot. Review the task in the Kling console.");
      if (!["submitted", "processing"].includes(task.status)) throw new KlingError("Kling returned an unknown task status.", { recoverable: true });
      if (Date.now() >= deadline) throw new KlingError("Kling is still processing. Resume using the saved task ID.", { recoverable: true });
      await sleep(pollMs);
      try { task = await query({ taskId: task.id }) ?? task; } catch (error) { if (!error.recoverable) throw error; }
    }
  }
  return { query, run, checkAccess: () => request("/tasks", { limit: 1, filters: [{ key: "product_type", values: ["video"] }] }) };
}
