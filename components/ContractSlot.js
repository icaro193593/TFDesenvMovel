import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

/**
 * Componente reutilizável para cada um dos 3 slots do Contrato de Trocas CS2.
 * Possui 2 estados visuais impecáveis:
 * - Vazio: borda tracejada tática, ícone estilizado de adicionar, indicador "Slot 1/2/3"
 * - Preenchido: imagem nítida, tag StatTrak™ (se houver), nome, wear, chip com cor oficial da raridade e botão de remoção
 */
export default function ContractSlot({ item, indice, onRemover }) {
  if (!item) {
    return (
      <View style={styles.slotVazio}>
        <View style={styles.circuloIconeVazio}>
          <MaterialIcons name="add" size={20} color={CORES.laranjaCs} />
        </View>
        <Text style={styles.textoSlotVazio}>Slot {indice + 1}</Text>
        <View style={styles.badgeSlotLivre}>
          <Text style={styles.subtextoSlotVazio}>VAZIO</Text>
        </View>
      </View>
    );
  }

  // Cor oficial da raridade da skin
  const corRaridade =
    item.rarity?.color ||
    CORES.raridades[item.rarity?.name] ||
    CORES.azulAco;
  const nomeRaridade = item.rarity?.name || 'Raridade Oficial';

  return (
    <View style={[styles.slotPreenchido, { borderColor: corRaridade }]}>
      {/* Botão de remoção (X) no topo direito com fundo escuro e toque preciso */}
      <TouchableOpacity
        style={styles.botaoRemoverSlot}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => onRemover && onRemover(item)}
      >
        <MaterialIcons name="close" size={12} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Indicador StatTrak™ no topo esquerdo quando aplicável */}
      {item.isStatTrak && (
        <View style={styles.badgeStatTrakSlot}>
          <Text style={styles.textoStatTrakSlot}>ST™</Text>
        </View>
      )}

      {/* Imagem nítida da skin */}
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

      {/* Nome e Desgaste (Wear) */}
      <View style={styles.infoSlot}>
        <Text style={styles.nomeSkinSlot} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.wearSlot} numberOfLines={1}>
          {item.wearNome || 'Padrão'}
        </Text>
      </View>

      {/* Chip/Badge inferior com a cor oficial da raridade (borda completa sem faixas) */}
      <View style={[styles.chipRaridadeSlot, { backgroundColor: `${corRaridade}22`, borderColor: `${corRaridade}66` }]}>
        <Text style={[styles.textoChipRaridadeSlot, { color: corRaridade }]} numberOfLines={1}>
          {nomeRaridade}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slotVazio: {
    flex: 1,
    height: 140,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderStyle: 'dashed',
    borderRadius: BORDAS.md,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.xs,
  },
  circuloIconeVazio: {
    width: 36,
    height: 36,
    borderRadius: BORDAS.pill,
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.xs,
  },
  textoSlotVazio: {
    color: CORES.textoPrincipal,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSlotLivre: {
    backgroundColor: CORES.fundoCard,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDAS.sm,
    marginTop: 3,
  },
  subtextoSlotVazio: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  slotPreenchido: {
    flex: 1,
    height: 140,
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderRadius: BORDAS.md,
    marginHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: ESPACAMENTO.xs,
    paddingBottom: 4,
    paddingHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  botaoRemoverSlot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: CORES.erro,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeStatTrakSlot: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: CORES.laranjaEscuro,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    zIndex: 10,
  },
  textoStatTrakSlot: {
    color: CORES.textoPrincipal,
    fontSize: 8,
    fontWeight: '900',
  },
  containerImagemSlot: {
    width: '100%',
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  imagemSlot: {
    width: '88%',
    height: 52,
  },
  semImagemSlot: {
    width: 44,
    height: 44,
    borderRadius: BORDAS.sm,
    backgroundColor: CORES.fundoSuperficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemSlot: {
    color: CORES.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
  },
  infoSlot: {
    width: '100%',
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  nomeSkinSlot: {
    color: CORES.textoPrincipal,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  wearSlot: {
    color: CORES.textoSecundario,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  chipRaridadeSlot: {
    width: '94%',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textoChipRaridadeSlot: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
