import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Link } from 'expo-router';

const MOCK_CHATS = [
  { id: '1', name: 'Driver Alex', last: 'On my way!', time: '2m' },
  { id: '2', name: 'Support', last: 'How can we help?', time: '1d' },
];

export default function ChatTab() {
  const [chats] = useState(MOCK_CHATS);
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF',paddingTop:70}}>
       <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: '#111827',
          marginTop: 8,
          marginBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        Your chats
      </Text>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={chats}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Link asChild href={{ pathname: '/chat/[id]', params: { id: item.id } }}>
            <Pressable style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12 }}>
              <Text style={{ color: '#111827', fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>{item.last}</Text>
              <Text style={{ color: '#9CA3AF', marginTop: 4, fontSize: 12 }}>{item.time}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}


