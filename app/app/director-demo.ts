import type { VideoItem } from "./page";

// Account-scoped UI preview requested by the account owner. Never queued or billed.
export const DIRECTOR_DEMO_USER_ID = "4ad1016c-69a7-4230-a585-479dc50d0f2a";
export const DIRECTOR_DEMO_ID = "director-demo-property-film";
const context = { listingId: null, aspectRatio: "16:9", duration: 30 };
export const directorDemoChat = {
  id: DIRECTOR_DEMO_ID,
  title: "Demo · A cinematic home tour",
  context,
  messages: [
    { id: "demo-user-1", role: "user" as const, content: "Create a warm, cinematic home tour. I want it to feel inviting rather than like a property slideshow.", context },
    { id: "demo-assistant-1", role: "assistant" as const, content: "Let’s build the film around the feeling of arriving home. Would you prefer a calm, spacious pace or a quicker social-media edit?", context },
    { id: "demo-user-2", role: "user" as const, content: "Calm and spacious. Start outside, move through the living spaces, and finish with a memorable exterior shot.", context },
    { id: "demo-assistant-2", role: "assistant" as const, content: "I’d use a gentle approach for the opening, smooth movement through the interiors, and a quiet final hold. Here’s the first direction.", brief: "A warm cinematic property tour with measured pacing. Open on an exterior approach, continue through the supplied room photos in order with gentle camera movement, and close on the final reference. Preserve the home’s architecture and real details.", context, projectId: -901 },
    { id: "demo-user-3", role: "user" as const, content: "Let’s try a second version with a stronger opening and a little more energy.", context },
    { id: "demo-assistant-3", role: "assistant" as const, content: "For version two, I’d bring the opening forward, tighten the transitions, and give the final shot room to breathe. Both versions are shown on the right for comparison.\n\nThis is a UI demo: the players use existing example footage, not newly generated films.", brief: "A more energetic alternative with a confident exterior opening, tighter transitions and deliberate camera movement. Keep the reference order and architecture intact; end with a composed final hold.", context, projectId: -902 },
  ],
};
export const directorDemoVideos: VideoItem[] = [
  { id: -901, title: "Demo · Cinematic tour", address: "Sample property", city: "", price: "", template: "Demo footage", format: "16:9", duration: "30 sec", credits: 0, photosUsed: 0, totalPhotos: 0, created: "Demo", status: "Ready", image: "/homes/modern-villa.jpg", videoUrl: "/templates/foreground-reveal/preview.mp4", progress: 100 },
  { id: -902, title: "Demo · Alternate direction", address: "Sample property", city: "", price: "", template: "Demo footage", format: "16:9", duration: "30 sec", credits: 0, photosUsed: 0, totalPhotos: 0, created: "Demo", status: "Ready", image: "/homes/lounge.jpg", videoUrl: "/template-previews/49-f55a00f2f88b.mp4", progress: 100 },
];
