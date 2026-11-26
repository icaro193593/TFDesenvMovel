import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

/**
 * SkinCard - Card tático de skin para o catálogo do CS2 SkinWiki
 * 
 * Segue rigorosamente os princípios de Impeccable Design:
 * - Sem faixas laterais unilaterais (borderLeftWidth proibido).
 * - Borda sutil de 1px em todo o contorno (#25354D).
 * - Identificação visual de raridade por badge/chip elegante com ponto colorido.
 * - Textos de alto contraste (Branco puro para nomes, #9EB1D0 para dados táticos).
 * - Feedback de toque profissional com TouchableOpacity e activeOpacity={0.7}.
 */
export default function SkinCard({ item, onPress, style }) {
  if (!item) return null;

  // Cor oficial e nome da raridade
  const nomeRaridade = item.rarity?.name || 'Raridade Oficial';
  const corRaridade =
    item.rarity?.color ||
    CORES.raridades[nomeRaridade] ||
    CORES.azulClaro;

  // Monta rótulo de categoria e arma
  const categoria = item.category?.name || '';
  const arma = item.weapon?.name || '';
  const rotuloArmaCategoria =
    categoria && arma
      ? `${categoria.toUpperCase()} • ${arma.toUpperCase()}`
      : (categoria || arma || 'CS2 ARSENAL').toUpperCase();

  // Tratamento da faixa de float
  const temFloat =
    item.min_float !== null &&
    item.min_float !== undefined &&
    item.max_float !== null &&
    item.max_float !== undefined;

  const textoFloat = temFloat
    ? `Float ${item.min_float.toFixed(2)} - ${item.max_float.toFixed(2)}`
    : 'Float não aplicável';

  const isStatTrak = item.stattrak === true;
  const isSouvenir = item.souvenir === true;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Skin ${item.name}, ${nomeRaridade}`}
    >
      {/* Moldura Tática para o Thumbnail da Arma */}
      <View style={styles.molduraThumbnail}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.imagemArma}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagem}>
            <MaterialIcons
              name="image-not-supported"
              size={22}
              color={CORES.textoMudo}
            />
            <Text style={styles.textoSemImagem}>CS2</Text>
          </View>
        )}

        {/* Indicador de float no rodapé da moldura */}
        {temFloat && (
          <View style={styles.tagFloatMoldura}>
            <Text style={styles.textoFloatMoldura}>
              {item.min_float.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Conteúdo Tático Central */}
      <View style={styles.conteudo}>
        {/* Linha Superior: Categoria/Arma e Badge de Raridade */}
        <View style={styles.linhaSuperior}>
          <Text style={styles.categoriaArma} numberOfLines={1}>
            {rotuloArmaCategoria}
          </Text>

          <View
            style={[
              styles.badgeRaridade,
              {
                borderColor: corRaridade,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
              },
            ]}
          >
            <View style={[styles.pontoRaridade, { backgroundColor: corRaridade }]} />
            <Text
              style={[styles.textoBadgeRaridade, { color: corRaridade }]}
              numberOfLines={1}
            >
              {nomeRaridade}
            </Text>
          </View>
        </View>

        {/* Nome da Skin em Alto Contraste */}
        <Text style={styles.nomeSkin} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Linha Inferior: Faixa de Float e Badges Especiais (StatTrak / Souvenir) */}
        <View style={styles.linhaInferior}>
          <Text style={styles.textoFloat}>{textoFloat}</Text>

          <View style={styles.grupoBadgesEspeciais}>
            {isStatTrak && (
              <View style={styles.badgeStatTrak}>
                <Text style={styles.textoStatTrak}>StatTrak™</Text>
              </View>
            )}

            {isSouvenir && (
              <View style={styles.badgeSouvenir}>
                <Text style={styles.textoSouvenir}>Souvenir</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
  },
  // MOLDURA DO THUMBNAIL
  molduraThumbnail: {
    width: 86,
    height: 72,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  imagemArma: {
    width: 78,
    height: 58,
  },
  semImagem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  tagFloatMoldura: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  textoFloatMoldura: {
    color: CORES.textoMudo,
    fontSize: 8,
    fontWeight: '700',
  },
  // CONTEÚDO
  conteudo: {
    flex: 1,
    marginLeft: ESPACAMENTO.md,
    justifyContent: 'center',
  },
  linhaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoriaArma: {
    color: CORES.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 6,
  },
  badgeRaridade: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDAS.pill,
    borderWidth: 1,
    maxWidth: '45%',
  },
  pontoRaridade: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  textoBadgeRaridade: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nomeSkin: {
    color: CORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 2,
  },
  linhaInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  textoFloat: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '500',
  },
  grupoBadgesEspeciais: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeStatTrak: {
    backgroundColor: 'rgba(245, 130, 32, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.45)',
    borderRadius: BORDAS.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  textoStatTrak: {
    color: CORES.laranjaCs,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeSouvenir: {
    backgroundColor: 'rgba(255, 215, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    borderRadius: BORDAS.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  textoSouvenir: {
    color: CORES.ouro,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
