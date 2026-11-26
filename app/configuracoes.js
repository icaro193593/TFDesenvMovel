import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEY_MOEDA,
  salvarMoedaSelecionada,
  obterMoedaSelecionada,
  TAXAS_CAMBIO,
} from '../services/priceService';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const STORAGE_KEY_RECORDE = '@higher_lower_recorde_historico';

const OPCOES_MOEDA = [
  {
    codigo: 'USD',
    nome: 'Dólar Americano',
    simbolo: '$',
    rotulo: 'USD ($) • Cotação Base Global',
    taxa: '1.00 USD',
  },
  {
    codigo: 'BRL',
    nome: 'Real Brasileiro',
    simbolo: 'R$',
    rotulo: 'BRL (R$) • Cotação Local Brasil',
    taxa: `R$ ${TAXAS_CAMBIO.BRL.toFixed(2)}`,
  },
  {
    codigo: 'EUR',
    nome: 'Euro Europeu',
    simbolo: '€',
    rotulo: 'EUR (€) • Mercado Europeu',
    taxa: `€ ${TAXAS_CAMBIO.EUR.toFixed(2)}`,
  },
];

/**
 * Tela de Configurações Táticas do CS2 SkinWiki
 *
 * Princípios de Impeccable Design:
 * - Tema tático escuro CS2 coeso (#0B0E14, #131924, #182232).
 * - Sem faixas unilaterais (borderLeftWidth proibido).
 * - Dropdown com modal escuro e radio buttons táteis.
 * - Confirmação segura de limpeza com estatísticas do inventário.
 * - Seção com metodologia pedagógica do Prof. Victor Vidigal Ribeiro.
 * - Pure JavaScript e componentes oficiais.
 */
