import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMessages } from '../../../src/api/messages';
import { ThreadPreview } from '../../../src/components/messages/ThreadPreview';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { PortalMessage } from '../../../src/types/messages';

export default function MessagesListScreen() {
  const theme = useTheme();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['messages'],
    queryFn: () => getMessages(),
  });

  const handleMessagePress = (message: PortalMessage) => {
    router.push(`/(tabs)/messages/${message.id}`);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading messages..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load messages"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  if (!data?.results?.length) {
    return (
      <>
        <EmptyState
          icon="email-outline"
          title="No Messages"
          description="You don't have any messages yet."
          actionLabel="Send Message"
          onAction={() => router.push('/(tabs)/messages/compose')}
        />
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/(tabs)/messages/compose')}
        />
      </>
    );
  }

  return (
    <>
      <FlatList
        data={data.results ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThreadPreview message={item} onPress={() => handleMessagePress(item)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
          />
        }
      />
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/(tabs)/messages/compose')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
