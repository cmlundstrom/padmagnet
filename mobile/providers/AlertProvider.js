import { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const AlertContext = createContext(null);

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
  });

  const alert = useCallback((title, message, buttons) => {
    setConfig({
      title: title || '',
      message: message || '',
      buttons: buttons || [{ text: 'OK' }],
    });
    setVisible(true);
  }, []);

  function handlePress(onPress) {
    setVisible(false);
    if (onPress) setTimeout(onPress, 200);
  }

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {config.title ? (
              <Text style={styles.title}>{config.title}</Text>
            ) : null}
            {config.message ? (
              <Text style={styles.message}>{config.message}</Text>
            ) : null}
            <View style={styles.buttonRow}>
              {config.buttons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isPrimary = i === config.buttons.length - 1;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      isPrimary && styles.buttonPrimary,
                      isDestructive && styles.buttonDestructive,
                      config.buttons.length === 1 && styles.buttonFull,
                    ]}
                    onPress={() => handlePress(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isPrimary && styles.buttonTextPrimary,
                        isDestructive && styles.buttonTextDestructive,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.scrimDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.frostedGlass,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.accent,
  },
  buttonDestructive: {
    backgroundColor: COLORS.danger,
  },
  buttonFull: {
    flex: 1,
  },
  buttonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  buttonTextPrimary: {
    color: COLORS.white,
  },
  buttonTextDestructive: {
    color: COLORS.white,
  },
});
