import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Card em grade de alta precisão para exibição de uma caixa do CS2
export default function CaseCard({ item, onPress }) {
  const totalSkins = item.contains ? item.contains.length : 0;
  const temRaras = item.contains_rare && item.contains_rare.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.82}
      onPress={() => onPress && onPress(item)}
    >
      {/* Container da imagem sobre fundo escuro tático */}
      <View style={styles.containerImagem}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.imagem}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.semImagem}>
            <MaterialIcons name="inventory-2" size={32} color={CORES.textoMudo} />
            <Text style={styles.textoSemImagem}>Sem imagem</Text>
          </View>
        )}
      </View>

      {/* Conteúdo informativo do card */}
      <View style={styles.conteudo}>
        <Text style={styles.nomeCaixa} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Linha de Badges refinadas */}
        <View style={styles.linhaBadge}>
          <View style={styles.badgeSkins}>
            <MaterialIcons name="layers" size={12} color={CORES.azulClaro} />
            <Text style={styles.textoBadgeSkins}>{totalSkins} skins</Text>
          </View>

          {temRaras && (
            <View style={styles.badgeRaras}>
              <Text style={styles.textoBadgeRaras}>★ Raras</Text>
            </View>
          )}
        </View>

        {/* Botão de ação estilizado */}
        <View style={styles.botaoAbrir}>
          <Text style={styles.textoBotaoAbrir}>Abrir Caixa</Text>
          <MaterialIcons name="chevron-right" size={16} color={CORES.textoInvertido} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 236,
  },
  containerImagem: {
    width: '100%',
    height: 112,
    backgroundColor: CORES.fundoInput,
    borderRadius: BORDAS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.sm,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
  },
  imagem: {
    width: 104,
    height: 96,
  },
  semImagem: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '600',
  },
  conteudo: {
    width: '100%',
    alignItems: 'center',
  },
  nomeCaixa: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: 36,
    lineHeight: 18,
  },
  linhaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: ESPACAMENTO.xs,
    gap: 6,
  },
  badgeSkins: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.borda,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
    gap: 4,
  },
  textoBadgeSkins: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeRaras: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  textoBadgeRaras: {
    color: CORES.ouro,
    fontSize: 11,
    fontWeight: 'bold',
  },
  botaoAbrir: {
    marginTop: ESPACAMENTO.md,
    backgroundColor: CORES.laranjaCs,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDAS.sm,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  textoBotaoAbrir: {
    color: CORES.textoInvertido,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
