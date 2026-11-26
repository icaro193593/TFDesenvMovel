import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

/**
 * Componente HigherLowerCard
 * Card tático para confronto no minigame Higher or Lower.
 *
 * Diretrizes Impeccable Design:
 * - Tema escuro tático CS2 (#0B0E14, #131924, #182232).
 * - Borda uniforme em todo o contorno (PROIBIDO borderLeftWidth).
 * - NUNCA exibe a raridade das skins para preservar o desafio justo.
 * - Imagem de arma com moldura tática em alto contraste.
 * - Preço heroico revelado vs interrogação misteriosa com acabamento CS2.
 */
export default function HigherLowerCard({
  skin,
  etiqueta = 'SKIN BASE',
  ocultarPreco = false,
  destaqueEstado = null, // 'acerto' | 'erro' | null
}) {
  if (!skin) {
    return null;
  }

  const ehBase = String(etiqueta).toUpperCase().includes('BASE');
  const corAcento = ehBase ? CORES.azulClaro : CORES.laranjaCs;
  const fundoBadge = ehBase ? 'rgba(30, 76, 138, 0.28)' : 'rgba(245, 130, 32, 0.20)';

  // Decomposição limpa do nome da skin (ex: "AK-47 | Redline" -> Arma: "AK-47", Acabamento: "Redline")
  const partesNome = (skin.name || '').split('|');
  const armaNome = partesNome.length > 1 ? partesNome[0].trim() : (skin.weapon || 'Arma');
  const acabamentoNome = partesNome.length > 1 ? partesNome[1].trim() : skin.name;

  // Estado dinâmico de feedback
  const estiloCardDestaque =
    destaqueEstado === 'acerto'
      ? styles.cardAcerto
      : destaqueEstado === 'erro'
      ? styles.cardErro
      : null;

  return (
    <View style={[styles.card, estiloCardDestaque]}>
      {/* Topo do Card: Badge tático e status */}
      <View style={styles.linhaTopo}>
        <View style={[styles.badgeEtiqueta, { backgroundColor: fundoBadge, borderColor: corAcento }]}>
          <MaterialIcons
            name={ehBase ? 'shield' : 'help-outline'}
            size={13}
            color={corAcento}
            style={styles.iconeEtiqueta}
          />
          <Text style={[styles.textoEtiqueta, { color: corAcento }]}>
            {etiqueta.toUpperCase()}
          </Text>
        </View>

        {skin.wear && (
          <View style={styles.badgeWear}>
            <Text style={styles.textoWear}>{skin.wear}</Text>
          </View>
        )}
      </View>

      {/* Moldura Tática da Imagem da Skin */}
      <View style={styles.molduraImagem}>
        <View style={styles.gridFundo}>
          <View style={styles.miraTopoEsquerda} />
          <View style={styles.miraTopoDireita} />
          <View style={styles.miraBaseEsquerda} />
          <View style={styles.miraBaseDireita} />
        </View>

        {skin.image ? (
          <Image
            source={{ uri: skin.image }}
            style={styles.imagemSkin}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.containerSemImagem}>
            <MaterialIcons name="image-not-supported" size={32} color={CORES.textoMudo} />
            <Text style={styles.textoSemImagem}>CS2 TACTICAL ASSET</Text>
          </View>
        )}
      </View>

      {/* Identificação da Arma e Skin (Sem exibir raridade!) */}
      <View style={styles.blocoInfo}>
        <Text style={styles.textoArma} numberOfLines={1}>
          {armaNome.toUpperCase()}
        </Text>
        <Text style={styles.textoAcabamento} numberOfLines={1}>
          {acabamentoNome}
        </Text>
      </View>

      {/* Área Heroica de Preço: Revelado vs Misterioso */}
      <View style={styles.areaPreco}>
        {ocultarPreco ? (
          <View style={styles.caixaPrecoOculto}>
            <View style={styles.linhaMisteriosa}>
              <MaterialIcons name="lock" size={18} color={CORES.laranjaCs} />
              <Text style={styles.textoPrecoOculto}>???</Text>
            </View>
            <Text style={styles.subtextoOculto}>PREÇO OCULTO • FAÇA SEU PALPITE</Text>
          </View>
        ) : (
          <View
            style={[
              styles.caixaPrecoVisivel,
              destaqueEstado === 'acerto' && styles.caixaPrecoAcerto,
              destaqueEstado === 'erro' && styles.caixaPrecoErro,
            ]}
          >
            <Text style={styles.subtextoPreco}>VALOR ESTIMADO DE MERCADO</Text>
            <Text
              style={[
                styles.textoPrecoHeroico,
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
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginVertical: ESPACAMENTO.xs,
  },
  cardAcerto: {
    borderColor: CORES.sucesso,
    backgroundColor: '#122620',
  },
  cardErro: {
    borderColor: CORES.erro,
    backgroundColor: '#261416',
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACAMENTO.sm,
  },
  badgeEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  iconeEtiqueta: {
    marginRight: 4,
  },
  textoEtiqueta: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeWear: {
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  textoWear: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  molduraImagem: {
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    height: 124,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridFundo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  miraTopoEsquerda: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: CORES.bordaDestaque,
  },
  miraTopoDireita: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: CORES.bordaDestaque,
  },
  miraBaseEsquerda: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: CORES.bordaDestaque,
  },
  miraBaseDireita: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: CORES.bordaDestaque,
  },
  imagemSkin: {
    width: '92%',
    height: 105,
  },
  containerSemImagem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  blocoInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: ESPACAMENTO.sm,
    paddingHorizontal: ESPACAMENTO.xs,
  },
  textoArma: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  textoAcabamento: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: 'center',
  },
  areaPreco: {
    marginTop: ESPACAMENTO.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaPrecoOculto: {
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
    borderWidth: 1.5,
    borderColor: CORES.laranjaCs,
    borderRadius: BORDAS.md,
    paddingVertical: 8,
    paddingHorizontal: ESPACAMENTO.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaMisteriosa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoPrecoOculto: {
    color: CORES.laranjaBrilhante,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtextoOculto: {
    color: CORES.laranjaCs,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  caixaPrecoVisivel: {
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    paddingVertical: 8,
    paddingHorizontal: ESPACAMENTO.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaPrecoAcerto: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: CORES.sucesso,
  },
  caixaPrecoErro: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: CORES.erro,
  },
  subtextoPreco: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  textoPrecoHeroico: {
    color: CORES.sucesso,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoPrecoErro: {
    color: CORES.erro,
  },
});
