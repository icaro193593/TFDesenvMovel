import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

export default function InicioScreen() {
  const modulos = [
    {
      id: 'catalogo',
      titulo: 'Catálogo de Skins',
      descricao: 'Armas, facas, luvas e faixas de float',
      tag: 'DATABASE',
      icone: 'grid-view',
      corAcento: CORES.azulClaro,
      rota: '/catalogo',
    },
    {
      id: 'caixas',
      titulo: 'Simulador de Caixas',
      descricao: 'Roleta animada com odds oficiais da Valve',
      tag: 'SIMULADOR',
      icone: 'card-giftcard',
      corAcento: CORES.ouro,
      rota: '/caixas',
    },
    {
      id: 'contrato',
      titulo: 'Contrato de Trocas',
      descricao: 'Combine 10 skins e tente um upgrade tático',
      tag: 'TRADE-UP',
      icone: 'swap-horiz',
      corAcento: '#C084FC',
      rota: '/contrato',
    },
    {
      id: 'inventario',
      titulo: 'Meu Inventário',
      descricao: 'Coleção pessoal e valor total de mercado',
      tag: 'ARSENAL',
      icone: 'inventory',
      corAcento: CORES.sucesso,
      rota: '/inventario',
    },
    {
      id: 'higherlower',
      titulo: 'Higher or Lower',
      descricao: 'Minigame desafiador de cotações do CS2',
      tag: 'MINIGAME',
      icone: 'trending-up',
      corAcento: CORES.laranjaBrilhante,
      rota: '/higherlower',
    },
    {
      id: 'configuracoes',
      titulo: 'Configurações',
      descricao: 'Moeda ativa (BRL, USD, EUR) e preferências',
      tag: 'SISTEMA',
      icone: 'settings',
      corAcento: CORES.textoSecundario,
      rota: '/configuracoes',
    },
  ];

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD TÁTICO CS2 */}
        <View style={styles.heroCard}>
          {/* Header do Hero com Status Tático */}
          <View style={styles.heroTopo}>
            <View style={styles.tagStatus}>
              <View style={styles.pontoStatus} />
              <Text style={styles.textoTagStatus}>CS2 TACTICAL HUB • ONLINE</Text>
            </View>
            <View style={styles.badgeVersao}>
              <Text style={styles.textoBadgeVersao}>v1.0</Text>
            </View>
          </View>

          {/* Título e Descrição Principal */}
          <Text style={styles.heroTitulo}>CS2 SkinWiki</Text>
          <Text style={styles.heroDescricao}>
            Central tática de inteligência do Counter-Strike 2. Explore o arsenal
            completo de skins, simule aberturas de caixas com física real e
            monitore cotações de mercado.
          </Text>

          {/* Botão de Destaque Primário */}
          <TouchableOpacity
            style={styles.heroBotaoPrincipal}
            activeOpacity={0.8}
            onPress={() => router.push('/catalogo')}
          >
            <View style={styles.heroBotaoConteudo}>
              <MaterialIcons name="grid-view" size={20} color={CORES.textoInvertido} />
              <Text style={styles.heroTextoBotaoPrincipal}>EXPLORAR CATÁLOGO COMPLETO</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={18} color={CORES.textoInvertido} />
          </TouchableOpacity>
        </View>

        {/* BARRA DE MÉTRICAS VISUAIS / TELEMETRIA */}
        <View style={styles.containerMetricas}>
          <View style={styles.cardMetrica}>
            <Text style={styles.valorMetrica}>1.800+</Text>
            <Text style={styles.rotuloMetrica}>Skins Ativas</Text>
          </View>
          <View style={styles.divisorMetrica} />
          <View style={styles.cardMetrica}>
            <Text style={styles.valorMetrica}>40+</Text>
            <Text style={styles.rotuloMetrica}>Caixas CS2</Text>
          </View>
          <View style={styles.divisorMetrica} />
          <View style={styles.cardMetrica}>
            <Text style={[styles.valorMetrica, { color: CORES.sucesso }]}>TEMPO REAL</Text>
            <Text style={styles.rotuloMetrica}>Cotações Live</Text>
          </View>
        </View>

        {/* CABEÇALHO DA SEÇÃO DE MÓDULOS */}
        <View style={styles.cabecalhoSecao}>
          <View style={styles.linhaIndicadorSecao} />
          <View style={styles.textosSecao}>
            <Text style={styles.tituloSecao}>MÓDULOS OPERACIONAIS</Text>
            <Text style={styles.subtituloSecao}>
              Selecione uma ferramenta tática para iniciar
            </Text>
          </View>
        </View>

        {/* GRADE DE CARTÕES DE ACESSO RÁPIDO (HUB TÁTICO) */}
        <View style={styles.gradeModulos}>
          {modulos.map((modulo) => (
            <TouchableOpacity
              key={modulo.id}
              style={styles.cardModulo}
              activeOpacity={0.7}
              onPress={() => router.push(modulo.rota)}
            >
              <View style={styles.moduloTopo}>
                <View
                  style={[
                    styles.iconeContainer,
                    {
                      borderColor: modulo.corAcento,
                      backgroundColor: 'rgba(37, 53, 77, 0.45)',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={modulo.icone}
                    size={22}
                    color={modulo.corAcento}
                  />
                </View>
                <View style={styles.tagModulo}>
                  <Text style={styles.textoTagModulo}>{modulo.tag}</Text>
                </View>
              </View>

              <View style={styles.moduloCorpo}>
                <Text style={styles.tituloModulo} numberOfLines={1}>
                  {modulo.titulo}
                </Text>
                <Text style={styles.descricaoModulo} numberOfLines={2}>
                  {modulo.descricao}
                </Text>
              </View>

              <View style={styles.moduloRodape}>
                <Text style={[styles.textoAcessar, { color: modulo.corAcento }]}>
                  Acessar
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={modulo.corAcento}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* RODAPÉ TÁTICO */}
        <View style={styles.rodape}>
          <View style={styles.linhaDivisoria} />
          <Text style={styles.textoRodape}>
            CS2 SKINWIKI • SISTEMA TÁTICO OPERACIONAL
          </Text>
          <Text style={styles.textoCreditos}>
            Dados via ByMykel CSGO-API • Cotações via PriceEmpire
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
  },
  container: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
  },
  conteudo: {
    padding: ESPACAMENTO.lg,
    paddingBottom: ESPACAMENTO.xxl + 8,
  },
  // HERO CARD
  heroCard: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.lg,
    marginBottom: ESPACAMENTO.lg,
  },
  heroTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  tagStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDAS.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  pontoStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CORES.sucesso,
    marginRight: 6,
  },
  textoTagStatus: {
    color: CORES.sucesso,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeVersao: {
    backgroundColor: CORES.fundoSuperficie,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDAS.sm,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  textoBadgeVersao: {
    color: CORES.textoSecundario,
    fontSize: 10,
    fontWeight: '600',
  },
  heroTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: ESPACAMENTO.xs,
  },
  heroDescricao: {
    color: CORES.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: ESPACAMENTO.lg,
  },
  heroBotaoPrincipal: {
    backgroundColor: CORES.laranjaCs,
    borderRadius: BORDAS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBotaoConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTextoBotaoPrincipal: {
    color: CORES.textoInvertido,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // MÉTRICAS VISUAIS
  containerMetricas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.sm,
    marginBottom: ESPACAMENTO.xl,
  },
  cardMetrica: {
    flex: 1,
    alignItems: 'center',
  },
  valorMetrica: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rotuloMetrica: {
    color: CORES.textoSecundario,
    fontSize: 11,
    marginTop: 2,
  },
  divisorMetrica: {
    width: 1,
    height: 24,
    backgroundColor: CORES.borda,
  },
  // CABEÇALHO DA SEÇÃO
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  linhaIndicadorSecao: {
    width: 4,
    height: 28,
    backgroundColor: CORES.laranjaCs,
    borderRadius: 2,
    marginRight: 10,
  },
  textosSecao: {
    flex: 1,
  },
  tituloSecao: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtituloSecao: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 1,
  },
  // GRADE DE MÓDULOS
  gradeModulos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardModulo: {
    width: '48%',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    justifyContent: 'space-between',
    minHeight: 146,
  },
  moduloTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconeContainer: {
    width: 38,
    height: 38,
    borderRadius: BORDAS.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagModulo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDAS.sm,
  },
  textoTagModulo: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  moduloCorpo: {
    marginVertical: 4,
  },
  tituloModulo: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  descricaoModulo: {
    color: CORES.textoSecundario,
    fontSize: 11,
    lineHeight: 15,
  },
  moduloRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  textoAcessar: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  // RODAPÉ
  rodape: {
    alignItems: 'center',
    marginTop: ESPACAMENTO.xl,
    paddingTop: ESPACAMENTO.md,
  },
  linhaDivisoria: {
    width: '100%',
    height: 1,
    backgroundColor: CORES.bordaSuave,
    marginBottom: ESPACAMENTO.md,
  },
  textoRodape: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  textoCreditos: {
    color: CORES.textoMudo,
    fontSize: 10,
  },
});
