import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Item individual da esteira da roleta com estética tática de display CS2
export default function RouletteItem({ item, largura = 130, isDestaque = false }) {
  if (!item) return null;

  const corRaridade = item.rarity?.color || CORES.azulCs;
  const nomeCompleto = item.name || '';
  const partes = nomeCompleto.includes(' | ')
    ? nomeCompleto.split(' | ')
    : [nomeCompleto, ''];

  const arma = partes[0];
  const skin = partes[1] || '';

  return (
    <View
      style={[
        styles.card,
        { width: largura },
        isDestaque && styles.cardDestaque,
      ]}
    >
      {/* Indicador superior de raridade integrado */}
      <View style={[styles.barraRaridadeSuperior, { backgroundColor: corRaridade }]} />

      {/* Miniatura da Skin em câmara escura de contraste */}
      <View style={styles.containerImagem}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.imagem}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagem}>
            <Text style={styles.textoSemImagem}>CS2</Text>
          </View>
        )}
      </View>

      {/* Identificação legível da Arma e Skin */}
      <View style={styles.info}>
        <Text style={styles.textoArma} numberOfLines={1}>
          {arma}
        </Text>
        <Text style={styles.textoSkin} numberOfLines={1}>
          {skin || arma}
        </Text>
      </View>

      {/* Acento inferior harmonioso da raridade */}
      <View style={[styles.linhaAcentoInferior, { backgroundColor: corRaridade }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 148,
    backgroundColor: CORES.fundoCard,
    borderRadius: BORDAS.md,
    overflow: 'hidden',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: CORES.borda,
    justifyContent: 'space-between',
  },
  cardDestaque: {
    borderColor: CORES.laranjaCs,
    borderWidth: 2,
    backgroundColor: CORES.fundoCardElevado,
  },
  barraRaridadeSuperior: {
    height: 3,
    width: '100%',
  },
  containerImagem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: ESPACAMENTO.xs,
    marginTop: ESPACAMENTO.xs,
    backgroundColor: CORES.fundoInput,
    borderRadius: BORDAS.sm,
    padding: ESPACAMENTO.xs,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
  },
  imagem: {
    width: '92%',
    height: 68,
  },
  semImagem: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderRadius: BORDAS.sm,
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: 'bold',
  },
  info: {
    paddingHorizontal: ESPACAMENTO.sm,
    paddingVertical: 5,
  },
  textoArma: {
    color: CORES.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textoSkin: {
    color: CORES.textoPrincipal,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  linhaAcentoInferior: {
    height: 2,
    width: '100%',
    opacity: 0.85,
  },
});
