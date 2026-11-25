import { StyleSheet, Text, View, Image } from 'react-native';

// Componente reutilizável para os cards de skin do minigame Higher or Lower.
// Apresenta a skin com imagem centralizada e área de preço que pode ser ocultada (???)
// ou revelada, sem exibir a raridade de nenhum dos itens para manter o desafio justo.
export default function HigherLowerCard({
  skin,
  etiqueta = 'SKIN BASE',
  ocultarPreco = false,
  destaqueEstado = null, // 'acerto' | 'erro' | null
}) {
  if (!skin) {
    return null;
  }

  const ehBase = etiqueta.includes('BASE');
  const corDestaque = ehBase ? '#1E4C8A' : '#F58220';

  // Define borda e fundo conforme o estado da rodada
  const bordaDestaque =
    destaqueEstado === 'acerto'
      ? styles.cardAcerto
      : destaqueEstado === 'erro'
      ? styles.cardErro
      : null;

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: corDestaque },
        bordaDestaque,
      ]}
    >
      {/* Linha superior: Etiqueta do Card (sem exibir raridade) */}
      <View style={styles.linhaTopo}>
        <Text style={[styles.textoEtiqueta, { color: corDestaque }]}>
          {etiqueta}
        </Text>
      </View>

      {/* Container da Imagem da Skin */}
      <View style={styles.containerImagem}>
        {skin.image ? (
          <Image
            source={{ uri: skin.image }}
            style={styles.imagem}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagem}>
            <Text style={styles.textoSemImagem}>CS2</Text>
          </View>
        )}
      </View>

      {/* Informações da Skin: Nome e Condição (Wear) */}
      <View style={styles.infoSkin}>
        <Text style={styles.nomeSkin} numberOfLines={2}>
          {skin.name}
        </Text>
        {skin.wear ? (
          <Text style={styles.wearSkin}>{skin.wear}</Text>
        ) : null}
      </View>

      {/* Área do Preço: Oculto (???) ou Revelado */}
      <View style={styles.areaPreco}>
        {ocultarPreco ? (
          <View style={styles.caixaPrecoOculto}>
            <Text style={styles.textoPrecoOculto}>???</Text>
          </View>
        ) : (
          <View style={styles.caixaPrecoVisivel}>
            <Text
              style={[
                styles.textoPrecoVisivel,
                destaqueEstado === 'erro' && styles.textoPrecoErro,
              ]}
            >
              {skin.precoFormatado || 'R$ --'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderLeftWidth: 5,
    borderRadius: 8,
    padding: 12,
  },
  cardAcerto: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  cardErro: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  textoEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  containerImagem: {
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
    height: 110,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagem: {
    width: 140,
    height: 95,
  },
  semImagem: {
    width: 140,
    height: 95,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: '#2B6CB0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSkin: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  nomeSkin: {
    color: '#1E3A5F',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  wearSkin: {
    color: '#2B6CB0',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  areaPreco: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaPrecoOculto: {
    backgroundColor: '#FFF3E8',
    borderWidth: 1,
    borderColor: '#F58220',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPrecoOculto: {
    color: '#C95F08',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  caixaPrecoVisivel: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPrecoVisivel: {
    color: '#059669',
    fontSize: 20,
    fontWeight: 'bold',
  },
  textoPrecoErro: {
    color: '#EF4444',
  },
});
