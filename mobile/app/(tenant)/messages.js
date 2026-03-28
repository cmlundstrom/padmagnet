import { useState, useContext } from 'react';
import { View } from 'react-native';
import MessagesScreen from '../../components/screens/MessagesScreen';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import usePadPoints from '../../hooks/usePadPoints';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';

export default function TenantMessages() {
  const [showAuth, setShowAuth] = useState(false);
  const padPoints = usePadPoints();

  // Check if user is anonymous
  const checkAnonymous = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true;
    const isAnon = session.user?.is_anonymous || session.user?.app_metadata?.provider === 'anonymous';
    return isAnon;
  };

  // On mount, check if anonymous and show auth gate
  useState(() => {
    checkAnonymous().then(isAnon => {
      if (isAnon) setShowAuth(true);
    });
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <MessagesScreen emptySubtitle="Contact a property owner from a listing to start chatting." />
      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="messages_tab"
        padpoints={padPoints.padpoints}
      />
    </View>
  );
}
