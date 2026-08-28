import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useNotebookLock } from '@/lib/notebookLock';

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function NotebookLockCountdown({ notebookId }: { notebookId?: string }) {
  const { getRemainingLockMs, isProtected, isUnlocked } = useNotebookLock();
  const [now, setNow] = useState(() => Date.now());
  const visible = Boolean(notebookId && isProtected(notebookId) && isUnlocked(notebookId));

  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible || !notebookId) return null;

  const remaining = getRemainingLockMs(notebookId, now);
  if (remaining <= 0) return null;

  const urgent = remaining <= 30 * 1000;
  const tone = urgent ? colors.terracotta : colors.forest;
  const background = urgent ? colors.terracottaSoft : colors.forestSoft;

  return (
    <View style={[styles.badge, { backgroundColor: background }]} accessibilityLabel={`Kilit ${formatRemaining(remaining)} sonra`}>
      <Ionicons name="lock-closed-outline" size={14} color={tone} />
      <Text style={[styles.time, { color: tone }]}>{formatRemaining(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  time: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
});
