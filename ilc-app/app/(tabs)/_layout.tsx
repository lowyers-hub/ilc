import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const tabContent = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: Platform.OS === 'web' ? { display: 'none' } : undefined,
      }}>
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Drafts',
          tabBarIcon: ({ color }) => <TabBarIcon name="edit" color={color} />,
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );

  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 flex-row bg-bg">
        <View className="hidden md:flex w-64 border-r border-divider bg-surface p-4">
          <View className="mb-8">
            <TabBarIcon name="balance-scale" color={Colors[colorScheme ?? 'light'].tint} />
          </View>
          <View className="flex-col gap-4">
            {['chat', 'documents', 'contracts', 'forum', 'account'].map((item) => (
              <View key={item} className="flex-row items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                <TabBarIcon name="circle-o" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
              </View>
            ))}
          </View>
        </View>
        <View className="flex-1 max-w-5xl mx-auto w-full">
          {tabContent}
        </View>
      </View>
    );
  }

  return tabContent;
}
