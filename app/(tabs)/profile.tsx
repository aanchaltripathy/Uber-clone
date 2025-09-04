import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Image, StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ProfileTab() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        {/* Header with X button */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </Pressable>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/100' }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.userName}>Ramzi Sherif</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#000" />
            <Text style={styles.rating}>5.0</Text>
          </View>
        </View>

        {/* Action Buttons Grid */}
        <View style={styles.actionGrid}>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color="#000" />
            </View>
            <Text style={styles.actionText}>Help</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#000" />
            </View>
            <Text style={styles.actionText}>Wallet</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="time-outline" size={24} color="#000" />
            </View>
            <Text style={styles.actionText}>Trips</Text>
          </Pressable>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={20} color="#000" />
              <Text style={styles.menuText}>Messages</Text>
            </View>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={20} color="#000" />
              <Text style={styles.menuText}>Settings</Text>
            </View>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#000" />
              <Text style={styles.menuText}>Legal</Text>
            </View>
          </Pressable>
        </View>

        {/* Version Number */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>v4.410.10000</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  closeButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
  },
  userName: { 
    fontSize: 24, 
    fontWeight: '600', 
    color: '#000',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: { 
    fontSize: 16, 
    color: '#000',
    marginLeft: 12,
    fontWeight: '400',
  },
  versionContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
  },
});