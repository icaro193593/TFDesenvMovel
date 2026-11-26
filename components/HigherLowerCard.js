import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { CORES } from '../constants/cs2Theme';

// Card simples para exibir uma skin no Higher or Lower (sem raridade)
export default function HigherLowerCard({ skin, ocultarPreco = false, destaqueEstado = null }) {
  if (!skin) return null;

  return (
    <View
      style={[
        styles.card,
        destaqueEstado === 'acerto' && styles.cardAcerto,
        destaqueEstado === 'erro' && styles.cardErro,
      ]}
    >
      {skin.image ? (
        <Image source={{ uri: skin.image }} style={styles.imagem} resizeMode="contain" />
      ) : (
        <Text style={styles.semImagem}>Sem imagem</Text>
      )}

      <Text style={styles.nome} numberOfLines={2}>
        {skin.name}
      </Text>

      <Text
        style={[
          styles.preco,
          ocultarPreco && styles.precoOculto,
          !ocultarPreco && destaqueEstado === 'acerto' && styles.precoAcerto,
          !ocultarPreco && destaqueEstado === 'erro' && styles.precoErro,
        ]}
      >
        {ocultarPreco ? '???' : skin.precoFormatado || 'R$ --'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cardAcerto: {
    borderColor: CORES.sucesso,
    borderWidth: 2,
  },
  cardErro: {
    borderColor: CORES.erro,
    borderWidth: 2,
  },
  imagem: {
    width: '100%',
    height: 92,
    marginBottom: 8,
  },
  semImagem: {
    fontSize: 13,
    color: CORES.textoSecundario,
    marginVertical: 36,
  },
  nome: {
    fontSize: 15,
    fontWeight: 'bold',
    color: CORES.texto,
    textAlign: 'center',
    marginBottom: 6,
  },
  preco: {
    fontSize: 19,
    fontWeight: 'bold',
    color: CORES.azulPrincipal,
  },
  precoOculto: { color: CORES.aviso },
  precoAcerto: { color: CORES.sucesso },
  precoErro: { color: CORES.erro },
});
