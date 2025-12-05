import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../../components/shared/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { turfAPI } from '../../services/api';
import { Turf } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingState from '../../components/shared/LoadingState';
import EmptyState from '../../components/shared/EmptyState';
import TurfCard from '../../components/user/TurfCard';
import { Alert } from 'react-native';
import { useTabBarScroll } from '../../hooks/useTabBarScroll';
import TurfFilterModal from '../../components/user/TurfFilterModal';

const TurfListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Turf[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeFilterParams, setActiveFilterParams] = useState<{date: string, slotId: number, city: string} | null>(null);
  const { onScroll } = useTabBarScroll(navigation);

  useEffect(() => {
    fetchTurfs();
  }, []);

  const fetchTurfs = async () => {
    try {
      // Fetch all turfs first
      const response = await turfAPI.getAllTurfs();
      
      // Client-side filter to show only turfs with availability: true
      // Handle cases where availability might be undefined, null, or false
      const availableTurfs = response.data.filter((turf: Turf) => {
        // Only show turfs that are explicitly set to available (true)
        return turf.availability === true;
      });
      
      console.log('Filtered available turfs:', availableTurfs);
      console.log(`Total turfs: ${response.data.length}, Available turfs: ${availableTurfs.length}`);
      
      setTurfs(availableTurfs);
    } catch (error) {
      console.error('Error fetching turfs:', error);
      Alert.alert('Error', 'Failed to fetch turfs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (isFilterActive && activeFilterParams) {
      // Refresh the search with existing params
      // We'll reuse the logic from handleFilterApply but without the loading state that blocks UI (since we have refresh control)
      turfAPI.searchByAvailability(activeFilterParams)
        .then(response => {
          setTurfs(response.data);
          // Keep filter active
        })
        .catch(error => {
           console.error('Error refreshing search:', error);
           Alert.alert('Error', 'Failed to refresh search results');
        })
        .finally(() => {
          setRefreshing(false);
        });
    } else {
      fetchTurfs();
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    
    // Filter turfs based on name containing the search query (case-insensitive)
    // Note: turfs array already contains only available turfs (filtered client-side)
    const filtered = turfs.filter(turf =>
      turf.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      turf.location.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    
    setSearchResults(filtered);
    setSearching(false);
  };

  const handleFilterApply = async (date: string, slotId: number, city: string) => {
    setLoading(true);
    try {
      const response = await turfAPI.searchByAvailability({
        date,
        slotId,
        city: city || '', 
      });
      console.log('Search availability results:', response.data);
      setTurfs(response.data);
      setIsFilterActive(true);
      setActiveFilterParams({ date, slotId, city: city || '' });
    } catch (error) {
      console.error('Error searching by availability:', error);
      Alert.alert('Error', 'Failed to search turfs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setIsFilterActive(false);
    setActiveFilterParams(null);
    setLoading(true);
    fetchTurfs();
  };

  // Perform search whenever query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(performSearch, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, turfs]);

  const renderTurfCard = ({ item }: { item: Turf }) => (
    <TurfCard
      turf={item}
      onPress={() => navigation.navigate('TurfDetail', { turfId: item.id })}
    />
  );

  const renderSearchResult = ({ item }: { item: Turf }) => (
    <TouchableOpacity 
      style={[styles.searchResultItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
      onPress={() => {
        closeSearchModal();
        navigation.navigate('TurfDetail', { turfId: item.id });
      }}
    >
      <View style={styles.searchResultContent}>
        <Text style={[styles.searchResultName, { color: theme.colors.text }]}>{item.name}</Text>
        <View style={styles.searchResultLocationRow}>
          <Ionicons name="location-outline" size={14} color={theme.colors.gray} />
          <Text style={[styles.searchResultLocation, { color: theme.colors.textSecondary }]}>{item.location}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ScreenWrapper 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={['bottom', 'left', 'right']}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Modern Header with Gradient */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top}]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Welcome</Text>
              <Text style={styles.headerTitle}>Find Your Turf</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>U</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TouchableOpacity 
              style={styles.searchBar} 
              onPress={handleSearch}
              activeOpacity={0.5}
            >
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.searchPlaceholder, { color: theme.colors.textSecondary }]}>
                Search by name or location...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: isFilterActive ? theme.colors.primary : '#FFFFFF' }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons 
                name={isFilterActive ? "funnel" : "options-outline"} 
                size={22} 
                color={isFilterActive ? '#FFFFFF' : theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {isFilterActive && (
        <View style={[styles.activeFilterContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.activeFilterText, { color: theme.colors.text }]}>
            Showing filtered results
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
            <Text style={[styles.clearFilterText, { color: theme.colors.primary }]}>Clear</Text>
            <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {turfs.length === 0 ? (
        <EmptyState
          icon="football-outline"
          title="No Available Turfs"
          description="All turfs are currently unavailable. Check back later for available turfs to book."
        />
      ) : (
        <FlatList
          data={turfs}
          renderItem={renderTurfCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSearchModal}
      >
        <ScreenWrapper style={[styles.searchModalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.searchModalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity 
              style={styles.searchBackButton}
              onPress={closeSearchModal}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.searchModalTitle, { color: theme.colors.text }]}>Search Turfs</Text>
            <View style={styles.searchBackButton} />
          </View>

          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="search-outline" size={20} color={theme.colors.gray} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search by turf name or location..."
              placeholderTextColor={theme.colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          {searching ? (
            <View style={styles.searchingContainer}>
              <Text style={[styles.searchingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
            </View>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color={theme.colors.gray} />
              <Text style={[styles.noResultsText, { color: theme.colors.text }]}>No turfs found</Text>
              <Text style={[styles.noResultsSubtext, { color: theme.colors.textSecondary }]}>
                Try searching with different keywords
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </ScreenWrapper>
      </Modal>

      {/* Filter Modal */}
      <TurfFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 0,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 3,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  profileButton: {
    padding: 4,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  list: {
    padding: 16,
    paddingBottom: 40, // Extra space for bottom navigation
  },
  // Search Modal Styles
  searchModalContainer: {
    flex: 1,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  searchResultsList: {
    padding: 16,
    paddingBottom: 40, // Extra space for phones with home indicator/navbar
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultLocation: {
    fontSize: 14,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TurfListScreen;
