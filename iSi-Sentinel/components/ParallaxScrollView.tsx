import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
	headerImage: ReactElement;
	headerBackgroundColor: { dark: string; light: string };
}>;

/**
 * Composant de défilement avec effet parallax pour l'en-tête.
 * 
 * @component
 * @param {Props} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Les éléments enfants à afficher dans la vue
 * @param {React.ReactNode} props.headerImage - L'image à afficher dans l'en-tête
 * @param {Object} props.headerBackgroundColor - Les couleurs d'arrière-plan de l'en-tête selon le thème
 * @returns {React.FC} Composant avec défilement et effet parallax sur l'en-tête
 * 
 * @description
 * Ce composant crée une vue défilante avec un effet parallax sur l'en-tête.
 * L'image de l'en-tête se déplace et change d'échelle en fonction du défilement.
 * 
 * @remarks
 * - Utilise Reanimated pour créer des animations fluides pendant le défilement
 * - S'adapte au mode clair/sombre de l'appareil
 * - Ajuste l'affichage en fonction de la barre de navigation inférieure
 */
export default function ParallaxScrollView({
	children,
	headerImage,
	headerBackgroundColor,
}: Props) {
	const colorScheme = useColorScheme() ?? 'light';
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollOffset = useScrollViewOffset(scrollRef);
	const bottom = useBottomTabOverflow();
	const headerAnimatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateY: interpolate(
						scrollOffset.value,
						[-HEADER_HEIGHT, 0, HEADER_HEIGHT],
						[-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
					),
				},
				{
					scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
				},
			],
		};
	});

	return (
		<ThemedView style={styles.container}>
			<Animated.ScrollView
				ref={scrollRef}
				scrollEventThrottle={16}
				scrollIndicatorInsets={{ bottom }}
				contentContainerStyle={{ paddingBottom: bottom }}>
				<Animated.View
					style={[
						styles.header,
						{ backgroundColor: headerBackgroundColor[colorScheme] },
						headerAnimatedStyle,
					]}>
					{headerImage}
				</Animated.View>
				<ThemedView style={styles.content}>{children}</ThemedView>
			</Animated.ScrollView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		height: HEADER_HEIGHT,
		overflow: 'hidden',
	},
	content: {
		flex: 1,
		padding: 32,
		gap: 16,
		overflow: 'hidden',
	},
});
