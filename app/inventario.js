import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import {
  converterValorMoeda,
  obterMoedaSelecionada,
} from '../services/priceService';
import {
  obterSaldoBRL,
  calcularValorVendaBRL,
  venderSkinDoInventario,
  venderTodoInventario,
  formatarBRLNaMoeda,
  formatarValorVendaSkin,
} from '../services/economyService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';

const OPCOES_ORDENACAO = [
  { id: 'maior_preco', rotulo: 'Maior preço' },
  { id: 'menor_preco', rotulo: 'Menor preço' },
  { id: 'mais_recente', rotulo: 'Mais recente' },
  { id: 'menos_recente', rotulo: 'Menos recente' },
];

const obterTimestampItem = (item) => {
  if (!item) return null;
  if (typeof item.timestamp === 'number' && Number.isFinite(item.timestamp)) {
    return item.timestamp;
  }
  if (typeof item.criadoEm === 'number' && Number.isFinite(item.criadoEm)) {
    return item.criadoEm;
  }
  const idBruto = String(item.idInventario || item.idUnico || '');
  const matchId = idBruto.match(/^(\d{12,16})(?:_|$)/);
  if (matchId) {
    const ts = Number(matchId[1]);
    if (Number.isFinite(ts)) return ts;
  }
  return null;
};

const obterDataDiaItem = (item) => {
  if (!item?.dataObtencao || typeof item.dataObtencao !== 'string') return null;
  const matchData = item.dataObtencao.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!matchData) return null;
  const dia = Number(matchData[1]);
  const mes = Number(matchData[2]) - 1;
  const ano = Number(matchData[3]);
  const ts = new Date(ano, mes, dia).getTime();
  return Number.isFinite(ts) ? ts : null;
};

