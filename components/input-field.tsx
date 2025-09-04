import { View, Text, TextInput, TextInputProps } from 'react-native';

type Props = {
  label: string;
  placeholder?: string;
  containerStyle?: string;
  inputStyle?: string;
  editable?: boolean;
} & TextInputProps;

export default function InputField({ label, placeholder, containerStyle, inputStyle, editable = true, ...rest }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 16, color: 'rgba(0, 0, 0, 0.8)', fontWeight: '500', marginBottom: 8 }}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={editable}
        style={{
          backgroundColor: editable ? '#FFFFFF' : '#F9FAFB',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 8,
          color: editable ? '#000000' : '#6B7280',
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16
        }}
        {...rest}
      />
    </View>
  );
}


