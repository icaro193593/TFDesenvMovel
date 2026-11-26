import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HigherLowerCard from '../components/HigherLowerCard';
import useHigherOrLower from '../hooks/useHigherOrLower';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Chave para persistência permanente do recorde do jogador no dispositivo
const STORAGE_KEY_RECORDE_HIGHER_LOWER = '@higher_lower_recorde_historico';

/**
 * Tela HigherLowerScreen - Arena de Duelo de Preços CS2
 *
 * Princípios de Impeccable Design:
 * - Tema tático escuro (#0B0E14) em camadas (#131924, #182232).
 * - Sem faixas unilaterais.
 * - Brasão divisor "VS" com linhas táticas de mira.
 * - Botões de ação rápida e responsivos com feedback de pressão.
 * - Persistência do recorde pessoal via AsyncStorage.
 * - Conformidade com TUTORIAL_REACT_NATIVE.md (Pure JavaScript).
 */
export default function HigherLowerScreen() {
  const {
    skinBase,
    skinComparada,
    pontuacao,
    recorde: recordeSessao,
    isLoading,
    error,
    fase,
    resultadoRodada,
    mostrarPrecoComparada,
    botoesDesabilitados,
    palpitar,
    jogarNovamente,
    tentarNovamente,
  } = useHigherOrLower();

  const [recordePersistido, setRecordePersistido] = useState(0);

  // Carrega o recorde histórico persistido no dispositivo
  useEffect(() => {
    const carregarRecordeSalvo = async () => {
      try {
        const valorSalvo = await AsyncStorage.getItem(STORAGE_KEY_RECORDE_HIGHER_LOWER);
        if (valorSalvo !== null) {
          const num = parseInt(valorSalvo, 10);
          if (!isNaN(num)) {
            setRecordePersistido(num);
          }
        }
      } catch (err) {
        // Fallback silencioso
      }
    };
    carregarRecordeSalvo();
  }, []);

  // Atualiza e persiste o recorde histórico sempre que a pontuação superar o recorde anterior
  useEffect(() => {
    const maiorRecorde = Math.max(recordeSessao, pontuacao);
    if (maiorRecorde > recordePersistido) {
      setRecordePersistido(maiorRecorde);
      AsyncStorage.setItem(STORAGE_KEY_RECORDE_HIGHER_LOWER, String(maiorRecorde)).catch(() => {});
    }
  }, [recordeSessao, pontuacao, recordePersistido]);

  const recordeExibido = Math.max(recordePersistido, recordeSessao, pontuacao);

  // 1. Estado de Carregamento inicial da API / preços
  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.telaCarregamento}>
        <View style={styles.caixaSpinner}>
          <ActivityIndicator size="large" color={CORES.laranjaCs} />
          <Text style={styles.textoCarregando}>SINCRONIZANDO ARENA CS2...</Text>
          <Text style={styles.subtextoCarregando}>
            Consultando cotações de mercado da comunidade
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Estado de Erro de conexão ou ausência de dados
  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.telaCarregamento}>
        <View style={styles.caixaErro}>
          <MaterialIcons name="cloud-off" size={48} color={CORES.erro} />
          <Text style={styles.tituloErro}>FALHA DE COMUNICAÇÃO</Text>
          <Text style={styles.textoErro}>{error}</Text>
          <TouchableOpacity
            style={styles.botaoTentarNovamente}
            activeOpacity={0.7}
            onPress={tentarNovamente}
          >
            <MaterialIcons name="refresh" size={18} color={CORES.textoInvertido} />
            <Text style={styles.textoBotaoTentarNovamente}>RECONECTAR ARENA</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Painel Tático de Pontuação e Recorde */}
        <View style={styles.painelPlacar}>
          <View style={styles.cardStreak}>
            <View style={styles.linhaRotuloPlacar}>
              <MaterialIcons name="flash-on" size={14} color={CORES.azulClaro} />
              <Text style={styles.rotuloStreak}>SEQUÊNCIA ATUAL</Text>
            </View>
            <Text style={styles.valorStreak}>{pontuacao}</Text>
            <Text style={styles.subtextoStreak}>VITÓRIAS SEGUIDAS</Text>
          </View>

          <View style={styles.divisorPlacar} />

          <View style={styles.cardRecorde}>
            <View style={styles.linhaRotuloPlacar}>
              <MaterialIcons name="emoji-events" size={14} color={CORES.ouro} />
              <Text style={styles.rotuloRecorde}>RECORDE PESSOAL</Text>
            </View>
            <Text style={styles.valorRecorde}>{recordeExibido}</Text>
            <Text style={styles.subtextoRecorde}>MELHOR MARCA</Text>
          </View>
        </View>

        {/* Banners Táticos de Feedback Durante a Revelação */}
        {resultadoRodada === 'acerto' && (
          <View style={styles.bannerAcerto}>
            <MaterialIcons name="check-circle" size={22} color={CORES.sucesso} />
            <View style={styles.colunaTextoBanner}>
              <Text style={styles.tituloBannerAcerto}>ALVO CONFIRMADO!</Text>
              <Text style={styles.subtextoBannerAcerto}>+1 Ponto para a sequência</Text>
            </View>
          </View>
        )}

        {resultadoRodada === 'erro' && (
          <View style={styles.bannerErro}>
            <MaterialIcons name="highlight-off" size={22} color={CORES.erro} />
            <View style={styles.colunaTextoBanner}>
              <Text style={styles.tituloBannerErro}>PREVISÃO INCORRETA!</Text>
              <Text style={styles.subtextoBannerErro}>Revelando cotação de mercado...</Text>
            </View>
          </View>
        )}

        {/* Card 1: Skin Base (preço sempre revelado) */}
        <HigherLowerCard
          skin={skinBase}
          etiqueta="SKIN DE REFERÊNCIA"
          ocultarPreco={false}
          destaqueEstado={null}
        />

        {/* Divisor "VS" com Brasão Tático e Linhas de Mira */}
        <View style={styles.containerVs}>
          <View style={styles.linhaMiraVs} />
          <View style={styles.brasaoVs}>
            <View style={styles.anelExternoVs}>
              <Text style={styles.textoVs}>VS</Text>
            </View>
          </View>
          <View style={styles.linhaMiraVs} />
        </View>

        {/* Card 2: Skin Comparada (preço oculto durante o palpite) */}
        <HigherLowerCard
          skin={skinComparada}
          etiqueta="MAIS CARA OU MAIS BARATA?"
          ocultarPreco={!mostrarPrecoComparada}
          destaqueEstado={resultadoRodada}
        />

        {/* Bloco de Botões de Ação Tática */}
        <View style={styles.linhaBotoesAcao}>
          {/* Botão MAIOR / MAIS CARA */}
          <TouchableOpacity
            style={[
              styles.botaoPalpite,
              styles.botaoMaior,
              botoesDesabilitados && styles.botaoDesabilitado,
            ]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('maior')}
          >
            <View style={styles.iconeBotaoContainer}>
              <MaterialIcons name="arrow-upward" size={22} color={CORES.textoInvertido} />
            </View>
            <View style={styles.colunaTextoBotao}>
              <Text style={styles.textoBotaoPrincipal}>MAIS CARA</Text>
              <Text style={styles.subtextoBotaoMaior}>▲ MAIOR VALOR</Text>
            </View>
          </TouchableOpacity>

          {/* Botão MENOR / MAIS BARATA */}
          <TouchableOpacity
            style={[
              styles.botaoPalpite,
              styles.botaoMenor,
              botoesDesabilitados && styles.botaoDesabilitado,
            ]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('menor')}
          >
            <View style={styles.iconeBotaoContainerMenor}>
              <MaterialIcons name="arrow-downward" size={22} color={CORES.azulClaro} />
            </View>
            <View style={styles.colunaTextoBotao}>
              <Text style={styles.textoBotaoMenor}>MAIS BARATA</Text>
              <Text style={styles.subtextoBotaoMenor}>▼ MENOR VALOR</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Tático de Game Over */}
      <Modal
        visible={fase === 'gameover'}
        transparent
        animationType="fade"
        onRequestClose={jogarNovamente}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Brasão de Cabeçalho do Fim de Jogo */}
            <View style={styles.topoModal}>
              <View style={styles.iconeModalFim}>
                <MaterialIcons name="military-tech" size={32} color={CORES.erro} />
              </View>
              <Text style={styles.tituloModal}>FIM DE JOGO</Text>
              <Text style={styles.subtituloModal}>CONFRONTO TÁTICO ENCERRADO</Text>
            </View>

            {/* Resumo do Confronto de Cotações */}
            <View style={styles.resumoConfronto}>
              <Text style={styles.rotuloResumo}>COTAÇÕES FINAIS REVELADAS</Text>

              {/* Skin 1 */}
              <View style={styles.itemResumo}>
                <View style={styles.infoResumoSkin}>
                  <Text style={styles.nomeResumo} numberOfLines={1}>
                    {skinBase?.name}
                  </Text>
                  <Text style={styles.tipoResumo}>REFERÊNCIA</Text>
                </View>
                <Text style={styles.precoResumo}>{skinBase?.precoFormatado}</Text>
              </View>

              <View style={styles.divisorResumo} />

              {/* Skin 2 */}
              <View style={styles.itemResumo}>
                <View style={styles.infoResumoSkin}>
                  <Text style={styles.nomeResumo} numberOfLines={1}>
                    {skinComparada?.name}
                  </Text>
                  <Text style={styles.tipoResumo}>PALPITE</Text>
                </View>
                <Text style={styles.precoResumoDestaque}>
                  {skinComparada?.precoFormatado}
                </Text>
              </View>
            </View>

            {/* Placar Final e Recorde */}
            <View style={styles.gradeEstatisticasModal}>
              <View style={styles.caixaEstatisticaModal}>
                <Text style={styles.rotuloEstatisticaModal}>PONTUAÇÃO</Text>
                <Text style={styles.valorEstatisticaModal}>{pontuacao}</Text>
              </View>

              <View style={styles.caixaEstatisticaModal}>
                <Text style={styles.rotuloEstatisticaRecorde}>RECORDE</Text>
                <Text style={styles.valorEstatisticaRecorde}>{recordeExibido}</Text>
              </View>
            </View>

            {pontuacao >= recordeExibido && pontuacao > 0 && (
              <View style={styles.badgeNovoRecorde}>
                <MaterialIcons name="stars" size={16} color={CORES.ouro} />
                <Text style={styles.textoNovoRecorde}>NOVO RECORDE PESSOAL ATINGIDO!</Text>
              </View>
            )}

            {/* Botão de Reinício */}
            <TouchableOpacity
              style={styles.botaoReiniciar}
              activeOpacity={0.8}
              onPress={jogarNovamente}
            >
              <MaterialIcons name="replay" size={20} color={CORES.textoInvertido} />
              <Text style={styles.textoBotaoReiniciar}>JOGAR NOVAMENTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
  },
  telaCarregamento: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.xl,
  },
  caixaSpinner: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  textoCarregando: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: ESPACAMENTO.md,
  },
  subtextoCarregando: {
    color: CORES.textoMudo,
    fontSize: 12,
    textAlign: 'center',
    marginTop: ESPACAMENTO.xs,
  },
  caixaErro: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.erro,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  tituloErro: {
    color: CORES.erro,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: ESPACAMENTO.sm,
  },
  textoErro: {
    color: CORES.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: ESPACAMENTO.md,
    lineHeight: 18,
  },
  botaoTentarNovamente: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.lg,
    borderRadius: BORDAS.md,
    width: '100%',
  },
  textoBotaoTentarNovamente: {
    color: CORES.textoInvertido,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  conteudoScroll: {
    paddingHorizontal: ESPACAMENTO.md,
    paddingTop: ESPACAMENTO.sm,
    paddingBottom: ESPACAMENTO.xxl,
  },
  painelPlacar: {
    flexDirection: 'row',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.sm,
    alignItems: 'center',
  },
  cardStreak: {
    flex: 1,
    alignItems: 'center',
  },
  cardRecorde: {
    flex: 1,
    alignItems: 'center',
  },
  divisorPlacar: {
    width: 1,
    height: 48,
    backgroundColor: CORES.bordaSuave,
  },
  linhaRotuloPlacar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  rotuloStreak: {
    color: CORES.azulClaro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valorStreak: {
    color: CORES.textoPrincipal,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  subtextoStreak: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rotuloRecorde: {
    color: CORES.ouro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valorRecorde: {
    color: CORES.ouro,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  subtextoRecorde: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bannerAcerto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: CORES.sucesso,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.sm,
    paddingHorizontal: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.sm,
    gap: 10,
  },
  colunaTextoBanner: {
    flex: 1,
  },
  tituloBannerAcerto: {
    color: CORES.sucesso,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  subtextoBannerAcerto: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  bannerErro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: CORES.erro,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.sm,
    paddingHorizontal: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.sm,
    gap: 10,
  },
  tituloBannerErro: {
    color: CORES.erro,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  subtextoBannerErro: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  containerVs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: ESPACAMENTO.xs,
  },
  linhaMiraVs: {
    flex: 1,
    height: 1.5,
    backgroundColor: CORES.bordaDestaque,
  },
  brasaoVs: {
    paddingHorizontal: ESPACAMENTO.md,
  },
  anelExternoVs: {
    width: 38,
    height: 38,
    borderRadius: BORDAS.pill,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 2,
    borderColor: CORES.laranjaCs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoVs: {
    color: CORES.laranjaCs,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  linhaBotoesAcao: {
    flexDirection: 'row',
    gap: ESPACAMENTO.sm,
    marginTop: ESPACAMENTO.md,
  },
  botaoPalpite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.sm,
    borderRadius: BORDAS.lg,
    borderWidth: 1.5,
    gap: 8,
  },
  botaoMaior: {
    backgroundColor: CORES.laranjaCs,
    borderColor: CORES.laranjaBrilhante,
  },
  iconeBotaoContainer: {
    width: 28,
    height: 28,
    borderRadius: BORDAS.pill,
    backgroundColor: 'rgba(11, 14, 20, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colunaTextoBotao: {
    alignItems: 'flex-start',
  },
  textoBotaoPrincipal: {
    color: CORES.textoInvertido,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtextoBotaoMaior: {
    color: 'rgba(11, 14, 20, 0.75)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  botaoMenor: {
    backgroundColor: CORES.fundoCardElevado,
    borderColor: CORES.azulAco,
  },
  iconeBotaoContainerMenor: {
    width: 28,
    height: 28,
    borderRadius: BORDAS.pill,
    backgroundColor: 'rgba(30, 76, 138, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoMenor: {
    color: CORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtextoBotaoMenor: {
    color: CORES.azulClaro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  botaoDesabilitado: {
    opacity: 0.45,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: CORES.fundoModal,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.lg,
  },
  modalCard: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1.5,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.xl,
    padding: ESPACAMENTO.xl,
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
  },
  topoModal: {
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  iconeModalFim: {
    width: 52,
    height: 52,
    borderRadius: BORDAS.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: CORES.erro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.xs,
  },
  tituloModal: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subtituloModal: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  resumoConfronto: {
    width: '100%',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.md,
  },
  rotuloResumo: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: ESPACAMENTO.xs,
  },
  itemResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoResumoSkin: {
    flex: 1,
    marginRight: ESPACAMENTO.sm,
  },
  nomeResumo: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '700',
  },
  tipoResumo: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  precoResumo: {
    color: CORES.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
  },
  precoResumoDestaque: {
    color: CORES.laranjaBrilhante,
    fontSize: 14,
    fontWeight: '900',
  },
  divisorResumo: {
    height: 1,
    backgroundColor: CORES.bordaSuave,
    marginVertical: ESPACAMENTO.xs,
  },
  gradeEstatisticasModal: {
    flexDirection: 'row',
    gap: ESPACAMENTO.sm,
    width: '100%',
    marginBottom: ESPACAMENTO.md,
  },
  caixaEstatisticaModal: {
    flex: 1,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.sm,
    alignItems: 'center',
  },
  rotuloEstatisticaModal: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  valorEstatisticaModal: {
    color: CORES.textoPrincipal,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  rotuloEstatisticaRecorde: {
    color: CORES.ouro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  valorEstatisticaRecorde: {
    color: CORES.ouro,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  badgeNovoRecorde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: CORES.ouro,
    borderRadius: BORDAS.sm,
    paddingVertical: 6,
    paddingHorizontal: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.md,
  },
  textoNovoRecorde: {
    color: CORES.ouro,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  botaoReiniciar: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACAMENTO.md,
    paddingHorizontal: ESPACAMENTO.lg,
    borderRadius: BORDAS.md,
    width: '100%',
    gap: 8,
  },
  textoBotaoReiniciar: {
    color: CORES.textoInvertido,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
