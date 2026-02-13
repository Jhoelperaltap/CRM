import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { statusColors, StatusColorKey } from '../../constants/colors';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
}

// Map various status values to color keys
function getColorKey(status: string): StatusColorKey {
  const statusLower = status.toLowerCase().replace(/[^a-z_]/g, '_');

  // Direct matches
  if (statusLower in statusColors) {
    return statusLower as StatusColorKey;
  }

  // Map variations
  const mappings: Record<string, StatusColorKey> = {
    active: 'in_progress',
    processing: 'in_progress',
    review: 'pending',
    waiting: 'pending',
    done: 'completed',
    finished: 'completed',
    success: 'approved',
    accepted: 'approved',
    denied: 'rejected',
    failed: 'rejected',
    cancelled: 'rejected',
    canceled: 'rejected',
    inactive: 'closed',
    archived: 'closed',
    scheduled: 'pending',
    confirmed: 'approved',
    no_show: 'rejected',
  };

  return mappings[statusLower] || 'pending';
}

// Format status label for display
function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label, size = 'medium' }: StatusBadgeProps) {
  const colorKey = getColorKey(status);
  const colors = statusColors[colorKey];
  const displayLabel = label || formatLabel(status);

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.background },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          isSmall && styles.textSmall,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
});
