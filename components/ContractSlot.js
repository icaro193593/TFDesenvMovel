import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CORES } from '../constants/cs2Theme';

// Slot individual para exibir uma skin selecionada no contrato
export default function ContractSlot({ item, indice, onRemover }) {
  if (!item) {
    return (
      <View style={[styles.slot, styles.slotVazio]}>
        <Text style={styles.textoVazio}>Slot {indice + 1}</Text>
      </View>
    );
  }

  const corRaridade =
    item.rarity?.color || CORES.raridades[item.rarity?.name] || CORES.azulBorda;

  return (
    <View style={[styles.slot, styles.slotPreenchido, { borderColor: corRaridade }]}>
      <TouchableOpacity
        style={styles.botaoRemover}
        activeOpacity={0.7}
        onPress={() => onRemover && onRemover(item)}
      >
        <Text style={styles.textoRemover}>X</Text>
      </TouchableOpacity>

      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.imagem} resizeMode="contain" />
      ) : (
        <Text style={styles.textoVazio}>CS2</Text>
      )}

      <Text style={styles.nomeSkin} numberOfLines={2}>
        {item.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    height: 108,
    backgroundColor: CORES.branco,
    borderRadius: 8,
    marginHorizontal: 4,
    padding: 6,
    alignItems: 'center',
  },
  slotVazio: {
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  slotPreenchido: {
    borderWidth: 2,
    justifyContent: 'space-between',
  },
  botaoRemover: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: CORES.erro,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  textoRemover: { color: CORES.branco, fontSize: 11, fontWeight: 'bold' },
  imagem: { width: '90%', height: 48, marginTop: 8 },
  textoVazio: { color: CORES.textoSecundario, fontSize: 12, fontWeight: '600' },
  nomeSkin: { color: CORES.texto, fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
