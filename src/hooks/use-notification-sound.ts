"use client";

import { useCallback, useEffect, useRef } from "react";

// Notification sound URL - using a simple notification sound
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";

/**
 * Hook to play notification sounds
 * Respects user preference stored in localStorage
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Check if sound is enabled
  const isSoundEnabled = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    
    try {
      const prefs = localStorage.getItem("notification-preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        return parsed.sound !== false; // Default to true
      }
      return true; // Default enabled
    } catch {
      return true;
    }
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!isSoundEnabled()) return;
    
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Ignore autoplay errors - user hasn't interacted yet
        });
      }
    } catch {
      // Ignore errors
    }
  }, [isSoundEnabled]);

  // Toggle sound preference
  const toggleSound = useCallback((enabled: boolean) => {
    if (typeof window === "undefined") return;
    
    try {
      const prefs = localStorage.getItem("notification-preferences");
      const parsed = prefs ? JSON.parse(prefs) : {};
      parsed.sound = enabled;
      localStorage.setItem("notification-preferences", JSON.stringify(parsed));
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    playSound,
    isSoundEnabled,
    toggleSound,
  };
}

/**
 * Hook to get/set notification preferences from localStorage
 */
export function useNotificationPreferences() {
  const getPreferences = useCallback(() => {
    if (typeof window === "undefined") {
      return { sound: true, push: true };
    }
    
    try {
      const prefs = localStorage.getItem("notification-preferences");
      if (prefs) {
        return JSON.parse(prefs);
      }
    } catch {
      // Ignore
    }
    
    return { sound: true, push: true };
  }, []);

  const setPreference = useCallback((key: string, value: boolean) => {
    if (typeof window === "undefined") return;
    
    try {
      const prefs = getPreferences();
      prefs[key] = value;
      localStorage.setItem("notification-preferences", JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, [getPreferences]);

  return {
    getPreferences,
    setPreference,
  };
}
