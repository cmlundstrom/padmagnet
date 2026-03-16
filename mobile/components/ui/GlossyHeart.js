import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

export default function GlossyHeart({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLORS.successGradient1} />
          <Stop offset="45%" stopColor={COLORS.successGradient2} />
          <Stop offset="100%" stopColor={COLORS.successGradient3} />
        </LinearGradient>
        <LinearGradient id="heartShine" x1="0.3" y1="0" x2="0.7" y2="0.5">
          <Stop offset="0%" stopColor={COLORS.white} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={COLORS.white} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Heart shape (FontAwesome heart path) */}
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="url(#heartGrad)"
      />
      {/* Glossy highlight */}
      <Path
        d="M7.5 4.5c-1.93 0-3.5 1.57-3.5 3.5 0 .97.4 1.84 1.03 2.5C6.5 8.5 8 6.5 10.5 5.5 9.6 4.85 8.6 4.5 7.5 4.5z"
        fill="url(#heartShine)"
      />
    </Svg>
  );
}
