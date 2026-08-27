import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { TabBarLabel } from '@/components/TabBarLabel';
import { colors } from '@/constants/theme';
import { sharedHeaderOptions, sharedTabBarOptions } from '@/constants/navigation';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '800' },
        ...sharedHeaderOptions,
        ...sharedTabBarOptions,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Not Defterlerim',
          tabBarLabel: ({ color }) => <TabBarLabel label="Not Defterlerim" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="handwriting"
        options={{
          title: 'El Yazım',
          tabBarLabel: ({ color }) => <TabBarLabel label="El Yazım" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pencil-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hesap',
          tabBarLabel: ({ color }) => <TabBarLabel label="Hesap" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Yönetici',
            href: isAdmin ? undefined : null,
            tabBarLabel: ({ color }) => <TabBarLabel label="Yönetici" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
