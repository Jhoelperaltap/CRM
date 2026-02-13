import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCases } from '../../../src/api/cases';
import { CaseCard } from '../../../src/components/cases/CaseCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { PortalCase } from '../../../src/types/cases';

export default function CasesListScreen() {
  const theme = useTheme();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases(),
  });

  const handleCasePress = (caseItem: PortalCase) => {
    router.push(`/(tabs)/cases/${caseItem.id}`);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading cases..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load cases"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  if (!data?.results?.length) {
    return (
      <EmptyState
        icon="folder-open-outline"
        title="No Cases"
        description="You don't have any cases yet."
      />
    );
  }

  return (
    <FlatList
      data={data.results ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CaseCard caseItem={item} onPress={() => handleCasePress(item)} />
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
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
});
