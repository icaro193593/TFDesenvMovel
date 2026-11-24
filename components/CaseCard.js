import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

// Card customizado para exibição de uma caixa do CS2 na lista
export default function CaseCard({ item, onPress }) {
  const totalSkins = item.contains ? item.contains.length : 0;
  const temRaras = item.contains_rare && item.contains_rare.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress && onPress(item)}
    >
      <View style={styles.containerImagem}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.imagem}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagem}>
            <Text style={styles.textoSemImagem}>Sem imagem</Text>
          </View>
        )}
      </View>

      <View style={styles.conteudo}>
        <Text style={styles.nomeCaixa} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.linhaBadge}>
          <Text style={styles.badgeSkins}>
            {totalSkins} skins
          </Text>
          {temRaras && (
            <Text style={styles.badgeRaras}>
              ★ Raras
            </Text>
          )}
        </View>

        <View style={styles.botaoAbrir}>
          <Text style={styles.textoBotaoAbrir}>Abrir Caixa ›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    padding: 12,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 220,
  },
  containerImagem: {
    width: '100%',
    height: 110,
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagem: {
    width: 100,
    height: 95,
  },
  semImagem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: '#2B6CB0',
    fontSize: 12,
  },
  conteudo: {
    width: '100%',
    alignItems: 'center',
  },
  nomeCaixa: {
    color: '#1E3A5F',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: 36,
  },
  linhaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  badgeSkins: {
    backgroundColor: '#EBF4FC',
    color: '#1E4C8A',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeRaras: {
    backgroundColor: '#FFF4E5',
    color: '#C95F08',
    fontSize: 11,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  botaoAbrir: {
    marginTop: 10,
    backgroundColor: '#F58220',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  textoBotaoAbrir: {
    color: '#0F1923',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
