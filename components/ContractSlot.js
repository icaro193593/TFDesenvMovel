import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Componente reutilizável para cada um dos 3 slots da caixa do contrato de troca
export default function ContractSlot({ item, indice, onRemover }) {
  if (!item) {
    return (
      <View style={styles.slotVazio}>
        <View style={styles.circuloIconeVazio}>
          <MaterialIcons name="add" size={24} color="#68A3E5" />
        </View>
        <Text style={styles.textoSlotVazio}>Slot {indice + 1}</Text>
        <Text style={styles.subtextoSlotVazio}>Vazio</Text>
      </View>
    );
  }

  const corRaridade = item.rarity?.color || '#2B6CB0';

  return (
    <View style={[styles.slotPreenchido, { borderTopColor: corRaridade }]}>
      {/* Botão para remover a skin do contrato */}
      <TouchableOpacity
        style={styles.botaoRemoverSlot}
        activeOpacity={0.7}
        onPress={() => onRemover && onRemover(item)}
      >
        <MaterialIcons name="close" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Imagem da Skin */}
      <View style={styles.containerImagemSlot}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.imagemSlot}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagemSlot}>
            <Text style={styles.textoSemImagemSlot}>CS2</Text>
          </View>
        )}
      </View>

      {/* Nome e Condição */}
      <View style={styles.infoSlot}>
        <Text style={styles.nomeSkinSlot} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.wearSlot} numberOfLines={1}>
          {item.wearNome || 'Padrão'}
        </Text>
      </View>

      {/* Faixa inferior da raridade */}
      <View style={[styles.faixaRaridade, { backgroundColor: corRaridade }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slotVazio: {
    flex: 1,
    height: 130,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  circuloIconeVazio: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  textoSlotVazio: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtextoSlotVazio: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  slotPreenchido: {
    flex: 1,
    height: 130,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderTopWidth: 4,
    borderRadius: 8,
    marginHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  botaoRemoverSlot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  containerImagemSlot: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  imagemSlot: {
    width: '85%',
    height: 55,
  },
  semImagemSlot: {
    width: 45,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemSlot: {
    color: '#94A3B8',
    fontSize: 10,
  },
  infoSlot: {
    width: '100%',
    paddingHorizontal: 6,
    paddingBottom: 4,
    alignItems: 'center',
  },
  nomeSkinSlot: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  wearSlot: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 1,
  },
  faixaRaridade: {
    width: '100%',
    height: 3,
  },
});
