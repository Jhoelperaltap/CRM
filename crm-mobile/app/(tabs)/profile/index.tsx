import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Text, Card, Button, Divider, List, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';
import { useAuthStore, selectContact } from '../../../src/stores/auth-store';
import { iconColors, darkIconColors } from '../../../src/constants/colors';

export default function ProfileScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;
  const { logout, isLoggingOut } = useAuth();
  const contact = useAuthStore(selectContact);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!contact) {
    return null;
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="headlineMedium"
              style={{ color: theme.colors.primary, fontWeight: '700' }}
            >
              {initials}
            </Text>
          </View>
          <Text variant="headlineSmall" style={styles.name}>
            {fullName}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {contact.email}
          </Text>
        </Card.Content>
      </Card>

      {/* Contact Information */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Contact Information
          </Text>

          {contact.phone && (
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons
                  name="phone"
                  size={18}
                  color={icons.phone}
                />
              </View>
              <View style={styles.infoContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Phone
                </Text>
                <Text variant="bodyMedium">{contact.phone}</Text>
              </View>
            </View>
          )}

          {contact.address && (
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FCE4EC' }]}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color={icons.address}
                />
              </View>
              <View style={styles.infoContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Address
                </Text>
                <Text variant="bodyMedium">
                  {contact.address}
                  {contact.city && `, ${contact.city}`}
                  {contact.state && `, ${contact.state}`}
                  {contact.zip_code && ` ${contact.zip_code}`}
                </Text>
              </View>
            </View>
          )}

          {contact.date_of_birth && (
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons
                  name="cake"
                  size={18}
                  color={icons.birthday}
                />
              </View>
              <View style={styles.infoContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Date of Birth
                </Text>
                <Text variant="bodyMedium">{contact.date_of_birth}</Text>
              </View>
            </View>
          )}

          {contact.ssn_last_four && (
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#ECEFF1' }]}>
                <MaterialCommunityIcons
                  name="shield-account"
                  size={18}
                  color={icons.security}
                />
              </View>
              <View style={styles.infoContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  SSN (Last 4)
                </Text>
                <Text variant="bodyMedium">***-**-{contact.ssn_last_four}</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Account Settings */}
      <Card style={styles.settingsCard}>
        <List.Item
          title="Change Password"
          left={() => (
            <View style={[styles.settingsIconCircle, { backgroundColor: '#F3E5F5' }]}>
              <MaterialCommunityIcons name="lock" size={20} color={icons.lock} />
            </View>
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/(tabs)/profile/change-password')}
        />
      </Card>

      {/* Logout Button */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        loading={isLoggingOut}
        disabled={isLoggingOut}
        style={styles.logoutButton}
        textColor={theme.colors.error}
        icon="logout"
      >
        Sign Out
      </Button>

      <Text
        variant="bodySmall"
        style={[styles.version, { color: theme.colors.onSurfaceVariant }]}
      >
        Ebenezer Client Portal v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  infoContent: {
    flex: 1,
  },
  settingsCard: {
    marginBottom: 24,
    borderRadius: 12,
  },
  logoutButton: {
    marginBottom: 24,
  },
  version: {
    textAlign: 'center',
  },
});
