import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = { id: string; from: 'me' | 'them'; text: string };

export default function ChatDetail() {
  const { id } = useLocalSearchParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', from: 'them', text: 'Hi! I am on my way.' },
    { id: '2', from: 'me', text: 'Great, see you soon!' },
  ]);

  function send() {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { id: String(Date.now()), from: 'me', text: t }]);
    setInput('');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10, alignItems: item.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <View style={{ backgroundColor: item.from === 'me' ? '#DCFCE7' : '#F3F4F6', padding: 10, borderRadius: 12 }}>
              <Text style={{ color: '#111827' }}>{item.text}</Text>
            </View>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Message #${id}`}
          style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10 }}
        />
        <Pressable onPress={send} style={{ backgroundColor: '#111827', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}













