import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';

// Dados de fallback para demonstração caso a tela seja aberta diretamente sem parâmetros
const SKIN_DEMO = {
  id: 'skin_demo_awp_dragon_lore',
  name: 'AWP | Dragon Lore',
  weapon: 'AWP',
  category: 'Rifles',
  image: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/skins/skin_awp_dragon_lore.png',
  rarity: 'Covert',
  rarityColor: '#EB4B4B',
  min_float: 0.00,
  max_float: 0.70,
  stattrak: false,
  souvenir: true,
  description: 'Com acabamento personalizado em pintura de nós e uma serpente dragão cuspidora de fogo, é a arma mais cobiçada e lendária da história do Counter-Strike.',
};

/**
 * Tela de Inspeção de Skin estilo CS2
 *
 * Características:
 * - Leitura e higienização robusta de parâmetros via useLocalSearchParams().
 * - Card de visualização ampla da arma com grid e mirantes táticos.
 * - Contador digital StatTrak™ e insígnia Souvenir.
 * - Barra visual analítica de Float Range (0.00 - 1.00 com divisões FN, MW, FT, WW, BS).
 * - Ações táteis: Adicionar ao inventário local e retornar ao catálogo.
 */
export default function DetalhesScreen() {
  const params = useLocalSearchParams();
  const [salvando, setSalvando] = useState(false);
  const [adicionado, setAdicionado] = useState(false);

  // Parsing seguro dos parâmetros com fallback para dados de demonstração
  const parseJsonOuString = (valor) => {
    if (!valor) return null;
    if (typeof valor === 'object') return valor;
    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  };

  const id = params.id || SKIN_DEMO.id;
  const name = params.name || SKIN_DEMO.name;
  const image = params.image || SKIN_DEMO.image;
  const weaponRaw = parseJsonOuString(params.weapon) || (params.weapon ? { name: params.weapon } : { name: SKIN_DEMO.weapon });
  const categoryRaw = parseJsonOuString(params.category) || (params.category ? { name: params.category } : { name: SKIN_DEMO.category });
  const rarityRaw = parseJsonOuString(params.rarity);

  const weaponNome = weaponRaw?.name || (typeof weaponRaw === 'string' ? weaponRaw : SKIN_DEMO.weapon);
  const categoryNome = categoryRaw?.name || (typeof categoryRaw === 'string' ? categoryRaw : SKIN_DEMO.category);

  // Raridade e cor oficial
  let rarityNome = 'Mil-Spec Grade';
  let rarityColor = CORES.raridades['Mil-Spec Grade'] || '#4B69FF';

  if (typeof rarityRaw === 'object' && rarityRaw !== null) {
    rarityNome = rarityRaw.name || rarityNome;
    rarityColor = rarityRaw.color || CORES.raridades[rarityNome] || rarityColor;
  } else if (typeof rarityRaw === 'string') {
    rarityNome = rarityRaw;
    rarityColor = CORES.raridades[rarityNome] || rarityColor;
  } else if (params.rarity) {
    rarityNome = String(params.rarity);
    rarityColor = CORES.raridades[rarityNome] || rarityColor;
  }

  // Decomposição limpa do nome
  const partesNome = String(name).split('|');
  const armaDisplay = partesNome.length > 1 ? partesNome[0].trim() : weaponNome;
  const acabamentoDisplay = partesNome.length > 1 ? partesNome[1].trim() : name;

  // Floats
  const minFloat = params.min_float !== undefined && params.min_float !== null
    ? Number(params.min_float)
    : SKIN_DEMO.min_float;
  const maxFloat = params.max_float !== undefined && params.max_float !== null
    ? Number(params.max_float)
    : SKIN_DEMO.max_float;

  const temFloat = Number.isFinite(minFloat) && Number.isFinite(maxFloat);
  const minFloatSeguro = temFloat ? Math.max(0, Math.min(1, minFloat)) : 0.00;
  const maxFloatSeguro = temFloat ? Math.max(0, Math.min(1, maxFloat)) : 1.00;

  const ehStatTrak = params.stattrak === 'true' || params.stattrak === true;
  const ehSouvenir = params.souvenir === 'true' || params.souvenir === true;
  const descricao = params.description || SKIN_DEMO.description;

  // Adicionar ao inventário local do jogador
  const adicionarAoInventario = async () => {
    if (salvando || adicionado) return;
    setSalvando(true);

    try {
      const dadosAtuais = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
      const listaAtual = dadosAtuais ? JSON.parse(dadosAtuais) : [];

      const novoItem = {
        idInventario: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        id: String(id),
        name: String(name),
        image: String(image),
        weapon: { name: armaDisplay },
        category: { name: categoryNome },
        rarity: { name: rarityNome, color: rarityColor },
        min_float: minFloatSeguro,
        max_float: maxFloatSeguro,
        floatValue: Number((minFloatSeguro + (maxFloatSeguro - minFloatSeguro) * 0.35).toFixed(4)),
        wear: 'Field-Tested',
        stattrak: ehStatTrak,
        souvenir: ehSouvenir,
        timestamp: Date.now(),
        dataObtencao: new Date().toLocaleDateString('pt-BR'),
        origem: 'Inspeção do Catálogo',
      };

      const novaLista = [novoItem, ...listaAtual];
      await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(novaLista));

      setAdicionado(true);
      Alert.alert(
        'Item Armazenado!',
        `A skin "${name}" foi adicionada com sucesso ao seu inventário tático.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Erro ao Salvar', 'Não foi possível adicionar o item ao inventário.');
    } finally {
      setSalvando(false);
    }
  };

  const voltarCatalogo = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/catalogo');
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {/* Barra Superior Tática */}
      <View style={styles.barraSuperior}>
        <TouchableOpacity
          style={styles.botaoVoltar}
          activeOpacity={0.7}
          onPress={voltarCatalogo}
        >
          <MaterialIcons name="arrow-back" size={20} color={CORES.textoPrincipal} />
          <Text style={styles.textoBotaoVoltar}>VOLTAR</Text>
        </TouchableOpacity>

        <View style={styles.badgeModoInspecao}>
          <MaterialIcons name="search" size={14} color={CORES.laranjaCs} />
          <Text style={styles.textoModoInspecao}>INSPEÇÃO TÁTICA</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal de Visualização da Skin */}
        <View style={styles.cardVisualizacao}>
          {/* Mirantes e Mira nos Cantos */}
          <View style={styles.miraTopoEsq} />
          <View style={styles.miraTopoDir} />
          <View style={styles.miraBaseEsq} />
          <View style={styles.miraBaseDir} />

          {/* Badges de Edição Especial sobre o Card */}
          <View style={styles.linhaBadgesEspeciais}>
            {ehStatTrak && (
              <View style={styles.badgeStatTrak}>
                <Text style={styles.textoBadgeStatTrak}>StatTrak™</Text>
              </View>
            )}
            {ehSouvenir && (
              <View style={styles.badgeSouvenir}>
                <Text style={styles.textoBadgeSouvenir}>Souvenir</Text>
              </View>
            )}
          </View>

          {/* Imagem da Skin em Destaque */}
          <View style={styles.containerImagem}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.imagemArma}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.semImagem}>
                <MaterialIcons name="image-not-supported" size={48} color={CORES.textoMudo} />
                <Text style={styles.textoSemImagem}>VISUALIZAÇÃO INDISPONÍVEL</Text>
              </View>
            )}
          </View>

          {/* Display Digital StatTrak™ se aplicável */}
          {ehStatTrak && (
            <View style={styles.displayDigitalStatTrak}>
              <Text style={styles.rotuloStatTrakDigital}>CONFIRMED KILLS</Text>
              <Text style={styles.contadorStatTrakDigital}>000042</Text>
            </View>
          )}
        </View>

        {/* Título Principal e Raridade */}
        <View style={styles.cardIdentificacao}>
          <View style={styles.linhaRaridade}>
            <View
              style={[
                styles.badgeRaridade,
                { backgroundColor: `${rarityColor}20`, borderColor: rarityColor },
              ]}
            >
              <View style={[styles.pontoRaridade, { backgroundColor: rarityColor }]} />
              <Text style={[styles.textoRaridade, { color: rarityColor }]}>
                {rarityNome.toUpperCase()}
              </Text>
            </View>

            <View style={styles.badgeCategoria}>
              <Text style={styles.textoCategoria}>{categoryNome.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.tituloArma}>{armaDisplay.toUpperCase()}</Text>
          <Text style={styles.tituloAcabamento}>{acabamentoDisplay}</Text>
        </View>

        {/* Bloco de Análise de Float (Desgaste da Arma) */}
        <View style={styles.cardFloat}>
          <View style={styles.cabecalhoSecao}>
            <MaterialIcons name="tune" size={18} color={CORES.laranjaCs} />
            <Text style={styles.tituloSecao}>FAIXA DE FLOAT (DESGASTE)</Text>
          </View>

          <Text style={styles.descricaoFloat}>
            Variação permitida de desgaste para esta skin no motor do CS2.
          </Text>

          {/* Barra Visual dos 5 Níveis de Desgaste do CS2 */}
          <View style={styles.barraFloatContainer}>
            {/* FN: 0.00 - 0.07 */}
            <View style={[styles.segmentoFloat, { flex: 7, backgroundColor: '#10B981' }]} />
            {/* MW: 0.07 - 0.15 */}
            <View style={[styles.segmentoFloat, { flex: 8, backgroundColor: '#06B6D4' }]} />
            {/* FT: 0.15 - 0.38 */}
            <View style={[styles.segmentoFloat, { flex: 23, backgroundColor: '#F59E0B' }]} />
            {/* WW: 0.38 - 0.45 */}
            <View style={[styles.segmentoFloat, { flex: 7, backgroundColor: '#F97316' }]} />
            {/* BS: 0.45 - 1.00 */}
            <View style={[styles.segmentoFloat, { flex: 55, backgroundColor: '#EF4444' }]} />

            {/* Marcador de Range da Skin */}
            <View
              style={[
                styles.marcadorFloatRange,
                {
                  left: `${minFloatSeguro * 100}%`,
                  width: `${Math.max(4, (maxFloatSeguro - minFloatSeguro) * 100)}%`,
                },
              ]}
            />
          </View>

          {/* Rótulos de Desgaste */}
          <View style={styles.linhaRotulosFloat}>
            <Text style={styles.rotuloDesgaste}>FN (0.00)</Text>
            <Text style={styles.rotuloDesgaste}>MW (0.07)</Text>
            <Text style={styles.rotuloDesgaste}>FT (0.15)</Text>
            <Text style={styles.rotuloDesgaste}>WW (0.38)</Text>
            <Text style={styles.rotuloDesgaste}>BS (1.00)</Text>
          </View>

          {/* Valores Mínimo e Máximo Numéricos */}
          <View style={styles.gridValoresFloat}>
            <View style={styles.caixaValorFloat}>
              <Text style={styles.rotuloValorFloat}>FLOAT MÍNIMO</Text>
              <Text style={styles.numeroFloat}>{minFloatSeguro.toFixed(4)}</Text>
            </View>
            <View style={styles.divisorFloat} />
            <View style={styles.caixaValorFloat}>
              <Text style={styles.rotuloValorFloat}>FLOAT MÁXIMO</Text>
              <Text style={styles.numeroFloat}>{maxFloatSeguro.toFixed(4)}</Text>
            </View>
          </View>
        </View>

        {/* Bloco de Informações Técnicas e Lore */}
        <View style={styles.cardLore}>
          <View style={styles.cabecalhoSecao}>
            <MaterialIcons name="info-outline" size={18} color={CORES.azulClaro} />
            <Text style={styles.tituloSecao}>ESPECIFICAÇÕES TÁTICAS</Text>
          </View>

          <View style={styles.linhaInfoItem}>
            <Text style={styles.rotuloInfoItem}>Tipo de Armamento:</Text>
            <Text style={styles.valorInfoItem}>{armaDisplay}</Text>
          </View>

          <View style={styles.linhaInfoItem}>
            <Text style={styles.rotuloInfoItem}>Categoria Tática:</Text>
            <Text style={styles.valorInfoItem}>{categoryNome}</Text>
          </View>

          <View style={styles.linhaInfoItem}>
            <Text style={styles.rotuloInfoItem}>Padrão de Acabamento:</Text>
            <Text style={styles.valorInfoItem}>{acabamentoDisplay}</Text>
          </View>

          <View style={styles.divisorLore} />

          <Text style={styles.textoLore}>{descricao}</Text>
        </View>

        {/* Botões de Ação na Base */}
        <View style={styles.blocoAcoes}>
          <TouchableOpacity
            style={[
              styles.botaoAdicionarInventario,
              adicionado && styles.botaoAdicionado,
            ]}
            activeOpacity={0.7}
            onPress={adicionarAoInventario}
            disabled={salvando || adicionado}
          >
            <MaterialIcons
              name={adicionado ? 'check' : 'bookmark-border'}
              size={20}
              color={CORES.textoInvertido}
            />
            <Text style={styles.textoBotaoAdicionar}>
              {adicionado
                ? 'ITEM GUARDADO NO INVENTÁRIO'
                : 'ADICIONAR AO MEU INVENTÁRIO'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoVoltarCatalogo}
            activeOpacity={0.7}
            onPress={voltarCatalogo}
          >
            <MaterialIcons name="grid-view" size={18} color={CORES.textoPrincipal} />
            <Text style={styles.textoBotaoCatalogo}>EXPLORAR OUTRAS SKINS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
  },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACAMENTO.md,
    paddingVertical: ESPACAMENTO.sm,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    backgroundColor: CORES.fundoSuperficie,
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  textoBotaoVoltar: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeModoInspecao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    borderRadius: BORDAS.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  textoModoInspecao: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  conteudoScroll: {
    padding: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.xxl,
  },
  cardVisualizacao: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.xl,
    padding: ESPACAMENTO.md,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  miraTopoEsq: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: CORES.laranjaCs,
  },
  miraTopoDir: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: CORES.laranjaCs,
  },
  miraBaseEsq: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: CORES.laranjaCs,
  },
  miraBaseDir: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: CORES.laranjaCs,
  },
  linhaBadgesEspeciais: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: ESPACAMENTO.xs,
  },
  badgeStatTrak: {
    backgroundColor: '#CF6A32',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  textoBadgeStatTrak: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeSouvenir: {
    backgroundColor: CORES.ouro,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  textoBadgeSouvenir: {
    color: CORES.textoInvertido,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  containerImagem: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemArma: {
    width: '100%',
    height: '100%',
  },
  semImagem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  displayDigitalStatTrak: {
    backgroundColor: '#1A0C06',
    borderWidth: 1,
    borderColor: '#CF6A32',
    borderRadius: BORDAS.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: ESPACAMENTO.xs,
  },
  rotuloStatTrakDigital: {
    color: '#CF6A32',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  contadorStatTrakDigital: {
    color: '#FF8833',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  cardIdentificacao: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
  },
  linhaRaridade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ESPACAMENTO.sm,
  },
  badgeRaridade: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BORDAS.sm,
    gap: 6,
  },
  pontoRaridade: {
    width: 8,
    height: 8,
    borderRadius: BORDAS.pill,
  },
  textoRaridade: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeCategoria: {
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  textoCategoria: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  tituloArma: {
    color: CORES.textoMudo,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tituloAcabamento: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cardFloat: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ESPACAMENTO.xs,
  },
  tituloSecao: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  descricaoFloat: {
    color: CORES.textoMudo,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: ESPACAMENTO.md,
  },
  barraFloatContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: BORDAS.pill,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: CORES.fundoInput,
  },
  segmentoFloat: {
    height: '100%',
  },
  marcadorFloatRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
  },
  linhaRotulosFloat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: ESPACAMENTO.md,
  },
  rotuloDesgaste: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
  },
  gridValoresFloat: {
    flexDirection: 'row',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
  },
  caixaValorFloat: {
    flex: 1,
    alignItems: 'center',
  },
  divisorFloat: {
    width: 1,
    backgroundColor: CORES.bordaSuave,
  },
  rotuloValorFloat: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  numeroFloat: {
    color: CORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  cardLore: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
  },
  linhaInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  rotuloInfoItem: {
    color: CORES.textoMudo,
    fontSize: 12,
    fontWeight: '700',
  },
  valorInfoItem: {
    color: CORES.textoPrincipal,
    fontSize: 12,
    fontWeight: '800',
  },
  divisorLore: {
    height: 1,
    backgroundColor: CORES.bordaSuave,
    marginVertical: ESPACAMENTO.sm,
  },
  textoLore: {
    color: CORES.textoSecundario,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  blocoAcoes: {
    marginTop: ESPACAMENTO.lg,
    gap: ESPACAMENTO.sm,
  },
  botaoAdicionarInventario: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.lg,
    borderRadius: BORDAS.md,
    gap: 8,
  },
  botaoAdicionado: {
    backgroundColor: CORES.sucesso,
  },
  textoBotaoAdicionar: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  botaoVoltarCatalogo: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1.5,
    borderColor: CORES.bordaDestaque,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.lg,
    borderRadius: BORDAS.md,
    gap: 8,
  },
  textoBotaoCatalogo: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
