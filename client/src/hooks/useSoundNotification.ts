import { useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

// Sound URLs - using simple beep sounds
const NOTIFICATION_SOUNDS = {
  message: '/sounds/message.mp3',
  task: '/sounds/task.mp3',
  alert: '/sounds/alert.mp3',
} as const;

type SoundType = keyof typeof NOTIFICATION_SOUNDS;

export function useSoundNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Get user's sound settings from notification settings
  const { data: settings } = trpc.settings.getNotificationSettings.useQuery(undefined, {
    staleTime: 60000,
  });

  const soundEnabled = settings?.soundEnabled ?? true;
  const soundVolume = (settings?.soundVolume ?? 50) / 100;

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  const playSound = useCallback((type: SoundType = 'message') => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      const soundUrl = NOTIFICATION_SOUNDS[type];
      audioRef.current.src = soundUrl;
      audioRef.current.volume = soundVolume;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors - user interaction required
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [soundEnabled, soundVolume]);

  const playMessageSound = useCallback(() => playSound('message'), [playSound]);
  const playTaskSound = useCallback(() => playSound('task'), [playSound]);
  const playAlertSound = useCallback(() => playSound('alert'), [playSound]);

  return {
    playSound,
    playMessageSound,
    playTaskSound,
    playAlertSound,
    soundEnabled,
    soundVolume,
  };
}

// Hook to monitor for new messages and play sounds
export function useMessageSoundNotification() {
  const { playMessageSound, soundEnabled } = useSoundNotification();
  const previousCountRef = useRef<number | null>(null);

  const { data: unreadCount } = trpc.ohweees.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!soundEnabled || unreadCount === undefined) return;

    // Only play sound if count increased (new message)
    if (previousCountRef.current !== null && unreadCount > previousCountRef.current) {
      playMessageSound();
    }

    previousCountRef.current = unreadCount;
  }, [unreadCount, soundEnabled, playMessageSound]);
}

// Hook to monitor for new notifications and play sounds
export function useNotificationSoundAlert() {
  const { playAlertSound, soundEnabled } = useSoundNotification();
  const previousCountRef = useRef<number | null>(null);

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!soundEnabled || unreadCount === undefined) return;

    // Only play sound if count increased (new notification)
    if (previousCountRef.current !== null && unreadCount > previousCountRef.current) {
      playAlertSound();
    }

    previousCountRef.current = unreadCount;
  }, [unreadCount, soundEnabled, playAlertSound]);
}
