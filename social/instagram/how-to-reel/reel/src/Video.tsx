import React from "react";
import { AbsoluteFill } from "reelkit/frame";
import { fonts, Music, SceneFrame, SoundCues, Vignette, cueBefore } from "reelkit/kit";
import type { VideoProps } from "reelkit/kit";
import { GlowGround } from "./GlowGround";
import { LogoLockup } from "./LogoLockup";
import { GlitchSlices } from "./GlitchSlices";
import { TiltScreen, type ScreenKey } from "./TiltScreen";
import { HandCursor, handClicks, type HandPoint } from "./HandCursor";
import { KeywordLine } from "./KeywordLine";
import { PhoneCard } from "./PhoneCard";
import { PunchClip } from "./PunchClip";

// Homie palette: near-black ground, cream type, one sage accent.
const P = { ground: "#0d0f0c", ink: "#f6f1e7", accent: "#a3c98b", edge: "rgba(163,201,139,0.28)", app: "#111111" };
const IMG = { w: 2880, h: 1800 };
const CARD = { left: 60, top: 280, width: 960, height: 1240 };
const CAPTION_TOP = 1590, CAPTION = 92;

// Each app shot: the real screenshot, its camera keys and the hand's path, all in screenshot pixels (scene-local frames).
// The hand lands fast, clicks, and the camera punches in right after the click.
const EXPLORE = {
  keys: [{ frame: 0, x: 1500, y: 950, zoom: 2.2, rx: 8, ry: 12 }, { frame: 22, x: 860, y: 1080, zoom: 2.7, rx: 4, ry: 6 }, { frame: 32, x: 840, y: 1100, zoom: 3.3, rx: 2, ry: 3 }, { frame: 56, x: 835, y: 1105, zoom: 3.45, rx: 2, ry: 2 }],
  hand: [{ frame: 0, x: 1400, y: 1500 }, { frame: 22, x: 830, y: 1060, click: true }, { frame: 56, x: 845, y: 1080 }],
};
const TEMPLATE = {
  keys: [{ frame: 0, x: 1400, y: 900, zoom: 2.2, rx: 6, ry: -10 }, { frame: 18, x: 1660, y: 1060, zoom: 2.6, rx: 4, ry: -4 }, { frame: 28, x: 1690, y: 1059, zoom: 3.1, rx: 2, ry: -2 }, { frame: 42, x: 1695, y: 1059, zoom: 3.2, rx: 2, ry: -2 }],
  hand: [{ frame: 0, x: 1400, y: 1600 }, { frame: 18, x: 1699, y: 1332, click: true }, { frame: 42, x: 1712, y: 1350 }],
};
const PICKER = {
  keys: [{ frame: 0, x: 1100, y: 750, zoom: 2.4, rx: -4, ry: 8 }, { frame: 18, x: 990, y: 790, zoom: 2.7, rx: -2, ry: 4 }, { frame: 28, x: 990, y: 790, zoom: 3.2, rx: -1, ry: 2 }, { frame: 42, x: 990, y: 790, zoom: 3.3, rx: -1, ry: 2 }],
  hand: [{ frame: 0, x: 1450, y: 1150 }, { frame: 17, x: 985, y: 780, click: true }, { frame: 42, x: 995, y: 795 }],
};
const CREATE = {
  keys: [{ frame: 0, x: 1880, y: 1125, zoom: 3.0, rx: 2, ry: -3 }, { frame: 12, x: 1920, y: 1150, zoom: 3.3, rx: 1, ry: -2 }, { frame: 28, x: 1935, y: 1170, zoom: 3.8, rx: 0, ry: 0 }],
  hand: [{ frame: 0, x: 1700, y: 1650 }, { frame: 11, x: 1941, y: 1475, click: true }, { frame: 28, x: 1955, y: 1490 }],
};

