"use client";

import { SkipForward, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { IntroFallback, playIntroSweep } from "@/components/intro/IntroFallback";
import { useLayoutMode } from "@/layout/LayoutProvider";
import { markIntroPlayed } from "@/lib/introState";
import { useLocale } from "@/providers/LocaleProvider";

const INTRO_DURATION_MS = 6000;

export default function IntroPage() {
  const { t } = useLocale();
  const router = useRouter();
  const mode = useLayoutMode();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const finished = useRef(false);
  const [useVideo, setUseVideo] = useState(true);
  const [muted, setMuted] = useState(true);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    markIntroPlayed();
    void audioCtx.current?.close();
    router.replace("/");
  }, [router]);

  // The fallback animation (and a stalled video) still ends at exactly 6 seconds.
  useEffect(() => {
    const timer = setTimeout(finish, INTRO_DURATION_MS + 400);
    return () => clearTimeout(timer);
  }, [finish]);

  const toggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (useVideo && videoRef.current) {
      videoRef.current.muted = nextMuted;
      return;
    }
    if (!nextMuted) {
      audioCtx.current ??= new AudioContext();
      playIntroSweep(audioCtx.current);
    } else {
      void audioCtx.current?.suspend();
    }
  };

  const src = mode === "mobilePortrait" ? "/intro/intro_portrait.mp4" : "/intro/intro_landscape.mp4";

  return (
    <div className="fixed inset-0 bg-obsidian" data-testid="intro-screen">
      {useVideo ? (
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster="/intro/poster.webp"
          autoPlay
          muted
          playsInline
          onEnded={finish}
          onError={() => setUseVideo(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <IntroFallback />
      )}

      <div className="safe-top absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? t("intro_sound_on") : t("intro_sound_off")}
          className="btn-ghost flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span>{muted ? t("intro_sound_on") : t("intro_sound_off")}</span>
        </button>
        <button
          type="button"
          onClick={finish}
          data-testid="intro-skip"
          className="btn-ghost flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
        >
          <span>{t("intro_skip")}</span>
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
