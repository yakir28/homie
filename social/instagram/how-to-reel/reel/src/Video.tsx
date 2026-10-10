import React from "react";
import { AbsoluteFill, useCurrentFrame } from "reelkit/frame";
import { fonts, Music, SceneFrame, SoundCues, Vignette, cueBefore } from "reelkit/kit";
import type { VideoProps } from "reelkit/kit";
import { GlowGround } from "./GlowGround";
import { PixelBurst } from "./PixelBurst";
import { LogoLockup } from "./LogoLockup";
import { GlitchSlices } from "./GlitchSlices";
import { TiltScreen, type ScreenKey } from "./TiltScreen";
import { HandCursor, handClicks, type HandPoint } from "./HandCursor";
import { KeywordLine } from "./KeywordLine";
import { PhoneCard } from "./PhoneCard";

// Homie palette: near-black ground, cream type, one sage accent.
const P = { ground: "#0d0f0c", ink: "#f6f1e7", accent: "#a3c98b", edge: "rgba(163,201,139,0.28)", app: "#111111" };
const IMG = { w: 2880, h: 1800 };
const CARD = { left: 60, top: 300, width: 960, height: 1240 };
const CAPTION_TOP = 1610, CAPTION = 76;

// Each app shot: the real screenshot, its camera keys and the hand's path, all in screenshot pixels (scene-local frames).
const SIDEBAR: { keys: ScreenKey[]; hand: HandPoint[] } = {
  keys: [{ frame: 0, x: 330, y: 430, zoom: 4.2, rx: 10, ry: -16 }, { frame: 90, x: 340, y: 440, zoom: 4.6, rx: 6, ry: -10 }],
  hand: [{ frame: 0, x: 470, y: 820 }, { frame: 24, x: 175, y: 636, click: true }, { frame: 48, x: 175, y: 342, click: true }, { frame: 70, x: 175, y: 246, click: true }, { frame: 90, x: 250, y: 300 }],
};
const EXPLORE = {
  keys: [{ frame: 0, x: 1700, y: 900, zoom: 2.1, rx: 8, ry: 12 }, { frame: 80, x: 900, y: 1060, zoom: 2.7, rx: 4, ry: 6 }, { frame: 105, x: 860, y: 1090, zoom: 2.85, rx: 3, ry: 4 }],
  hand: [{ frame: 0, x: 1650, y: 1550 }, { frame: 62, x: 830, y: 1060, click: true }, { frame: 105, x: 850, y: 1090 }],
};
const TEMPLATE = {
  keys: [{ frame: 0, x: 1250, y: 820, zoom: 2.1, rx: 6, ry: -10 }, { frame: 60, x: 1660, y: 1060, zoom: 2.6, rx: 4, ry: -4 }, { frame: 90, x: 1680, y: 1070, zoom: 2.7, rx: 3, ry: -3 }],
  hand: [{ frame: 0, x: 1350, y: 1650 }, { frame: 58, x: 1699, y: 1332, click: true }, { frame: 90, x: 1720, y: 1365 }],
};
const PICKER = {
  keys: [{ frame: 0, x: 1150, y: 720, zoom: 2.3, rx: -4, ry: 8 }, { frame: 75, x: 1010, y: 790, zoom: 2.65, rx: -2, ry: 4 }],
  hand: [{ frame: 0, x: 1550, y: 1150 }, { frame: 42, x: 985, y: 780, click: true }, { frame: 75, x: 1000, y: 805 }],
};
const CREATE = {
  keys: [{ frame: 0, x: 1700, y: 980, zoom: 2.6, rx: 3, ry: -6 }, { frame: 30, x: 1880, y: 1125, zoom: 3.2, rx: 2, ry: -3 }, { frame: 60, x: 1920, y: 1160, zoom: 3.6, rx: 1, ry: -2 }],
  hand: [{ frame: 0, x: 1650, y: 1720 }, { frame: 28, x: 1941, y: 1475, click: true }, { frame: 60, x: 1965, y: 1505 }],
};

// The sidebar's active item follows each click: the screen swaps to the page that click opens.
const SidebarShot: React.FC<{ screens: string[] }> = ({ screens }) => {
  const f = useCurrentFrame();
  const [c1, c2, c3] = handClicks(SIDEBAR.hand);
  const src = f < c1! ? screens[0]! : f < c2! ? screens[1]! : f < c3! ? screens[2]! : screens[0]!;
  return (
    <TiltScreen src={src} imageWidth={IMG.w} imageHeight={IMG.h} {...CARD} keys={SIDEBAR.keys} edge={P.edge} background={P.app}>
      <HandCursor points={SIDEBAR.hand} size={95} ring={P.accent} />
    </TiltScreen>
  );
};

