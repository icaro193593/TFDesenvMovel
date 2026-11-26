import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { CORES } from '../constants/cs2Theme';

function limparTexto(texto) {
  return (texto || '').replace(/[\u2605\u2122]/g, '').trim();
}

export default function RouletteItem({ item, largura = 120, isDestaque = false }) {
  if (!item) return null;

  const corRaridade =
    item.rarity?.color || CORES.raridades?.[item.rarity?.name] || CORES.azulPrincipal;

  return (
    <View style={[styles.card, { width: largura }, isDestaque && styles.cardDestaque]}>
      <View style={[styles.barraRaridade, { backgroundColor: corRaridade }]} />
      <View style={styles.imagemBox}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.imagem} resizeMode="contain" />
        ) : (
          <Text style={styles.semImagem}>Sem imagem</Text>
        )}
      </View>
      <Text style={styles.nome} numberOfLines={1}>
        {limparTexto(item.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 118,
    backgroundColor: CORES.branco,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginHorizontal: 4,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardDestaque: {
    borderColor: CORES.azulPrincipal,
    borderWidth: 2,
    backgroundColor: CORES.azulClaro,
  },
  barraRaridade: { height: 4, width: '100%' },
  imagemBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 6 },
  imagem: { width: '90%', height: 58 },
  semImagem: { color: CORES.textoSecundario, fontSize: 11 },
  nome: {
    color: CORES.texto,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingBottom: 6,
    textAlign: 'center',
  },
});
