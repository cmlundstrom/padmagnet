import { View } from 'react-native';
import MessagesScreen from '../../components/screens/MessagesScreen';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import usePadPoints from '../../hooks/usePadPoints';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';

export default function TenantMessages() {
  const { session } = useAuth();
  const isAnon = !session || session.user?.is_anonymous === true;
  const padPoints = usePadPoints();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <MessagesScreen emptySubtitle="Message owners and listing agents about properties you love." />
      <AuthBottomSheet
        visible={isAnon}
        onClose={() => {}}
        context="messages_tab"
        padpoints={padPoints.padpoints}
      />
    </View>
  );
}