export const Video: React.FC<VideoProps> = ({ manifest, urls }) => {
  const [logo, glitch, sidebar, explore, template, picker, create, result, end] = manifest.scenes as typeof manifest.scenes;
  const s = (id: string) => manifest.scenes.find((x) => x.id === id)!;
  const shots = { explore: urls["assets/screens/explore.png"]!, listings: urls["assets/screens/listings.png"]!, videos: urls["assets/screens/videos.png"]!, template: urls["assets/screens/template.png"]!, picker: urls["assets/screens/picker.png"]!, picked: urls["assets/screens/picked.png"]! };
  const mark = urls["assets/brand/homie-mark-cream.png"]!, word = urls["assets/brand/homie-wordmark-cream.png"]!;
  const lockup = { mark, word, markRatio: 342 / 411, wordRatio: 1028 / 276, height: 220, gap: 44, cx: 540, glow: P.accent };
  const markBox = { x: 540 - 410, y: 860 - 110, w: 183, h: 220 };

  const sounds = {
    click: urls["assets/sfx/click.wav"]!, tap: urls["assets/sfx/tap.wav"]!, thud: urls["assets/sfx/thud.wav"]!, boom: urls["assets/sfx/boom.wav"]!,
    glitch: urls["assets/sfx/glitch.wav"]!, glitch2: urls["assets/sfx/glitch2.wav"]!, pop: urls["assets/sfx/pop.wav"]!, select: urls["assets/sfx/select.wav"]!,
    whoosh: urls["assets/sfx/whoosh.wav"]!, riser: urls["assets/sfx/riser.wav"]!,
  };
  const WHOOSH = 18, RISER = 30;
  const clicks = [
    ...handClicks(SIDEBAR.hand, sidebar.startFrame), ...handClicks(EXPLORE.hand, explore.startFrame), ...handClicks(TEMPLATE.hand, template.startFrame),
    ...handClicks(PICKER.hand, picker.startFrame), ...handClicks(CREATE.hand, create.startFrame),
  ];
  const cues = [
    { at: 0, sound: "glitch", volume: 0.4 }, { at: 6, sound: "glitch2", volume: 0.35 }, { at: 14, sound: "thud", volume: 0.55 }, { at: 24, sound: "select", volume: 0.35 },
    { at: glitch.startFrame, sound: "glitch", volume: 0.45 }, { at: glitch.startFrame + 6, sound: "glitch", volume: 0.55 }, { at: glitch.startFrame + 11, sound: "glitch2", volume: 0.5 },
    { at: cueBefore(sidebar.startFrame, WHOOSH), sound: "whoosh", volume: 0.25 },
    { at: sidebar.startFrame, sound: "boom", volume: 0.55 },
    ...clicks.flatMap((c) => [{ at: c, sound: "click", volume: 0.6 }, { at: c, sound: "tap", volume: 0.55 }, { at: c, sound: "pop", volume: 0.3 }]),
    { at: cueBefore(explore.startFrame, WHOOSH), sound: "whoosh", volume: 0.3 }, { at: explore.startFrame, sound: "thud", volume: 0.5 },
    { at: cueBefore(template.startFrame, WHOOSH), sound: "whoosh", volume: 0.3 }, { at: template.startFrame, sound: "boom", volume: 0.5 },
    { at: cueBefore(picker.startFrame, WHOOSH), sound: "whoosh", volume: 0.25 }, { at: picker.startFrame, sound: "pop", volume: 0.45 },
    { at: cueBefore(create.startFrame, WHOOSH), sound: "whoosh", volume: 0.25 }, { at: create.startFrame, sound: "thud", volume: 0.5 },
    { at: cueBefore(result.startFrame, RISER), sound: "riser", volume: 0.35 }, { at: result.startFrame, sound: "boom", volume: 0.6 }, { at: result.startFrame + 4, sound: "pop", volume: 0.4 },
    { at: cueBefore(end.startFrame, WHOOSH), sound: "whoosh", volume: 0.3 }, { at: end.startFrame, sound: "thud", volume: 0.55 },
    { at: end.startFrame + 18, sound: "select", volume: 0.35 }, { at: end.startFrame + 26, sound: "tap", volume: 0.35 },
  ];
  const create0 = handClicks(CREATE.hand, create.startFrame)[0]!;

  const appShot = (src: string, cfg: { keys: ScreenKey[]; hand: HandPoint[] }) => (
    <TiltScreen src={src} imageWidth={IMG.w} imageHeight={IMG.h} {...CARD} keys={cfg.keys} edge={P.edge} background={P.app}>
      <HandCursor points={cfg.hand} size={130 / cfg.keys[0]!.zoom * 2.2} ring={P.accent} />
    </TiltScreen>
  );
  const line = (text: string, keyword: string, animate = true) => <KeywordLine text={text} keyword={keyword} color={P.ink} accent={P.accent} size={CAPTION} font={fonts.display} top={CAPTION_TOP} delay={6} animate={animate} />;

  return (
    <AbsoluteFill style={{ background: P.ground }}>
      <GlowGround base={P.ground} glow={P.accent} />
      <Music src={urls["assets/audio/music.wav"]!} volume={0.42} dips={[{ from: create0 + 4, to: result.startFrame, volume: 0.12 }]} />

      <SceneFrame from={logo.startFrame} durationInFrames={logo.durationFrames} enter="cut" exit="cut">
        <PixelBurst box={markBox} from={0} frames={22} mode="gather" colors={[P.accent, P.ink, "#5d7a4c"]} count={110} size={20} spread={620} />
        <LogoLockup {...lockup} cy={860} land={14} write={24} writeFrames={24} />
      </SceneFrame>

      <SceneFrame from={glitch.startFrame} durationInFrames={glitch.durationFrames} enter="cut" exit="cut">
        <GlitchSlices before={<LogoLockup {...lockup} cy={860} land={-60} write={-40} />} after={<SidebarShot screens={[shots.explore, shots.listings, shots.videos]} />} switchAt={6} frames={glitch.durationFrames} ghost={P.accent} />
      </SceneFrame>

      <SceneFrame from={sidebar.startFrame} durationInFrames={sidebar.durationFrames} enter="cut" exit="cut">
        <SidebarShot screens={[shots.explore, shots.listings, shots.videos]} />
        {line("All your listings", "listings")}
      </SceneFrame>

      <SceneFrame from={explore.startFrame} durationInFrames={explore.durationFrames} enter="cut" exit="cut">
        {appShot(shots.explore, EXPLORE)}
        {line("Pick a template", "template")}
      </SceneFrame>

      <SceneFrame from={template.startFrame} durationInFrames={template.durationFrames} enter="cut" exit="cut">
        {appShot(shots.template, TEMPLATE)}
        {line("Choose a listing", "listing")}
      </SceneFrame>

      <SceneFrame from={picker.startFrame} durationInFrames={picker.durationFrames} enter="cut" exit="cut">
        {appShot(shots.picker, PICKER)}
        {line("Choose a listing", "listing", false)}
      </SceneFrame>

      <SceneFrame from={create.startFrame} durationInFrames={create.durationFrames} enter="cut" exit="cut">
        {appShot(shots.picked, CREATE)}
        {line("Hit create", "create")}
      </SceneFrame>

      <SceneFrame from={result.startFrame} durationInFrames={result.durationFrames} enter="cut" exit="cut">
        <GlowGround base={P.ground} glow={P.accent} strength={0.34} />
        <PhoneCard src={urls["assets/clips/spin-tour.mp4"]!} width={700} cx={540} cy={800} glow={P.accent} edge={P.edge} land={0} />
        {line("Your reel is ready", "reel")}
      </SceneFrame>

      <SceneFrame from={end.startFrame} durationInFrames={end.durationFrames} enter="cut" exit="cut">
        <LogoLockup {...lockup} cy={820} land={0} write={6} writeFrames={18} />
        <KeywordLine text="Your first video for $1" keyword="$1" color={P.ink} accent={P.accent} size={64} font={fonts.display} top={1030} delay={18} />
        <KeywordLine text="try-homie.com" color={P.accent} accent={P.accent} size={50} font={fonts.body} weight={500} top={1130} delay={26} />
      </SceneFrame>

      <Vignette />
      <SoundCues cues={cues} sounds={sounds} />
    </AbsoluteFill>
  );
};

