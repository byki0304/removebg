const INTRO_PLAYED_KEY = "introPlayed";

export function hasPlayedIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_PLAYED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
  } catch {
    // Ignore: without storage the intro simply plays once per page load.
  }
}