export default function TelaInventario() {
  const [itens, setItens] = useState([]);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [saldoBRL, setSaldoBRL] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('mais_recente');
  const [modalOrdenacaoAberto, setModalOrdenacaoAberto] = useState(false);
  const [modalVenderTudoAberto, setModalVenderTudoAberto] = useState(false);
  const [mensagemFeedback, setMensagemFeedback] = useState('');
  const [vendendoId, setVendendoId] = useState(null);
  const [vendendoTudo, setVendendoTudo] = useState(false);
  const timerFeedbackRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerFeedbackRef.current) {
        clearTimeout(timerFeedbackRef.current);
      }
    };
  }, []);

  const exibirFeedback = (texto) => {
    if (timerFeedbackRef.current) {
      clearTimeout(timerFeedbackRef.current);
    }
    setMensagemFeedback(texto);
    timerFeedbackRef.current = setTimeout(() => {
      setMensagemFeedback('');
      timerFeedbackRef.current = null;
    }, 3000);
  };

  const carregarInventario = () => {
    setIsLoading(true);
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
      obterMoedaSelecionada(),
      obterSaldoBRL(),
    ])
      .then(([dados, moeda, saldo]) => {
        setMoedaAtual(moeda);
        setSaldoBRL(typeof saldo === 'number' && Number.isFinite(saldo) ? saldo : 0);
        if (dados) {
          const lista = JSON.parse(dados);
          setItens(Array.isArray(lista) ? lista : []);
        } else {
          setItens([]);
        }
      })
      .catch((err) => {
        console.error('Erro ao ler inventário:', err);
        setItens([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useFocusEffect(
    useCallback(() => {
      carregarInventario();
    }, [])
  );

  const obterValorNaMoedaAtual = (item) => {
    const moedaItem = item.moeda || 'USD';
    if (moedaItem === moedaAtual && typeof item.valorNumerico === 'number') {
      return item.valorNumerico;
    }
    if (typeof item.valorUsd === 'number') {
      return converterValorMoeda(item.valorUsd, 'USD', moedaAtual);
    }
    const valorBase = typeof item.valorNumerico === 'number' ? item.valorNumerico : 0;
    return converterValorMoeda(valorBase, moedaItem, moedaAtual);
  };

  const removerItem = (idInventario) => {
    const novaLista = itens.filter((i) => i.idInventario !== idInventario);
    setItens(novaLista);

    AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(novaLista)).catch(
      (err) => {
        console.error('Erro ao remover item do inventário:', err);
      }
    );
  };

  const limparInventarioCompleto = () => {
    setItens([]);
    AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify([])).catch(
      (err) => {
        console.error('Erro ao limpar inventário:', err);
      }
    );
  };

  const venderItemDireto = async (item) => {
    if (!item || vendendoId || vendendoTudo) return;
    const idAlvo = item.idInventario || item.id;
    setVendendoId(idAlvo);

    try {
      const resultado = await venderSkinDoInventario(item.idInventario, item);
      if (resultado?.ok) {
        if (Array.isArray(resultado.novaLista)) {
          setItens(resultado.novaLista);
        } else {
          setItens((prev) => prev.filter((i) => i.idInventario !== item.idInventario));
        }
        if (typeof resultado.novoSaldo === 'number') {
          setSaldoBRL(resultado.novoSaldo);
        }
        exibirFeedback(`Vendida por ${formatarBRLNaMoeda(resultado.valorBRL, moedaAtual)}!`);
      } else {
        Alert.alert('Aviso', 'Não foi possível concluir a venda desta skin.');
      }
    } catch (err) {
      console.error('Erro ao vender skin:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao vender a skin.');
    } finally {
      setVendendoId(null);
    }
  };

  const executarVenderTudo = async () => {
    if (itens.length === 0 || vendendoTudo) return;
    setVendendoTudo(true);

    try {
      const resultado = await venderTodoInventario();
      if (resultado?.ok) {
        setItens([]);
        if (typeof resultado.novoSaldo === 'number') {
          setSaldoBRL(resultado.novoSaldo);
        }
        const qtd = resultado.quantidadeVendida ?? itens.length;
        const textoValor = formatarBRLNaMoeda(resultado.valorTotalBRL, moedaAtual);
        exibirFeedback(
          `${qtd} ${qtd === 1 ? 'skin vendida' : 'skins vendidas'} por ${textoValor}!`
        );
      } else {
        exibirFeedback('Não foi possível vender as skins do inventário.');
      }
    } catch (err) {
      console.error('Erro ao vender tudo:', err);
      exibirFeedback('Ocorreu um erro ao vender as skins.');
    } finally {
      setVendendoTudo(false);
    }
  };

  const confirmarVenderTudo = () => {
    if (itens.length === 0 || vendendoTudo) return;
    setModalVenderTudoAberto(true);
  };

  const indicesOriginais = new Map();
  itens.forEach((item, idx) => {
    indicesOriginais.set(item, idx);
  });

  const itensProcessados = itens
    .filter((item) => {
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const nome = (item.name || '').toLowerCase();
      const caixa = (item.nomeCaixaOrigem || '').toLowerCase();
      const wear = (item.wearNome || '').toLowerCase();
      return nome.includes(termo) || caixa.includes(termo) || wear.includes(termo);
    })
    .sort((a, b) => {
      if (ordenacao === 'maior_preco') {
        return obterValorNaMoedaAtual(b) - obterValorNaMoedaAtual(a);
      }
      if (ordenacao === 'menor_preco') {
        return obterValorNaMoedaAtual(a) - obterValorNaMoedaAtual(b);
      }

      const direcao = ordenacao === 'menos_recente' ? 1 : -1;
      const tsA = obterTimestampItem(a);
      const tsB = obterTimestampItem(b);
      if (tsA !== null && tsB !== null && tsA !== tsB) {
        return (tsA - tsB) * direcao;
      }

      const diaA = obterDataDiaItem(a);
      const diaB = obterDataDiaItem(b);
      if (diaA !== null && diaB !== null && diaA !== diaB) {
        return (diaA - diaB) * direcao;
      }

      const idxA = indicesOriginais.get(a) ?? 0;
      const idxB = indicesOriginais.get(b) ?? 0;
      return ordenacao === 'menos_recente' ? idxB - idxA : idxA - idxB;
    });

  const valorTotalVendaBRL = itens.reduce((acc, curr) => {
    return acc + calcularValorVendaBRL(curr);
  }, 0);

  if (isLoading && itens.length === 0) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
        <Text style={styles.textoCarregando}>Carregando inventário...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.cabecalho}>
        <View style={styles.linhaTopo}>
          <View>
            <Text style={styles.titulo}>Inventário</Text>
            <Text style={styles.subtitulo}>
              {itens.length} {itens.length === 1 ? 'skin' : 'skins'}
            </Text>
          </View>
          <Text style={styles.saldoTexto}>
            Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}
          </Text>
        </View>

        {mensagemFeedback.length > 0 && (
          <View style={styles.bannerFeedback}>
            <Text style={styles.textoBannerFeedback}>{mensagemFeedback}</Text>
          </View>
        )}

        {itens.length > 0 && (
          <View style={styles.cardResumo}>
            <Text style={styles.rotuloResumo}>Valor total estimado</Text>
            <Text style={styles.valorResumo}>
              {formatarBRLNaMoeda(valorTotalVendaBRL, moedaAtual)}
            </Text>

            <View style={styles.acoesResumo}>
              <TouchableOpacity
                style={[
                  styles.botaoVenderTudo,
                  vendendoTudo && styles.botaoDesabilitado,
                ]}
                activeOpacity={0.7}
                disabled={vendendoTudo}
                onPress={confirmarVenderTudo}
              >
                <Text style={styles.textoVenderTudo}>
                  {vendendoTudo ? 'Vendendo...' : 'Vender tudo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoLimparTudo}
                activeOpacity={0.7}
                disabled={vendendoTudo}
                onPress={limparInventarioCompleto}
              >
                <Text style={styles.textoLimparTudo}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {itens.length > 0 && (
        <View style={styles.linhaBuscaFiltro}>
          <View style={styles.barraBusca}>
            <TextInput
              style={styles.campoBusca}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar skin..."
              placeholderTextColor={CORES.textoSecundario}
            />
            {busca.length > 0 && (
              <TouchableOpacity
                style={styles.botaoLimparBusca}
                activeOpacity={0.7}
                onPress={() => setBusca('')}
              >
                <Text style={styles.textoLimparBusca}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.botaoOrdenar,
              ordenacao !== 'mais_recente' && styles.botaoOrdenarAtivo,
            ]}
            activeOpacity={0.7}
            accessibilityLabel="Ordenar inventário"
            onPress={() => setModalOrdenacaoAberto(true)}
          >
            <Text
              style={[
                styles.textoBotaoOrdenar,
                ordenacao !== 'mais_recente' && styles.textoBotaoOrdenarAtivo,
              ]}
            >
              Ordenar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={itensProcessados}
        keyExtractor={(item, index) => String(item.idInventario || item.id || index)}
        contentContainerStyle={styles.conteudoLista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const nomeRaridade = item.rarity?.name || 'Comum';
          const corRaridade =
            item.rarity?.color || CORES.raridades[nomeRaridade] || CORES.azulPrincipal;
          const idItem = item.idInventario || item.id;
          const estaVendendo = vendendoId === idItem || vendendoTudo;

          return (
            <View style={styles.cardItem}>
              <View style={styles.linhaSuperiorCard}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.imagemSkin}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.semImagem}>
                    <Text style={styles.textoSemImagem}>CS2</Text>
                  </View>
                )}

                <View style={styles.infoCard}>
                  <Text style={styles.nomeSkin} numberOfLines={2}>
                    {item.isStatTrak ? 'ST ' : ''}
                    {item.name}
                  </Text>
                  <Text style={[styles.raridade, { color: corRaridade }]} numberOfLines={1}>
                    {nomeRaridade}
                  </Text>
                  {item.wearNome ? (
                    <Text style={styles.condicao} numberOfLines={1}>
                      {item.wearNome}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.linhaInferiorCard}>
                <Text style={styles.precoItem}>
                  {formatarValorVendaSkin(item, moedaAtual)}
                </Text>

                <View style={styles.acoesCard}>
                  <TouchableOpacity
                    style={[
                      styles.botaoVenderSkin,
                      estaVendendo && styles.botaoDesabilitado,
                    ]}
                    activeOpacity={0.7}
                    disabled={estaVendendo}
                    onPress={() => venderItemDireto(item)}
                  >
                    <Text style={styles.textoBotaoVenderSkin}>
                      {vendendoId === idItem ? 'Vendendo...' : 'Vender'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botaoRemover}
                    activeOpacity={0.7}
                    disabled={estaVendendo}
                    onPress={() => removerItem(item.idInventario)}
                  >
                    <Text style={styles.textoBotaoRemover}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <Text style={styles.vazioTitulo}>
              {busca.length > 0
                ? 'Nenhuma skin encontrada para essa busca.'
                : 'Seu inventário está vazio'}
            </Text>
            <Text style={styles.vazioSubtitulo}>
              {busca.length > 0
                ? 'Tente buscar com outros termos.'
                : 'Abra caixas na aba "Abertura de Caixas" para colecionar suas skins aqui!'}
            </Text>

            {busca.length > 0 ? (
              <TouchableOpacity
                style={styles.botaoAcaoVazio}
                activeOpacity={0.7}
                onPress={() => setBusca('')}
              >
                <Text style={styles.textoBotaoAcaoVazio}>Limpar busca</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.botaoAcaoVazio}
                activeOpacity={0.7}
                onPress={() => router.push('/caixas')}
              >
                <Text style={styles.textoBotaoAcaoVazio}>Abrir Caixas</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal
        visible={modalOrdenacaoAberto}
        onRequestClose={() => setModalOrdenacaoAberto(false)}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Ordenar Inventário</Text>
          <FlatList
            style={styles.listaModal}
            data={OPCOES_ORDENACAO}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const ativa = item.id === ordenacao;
              return (
                <TouchableOpacity
                  style={[styles.opcaoModal, ativa && styles.opcaoModalAtiva]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setOrdenacao(item.id);
                    setModalOrdenacaoAberto(false);
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcaoModal,
                      ativa && styles.textoOpcaoModalAtiva,
                    ]}
                  >
                    {item.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.botaoFecharModal}
            activeOpacity={0.7}
            onPress={() => setModalOrdenacaoAberto(false)}
          >
            <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalVenderTudoAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVenderTudoAberto(false)}
      >
        <View style={styles.modalConfirmacaoOverlay}>
          <View style={styles.modalConfirmacaoCard}>
            <Text style={styles.modalConfirmacaoTitulo}>Vender tudo</Text>
            <Text style={styles.modalConfirmacaoTexto}>
              {`Deseja vender todas as ${itens.length} ${itens.length === 1 ? 'skin' : 'skins'} do inventário por ${formatarBRLNaMoeda(valorTotalVendaBRL, moedaAtual)}?`}
            </Text>

            <View style={styles.modalConfirmacaoAcoes}>
              <TouchableOpacity
                style={styles.botaoCancelarModal}
                activeOpacity={0.7}
                onPress={() => setModalVenderTudoAberto(false)}
              >
                <Text style={styles.textoBotaoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoConfirmarModal}
                activeOpacity={0.7}
                onPress={() => {
                  setModalVenderTudoAberto(false);
                  executarVenderTudo();
                }}
              >
                <Text style={styles.textoBotaoConfirmarModal}>Confirmar Venda</Text>
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
    backgroundColor: CORES.fundo,
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CORES.fundo,
    padding: 20,
  },
  textoCarregando: {
    color: CORES.textoSecundario,
    fontSize: 14,
    marginTop: 10,
  },
  cabecalho: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  linhaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    color: CORES.texto,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  saldoTexto: {
    color: CORES.sucesso,
    fontSize: 13,
    fontWeight: 'bold',
  },
  bannerFeedback: {
    backgroundColor: CORES.sucessoClaro,
    borderWidth: 1,
    borderColor: CORES.sucesso,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  textoBannerFeedback: {
    color: CORES.sucesso,
    fontSize: 13,
    fontWeight: '600',
  },
  cardResumo: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  rotuloResumo: {
    color: CORES.textoSecundario,
    fontSize: 12,
  },
  valorResumo: {
    color: CORES.texto,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  acoesResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  botaoVenderTudo: {
    flex: 1,
    backgroundColor: CORES.sucesso,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVenderTudo: {
    color: CORES.branco,
    fontSize: 13,
    fontWeight: 'bold',
  },
  botaoLimparTudo: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLimparTudo: {
    color: CORES.erro,
    fontSize: 13,
    fontWeight: '600',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  linhaBuscaFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  barraBusca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  campoBusca: {
    flex: 1,
    color: CORES.texto,
    fontSize: 14,
  },
  botaoLimparBusca: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  textoLimparBusca: {
    color: CORES.azulPrincipal,
    fontSize: 12,
    fontWeight: '600',
  },
  botaoOrdenar: {
    paddingHorizontal: 14,
    height: 40,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoOrdenarAtivo: {
    borderColor: CORES.azulPrincipal,
  },
  textoBotaoOrdenar: {
    color: CORES.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoBotaoOrdenarAtivo: {
    color: CORES.azulPrincipal,
  },
  conteudoLista: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  cardItem: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  linhaSuperiorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagemSkin: {
    width: 64,
    height: 48,
  },
  semImagem: {
    width: 64,
    height: 48,
    backgroundColor: CORES.fundo,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoCard: {
    flex: 1,
    marginLeft: 10,
  },
  nomeSkin: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: 'bold',
  },
  raridade: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  condicao: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  linhaInferiorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CORES.fundo,
  },
  precoItem: {
    color: CORES.sucesso,
    fontSize: 14,
    fontWeight: 'bold',
  },
  acoesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botaoVenderSkin: {
    backgroundColor: CORES.sucesso,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  textoBotaoVenderSkin: {
    color: CORES.branco,
    fontSize: 12,
    fontWeight: 'bold',
  },
  botaoRemover: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  textoBotaoRemover: {
    color: CORES.erro,
    fontSize: 12,
    fontWeight: '600',
  },
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  vazioTitulo: {
    color: CORES.texto,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vazioSubtitulo: {
    color: CORES.textoSecundario,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  botaoAcaoVazio: {
    backgroundColor: CORES.azulPrincipal,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textoBotaoAcaoVazio: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: CORES.branco,
    padding: 16,
  },
  modalTitulo: {
    color: CORES.texto,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  listaModal: {
    flex: 1,
  },
  opcaoModal: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  opcaoModalAtiva: {
    backgroundColor: CORES.azulPrincipal,
    borderColor: CORES.azulPrincipal,
  },
  textoOpcaoModal: {
    color: CORES.texto,
    fontSize: 15,
    fontWeight: '600',
  },
  textoOpcaoModalAtiva: {
    color: CORES.branco,
    fontWeight: 'bold',
  },
  botaoFecharModal: {
    backgroundColor: CORES.azulClaro,
    borderWidth: 1,
    borderColor: CORES.azulBorda,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotaoFecharModal: {
    color: CORES.azulPrincipal,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalConfirmacaoOverlay: {
    flex: 1,
    backgroundColor: CORES.modalFundo,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalConfirmacaoCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CORES.branco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 20,
  },
  modalConfirmacaoTitulo: {
    color: CORES.texto,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalConfirmacaoTexto: {
    color: CORES.textoSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  modalConfirmacaoAcoes: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoCancelarModal: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  textoBotaoCancelarModal: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoConfirmarModal: {
    flex: 1,
    backgroundColor: CORES.sucesso,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  textoBotaoConfirmarModal: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
