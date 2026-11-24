import { View, Text, Image, StyleSheet } from 'react-native';

// Item individual da esteira da roleta ou da grade de conteúdo da caixa
export default function RouletteItem({ item, largura = 130, isDestaque = false }) {
  if (!item) return null;

  const corRaridade = item.rarity?.color || '#2B6CB0';
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
        { width: largura, borderBottomColor: corRaridade },
        isDestaque && styles.cardDestaque,
      ]}
    >
      <View style={styles.topoRaridade}>
        <View style={[styles.barraCor, { backgroundColor: corRaridade }]} />
      </View>

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

      <View style={styles.info}>
        <Text style={styles.textoArma} numberOfLines={1}>
          {arma}
        </Text>
        <Text style={styles.textoSkin} numberOfLines={1}>
          {skin || arma}
        </Text>
      </View>

      {/* Faixa inferior com a cor da raridade oficial do jogo */}
      <View style={[styles.faixaInferior, { backgroundColor: corRaridade }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 145,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomWidth: 4,
    justifyContent: 'space-between',
  },
  cardDestaque: {
    borderColor: '#F58220',
    borderWidth: 2,
    backgroundColor: '#0F172A',
  },
  topoRaridade: {
    height: 3,
    width: '100%',
  },
  barraCor: {
    height: 3,
    width: '100%',
  },
  containerImagem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  imagem: {
    width: '90%',
    height: 70,
  },
  semImagem: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 4,
  },
  textoSemImagem: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  textoArma: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  textoSkin: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  faixaInferior: {
    height: 4,
    width: '100%',
  },
});
