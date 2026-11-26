import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { CORES } from '../constants/cs2Theme';

// Card horizontal simples para exibir uma skin na lista
export default function SkinCard({ item, onPress, style }) {
  if (!item) return null;

  const nomeRaridade = item.rarity?.name || 'Comum';
  const corRaridade =
    CORES.raridades?.[nomeRaridade] || item.rarity?.color || CORES.textoSecundario;

  return (
    <TouchableOpacity style={[styles.card, style]} activeOpacity={0.7} onPress={onPress}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.imagem} resizeMode="contain" />
      ) : (
        <View style={styles.semImagem}>
          <Text style={styles.textoSemImagem}>Sem foto</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.raridade, { color: corRaridade }]} numberOfLines={1}>
          {nomeRaridade}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  imagem: { width: 64, height: 48 },
  semImagem: {
    width: 64,
    height: 48,
    backgroundColor: CORES.fundo,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: { fontSize: 10, color: CORES.textoSecundario },
  info: { flex: 1, marginLeft: 12 },
  nome: { fontSize: 15, fontWeight: 'bold', color: CORES.texto },
  raridade: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
