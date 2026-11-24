import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';

// Chave utilizada para persistência do inventário local do usuário
const STORAGE_KEY_INVENTARIO = '@inventario_skins';

export default function InventarioScreen() {
  const [itens, setItens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

  // Carrega as skins salvas no AsyncStorage
  const carregarInventario = () => {
    setIsLoading(true);
    AsyncStorage.getItem(STORAGE_KEY_INVENTARIO)
      .then((dados) => {
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

  // Atualiza automaticamente o inventário toda vez que o usuário entra na aba
  useFocusEffect(
    useCallback(() => {
      carregarInventario();
    }, [])
  );

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
      const precoA = a.valorNumerico || 0;
      const precoB = b.valorNumerico || 0;
      if (ordenacao === 'maior_valor') {
        return precoB - precoA;
      }
      if (ordenacao === 'menor_valor') {
        return precoA - precoB;
      }
      // Padrão: mais recentes (ordem de inserção natural)
      return 0;
    });

  // Calcula o valor total estimado de todas as skins guardadas
  const valorTotalInventario = itens.reduce((acc, curr) => {
    return acc + (curr.valorNumerico || 0);
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
                $ {valorTotalInventario.toFixed(2)} USD
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

      {/* Barra de Busca */}
      {itens.length > 0 && (
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
      )}

      {/* Filtros de Ordenação */}
      {itens.length > 0 && (
        <View style={styles.linhaOrdenacao}>
          <TouchableOpacity
            style={[
              styles.botaoOrdenacao,
              ordenacao === 'recentes' && styles.botaoOrdenacaoAtivo,
            ]}
            activeOpacity={0.7}
            onPress={() => setOrdenacao('recentes')}
          >
            <Text
              style={[
                styles.textoOrdenacao,
                ordenacao === 'recentes' && styles.textoOrdenacaoAtivo,
              ]}
            >
              Mais Recentes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoOrdenacao,
              ordenacao === 'maior_valor' && styles.botaoOrdenacaoAtivo,
            ]}
            activeOpacity={0.7}
            onPress={() => setOrdenacao('maior_valor')}
          >
            <Text
              style={[
                styles.textoOrdenacao,
                ordenacao === 'maior_valor' && styles.textoOrdenacaoAtivo,
              ]}
            >
              Maior Preço
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoOrdenacao,
              ordenacao === 'menor_valor' && styles.botaoOrdenacaoAtivo,
            ]}
            activeOpacity={0.7}
            onPress={() => setOrdenacao('menor_valor')}
          >
            <Text
              style={[
                styles.textoOrdenacao,
                ordenacao === 'menor_valor' && styles.textoOrdenacaoAtivo,
              ]}
            >
              Menor Preço
            </Text>
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
                    {item.preco || '$ 0.00 USD'}
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
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
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
  linhaOrdenacao: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  botaoOrdenacao: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  botaoOrdenacaoAtivo: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  textoOrdenacao: {
    color: '#1E4C8A',
    fontSize: 11,
    fontWeight: '600',
  },
  textoOrdenacaoAtivo: {
    color: '#FFFFFF',
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
