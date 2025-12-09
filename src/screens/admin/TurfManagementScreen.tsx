import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { ScreenWrapper } from '../../components/shared/ScreenWrapper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import { Turf } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared Components
import LoadingState from '../../components/shared/LoadingState';
import EmptyState from '../../components/shared/EmptyState';
import Button from '../../components/shared/Button';
import AdminTurfCard from '../../components/admin/AdminTurfCard';


const TurfManagementScreen = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  
  // State
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    fetchTurfs();
  }, []);

  const fetchTurfs = async () => {
    try {
      if (!user?.id) {
        setTurfs([]);
        return;
      }
      const response = await adminAPI.getAdminTurfs(user.id);
      const turfList = response.data || response || [];
      setTurfs(Array.isArray(turfList) ? turfList : []);
    } catch (error: any) {
      console.error('Error fetching turfs:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch turfs');
      setTurfs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTurfs();
  };

  // Create Handler


  const handleTurfPress = (turf: Turf) => {
    navigation.navigate('AdminTurfDetail', { turf });
  };

  return (
    <ScreenWrapper 
      style={styles.container}
      safeAreaEdges={['bottom', 'left', 'right']}
    >
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Turf Management</Text>
              <Text style={styles.headerSubtitle}>Manage your listings</Text>
            </View>

          </View>
        </LinearGradient>
      </View>

      {/* Turf List */}
      {loading ? (
        <LoadingState />
      ) : turfs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="golf"
            title="No Turfs Yet"
            description="Create your first turf to get started"
          />

        </View>
      ) : (
        <FlatList
          data={turfs}
          renderItem={({ item }) => (
            <AdminTurfCard 
              turf={item} 
              onPress={() => handleTurfPress(item)}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modals */}

    </ScreenWrapper>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  headerGradient: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

});

export default TurfManagementScreen;
