import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ImageRotator from '../components/auth/ImageRotator';
import { Button } from '../components/ui';
import { saveUserRole } from '../lib/storage';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const { height } = Dimensions.get('window');

const WELCOME_IMAGES = [
  require('../assets/images/welcome-1.jpg'),
  require('../assets/images/welcome-2.jpg'),
  require('../assets/images/welcome-3.jpg'),
];

function handleRole(role) {
  saveUserRole(role);
  router.replace({ pathname: '/(auth)/email', params: { role } });
}

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Image rotator — top 33% */}
      <View style={styles.imageSection}>
        <ImageRotator images={WELCOME_IMAGES} interval={4000} />
        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['transparent', COLORS.background]}
          style={styles.gradient}
        />
      </View>

      <SafeAreaView style={styles.bottomSection} edges={['bottom']}>
        {/* Branding */}
        <View style={styles.branding}>
          <Image
            source={require('../assets/images/padmagnet-icon-512.png')}
            style={styles.icon}
            contentFit="contain"
          />
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkPad}>Pad</Text>
            <Text style={styles.wordmarkMagnet}>Magnet</Text>
          </View>
          <Text style={styles.tagline}>
            Find Your Perfect Pad with PadScore<Text style={styles.tm}>{'\u2122'}</Text>
          </Text>
        </View>

        {/* Role buttons */}
        <View style={styles.buttons}>
          <Button
            title="I'm a Tenant"
            variant="primary"
            size="lg"
            onPress={() => handleRole('tenant')}
            style={styles.fullButton}
          />
          <Button
            title="I'm a Property Owner"
            variant="outline"
            size="lg"
            onPress={() => handleRole('owner')}
            style={styles.fullButton}
          />
          {/* Future: Broker button */}
          <View style={{ height: 12 }} />
        </View>

        {/* Sign in link */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/email')}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  imageSection: {
    height: height * 0.28,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  branding: {
    alignItems: 'center',
    paddingTop: 16,
  },
  icon: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  wordmarkPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: 38,
    color: COLORS.white,
  },
  wordmarkMagnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: 38,
    color: COLORS.brandOrange,
  },
  tagline: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    textAlign: 'center',
  },
  tm: {
    fontSize: 10,
    lineHeight: 18,
  },
  buttons: {
    gap: 12,
  },
  fullButton: {
    width: '100%',
  },
  signInLink: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  signInText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  signInBold: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.accent,
  },
});
