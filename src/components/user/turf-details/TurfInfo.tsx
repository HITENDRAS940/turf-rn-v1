import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Turf } from '../../../types';
import { formatPhoneForDisplay } from '../../../utils/phoneUtils';

interface TurfInfoProps {
  turf: Turf;
  onCallPress: () => void;
}

const TurfInfo: React.FC<TurfInfoProps> = ({ turf, onCallPress }) => {
  const { theme } = useTheme();

  const renderSectionHeader = (title: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={[styles.turfName, { color: theme.colors.text }]}>{turf.name}</Text>
        
        <View style={styles.statsRow}>
          <View style={[styles.ratingBadge, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{turf.rating || 'New'}</Text>
          </View>
          <Text style={[styles.reviewCount, { color: theme.colors.textSecondary }]}>
            • 120 reviews
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
            {turf.location}
          </Text>
        </View>
      </View>

      {/* About Section */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderSectionHeader('About', 'information-circle')}
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {turf.description || 'No description available for this turf.'}
        </Text>
      </View>

      {/* Amenities Section */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderSectionHeader('Amenities', 'grid')}
        <View style={styles.amenitiesGrid}>
          {['Parking', 'Water', 'Changing Room', 'Floodlights'].map((amenity, index) => (
            <View key={index} style={[styles.amenityItem, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
              <Text style={[styles.amenityText, { color: theme.colors.text }]}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location Map Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderSectionHeader('Location', 'map')}
        <TouchableOpacity 
          style={[styles.mapPlaceholder, { backgroundColor: theme.colors.lightGray }]}
          onPress={() => {
            const lat = turf.latitude;
            const lng = turf.longitude;
            const label = encodeURIComponent(turf.name);
            
            if (lat && lng) {
              const url = Platform.select({
                ios: `maps:0,0?q=${label}@${lat},${lng}`,
                android: `geo:0,0?q=${lat},${lng}(${label})`,
              });
              
              if (url) {
                Linking.openURL(url).catch(err => console.error('An error occurred', err));
              }
            } else {
              // Fallback for search by query if no coordinates
              const query = encodeURIComponent(`${turf.name} ${turf.location}`);
              const url = Platform.select({
                ios: `maps:0,0?q=${query}`,
                android: `geo:0,0?q=${query}`,
              });
               if (url) {
                Linking.openURL(url).catch(err => console.error('An error occurred', err));
              }
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.mapContent}>
            <View style={styles.mapIconCircle}>
              <Ionicons name="map" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.mapTextContainer}>
              <Text style={[styles.mapTitle, { color: theme.colors.text }]}>View on Map</Text>
              <Text style={[styles.mapSubtitle, { color: theme.colors.textSecondary }]}>
                {turf.latitude && turf.longitude ? 'Precise location available' : 'Search location in maps'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
          
          {/* Decorative map pattern background could go here if we had an image */}
        </TouchableOpacity>
      </View>

      {/* Contact Section */}
      {turf.contactNumber && (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 20 }]}>
          {renderSectionHeader('Contact', 'call')}
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: theme.colors.primary + '10' }]}
            onPress={onCallPress}
            activeOpacity={0.7}
          >
            <View style={[styles.phoneIconCircle, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.contactText, { color: theme.colors.text }]}>
              {formatPhoneForDisplay(turf.contactNumber)}
            </Text>
            <View style={[styles.callAction, { borderColor: theme.colors.primary }]}>
              <Text style={[styles.callActionText, { color: theme.colors.primary }]}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    gap: 16,
  },
  headerSection: {
    marginBottom: 8,
  },
  turfName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    flex: 1,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    minWidth: '48%',
  },
  amenityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapPlaceholder: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTextContainer: {
    flex: 1,
    gap: 2,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  mapSubtitle: {
    fontSize: 13,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  callAction: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  callActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TurfInfo;
