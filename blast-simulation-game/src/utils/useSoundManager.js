import { useState, useEffect, useRef, useCallback } from "react";

const useSoundManager = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs to hold audio objects
  const bgmRef = useRef(null);
  const boomRef = useRef(null);
  const clickRef = useRef(null);
  const scoreRef = useRef(null);

  useEffect(() => {
    // Initialize Audio objects
    bgmRef.current = new Audio("/sounds/bgm.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3; // Lower volume for background

    boomRef.current = new Audio("/sounds/boom.mp3");
    clickRef.current = new Audio("/sounds/click.mp3");
    clickRef.current.volume = 0.6;
    scoreRef.current = new Audio("/sounds/score.mp3");

    // Attempt to play BGM (might be blocked by browser policy until interaction)
    const playBgm = async () => {
      try {
        if (!isMuted) await bgmRef.current.play();
      } catch (e) {
        console.log("Audio autoplay blocked until interaction");
      }
    };
    playBgm();

    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Handle Mute Toggling
  useEffect(() => {
    if (bgmRef.current) {
      if (isMuted) bgmRef.current.pause();
      else bgmRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  const playSound = useCallback((type) => {
    if (isMuted) return;
    
    let sound;
    switch (type) {
      case "boom":
        sound = boomRef.current;
        break;
      case "click":
        // Clone for overlapping clicks
        sound = clickRef.current ? clickRef.current.cloneNode() : null;
        break;
      case "score":
        sound = scoreRef.current;
        break;
      default:
        return;
    }

    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }, [isMuted]);

  return { isMuted, toggleMute, playSound };
};

export default useSoundManager;