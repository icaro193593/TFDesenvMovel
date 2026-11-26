import { View, Text, Image, StyleSheet } from 'react-native';

export default function CartaoSkin({ item }) {

  const corRaridade = item.rarity?.color || '#2B6CB0';
  const nomeRaridade = item.rarity?.name || 'Sem raridade';

  const categoria = item.category?.name || '';
  const arma = item.weapon?.name || '';
  const categoriaArma =
    categoria && arma ? `${categoria} - ${arma}` : categoria || arma || 'CS2 Item';

  const temFloat =
    item.min_float !== null &&
    item.min_float !== undefined &&
    item.max_float !== null &&
    item.max_float !== undefined;

  const textoFloat = temFloat
    ? `Float: ${item.min_float.toFixed(2)} - ${item.max_float.toFixed(2)}`
    : 'Sem faixa de float';

  return (
    <View style={[styles.card, { borderLeftColor: corRaridade }]}>
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

      <View style={styles.conteudo}>
        <Text style={styles.nomeSkin} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.categoriaArma} numberOfLines={1}>
          {categoriaArma}
        </Text>

        <Text style={styles.textoRaridade} numberOfLines={1}>
          Raridade: {nomeRaridade}
        </Text>

        <Text style={styles.textoFloat}>{textoFloat}</Text>

        {(item.stattrak === true || item.souvenir === true) && (
          <Text style={styles.linhaExtras}>
            {item.stattrak === true && (
              <Text style={styles.textoStatTrak}>StatTrak™</Text>
            )}
            {item.stattrak === true && item.souvenir === true ? '  ' : ''}
            {item.souvenir === true && (
              <Text style={styles.textoSouvenir}>Souvenir</Text>
            )}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  imagem: {
    width: 80,
    height: 60,
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
  },
  semImagem: {
    width: 80,
    height: 60,
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  textoSemImagem: {
    color: '#2B6CB0',
    fontSize: 11,
    textAlign: 'center',
  },
  conteudo: {
    flex: 1,
    marginLeft: 12,
  },
  nomeSkin: {
    color: '#1E3A5F',
    fontSize: 15,
    fontWeight: 'bold',
  },
  categoriaArma: {
    color: '#2B6CB0',
    fontSize: 12,
    marginTop: 2,
  },
  textoRaridade: {
    color: '#1E4C8A',
    fontSize: 12,
    marginTop: 2,
  },
  textoFloat: {
    color: '#2B6CB0',
    fontSize: 12,
    marginTop: 2,
  },
  linhaExtras: {
    marginTop: 3,
    fontSize: 12,
  },
  textoStatTrak: {
    color: '#C95F08',
    fontWeight: 'bold',
  },
  textoSouvenir: {
    color: '#1E4C8A',
    fontWeight: 'bold',
  },
});
