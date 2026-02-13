import { FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { useTheme, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDocuments } from '../../../src/api/documents';
import { DocumentCard } from '../../../src/components/documents/DocumentCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { PortalDocument } from '../../../src/types/documents';
import { useAuthStore } from '../../../src/stores/auth-store';

export default function DocumentsListScreen() {
  const theme = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);

  const handleOpenDocument = async (document: PortalDocument) => {
    try {
      // Build the download URL with inline viewing and auth token
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api/v1';
      const tokenParam = accessToken ? `&token=${accessToken}` : '';
      const url = `${API_BASE}/portal/documents/${document.id}/download/?inline=true${tokenParam}`;

      // Open document in external browser
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the document. Please try again.');
    }
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments(),
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading documents..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load documents"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  if (!data?.results?.length) {
    return (
      <>
        <EmptyState
          icon="file-document-outline"
          title="No Documents"
          description="You haven't uploaded any documents yet."
          actionLabel="Upload Document"
          onAction={() => router.push('/(tabs)/documents/upload')}
        />
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/(tabs)/documents/upload')}
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
          <DocumentCard document={item} onPress={() => handleOpenDocument(item)} />
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
        onPress={() => router.push('/(tabs)/documents/upload')}
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
