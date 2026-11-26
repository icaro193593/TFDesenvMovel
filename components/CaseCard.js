import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CORES } from '../constants/cs2Theme';

function limparTexto(texto) {
  return (texto || '').replace(/[\u2605\u2122]/g, '').trim();
}

export default function CaseCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onPress && onPress(item)}>
      <View style={styles.imagemBox}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.imagem} resizeMode="contain" />
        ) : (
          <Text style={styles.semImagem}>Sem imagem</Text>
        )}
      </View>
      <Text style={styles.nome} numberOfLines={2}>
        {limparTexto(item.name)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    padding: 10,
    margin: 6,
    alignItems: 'center',
  },
  imagemBox: {
    width: 84,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagem: { width: 84, height: 64 },
  semImagem: { color: CORES.textoSecundario, fontSize: 12 },
  nome: { color: CORES.texto, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
});
