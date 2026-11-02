import { Composition } from "remotion";
import { INTRO_FPS, INTRO_FRAMES, IntroComposition } from "./IntroComposition";

export function RemotionRoot() {
  return (
    <>
      <Composition id="IntroLandscape" component={IntroComposition} durationInFrames={INTRO_FRAMES} fps={INTRO_FPS} width={1920} height={1080} />
      <Composition id="IntroPortrait" component={IntroComposition} durationInFrames={INTRO_FRAMES} fps={INTRO_FPS} width={1080} height={1920} />
    </>
  );
}
