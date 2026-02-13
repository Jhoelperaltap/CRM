import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, List, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortalChecklist } from '../../types/cases';

interface CaseChecklistProps {
  checklist: PortalChecklist;
}

export function CaseChecklist({ checklist }: CaseChecklistProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          {checklist.name}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}
        >
          {checklist.progress}% complete
        </Text>
      </View>

      <ProgressBar
        progress={checklist.progress / 100}
        color={theme.colors.primary}
        style={styles.progressBar}
      />

      <View style={styles.items}>
        {checklist.items.map((item) => (
          <View key={item.id} style={styles.item}>
            <MaterialCommunityIcons
              name={item.is_completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={24}
              color={item.is_completed ? theme.colors.primary : theme.colors.outline}
              style={styles.itemIcon}
            />
            <View style={styles.itemContent}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.itemName,
                  item.is_completed && styles.itemCompleted,
                  { color: item.is_completed ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                ]}
              >
                {item.name}
              </Text>
              {item.description && (
                <Text
                  variant="bodySmall"
                  style={[styles.itemDescription, { color: theme.colors.onSurfaceVariant }]}
                >
                  {item.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  progressText: {},
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  items: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {},
  itemCompleted: {
    textDecorationLine: 'line-through',
  },
  itemDescription: {
    marginTop: 2,
  },
});
