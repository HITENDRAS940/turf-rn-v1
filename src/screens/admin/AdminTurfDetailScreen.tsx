// filepath: /Users/hitendrasingh/Desktop/EzTurf/src/screens/admin/AdminTurfDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { adminAPI, turfAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/shared/ScreenWrapper';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared Components
import RevenueCard from '../../components/shared/cards/RevenueCard';
import SlotGridCard from '../../components/shared/cards/SlotGridCard';
import BookingCard from '../../components/shared/cards/BookingCard';
import SlotsManagementModal from '../../components/shared/modals/SlotsManagementModal';
import AvailabilityModal from '../../components/shared/modals/AvailabilityModal';
import ManualBookingModal from '../../components/shared/modals/ManualBookingModal';
import DisableSlotByDateModal from '../../components/shared/modals/DisableSlotByDateModal';

// Utilities
import { formatDateToYYYYMMDD } from '../../utils/dateUtils';
import { calculateRevenueData } from '../../utils/revenueUtils';
import { mapSlotsWithBookingInfo, getBookedSlotIds } from '../../utils/slotUtils';

// Types
import { SlotConfig } from '../../types';

interface TurfSlot {
  id: number;
  slotId: number;
  startTime: string;
  endTime: string;
  price: number;
  enabled: boolean;
  isBooked?: boolean;
  isDisabledDate?: boolean; // New flag for date-specific disable
  disableReason?: string;
}

interface TurfBooking {
  id: number;
  user: {
    name: string;
    phone: string;
  };
  reference: string;
  amount: number;
  status: string;
  turfName: string;
  slotTime: string;
  slots: Array<{
    slotId: number;
    startTime: string;
    endTime: string;
    price: number;
  }>;
  bookingDate: string;
  createdAt: string;
}

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  bookedSlots: number;
  availableSlots: number;
}

type ModalStep = 'none' | 'slots' | 'availability' | 'manualBooking' | 'disableSlot';

const AdminTurfDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { turf } = route.params;
  
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<TurfBooking[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slotsWithBookings, setSlotsWithBookings] = useState<TurfSlot[]>([]);
  const [currentStep, setCurrentStep] = useState<ModalStep>('none');
  
  // Modal-specific state
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [currentTurfData, setCurrentTurfData] = useState(turf);

  // Data Fetching
  useEffect(() => {
    fetchTurfData();
  }, [selectedDate]);

  const fetchTurfData = async () => {
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      
      // Fetch updated turf data to get latest images and slots
      const turfResponse = await turfAPI.getTurfById(turf.id);
      const latestTurfData = turfResponse.data;
      setCurrentTurfData(latestTurfData);
      
      // Fetch bookings for this turf on the selected date
      const bookingsData = await adminAPI.getTurfBookings(turf.id, dateStr);
      
      // Fetch disabled slots for this date
      const disabledSlotsResponse = await adminAPI.getDisabledSlotsForDate(turf.id, dateStr);
      const disabledSlots = disabledSlotsResponse.data || [];
      const disabledSlotIdsMap = new Map();
      if (Array.isArray(disabledSlots)) {
        disabledSlots.forEach(ds => {
          disabledSlotIdsMap.set(ds.slotId, ds.reason);
        });
      }
      
      let bookingsList: TurfBooking[] = [];
      
      if (Array.isArray(bookingsData)) {
        bookingsList = bookingsData;
      } else if (bookingsData && Array.isArray(bookingsData.bookings)) {
        bookingsList = bookingsData.bookings;
      } else if (bookingsData && bookingsData.data && Array.isArray(bookingsData.data)) {
        bookingsList = bookingsData.data;
      }
      
      // Filter bookings to only show those matching the selected date
      const filteredBookings = bookingsList.filter((b: TurfBooking) => {
        return b.bookingDate === dateStr;
      });
      
      setBookings(filteredBookings);

      // Use latest slots from API response (not stale route params)
      const latestSlots = latestTurfData.slots || [];

      // Map slots with booking info using utility (do this FIRST)
      const bookedSlotIds = getBookedSlotIds(filteredBookings);
      const rawSlotsData = mapSlotsWithBookingInfo(latestSlots, bookedSlotIds);
      
      const slotsData: TurfSlot[] = rawSlotsData.map(slot => {
        const disabledReason = disabledSlotIdsMap.get(slot.id);
        const shouldDisable = !!disabledReason;
        
        return {
          ...slot,
          slotId: slot.id,
          // If explicitly disabled for this date, mark enabled=false or use specific flag
          // Using enabled=false ensures visual consistency with grid
          enabled: shouldDisable ? false : slot.enabled, 
          isDisabledDate: shouldDisable,
          disableReason: disabledReason,
        };
      });

      setSlotsWithBookings(slotsData);

      // Calculate revenue using the mapped slots (with isBooked property)
      const revenueData = calculateRevenueData(filteredBookings, slotsData);
      setRevenue(revenueData);

    } catch (error: any) {
      console.error('Error fetching turf details:', error);
      Alert.alert('Error', 'Failed to fetch turf details');
      
      setBookings([]);
      const defaultRevenue = calculateRevenueData([], turf.slots || []);
      setRevenue(defaultRevenue);
      const rawSlotsData = mapSlotsWithBookingInfo(turf.slots || [], new Set());
      const slotsData: TurfSlot[] = rawSlotsData.map(slot => ({
        ...slot,
        slotId: slot.id
      }));
      
      setSlotsWithBookings(slotsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTurfData();
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setLoading(true);
  };

  // Management Actions


  const handleManageSlots = async () => {
    await loadSlots();
    setCurrentStep('slots');
  };

  const handleManageAvailability = () => {
    setCurrentStep('availability');
  };
  
  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const response = await adminAPI.getTurfSlots(turf.id);
      const dbSlots = response.data;
      
      if (dbSlots && dbSlots.length > 0) {
        const mappedSlots = dbSlots.map((dbSlot: any, index: number) => ({
          slotId: dbSlot.id || dbSlot.slotId || (index + 1),
          startTime: dbSlot.startTime,
          endTime: dbSlot.endTime,
          price: dbSlot.price,
          enabled: dbSlot.enabled === true,
        }));
        
        setSlots(mappedSlots);
      }
    } catch (error: any) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDeleteTurf = () => {
    Alert.alert(
      'Delete Turf',
      `Are you sure you want to delete "${turf.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await adminAPI.deleteTurf(turf.id);
              Alert.alert('Success', 'Turf deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete turf');
            }
          }
        },
      ]
    );
  };



  const handleManualBooking = () => {
    setCurrentStep('manualBooking');
  };

  const handleDisableSlot = () => {
    setCurrentStep('disableSlot'); // Use the new ModalStep type
  };

  const handleDisableSlotConfirm = async (slotId: number, reason: string) => {
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      
      await adminAPI.disableSlotForDate({
        turfId: turf.id,
        slotId: slotId,
        date: dateStr,
        reason: reason,
      });

      Alert.alert('Success', 'Slot disabled successfully');
      fetchTurfData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to disable slot');
      throw error;
    }
  };

  const handleManualBookingConfirm = async (slotIds: number[]) => {
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      
      await adminAPI.createManualBooking({
        turfId: turf.id,
        slotIds: slotIds,
        bookingDate: dateStr,
      });
      
      // Refresh data to show new booking
      fetchTurfData();
    } catch (error: any) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Modal Callbacks


  const handleSlotsSave = async (updatedSlots: SlotConfig[]) => {
    try {
      // Update each slot
      for (const slot of updatedSlots) {
        if (slot.price !== undefined) {
          await adminAPI.updateSlotPrice(turf.id, slot.slotId, slot.price);
        }
        
        if (slot.enabled) {
          await adminAPI.enableSlot(turf.id, slot.slotId);
        } else {
          await adminAPI.disableSlot(turf.id, slot.slotId);
        }
      }
      
      // Refresh turf data to reflect latest DB state
      fetchTurfData();
    } catch (error: any) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleAvailabilitySave = async (isAvailable: boolean) => {
    try {
      if (isAvailable) {
        await adminAPI.setTurfAvailable(turf.id);
      } else {
        await adminAPI.setTurfNotAvailable(turf.id);
      }

      fetchTurfData();
    } catch (error: any) {
      throw error; // Re-throw to let modal handle the error
    }
  };



  const closeModal = () => {
    setCurrentStep('none');
  };



  // Render Bookings List
  const renderBookingsList = () => {
    if (bookings.length === 0) {
      return (
        <View style={styles.emptyBookings}>
          <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No bookings for this date
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.bookingsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Bookings ({bookings.length})
        </Text>

        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            variant="admin"
          />
        ))}
      </View>
    );
  };

  return (
    <ScreenWrapper 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={['bottom', 'left', 'right']}
    >
      <StatusBar barStyle="light-content" />
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
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {turf.name}
              </Text>
              <View style={styles.headerLocationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {turf.location}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Management Action Buttons */}
      <View style={[styles.actionButtonsContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionButtonsRow}
        >


          <TouchableOpacity 
            style={[styles.actionButtonItem, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={handleManageSlots}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="time" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Slots</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButtonItem, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={handleManageAvailability}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="toggle" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Availability</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButtonItem, { backgroundColor: '#10B98115' }]}
            onPress={handleManualBooking}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="add-circle" size={22} color="#10B981" />
            </View>
            <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Book Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButtonItem, { backgroundColor: '#F9731615' }]}
            onPress={handleDisableSlot}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F9731620' }]}>
              <Ionicons name="ban" size={22} color="#F97316" />
            </View>
            <Text style={[styles.actionButtonText, { color: '#F97316' }]}>Disable Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButtonItem, { backgroundColor: theme.colors.error + '15' }]}
            onPress={handleDeleteTurf}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="trash" size={22} color={theme.colors.error} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Date Selector */}
      <View style={[styles.dateSelector, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          onPress={() => changeDate(-1)}
          style={styles.dateButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Text style={[styles.dateText, { color: theme.colors.text }]}>
            {format(selectedDate, 'EEE, MMM dd, yyyy')}
          </Text>
          {formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(new Date()) && (
            <View style={[styles.todayBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.todayText, { color: theme.colors.primary }]}>Today</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => changeDate(1)}
          style={styles.dateButton}
        >
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading data...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          <View style={styles.content}>
            {revenue && (
              <View style={styles.cardContainer}>
                <RevenueCard
                  data={{
                    totalRevenue: revenue.totalRevenue,
                    totalBookings: revenue.totalBookings,
                    bookedSlots: revenue.bookedSlots,
                    availableSlots: revenue.availableSlots,
                  }}
                />
              </View>
            )}
            
            {slotsWithBookings.length > 0 && (
              <View style={styles.cardContainer}>
                <SlotGridCard
                  slots={slotsWithBookings}
                />
              </View>
            )}
            
            <View style={styles.cardContainer}>
              {renderBookingsList()}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modals */}


      <SlotsManagementModal
        visible={currentStep === 'slots'}
        onClose={closeModal}
        onSave={handleSlotsSave}
        slots={slots}
        loading={slotsLoading}
        showRefresh={true}
        onRefresh={() => loadSlots()}
        turfName={turf.name}
      />

      <AvailabilityModal
        visible={currentStep === 'availability'}
        onClose={closeModal}
        onSave={handleAvailabilitySave}
        currentAvailability={turf.isAvailable || false}
        turfName={turf.name}
        turfId={turf.id}
      />



      <ManualBookingModal
        visible={currentStep === 'manualBooking'}
        onClose={closeModal}
        onConfirm={handleManualBookingConfirm}
        slots={slotsWithBookings}
        turfName={turf.name}
        selectedDate={formatDateToYYYYMMDD(selectedDate)}
      />

      <DisableSlotByDateModal
        visible={currentStep === 'disableSlot'}
        onClose={closeModal}
        onConfirm={handleDisableSlotConfirm}
        slots={slotsWithBookings}
        selectedDate={formatDateToYYYYMMDD(selectedDate)}
        turfName={turf.name}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#fff',
  },
  headerGradient: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButtonItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 8,
    minWidth: 85,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dateButton: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 24,
  },
  bookingsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default AdminTurfDetailScreen;