export const Video: React.FC<VideoProps> = ({ manifest, urls }) => {
  const [hook, explore, template, picker, create, result, end] = manifest.scenes as typeof manifest.scenes;
  const shots = { explore: urls["assets/screens/explore.png"]!, template: urls["assets/screens/template.png"]!, picker: urls["assets/screens/picker.png"]!, picked: urls["assets/screens/picked.png"]! };
  const film = urls["assets/clips/spin-tour.mp4"]!;
  const mark = urls["assets/brand/homie-mark-cream.png"]!, word = urls["assets/brand/homie-wordmark-cream.png"]!;
  const lockup = { mark, word, markRatio: 342 / 411, wordRatio: 1028 / 276, height: 200, gap: 40, cx: 540, glow: P.accent };

  const sounds = {
    click: urls["assets/sfx/click.wav"]!, tap: urls["assets/sfx/tap.wav"]!, cut: urls["assets/sfx/cut.wav"]!, hit: urls["assets/sfx/hit.wav"]!,
    glitch: urls["assets/sfx/glitch.wav"]!, pop: urls["assets/sfx/pop.wav"]!, chime: urls["assets/sfx/chime.wav"]!,
    whoosh: urls["assets/sfx/whoosh.wav"]!, riser: urls["assets/sfx/riser.wav"]!, subdrop: urls["assets/sfx/subdrop.wav"]!,
  };
  const WHOOSH = 9, RISER = 18;
  const shotsWithHands = [[explore, EXPLORE], [template, TEMPLATE], [picker, PICKER], [create, CREATE]] as const;
  const clicks = shotsWithHands.flatMap(([s, cfg]) => handClicks(cfg.hand, s.startFrame));
  const createClick = handClicks(CREATE.hand, create.startFrame)[0]!;
  const cues = [
    // hook: the film slams in on a hit, each line pops
    { at: 0, sound: "hit", volume: 0.6 }, { at: 0, sound: "subdrop", volume: 0.45 }, { at: 3, sound: "pop", volume: 0.4 }, { at: 12, sound: "pop", volume: 0.45 },
    // every cut into an app shot: a whip that ends on a punch, with a glitch tick
    ...[explore, template, picker, create].flatMap((s) => [{ at: cueBefore(s.startFrame, WHOOSH), sound: "whoosh", volume: 0.3 }, { at: s.startFrame, sound: "cut", volume: 0.55 }, { at: s.startFrame + 1, sound: "glitch", volume: 0.3 }]),
    // every click: the press, a switch, and the whip of the camera punch that follows it
    ...clicks.flatMap((c) => [{ at: c, sound: "click", volume: 0.6 }, { at: c, sound: "tap", volume: 0.45 }, { at: c + 2, sound: "whoosh", volume: 0.22 }]),
    // reveal: a riser through the music break, then a heavy hit with a sub drop
    { at: cueBefore(result.startFrame, RISER), sound: "riser", volume: 0.4 }, { at: result.startFrame, sound: "hit", volume: 0.65 }, { at: result.startFrame, sound: "subdrop", volume: 0.5 },
    { at: result.startFrame + 10, sound: "pop", volume: 0.4 },
    // end card
    { at: cueBefore(end.startFrame, WHOOSH), sound: "whoosh", volume: 0.3 }, { at: end.startFrame, sound: "cut", volume: 0.55 },
    { at: end.startFrame + 14, sound: "chime", volume: 0.4 }, { at: end.startFrame + 22, sound: "pop", volume: 0.4 },
  ];

  const appShot = (src: string, cfg: { keys: ScreenKey[]; hand: HandPoint[] }) => (
    <TiltScreen src={src} imageWidth={IMG.w} imageHeight={IMG.h} {...CARD} keys={cfg.keys} edge={P.edge} background={P.app}>
      <HandCursor points={cfg.hand} size={130 / cfg.keys[0]!.zoom * 2.2} ring={P.accent} />
    </TiltScreen>
  );
  // Each cut lands broken for a few frames and snaps together.
  const glitchIn = (node: React.ReactNode) => <GlitchSlices before={node} after={node} switchAt={0} frames={6} ghost={P.accent} shift={90} />;
  const line = (text: string, keyword: string) => <KeywordLine text={text} keyword={keyword} color={P.ink} accent={P.accent} size={CAPTION} font={fonts.display} top={CAPTION_TOP} delay={2} frames={7} />;

  return (
    <AbsoluteFill style={{ background: P.ground }}>
      <GlowGround base={P.ground} glow={P.accent} />
      <Music src={urls["assets/audio/music.wav"]!} volume={0.45} />

      <SceneFrame from={hook.startFrame} durationInFrames={hook.durationFrames} enter="cut" exit="cut">
        <PunchClip src={film} startFrom={240} />
        <KeywordLine text="Turn your listing" color={P.ink} accent={P.accent} size={118} font={fonts.display} weight={800} top={1300} delay={1} frames={5} />
        <KeywordLine text="into a reel" keyword="reel" color={P.ink} accent={P.accent} size={118} font={fonts.display} weight={800} top={1440} delay={10} frames={5} />
      </SceneFrame>

      <SceneFrame from={explore.startFrame} durationInFrames={explore.durationFrames} enter="cut" exit="cut">
        {glitchIn(appShot(shots.explore, EXPLORE))}
        {line("Pick a template", "template")}
      </SceneFrame>

      <SceneFrame from={template.startFrame} durationInFrames={template.durationFrames} enter="cut" exit="cut">
        {glitchIn(appShot(shots.template, TEMPLATE))}
        {line("Choose a listing", "listing")}
      </SceneFrame>

      <SceneFrame from={picker.startFrame} durationInFrames={picker.durationFrames} enter="cut" exit="cut">
        {glitchIn(appShot(shots.picker, PICKER))}
        <KeywordLine text="Choose a listing" keyword="listing" color={P.ink} accent={P.accent} size={CAPTION} font={fonts.display} top={CAPTION_TOP} animate={false} />
      </SceneFrame>

      <SceneFrame from={create.startFrame} durationInFrames={create.durationFrames} enter="cut" exit="cut">
        {glitchIn(appShot(shots.picked, CREATE))}
        {line("Hit create", "create")}
      </SceneFrame>

      <SceneFrame from={result.startFrame} durationInFrames={result.durationFrames} enter="cut" exit="cut">
        <GlowGround base={P.ground} glow={P.accent} strength={0.4} />
        <PhoneCard src={film} width={720} cx={540} cy={790} glow={P.accent} edge={P.edge} land={0} />
        <KeywordLine text="Your reel is ready" keyword="reel" color={P.ink} accent={P.accent} size={CAPTION} font={fonts.display} top={CAPTION_TOP} delay={8} frames={7} />
      </SceneFrame>

      <SceneFrame from={end.startFrame} durationInFrames={end.durationFrames} enter="cut" exit="cut">
        <LogoLockup {...lockup} cy={780} land={0} write={4} writeFrames={12} />
        <KeywordLine text="Your first video for $1" keyword="$1" color={P.ink} accent={P.accent} size={76} font={fonts.display} weight={800} top={1000} delay={12} frames={6} />
        <KeywordLine text="try-homie.com" color={P.accent} accent={P.accent} size={56} font={fonts.body} weight={500} top={1110} delay={20} frames={6} />
      </SceneFrame>

      <Vignette />
      <SoundCues cues={cues} sounds={sounds} />
    </AbsoluteFill>
  );
};
