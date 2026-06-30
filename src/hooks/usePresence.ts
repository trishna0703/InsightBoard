import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

export interface OnlineUser {
  userId: string;
  name: string;
  email: string;
}

export function usePresence(
  currentUser: { id: string; name: string; email: string } | null
) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`presence:${TEAM_ID}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          name: string;
          email: string;
        }>();

        const users: OnlineUser[] = Object.entries(state).map(
          ([userId, presences]) => ({
            userId,
            name: presences[0]?.name ?? 'Unknown',
            email: presences[0]?.email ?? '',
          })
        );
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: currentUser.name,
            email: currentUser.email,
          });
        }
      });

    // Leave presence when app goes to background
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        channel.untrack();
      } else if (state === 'active') {
        channel.track({
          name: currentUser.name,
          email: currentUser.email,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [currentUser]);

  return { onlineUsers };
}