export default function ConfiguracoesScreen() {
  const [moedaSelecionada, setMoedaSelecionada] = useState('USD');
  const [modalMoedaAberto, setModalMoedaAberto] = useState(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [totalItensInventario, setTotalItensInventario] = useState(0);

  // Carrega moeda salva e contagem de itens ao abrir a tela
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        const moeda = await obterMoedaSelecionada();
        setMoedaSelecionada(moeda || 'USD');

        const dadosInventario = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
        if (dadosInventario) {
          const lista = JSON.parse(dadosInventario);
          setTotalItensInventario(Array.isArray(lista) ? lista.length : 0);
        } else {
          setTotalItensInventario(0);
        }
      } catch (err) {
        // Fallback seguro
      }
    };

    carregarDadosIniciais();
  }, []);

  // Altera a moeda no serviço e no estado local
  const selecionarMoeda = async (codigo) => {
    try {
      await salvarMoedaSelecionada(codigo);
      setMoedaSelecionada(codigo);
      setModalMoedaAberto(false);
    } catch (err) {
      setModalMoedaAberto(false);
    }
  };

  // Apaga inventário, cache e configurações locais
  const confirmarLimparCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_INVENTARIO,
        STORAGE_KEY_RECORDE,
      ]);
      setTotalItensInventario(0);
      setModalConfirmacaoAberto(false);
      Alert.alert(
        'Armazenamento Limpo',
        'Inventário local e registros temporários foram resetados com sucesso.'
      );
    } catch (erro) {
      setModalConfirmacaoAberto(false);
      Alert.alert('Erro', 'Não foi possível limpar os dados locais.');
    }
  };

  const moedaAtual =
    OPCOES_MOEDA.find((opcao) => opcao.codigo === moedaSelecionada) ||
    OPCOES_MOEDA[0];

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Moderno com Ícone Tático */}
        <View style={styles.cabecalho}>
          <View style={styles.iconeCabecalhoContainer}>
            <MaterialIcons name="settings" size={28} color={CORES.laranjaCs} />
          </View>
          <View style={styles.infoCabecalho}>
            <Text style={styles.tituloCabecalho}>CENTRAL TÁTICA</Text>
            <Text style={styles.subtituloCabecalho}>
              Preferências de mercado, câmbio e gestão de dados
            </Text>
          </View>
        </View>

        {/* Seção 1 — Câmbio e Moeda */}
        <View style={styles.cardSecao}>
          <View style={styles.topoSecao}>
            <View style={styles.iconeSecaoContainer}>
              <MaterialIcons name="currency-exchange" size={20} color={CORES.azulClaro} />
            </View>
            <View style={styles.titulosSecao}>
              <Text style={styles.tituloSecao}>CÂMBIO DO MERCADO</Text>
              <Text style={styles.descricaoSecao}>
                Selecione a moeda de referência para avaliação das skins
              </Text>
            </View>
          </View>

          {/* Botão Dropdown Refinado */}
          <TouchableOpacity
            style={styles.botaoDropdown}
            activeOpacity={0.7}
            onPress={() => setModalMoedaAberto(true)}
          >
            <View style={styles.infoMoedaAtual}>
              <View style={styles.simboloMoedaBadge}>
                <Text style={styles.textoSimboloMoeda}>{moedaAtual.simbolo}</Text>
              </View>
              <View style={styles.detalhesMoedaDropdown}>
                <Text style={styles.codigoMoedaDropdown}>{moedaAtual.codigo}</Text>
                <Text style={styles.nomeMoedaDropdown}>{moedaAtual.nome}</Text>
              </View>
            </View>

            <View style={styles.setaDropdownContainer}>
              <Text style={styles.rotuloTaxaDropdown}>{moedaAtual.taxa}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={CORES.laranjaCs} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção 2 — Armazenamento e Sessão */}
        <View style={styles.cardSecao}>
          <View style={styles.topoSecao}>
            <View style={styles.iconeSecaoContainer}>
              <MaterialIcons name="sd-storage" size={20} color={CORES.alerta} />
            </View>
            <View style={styles.titulosSecao}>
              <Text style={styles.tituloSecao}>DADOS E ARMAZENAMENTO</Text>
              <Text style={styles.descricaoSecao}>
                Gerenciamento do inventário persistido no dispositivo
              </Text>
            </View>
          </View>

          {/* Card Informativo com Estatísticas */}
          <View style={styles.cardInfoEstatisticas}>
            <View style={styles.linhaEstatistica}>
              <Text style={styles.rotuloEstatistica}>Skins no Inventário Local:</Text>
              <Text style={styles.valorEstatistica}>
                {totalItensInventario}{' '}
                {totalItensInventario === 1 ? 'item' : 'itens'}
              </Text>
            </View>
            <View style={styles.divisorEstatistica} />
            <View style={styles.linhaEstatistica}>
              <Text style={styles.rotuloEstatistica}>Mecanismo de Persistência:</Text>
              <Text style={styles.valorEstatisticaDestaque}>
                AsyncStorage Local
              </Text>
            </View>
          </View>

          {/* Botão de Limpar com Alerta */}
          <TouchableOpacity
            style={styles.botaoLimparCache}
            activeOpacity={0.7}
            onPress={() => setModalConfirmacaoAberto(true)}
          >
            <MaterialIcons name="delete-sweep" size={20} color={CORES.erro} />
            <Text style={styles.textoBotaoLimpar}>LIMPAR INVENTÁRIO E SESSÃO</Text>
          </TouchableOpacity>
        </View>

        {/* Seção 3 — Sobre o Aplicativo */}
        <View style={styles.cardSecao}>
          <View style={styles.topoSecao}>
            <View style={styles.iconeSecaoContainer}>
              <MaterialIcons name="info" size={20} color={CORES.sucesso} />
            </View>
            <View style={styles.titulosSecao}>
              <Text style={styles.tituloSecao}>SOBRE O APLICATIVO</Text>
              <Text style={styles.descricaoSecao}>
                Informações de build, engenharia e metodologia didática
              </Text>
            </View>
          </View>

          <View style={styles.blocoSobre}>
            <View style={styles.linhaSobreItem}>
              <Text style={styles.rotuloSobre}>Aplicativo:</Text>
              <Text style={styles.valorSobre}>CS2 SkinWiki Mobile</Text>
            </View>

            <View style={styles.linhaSobreItem}>
              <Text style={styles.rotuloSobre}>Versão:</Text>
              <Text style={styles.valorSobre}>v2.4.0 (Tactical Edition)</Text>
            </View>

            <View style={styles.linhaSobreItem}>
              <Text style={styles.rotuloSobre}>APIs Integradas:</Text>
              <Text style={styles.valorSobre}>ByMykel CSGO-API & PriceEmpire</Text>
            </View>

            <View style={styles.divisorSobre} />

            <View style={styles.caixaDidatica}>
              <MaterialIcons name="school" size={20} color={CORES.laranjaCs} />
              <View style={styles.textoDidaticoContainer}>
                <Text style={styles.tituloDidatico}>Projeto Educacional</Text>
                <Text style={styles.descricaoDidatica}>
                  Desenvolvido seguindo rigorosamente a estrutura didática e os
                  princípios de React Native do Prof. Victor Vidigal Ribeiro.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Tático de Seleção de Moeda */}
      <Modal
        visible={modalMoedaAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMoedaAberto(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.cabecalhoModal}>
              <View style={styles.linhaTituloModal}>
                <MaterialIcons name="currency-exchange" size={22} color={CORES.laranjaCs} />
                <Text style={styles.tituloModal}>SELECIONAR MOEDA</Text>
              </View>
              <Text style={styles.subtituloModal}>
                Os preços de todo o app serão convertidos automaticamente
              </Text>
            </View>

            <FlatList
              data={OPCOES_MOEDA}
              keyExtractor={(item) => item.codigo}
              renderItem={({ item }) => {
                const ativa = item.codigo === moedaSelecionada;
                return (
                  <TouchableOpacity
                    style={[
                      styles.opcaoMoedaModal,
                      ativa && styles.opcaoMoedaModalAtiva,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selecionarMoeda(item.codigo)}
                  >
                    <View style={styles.colunaInfoOpcao}>
                      <View style={styles.linhaCodigoSimbolo}>
                        <View style={styles.badgeSimboloModal}>
                          <Text style={styles.textoBadgeSimboloModal}>
                            {item.simbolo}
                          </Text>
                        </View>
                        <Text style={styles.codigoOpcaoModal}>{item.codigo}</Text>
                        <Text style={styles.taxaOpcaoModal}>({item.taxa})</Text>
                      </View>
                      <Text style={styles.nomeOpcaoModal}>{item.nome}</Text>
                    </View>

                    {/* Radio Button Tático */}
                    <View
                      style={[
                        styles.radioButtonExterior,
                        ativa && styles.radioButtonAtivo,
                      ]}
                    >
                      {ativa && <View style={styles.radioButtonInterior} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.botaoFecharModal}
              activeOpacity={0.7}
              onPress={() => setModalMoedaAberto(false)}
            >
              <Text style={styles.textoBotaoFecharModal}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tático de Confirmação para Limpar Cache */}
      <Modal
        visible={modalConfirmacaoAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConfirmacaoAberto(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconeAlertaModal}>
              <MaterialIcons name="warning" size={34} color={CORES.erro} />
            </View>

            <Text style={styles.tituloAlertaModal}>CONFIRMAR RESET</Text>
            <Text style={styles.descricaoAlertaModal}>
              Esta ação excluirá permanentemente todas as skins do seu inventário
              local e resetará os recordes do minigame.
            </Text>

            <View style={styles.linhaAcoesModalConfirmar}>
              <TouchableOpacity
                style={styles.botaoConfirmarPerigo}
                activeOpacity={0.7}
                onPress={confirmarLimparCache}
              >
                <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                <Text style={styles.textoConfirmarPerigo}>LIMPAR DADOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoCancelar}
                activeOpacity={0.7}
                onPress={() => setModalConfirmacaoAberto(false)}
              >
                <Text style={styles.textoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
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
  conteudoScroll: {
    padding: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.xxl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.md,
  },
  iconeCabecalhoContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDAS.md,
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ESPACAMENTO.md,
  },
  infoCabecalho: {
    flex: 1,
  },
  tituloCabecalho: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subtituloCabecalho: {
    color: CORES.textoMudo,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  cardSecao: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1.5,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.md,
  },
  topoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  iconeSecaoContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDAS.sm,
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ESPACAMENTO.sm,
  },
  titulosSecao: {
    flex: 1,
  },
  tituloSecao: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  descricaoSecao: {
    color: CORES.textoMudo,
    fontSize: 11,
    marginTop: 1,
  },
  botaoDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1.5,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.md,
    paddingHorizontal: ESPACAMENTO.md,
    paddingVertical: ESPACAMENTO.sm,
  },
  infoMoedaAtual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  simboloMoedaBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDAS.pill,
    backgroundColor: 'rgba(245, 130, 32, 0.15)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSimboloMoeda: {
    color: CORES.laranjaCs,
    fontSize: 14,
    fontWeight: '900',
  },
  detalhesMoedaDropdown: {
    alignItems: 'flex-start',
  },
  codigoMoedaDropdown: {
    color: CORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nomeMoedaDropdown: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '600',
  },
  setaDropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rotuloTaxaDropdown: {
    color: CORES.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  cardInfoEstatisticas: {
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
    marginBottom: ESPACAMENTO.md,
  },
  linhaEstatistica: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rotuloEstatistica: {
    color: CORES.textoMudo,
    fontSize: 12,
    fontWeight: '600',
  },
  valorEstatistica: {
    color: CORES.textoPrincipal,
    fontSize: 12,
    fontWeight: '800',
  },
  valorEstatisticaDestaque: {
    color: CORES.azulClaro,
    fontSize: 12,
    fontWeight: '800',
  },
  divisorEstatistica: {
    height: 1,
    backgroundColor: CORES.bordaSuave,
    marginVertical: 4,
  },
  botaoLimparCache: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: CORES.erro,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.sm,
    gap: 8,
  },
  textoBotaoLimpar: {
    color: CORES.erro,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  blocoSobre: {
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
  },
  linhaSobreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  rotuloSobre: {
    color: CORES.textoMudo,
    fontSize: 12,
    fontWeight: '600',
  },
  valorSobre: {
    color: CORES.textoPrincipal,
    fontSize: 12,
    fontWeight: '800',
  },
  divisorSobre: {
    height: 1,
    backgroundColor: CORES.bordaSuave,
    marginVertical: ESPACAMENTO.sm,
  },
  caixaDidatica: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.3)',
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
    gap: 10,
    alignItems: 'center',
  },
  textoDidaticoContainer: {
    flex: 1,
  },
  tituloDidatico: {
    color: CORES.laranjaCs,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  descricaoDidatica: {
    color: CORES.textoSecundario,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
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
    padding: ESPACAMENTO.lg,
    width: '100%',
    maxWidth: 380,
  },
  cabecalhoModal: {
    marginBottom: ESPACAMENTO.md,
  },
  linhaTituloModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tituloModal: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtituloModal: {
    color: CORES.textoMudo,
    fontSize: 12,
    marginTop: 2,
  },
  opcaoMoedaModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1.5,
    borderColor: CORES.bordaSuave,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.sm,
    paddingHorizontal: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.sm,
  },
  opcaoMoedaModalAtiva: {
    borderColor: CORES.laranjaCs,
    backgroundColor: 'rgba(245, 130, 32, 0.1)',
  },
  colunaInfoOpcao: {
    flex: 1,
  },
  linhaCodigoSimbolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeSimboloModal: {
    width: 22,
    height: 22,
    borderRadius: BORDAS.pill,
    backgroundColor: CORES.fundoSuperficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBadgeSimboloModal: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: '900',
  },
  codigoOpcaoModal: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '900',
  },
  taxaOpcaoModal: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '700',
  },
  nomeOpcaoModal: {
    color: CORES.textoSecundario,
    fontSize: 11,
    marginTop: 1,
  },
  radioButtonExterior: {
    width: 20,
    height: 20,
    borderRadius: BORDAS.pill,
    borderWidth: 2,
    borderColor: CORES.bordaDestaque,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ESPACAMENTO.sm,
  },
  radioButtonAtivo: {
    borderColor: CORES.laranjaCs,
  },
  radioButtonInterior: {
    width: 10,
    height: 10,
    borderRadius: BORDAS.pill,
    backgroundColor: CORES.laranjaCs,
  },
  botaoFecharModal: {
    backgroundColor: CORES.laranjaCs,
    borderRadius: BORDAS.md,
    paddingVertical: ESPACAMENTO.md,
    alignItems: 'center',
    marginTop: ESPACAMENTO.xs,
  },
  textoBotaoFecharModal: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  iconeAlertaModal: {
    width: 56,
    height: 56,
    borderRadius: BORDAS.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: CORES.erro,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: ESPACAMENTO.sm,
  },
  tituloAlertaModal: {
    color: CORES.textoPrincipal,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: ESPACAMENTO.xs,
  },
  descricaoAlertaModal: {
    color: CORES.textoSecundario,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: ESPACAMENTO.lg,
  },
  linhaAcoesModalConfirmar: {
    flexDirection: 'row',
    gap: ESPACAMENTO.sm,
  },
  botaoConfirmarPerigo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CORES.erro,
    paddingVertical: ESPACAMENTO.md,
    borderRadius: BORDAS.md,
    gap: 6,
  },
  textoConfirmarPerigo: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  botaoCancelar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1.5,
    borderColor: CORES.bordaDestaque,
    paddingVertical: ESPACAMENTO.md,
    borderRadius: BORDAS.md,
  },
  textoCancelar: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
