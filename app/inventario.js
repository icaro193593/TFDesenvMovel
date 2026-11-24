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

// Chave utilizada para persistência do inventário local do usuário
const STORAGE_KEY_INVENTARIO = '@inventario_skins';

// Opções de ordenação disponíveis no modal de filtro
const OPCOES_ORDENACAO = [
  { id: 'maior_preco', rotulo: 'Maior preço' },
  { id: 'menor_preco', rotulo: 'Menor preço' },
  { id: 'mais_recente', rotulo: 'Mais recente' },
  { id: 'menos_recente', rotulo: 'Menos recente' },
];

// Extrai timestamp numérico (ms) de campos conhecidos ou do idInventario/idUnico gerado via Date.now()
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

      // Fallback para ordem de inserção (unshift mantém o mais recente no índice 0)
      const idxA = indicesOriginais.get(a) ?? 0;
      const idxB = indicesOriginais.get(b) ?? 0;
      return ordenacao === 'menos_recente' ? idxB - idxA : idxA - idxB;
    });

  // Calcula o valor total estimado de todas as skins guardadas na moeda ativa
  const valorTotalInventario = itens.reduce((acc, curr) => {
    return acc + obterValorNaMoedaAtual(curr);
  }, 0);

  // Exibição de carregamento inicial (somente no primeiro carregamento)
  if (isLoading && itens.length === 0) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.textoCarregando}>Carregando seu inventário...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {/* Cabeçalho com Título e Subtítulo */}
      <View style={styles.cabecalho}>
        <View style={styles.linhaTitulo}>
          <View>
            <Text style={styles.titulo}>Meu Inventário</Text>
            <Text style={styles.subtitulo}>
              {itens.length} {itens.length === 1 ? 'skin guardada' : 'skins guardadas'}
            </Text>
          </View>
        </View>

        {/* Card Resumo do Inventário */}
        {itens.length > 0 && (
          <View style={styles.cardResumo}>
            <View style={styles.colunaResumo}>
              <Text style={styles.rotuloResumo}>VALOR TOTAL ESTIMADO</Text>
              <Text style={styles.valorResumo}>
                {formatarPrecoMoeda(valorTotalInventario, moedaAtual)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botaoLimparTudo}
              activeOpacity={0.7}
              onPress={limparInventarioCompleto}
            >
              <MaterialIcons name="delete-sweep" size={18} color="#EF4444" />
              <Text style={styles.textoLimparTudo}>Limpar tudo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Barra de Busca e Botão de Filtro lado a lado */}
      {itens.length > 0 && (
        <View style={styles.linhaBuscaFiltro}>
          <View style={styles.barraBusca}>
            <TextInput
              style={styles.campoBusca}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar por skin, arma ou caixa..."
              placeholderTextColor="#5D79AE"
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
              color={ordenacao !== 'mais_recente' ? '#1E4C8A' : '#2B6CB0'}
            />
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
          const corRaridade = item.rarity?.color || '#2B6CB0';
          const nomeRaridade = item.rarity?.name || 'Raridade Oficial';

          return (
            <View style={[styles.cardItem, { borderLeftColor: corRaridade }]}>
              {/* Imagem da Skin */}
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

              {/* Informações Centrais */}
              <View style={styles.infoCentral}>
                <View style={styles.linhaNome}>
                  {item.isStatTrak && (
                    <Text style={styles.tagStatTrak}>ST™ </Text>
                  )}
                  <Text style={styles.nomeSkin} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>

                <Text style={[styles.raridade, { color: corRaridade }]}>
                  {nomeRaridade}
                </Text>

                {item.wearNome && (
                  <Text style={styles.condicao}>
                    {item.wearNome}
                    {item.floatValor ? ` • Float: ${item.floatValor}` : ''}
                  </Text>
                )}

                {item.nomeCaixaOrigem && (
                  <Text style={styles.caixaOrigem} numberOfLines={1}>
                    Caixa: {item.nomeCaixaOrigem}
                  </Text>
                )}

                <View style={styles.linhaPrecoData}>
                  <Text style={styles.precoItem}>
                    {formatarPrecoMoeda(obterValorNaMoedaAtual(item), moedaAtual)}
                  </Text>
                  {item.dataObtencao && (
                    <Text style={styles.dataItem}>
                      {item.dataObtencao}
                    </Text>
                  )}
                </View>
              </View>

              {/* Botão de Remover do Inventário */}
              <TouchableOpacity
                style={styles.botaoRemover}
                activeOpacity={0.7}
                onPress={() => removerItem(item.idInventario)}
              >
                <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                <Text style={styles.textoBotaoRemover}>Remover</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <View style={styles.circuloIconeVazio}>
              <MaterialIcons name="inventory-2" size={48} color="#2B6CB0" />
            </View>
            <Text style={styles.vazioTitulo}>
              {busca.length > 0
                ? 'Nenhuma skin encontrada para essa busca.'
                : 'Seu inventário está vazio'}
            </Text>
            <Text style={styles.vazioSubtitulo}>
              {busca.length > 0
                ? 'Tente buscar com outros termos.'
                : 'Abra caixas na aba "Abertura de Caixas" e clique em "Guardar no Inventário" para colecionar suas skins aqui!'}
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
                <MaterialIcons name="vpn-key" size={18} color="#0F1923" />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  textoCarregando: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  cabecalho: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  linhaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#2B6CB0',
    fontSize: 13,
    marginTop: 2,
  },
  cardResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  colunaResumo: {
    flex: 1,
  },
  rotuloResumo: {
    color: '#2B6CB0',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valorResumo: {
    color: '#1E3A5F',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  botaoLimparTudo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  textoLimparTudo: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  linhaBuscaFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    gap: 8,
  },
  barraBusca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  campoBusca: {
    flex: 1,
    color: '#1E3A5F',
    fontSize: 14,
  },
  botaoLimparBusca: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  textoLimparBusca: {
    color: '#2B6CB0',
    fontSize: 12,
    fontWeight: '600',
  },
  botaoFiltro: {
    width: 42,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoFiltroAtivo: {
    backgroundColor: '#EBF4FC',
    borderColor: '#1E4C8A',
    borderWidth: 1.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalTitulo: {
    color: '#1E4C8A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  listaModal: {
    flex: 1,
  },
  opcaoModal: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  opcaoModalAtiva: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  textoOpcaoModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: '600',
  },
  textoOpcaoModalAtiva: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botaoFecharModal: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotaoFecharModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  conteudoLista: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 10,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderLeftWidth: 5,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  containerImagem: {
    width: 75,
    height: 65,
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemSkin: {
    width: 70,
    height: 55,
  },
  semImagem: {
    width: 70,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagem: {
    color: '#2B6CB0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoCentral: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  linhaNome: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatTrak: {
    color: '#C95F08',
    fontSize: 13,
    fontWeight: 'bold',
  },
  nomeSkin: {
    color: '#1E3A5F',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  raridade: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  condicao: {
    color: '#2B6CB0',
    fontSize: 11,
    marginTop: 1,
  },
  caixaOrigem: {
    color: '#5D79AE',
    fontSize: 11,
    marginTop: 1,
  },
  linhaPrecoData: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  precoItem: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dataItem: {
    color: '#94A3B8',
    fontSize: 10,
  },
  botaoRemover: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  textoBotaoRemover: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  circuloIconeVazio: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  vazioTitulo: {
    color: '#1E4C8A',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vazioSubtitulo: {
    color: '#2B6CB0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  botaoAcaoVazio: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    gap: 8,
  },
  textoBotaoAcaoVazio: {
    color: '#0F1923',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
