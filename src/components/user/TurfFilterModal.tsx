import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_SLOTS, formatTime } from '../../utils/slotUtils';
import { LinearGradient } from 'expo-linear-gradient';

interface TurfFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (date: string, slotId: number, city: string) => void;
  initialCity?: string;
}

const TurfFilterModal: React.FC<TurfFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialCity = '',
}) => {
  const { theme } = useTheme();
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [city, setCity] = useState(initialCity);

  // Generate next 7 days
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(date);
    }
    return result;
  }, []);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const handleApply = () => {
    if (selectedSlotId === null) {
        // ideally show alert, but for now just return or handle in parent
        return;
    }
    onApply(formatDate(selectedDate), selectedSlotId, city);
    onClose();
  };

  const renderDateItem = ({ item }: { item: Date }) => {
    const isSelected = formatDate(item) === formatDate(selectedDate);
    return (
      <TouchableOpacity
        style={[
          styles.dateItem,
          {
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={() => setSelectedDate(item)}
      >
        <Text
          style={[
            styles.dayText,
            { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
          ]}
        >
          {getDayName(item)}
        </Text>
        <Text
          style={[
            styles.dateText,
            { color: isSelected ? '#FFFFFF' : theme.colors.text },
          ]}
        >
          {item.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Filter Turfs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* City Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Location</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter city (e.g. Mumbai)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            {/* Date Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date</Text>
              <FlatList
                data={dates}
                renderItem={renderDateItem}
                keyExtractor={(item) => item.toISOString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateList}
              />
            </View>

            {/* Time Slots Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Time Slot</Text>
              <View style={styles.slotsGrid}>
                {DEFAULT_SLOTS.map((slot) => {
                    const isSelected = selectedSlotId === slot.slotId;
                    return (
                        <TouchableOpacity
                            key={slot.slotId}
                            style={[
                                styles.slotItem,
                                {
                                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                }
                            ]}
                            onPress={() => setSelectedSlotId(slot.slotId)}
                        >
                            <Text style={[
                                styles.slotText,
                                { color: isSelected ? '#FFFFFF' : theme.colors.text }
                            ]}>
                                {formatTime(slot.startTime)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity 
                style={[styles.applyButton, { opacity: selectedSlotId ? 1 : 0.6 }]}
                onPress={handleApply}
                disabled={!selectedSlotId}
            >
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                >
                    <Text style={styles.applyButtonText}>Apply Filter</Text>
                </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 100, // Space for footer
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  dateList: {
    gap: 12,
  },
  dateItem: {
    width: 60,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotItem: {
    width: '30%', // Approx 3 columns
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent', 
    borderTopWidth: 1,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TurfFilterModal;
