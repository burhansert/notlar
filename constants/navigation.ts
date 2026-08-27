import { Platform } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export const contentHorizontalPadding = spacing.lg;

export const sharedHeaderOptions = {
  headerTitleAlign: 'left' as const,
  headerLeftContainerStyle: { paddingLeft: contentHorizontalPadding },
  headerTitleContainerStyle: { paddingLeft: 0, flex: 1 },
  headerRightContainerStyle: { paddingRight: contentHorizontalPadding },
};

export const sharedTabBarOptions = {
  tabBarActiveTintColor: colors.forest,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    minHeight: Platform.select({ web: 72, default: 64 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ web: 12, default: 10 }),
  },
  tabBarItemStyle: {
    paddingTop: 2,
    paddingBottom: 4,
  },
  tabBarIconStyle: {
    marginBottom: 2,
  },
};
