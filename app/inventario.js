import { useState, useCallback } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import {
  converterValorMoeda,
  formatarPrecoMoeda,
  obterMoedaSelecionada,
} from '../services/priceService';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Chave utilizada para persistência do inventário local do usuário
const STORAGE_KEY_INVENTARIO = '@inventario_skins';

// Opções de ordenação disponíveis no modal de filtro
const OPCOES_ORDENACAO = [
  { id: 'mais_recente', rotulo: 'Mais recente' },
  { id: 'menos_recente', rotulo: 'Menos recente' },
  { id: 'maior_preco', rotulo: 'Maior preço' },
  { id: 'menor_preco', rotulo: 'Menor preço' },
];

// Extrai timestamp numérico (ms) de campos conhecidos ou do idInventario/idUnico
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

// Converte dataObtencao (DD/MM/YYYY) em timestamp de dia para fallback
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

export default function InventarioScreen() {
  const [itens, setItens] = useState([]);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('mais_recente');
  const [modalOrdenacaoAberto, setModalOrdenacaoAberto] = useState(false);

  // Carrega as skins salvas e a moeda ativa do AsyncStorage
  const carregarInventario = () => {
    setIsLoading(true);
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
      obterMoedaSelecionada(),
    ])
      .then(([dados, moeda]) => {
        setMoedaAtual(moeda);
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

  // Atualiza automaticamente o inventário e a moeda toda vez que o usuário entra na aba
  useFocusEffect(
    useCallback(() => {
      carregarInventario();
    }, [])
  );

  // Calcula o valor da skin na moeda ativa (assume 'USD' para itens antigos sem campo moeda)
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

  // Remove um item específico do inventário pelo ID único
  const removerItem = (idInventario) => {
    const novaLista = itens.filter((i) => i.idInventario !== idInventario);
    setItens(novaLista);

    AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(novaLista)).catch(
      (err) => {
        console.error('Erro ao remover item do inventário:', err);
      }
    );
  };

  // Diálogo de confirmação para limpar o inventário completo
  const confirmarLimpezaInventario = () => {
    Alert.alert(
      'Limpar Inventário',
      'Tem certeza de que deseja remover todas as skins do seu inventário? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: limparInventarioCompleto,
        },
      ]
    );
  };

  // Remove todos os itens do inventário de uma só vez
  const limparInventarioCompleto = () => {
    setItens([]);
    AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify([])).catch(
      (err) => {
        console.error('Erro ao limpar inventário:', err);
      }
    );
  };

  // Mapa de índice original para fallback estável na ordenação por data
  const indicesOriginais = new Map();
  itens.forEach((item, idx) => {
    indicesOriginais.set(item, idx);
  });

  // Filtra e ordena as skins do inventário
  const itensProcessados = itens
    .filter((item) => {
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const nome = (item.name || '').toLowerCase();
      const caixa = (item.nomeCaixaOrigem || '').toLowerCase();
      const wear = (item.wearNome || '').toLowerCase();
      const raridade = (item.rarity?.name || '').toLowerCase();
      return (
        nome.includes(termo) ||
        caixa.includes(termo) ||
        wear.includes(termo) ||
        raridade.includes(termo)
      );
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

      // Fallback para ordem de inserção (unshift mantém o mais recente no índice 0)
      const idxA = indicesOriginais.get(a) ?? 0;
      const idxB = indicesOriginais.get(b) ?? 0;
      return ordenacao === 'menos_recente' ? idxB - idxA : idxA - idxB;
    });

  // Calcula o valor total estimado de todas as skins guardadas na moeda ativa
  const valorTotalInventario = itens.reduce((acc, curr) => {
    return acc + obterValorNaMoedaAtual(curr);
  }, 0);

  // Exibição de carregamento inicial (somente no primeiro carregamento com inventário vazio)
  if (isLoading && itens.length === 0) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.laranjaCs} />
        <Text style={styles.textoCarregando}>Carregando seu inventário...</Text>
      </SafeAreaView>
    );
  }

  // Obter rótulo legível da ordenação atual
  const rotuloOrdenacaoAtiva =
    OPCOES_ORDENACAO.find((o) => o.id === ordenacao)?.rotulo || 'Mais recente';

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {/* Banner de Portfólio no Topo */}
      <View style={styles.cabecalho}>
        <View style={styles.linhaTopoBanner}>
          <View style={styles.colunaTituloBanner}>
            <View style={styles.linhaTituloComIcone}>
              <MaterialIcons name="account-balance-wallet" size={22} color={CORES.laranjaCs} />
              <Text style={styles.titulo}>Meu Inventário</Text>
            </View>
            <Text style={styles.subtitulo}>
              {itens.length} {itens.length === 1 ? 'skin guardada' : 'skins guardadas'}
            </Text>
          </View>

          {itens.length > 0 && (
            <TouchableOpacity
              style={styles.botaoLimparTudo}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={confirmarLimpezaInventario}
            >
              <MaterialIcons name="delete-sweep" size={17} color={CORES.erro} />
              <Text style={styles.textoLimparTudo}>Limpar tudo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card de Resumo de Valor de Mercado */}
        {itens.length > 0 && (
          <View style={styles.cardResumo}>
            <View style={styles.colunaResumo}>
              <Text style={styles.rotuloResumo}>VALOR TOTAL ESTIMADO DO PORTFÓLIO</Text>
              <Text style={styles.valorResumo}>
                {formatarPrecoMoeda(valorTotalInventario, moedaAtual)}
              </Text>
            </View>

            <View style={styles.badgeMoedaAtiva}>
              <MaterialIcons name="monetization-on" size={14} color={CORES.ouro} />
              <Text style={styles.textoBadgeMoedaAtiva}>{moedaAtual}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Barra de Busca e Botão de Ordenação */}
      {itens.length > 0 && (
        <View style={styles.linhaBuscaFiltro}>
          <View style={styles.barraBusca}>
            <MaterialIcons name="search" size={20} color={CORES.textoMudo} style={styles.iconeBusca} />
            <TextInput
              style={styles.campoBusca}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar por skin, arma, caixa ou raridade..."
              placeholderTextColor={CORES.textoMudo}
            />
            {busca.length > 0 && (
              <TouchableOpacity
                style={styles.botaoLimparBusca}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setBusca('')}
              >
                <MaterialIcons name="close" size={16} color={CORES.textoSecundario} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.botaoFiltro,
              ordenacao !== 'mais_recente' && styles.botaoFiltroAtivo,
            ]}
            activeOpacity={0.7}
            accessibilityLabel="Ordenar inventário"
            onPress={() => setModalOrdenacaoAberto(true)}
          >
            <MaterialIcons
              name="filter-list"
              size={22}
              color={ordenacao !== 'mais_recente' ? CORES.laranjaCs : CORES.textoSecundario}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Tag informativa quando há ordenação ativa diferente do padrão */}
      {itens.length > 0 && ordenacao !== 'mais_recente' && (
        <View style={styles.faixaFiltroAtivo}>
          <Text style={styles.textoFaixaFiltroAtivo}>
            Ordenado por: <Text style={styles.destaqueFaixaFiltro}>{rotuloOrdenacaoAtiva}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setOrdenacao('mais_recente')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.botaoResetarFiltro}>Restaurar padrão</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Skins do Inventário */}
      <FlatList
        data={itensProcessados}
        keyExtractor={(item) => item.idInventario || item.id}
        contentContainerStyle={styles.conteudoLista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const nomeRaridade = item.rarity?.name || 'Raridade Oficial';
          const corRaridade =
            item.rarity?.color ||
            CORES.raridades[nomeRaridade] ||
            CORES.azulAco;

          // Float numérico para o medidor visual de desgaste
          const floatNum =
            typeof item.floatValor === 'number'
              ? item.floatValor
              : typeof item.floatValor === 'string'
              ? parseFloat(item.floatValor)
              : null;

          return (
            <View style={styles.cardItem}>
              {/* Imagem nítida da Skin em container escuro suave */}
              <View style={styles.containerImagem}>
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
              </View>

              {/* Informações Centrais da Skin */}
              <View style={styles.infoCentral}>
                <View style={styles.linhaNome}>
                  {item.isStatTrak && (
                    <Text style={styles.tagStatTrak}>ST™ </Text>
                  )}
                  <Text style={styles.nomeSkin} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Chip com a cor oficial da raridade (borda completa sem faixas) */}
                <View style={styles.linhaChips}>
                  <View
                    style={[
                      styles.chipRaridade,
                      {
                        backgroundColor: `${corRaridade}22`,
                        borderColor: `${corRaridade}66`,
                      },
                    ]}
                  >
                    <Text style={[styles.textoChipRaridade, { color: corRaridade }]}>
                      {nomeRaridade}
                    </Text>
                  </View>

                  {item.wearNome && (
                    <Text style={styles.condicao} numberOfLines={1}>
                      {item.wearNome}
                    </Text>
                  )}
                </View>

                {/* Medidor visual tático de Wear quando o float estiver disponível */}
                {floatNum !== null && !isNaN(floatNum) && (
                  <View style={styles.containerTrilhoWear}>
                    <View style={styles.trilhoWear}>
                      <View
                        style={[
                          styles.barraProgressoWear,
                          {
                            width: `${Math.min(Math.max(floatNum * 100, 4), 100)}%`,
                            backgroundColor: corRaridade,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.textoFloatNumero}>
                      {floatNum.toFixed(4)}
                    </Text>
                  </View>
                )}

                {item.nomeCaixaOrigem && (
                  <Text style={styles.caixaOrigem} numberOfLines={1}>
                    Origem: {item.nomeCaixaOrigem}
                  </Text>
                )}

                <View style={styles.linhaPrecoData}>
                  <Text style={styles.precoItem}>
                    {formatarPrecoMoeda(obterValorNaMoedaAtual(item), moedaAtual)}
                  </Text>
                  {item.dataObtencao && (
                    <Text style={styles.dataItem}>{item.dataObtencao}</Text>
                  )}
                </View>
              </View>

              {/* Botão de Remoção elegante e discreto */}
              <TouchableOpacity
                style={styles.botaoRemover}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => removerItem(item.idInventario)}
              >
                <MaterialIcons name="delete-outline" size={20} color={CORES.erro} />
                <Text style={styles.textoBotaoRemover}>Remover</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <View style={styles.circuloIconeVazio}>
              <MaterialIcons name="inventory-2" size={44} color={CORES.laranjaCs} />
            </View>
            <Text style={styles.vazioTitulo}>
              {busca.length > 0
                ? 'Nenhuma skin encontrada para essa busca.'
                : 'Seu inventário está vazio'}
            </Text>
            <Text style={styles.vazioSubtitulo}>
              {busca.length > 0
                ? 'Tente buscar com outros termos de arma, skin ou coleção.'
                : 'Abra caixas na aba Caixas e guarde suas skins para colecioná-las ou combiná-las em Contratos de Troca!'}
            </Text>

            {busca.length > 0 ? (
              <TouchableOpacity
                style={styles.botaoAcaoVazio}
                activeOpacity={0.7}
                onPress={() => setBusca('')}
              >
                <MaterialIcons name="refresh" size={18} color={CORES.textoInvertido} />
                <Text style={styles.textoBotaoAcaoVazio}>Limpar busca</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.botaoAcaoVazio}
                activeOpacity={0.7}
                onPress={() => router.push('/caixas')}
              >
                <MaterialIcons name="vpn-key" size={18} color={CORES.textoInvertido} />
                <Text style={styles.textoBotaoAcaoVazio}>Abrir Caixas Agora</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Modal de Ordenação do Inventário */}
      <Modal
        visible={modalOrdenacaoAberto}
        onRequestClose={() => setModalOrdenacaoAberto(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.modalFundo}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalContainer}>
            <View style={styles.modalCabecalho}>
              <View style={styles.linhaModalTitulo}>
                <MaterialIcons name="sort" size={22} color={CORES.laranjaCs} />
                <Text style={styles.modalTitulo}>Ordenar Inventário</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOrdenacaoAberto(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={20} color={CORES.textoSecundario} />
              </TouchableOpacity>
            </View>

            <View style={styles.listaModal}>
              {OPCOES_ORDENACAO.map((opcao) => {
                const ativa = opcao.id === ordenacao;
                return (
                  <TouchableOpacity
                    key={opcao.id}
                    style={[styles.opcaoModal, ativa && styles.opcaoModalAtiva]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setOrdenacao(opcao.id);
                      setModalOrdenacaoAberto(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.textoOpcaoModal,
                        ativa && styles.textoOpcaoModalAtiva,
                      ]}
                    >
                      {opcao.rotulo}
                    </Text>
                    {ativa && (
                      <MaterialIcons name="check" size={20} color={CORES.laranjaCs} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.botaoFecharModal}
              activeOpacity={0.7}
              onPress={() => setModalOrdenacaoAberto(false)}
            >
              <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
            </TouchableOpacity>
          </SafeAreaView>
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
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CORES.fundoApp,
    padding: ESPACAMENTO.xl,
  },
  textoCarregando: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '700',
    marginTop: ESPACAMENTO.md,
  },

  // Banner do Portfólio
  cabecalho: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.xs,
  },
  linhaTopoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colunaTituloBanner: {
    flex: 1,
  },
  linhaTituloComIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACAMENTO.sm,
  },
  titulo: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitulo: {
    color: CORES.textoSecundario,
    fontSize: 12.5,
    marginTop: 2,
  },
  botaoLimparTudo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: BORDAS.sm,
    paddingVertical: 5,
    paddingHorizontal: 9,
    gap: 4,
  },
  textoLimparTudo: {
    color: CORES.erro,
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
  },
  colunaResumo: {
    flex: 1,
  },
  rotuloResumo: {
    color: CORES.textoMudo,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valorResumo: {
    color: CORES.sucesso,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  badgeMoedaAtiva: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDAS.sm,
    gap: 4,
  },
  textoBadgeMoedaAtiva: {
    color: CORES.textoPrincipal,
    fontSize: 11,
    fontWeight: '800',
  },

  // Barra de Busca e Ordenação
  linhaBuscaFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.sm,
    gap: ESPACAMENTO.sm,
  },
  barraBusca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingHorizontal: ESPACAMENTO.md,
    height: 42,
  },
  iconeBusca: {
    marginRight: ESPACAMENTO.sm,
  },
  campoBusca: {
    flex: 1,
    color: CORES.textoPrincipal,
    fontSize: 13,
  },
  botaoLimparBusca: {
    padding: 4,
  },
  botaoFiltro: {
    width: 42,
    height: 42,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoFiltroAtivo: {
    backgroundColor: CORES.fundoCardElevado,
    borderColor: CORES.laranjaCs,
    borderWidth: 1.5,
  },
  faixaFiltroAtivo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: ESPACAMENTO.lg,
    marginBottom: ESPACAMENTO.sm,
    paddingHorizontal: ESPACAMENTO.sm,
  },
  textoFaixaFiltroAtivo: {
    color: CORES.textoSecundario,
    fontSize: 11,
  },
  destaqueFaixaFiltro: {
    color: CORES.laranjaBrilhante,
    fontWeight: '700',
  },
  botaoResetarFiltro: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: '700',
  },

  // Lista de Itens do Inventário
  conteudoLista: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.xs,
    paddingBottom: 28,
    gap: ESPACAMENTO.sm,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
    alignItems: 'center',
  },
  containerImagem: {
    width: 78,
    height: 68,
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: BORDAS.sm,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemSkin: {
    width: 72,
    height: 58,
  },
  semImagem: {
    width: 60,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: '700',
  },
  infoCentral: {
    flex: 1,
    marginLeft: ESPACAMENTO.md,
    marginRight: ESPACAMENTO.sm,
  },
  linhaNome: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatTrak: {
    color: CORES.laranjaCs,
    fontSize: 12.5,
    fontWeight: '900',
  },
  nomeSkin: {
    color: CORES.textoPrincipal,
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  linhaChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  chipRaridade: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  textoChipRaridade: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  condicao: {
    color: CORES.textoSecundario,
    fontSize: 10,
    flexShrink: 1,
  },

  // Medidor de Wear
  containerTrilhoWear: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  trilhoWear: {
    flex: 1,
    height: 3,
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barraProgressoWear: {
    height: '100%',
    borderRadius: 2,
  },
  textoFloatNumero: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '600',
  },

  caixaOrigem: {
    color: CORES.textoMudo,
    fontSize: 10,
    marginTop: 3,
  },
  linhaPrecoData: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  precoItem: {
    color: CORES.sucesso,
    fontSize: 14,
    fontWeight: '900',
  },
  dataItem: {
    color: CORES.textoMudo,
    fontSize: 9.5,
  },
  botaoRemover: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  textoBotaoRemover: {
    color: CORES.erro,
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },

  // Estado Vazio
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: ESPACAMENTO.lg,
  },
  circuloIconeVazio: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  vazioTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  vazioSubtitulo: {
    color: CORES.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: ESPACAMENTO.xl,
    lineHeight: 19,
  },
  botaoAcaoVazio: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: BORDAS.md,
    gap: ESPACAMENTO.sm,
  },
  textoBotaoAcaoVazio: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: '900',
  },

  // Modal de Ordenação
  modalFundo: {
    flex: 1,
    backgroundColor: CORES.fundoModal,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: CORES.fundoSuperficie,
    borderTopLeftRadius: BORDAS.xl,
    borderTopRightRadius: BORDAS.xl,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    padding: ESPACAMENTO.lg,
  },
  modalCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  linhaModalTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACAMENTO.sm,
  },
  modalTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 18,
    fontWeight: '800',
  },
  listaModal: {
    gap: ESPACAMENTO.sm,
    marginVertical: ESPACAMENTO.xs,
  },
  opcaoModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingVertical: 13,
    paddingHorizontal: ESPACAMENTO.md,
  },
  opcaoModalAtiva: {
    backgroundColor: CORES.fundoCardElevado,
    borderColor: CORES.laranjaCs,
  },
  textoOpcaoModal: {
    color: CORES.textoSecundario,
    fontSize: 15,
    fontWeight: '600',
  },
  textoOpcaoModalAtiva: {
    color: CORES.laranjaBrilhante,
    fontWeight: '800',
  },
  botaoFecharModal: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: ESPACAMENTO.md,
  },
  textoBotaoFecharModal: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '700',
  },
});
