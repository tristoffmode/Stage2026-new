import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Composant collapsible permettant d'afficher ou de masquer du contenu.
 *
 * @component
 * @param {PropsWithChildren & { title: string }} props - Les propriétés du composant, incluant un titre et des enfants.
 * @returns {JSX.Element} Un composant React représentant une section repliable.
 *
 * @description
 * Ce composant affiche un titre cliquable qui permet de basculer l'affichage
 * d'un contenu enfant. Il utilise un thème clair ou sombre en fonction du schéma
 * de couleur de l'utilisateur.
 *
 * @remarks
 * - Utilise `useState` pour gérer l'état d'ouverture.
 * - Utilise `useColorScheme` pour appliquer un thème.
 * - Inclut une animation de rotation pour l'icône.
 */

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
	const [isOpen, setIsOpen] = useState(false);
	const theme = useColorScheme() ?? 'light';

	return (
		<ThemedView>
			<TouchableOpacity
				style={styles.heading}
				onPress={() => setIsOpen((value) => !value)}
				activeOpacity={0.8}>
				<IconSymbol
					name="chevron.right"
					size={18}
					weight="medium"
					color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
					style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
				/>

				<ThemedText type="defaultSemiBold">{title}</ThemedText>
			</TouchableOpacity>
			{isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	heading: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	content: {
		marginTop: 6,
		marginLeft: 24,
	},
});
