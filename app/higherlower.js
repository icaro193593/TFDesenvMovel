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
import HigherLowerCard from '../components/HigherLowerCard';
import useHigherOrLower from '../hooks/useHigherOrLower';

// Tela principal do minigame Higher or Lower.
// Compara o preço de mercado de skins de diferentes categorias do CS2.
export default function HigherLowerScreen() {
  const {
    skinBase,
    skinComparada,
    pontuacao,
    recorde,
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

  // 1. Estado de Carregamento inicial da API / preços
  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.textoStatus}>Carregando skins do jogo...</Text>
      </SafeAreaView>
    );
  }

  // 2. Estado de Erro de conexão ou ausência de preços válidos
  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoErro}>{error}</Text>
        <TouchableOpacity
          style={styles.botaoAcao}
          activeOpacity={0.7}
          onPress={tentarNovamente}
        >
          <Text style={styles.textoBotaoAcao}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho / Placar no topo */}
        <View style={styles.linhaPlacar}>
          <View style={styles.cardPlacar}>
            <Text style={styles.rotuloPlacar}>PONTUAÇÃO</Text>
            <Text style={styles.valorPlacar}>{pontuacao}</Text>
          </View>

          <View style={styles.cardPlacar}>
            <View style={styles.linhaRotuloRecorde}>
              <MaterialIcons name="emoji-events" size={14} color="#C95F08" />
              <Text style={styles.rotuloRecorde}>RECORDE</Text>
            </View>
            <Text style={styles.valorRecorde}>{recorde}</Text>
          </View>
        </View>

        {/* Banner de feedback durante revelação */}
        {resultadoRodada === 'acerto' && (
          <View style={styles.bannerAcerto}>
            <MaterialIcons name="check-circle" size={20} color="#059669" />
            <Text style={styles.textoBannerAcerto}>Acertou! +1 ponto</Text>
          </View>
        )}

        {resultadoRodada === 'erro' && (
          <View style={styles.bannerErro}>
            <MaterialIcons name="cancel" size={20} color="#EF4444" />
            <Text style={styles.textoBannerErro}>Errou! Fim de jogo...</Text>
          </View>
        )}

        {/* Card 1: Skin Base (preço sempre visível) */}
        <HigherLowerCard
          skin={skinBase}
          etiqueta="SKIN BASE"
          ocultarPreco={false}
          destaqueEstado={null}
        />

        {/* Divisor simples "VS" */}
        <View style={styles.containerVs}>
          <Text style={styles.textoVs}>VS</Text>
        </View>

        {/* Card 2: Skin Comparada (preço oculto durante o palpite) */}
        <HigherLowerCard
          skin={skinComparada}
          etiqueta="MAIS CARA OU MAIS BARATA?"
          ocultarPreco={!mostrarPrecoComparada}
          destaqueEstado={resultadoRodada}
        />

        {/* Botões de Palpite: Mais Cara e Mais Barata */}
        <View style={styles.linhaBotoes}>
          <TouchableOpacity
            style={[
              styles.botaoMaisCara,
              botoesDesabilitados && styles.botaoDesabilitado,
            ]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('maior')}
          >
            <MaterialIcons name="arrow-upward" size={20} color="#0F1923" />
            <Text style={styles.textoMaisCara}>Mais cara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoMaisBarata,
              botoesDesabilitados && styles.botaoDesabilitado,
            ]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('menor')}
          >
            <MaterialIcons name="arrow-downward" size={20} color="#1E4C8A" />
            <Text style={styles.textoMaisBarata}>Mais barata</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Game Over */}
      <Modal
        visible={fase === 'gameover'}
        transparent
        animationType="fade"
        onRequestClose={jogarNovamente}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Game Over</Text>

            {/* Resumo dos preços das duas skins */}
            <View style={styles.resumoPrecosContainer}>
              <View style={styles.linhaResumoSkin}>
                <Text style={styles.nomeResumoSkin} numberOfLines={1}>
                  {skinBase?.name}
                </Text>
                <Text style={styles.precoResumoSkin}>
                  {skinBase?.precoFormatado}
                </Text>
              </View>

              <View style={styles.divisorResumo} />

              <View style={styles.linhaResumoSkin}>
                <Text style={styles.nomeResumoSkin} numberOfLines={1}>
                  {skinComparada?.name}
                </Text>
                <Text style={styles.precoResumoSkin}>
                  {skinComparada?.precoFormatado}
                </Text>
              </View>
            </View>

            {/* Placar final e recorde da sessão */}
            <View style={styles.linhaModalPlacar}>
              <View style={styles.caixaModalPlacar}>
                <Text style={styles.rotuloModalPlacar}>PONTUAÇÃO FINAL</Text>
                <Text style={styles.valorModalPlacar}>{pontuacao}</Text>
              </View>

              <View style={styles.caixaModalPlacar}>
                <Text style={styles.rotuloModalRecorde}>RECORDE</Text>
                <Text style={styles.valorModalRecorde}>{recorde}</Text>
              </View>
            </View>

            {/* Botão para reiniciar a partida */}
            <TouchableOpacity
              style={styles.botaoJogarNovamente}
              activeOpacity={0.7}
              onPress={jogarNovamente}
            >
              <MaterialIcons name="replay" size={20} color="#0F1923" />
              <Text style={styles.textoBotaoJogarNovamente}>Jogar novamente</Text>
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
    backgroundColor: '#FFFFFF',
  },
  centralizado: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textoStatus: {
    color: '#1E4C8A',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  textoErro: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  botaoAcao: {
    backgroundColor: '#F58220',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  textoBotaoAcao: {
    color: '#0F1923',
    fontSize: 15,
    fontWeight: 'bold',
  },
  conteudoScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  linhaPlacar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cardPlacar: {
    flex: 1,
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rotuloPlacar: {
    color: '#2B6CB0',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valorPlacar: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  linhaRotuloRecorde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rotuloRecorde: {
    color: '#C95F08',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valorRecorde: {
    color: '#C95F08',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bannerAcerto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  textoBannerAcerto: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bannerErro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  textoBannerErro: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  containerVs: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  textoVs: {
    color: '#2B6CB0',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linhaBotoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  botaoMaisCara: {
    flex: 1,
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  textoMaisCara: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoMaisBarata: {
    flex: 1,
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  textoMaisBarata: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalTitulo: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  resumoPrecosContainer: {
    width: '100%',
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  linhaResumoSkin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nomeResumoSkin: {
    flex: 1,
    color: '#1E3A5F',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
  },
  precoResumoSkin: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divisorResumo: {
    height: 1,
    backgroundColor: '#68A3E5',
    marginVertical: 8,
    opacity: 0.5,
  },
  linhaModalPlacar: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 18,
  },
  caixaModalPlacar: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rotuloModalPlacar: {
    color: '#2B6CB0',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valorModalPlacar: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  rotuloModalRecorde: {
    color: '#C95F08',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valorModalRecorde: {
    color: '#C95F08',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  botaoJogarNovamente: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    gap: 8,
  },
  textoBotaoJogarNovamente: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
