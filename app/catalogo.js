import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SkinCard from '../components/SkinCard';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Endereço oficial da API ByMykel CSGO-API com todas as skins
const URL_API_SKINS =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

// Opções fixas para os filtros de Categoria e Raridade
const CATEGORIAS = [
  'Todas',
  'Pistols',
  'Rifles',
  'SMGs',
  'Heavy',
  'Knives',
  'Gloves',
  'Equipment',
];

const RARIDADES = [
  'Todas',
  'Consumer Grade',
  'Industrial Grade',
  'Mil-Spec Grade',
  'Restricted',
  'Classified',
  'Covert',
  'Contraband',
  'Extraordinary',
];

export default function CatalogoScreen() {
  // Padrão de 3 estados para consumo de API: dados, carregamento e erro
  const [skins, setSkins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados da busca por texto e dos filtros selecionados
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  const [raridadeSelecionada, setRaridadeSelecionada] = useState('Todas');

  // Modais dropdown de filtros em estilo cockpit
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [modalRaridadeAberto, setModalRaridadeAberto] = useState(false);

  // Busca o catálogo de skins na API usando fetch nativo
  const carregarSkins = () => {
    setIsLoading(true);
    setError(null);

    fetch(URL_API_SKINS)
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error('Falha ao sincronizar o arsenal de skins do CS2.');
        }
        return resposta.json();
      })
      .then((dados) => {
        setSkins(Array.isArray(dados) ? dados : []);
      })
      .catch((err) => {
        setError(err.message || 'Erro de conexão com o banco de dados.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    carregarSkins();
  }, []);

  // Restaura a busca e todos os filtros para o estado padrão
  const limparFiltros = () => {
    setBusca('');
    setCategoriaSelecionada('Todas');
    setRaridadeSelecionada('Todas');
  };

  // Filtragem combinada por busca textual, categoria e raridade otimizada com useMemo
  const skinsFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return skins.filter((item) => {
      const nomeSkin = item.name ? item.name.toLowerCase() : '';
      const nomeArma = item.weapon?.name ? item.weapon.name.toLowerCase() : '';

      const bateBusca =
        termo === '' || nomeSkin.includes(termo) || nomeArma.includes(termo);
      const bateCategoria =
        categoriaSelecionada === 'Todas' ||
        item.category?.name === categoriaSelecionada;
      const bateRaridade =
        raridadeSelecionada === 'Todas' ||
        item.rarity?.name === raridadeSelecionada;

      return bateBusca && bateCategoria && bateRaridade;
    });
  }, [skins, busca, categoriaSelecionada, raridadeSelecionada]);

  const temFiltroAtivo =
    busca.trim().length > 0 ||
    categoriaSelecionada !== 'Todas' ||
    raridadeSelecionada !== 'Todas';

  // Navega para detalhes da skin ao tocar no card
  const handleSelecionarSkin = (item) => {
    router.push({
      pathname: '/detalhes',
      params: { id: item.id, skin: JSON.stringify(item) },
    });
  };

  // 1. ESTADO DE CARREGAMENTO TÁTICO
  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <View style={styles.boxStatus}>
          <ActivityIndicator size="large" color={CORES.laranjaCs} />
          <Text style={styles.textoStatusTitulo}>SINCRONIZANDO ARSENAL CS2</Text>
          <Text style={styles.textoStatusSub}>
            Carregando catálogo com mais de 1.800 skins oficiais...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. ESTADO DE ERRO TÁTICO
  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <View style={styles.boxErro}>
          <MaterialIcons name="error-outline" size={44} color={CORES.erro} />
          <Text style={styles.textoErroTitulo}>FALHA DE COMUNICAÇÃO</Text>
          <Text style={styles.textoErroSub}>{error}</Text>
          <TouchableOpacity
            style={styles.botaoRecarregar}
            activeOpacity={0.7}
            onPress={carregarSkins}
          >
            <MaterialIcons name="refresh" size={18} color={CORES.textoInvertido} />
            <Text style={styles.textoBotaoRecarregar}>TENTAR NOVAMENTE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {/* CABEÇALHO TÁTICO COM TÍTULO E CONTADOR ESTILIZADO */}
      <View style={styles.cabecalho}>
        <View style={styles.linhaTitulo}>
          <Text style={styles.titulo}>Catálogo de Skins</Text>
          <View style={styles.badgeContador}>
            <View style={styles.pontoContador} />
            <Text style={styles.textoBadgeContador}>
              {skinsFiltradas.length}{' '}
              {skinsFiltradas.length === 1 ? 'SKIN' : 'SKINS'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitulo}>
          Arsenal de armamentos, facas, luvas e faixas de float
        </Text>
      </View>

      {/* BARRA DE BUSCA MODERNA COM ÍCONES E BOTÃO LIMPAR */}
      <View style={styles.barraBuscaContainer}>
        <View style={styles.campoBuscaWrapper}>
          <MaterialIcons
            name="search"
            size={20}
            color={CORES.textoSecundario}
            style={styles.iconeBusca}
          />
          <TextInput
            style={styles.campoBusca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por skin ou arma (ex: AK-47, Asiimov)..."
            placeholderTextColor={CORES.textoMudo}
            selectionColor={CORES.laranjaCs}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity
              style={styles.botaoLimparInput}
              activeOpacity={0.7}
              onPress={() => setBusca('')}
              accessibilityLabel="Limpar busca"
            >
              <MaterialIcons name="close" size={16} color={CORES.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* BARRA DE FILTROS ESTILO COCKPIT MILITAR */}
      <View style={styles.cockpitFiltros}>
        {/* Botão de Categoria */}
        <TouchableOpacity
          style={[
            styles.botaoFiltroCockpit,
            categoriaSelecionada !== 'Todas' && styles.botaoFiltroCockpitAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setModalCategoriaAberto(true)}
        >
          <View style={styles.conteudoFiltroCockpit}>
            <Text style={styles.rotuloFiltroCockpit}>CATEGORIA</Text>
            <Text
              style={[
                styles.valorFiltroCockpit,
                categoriaSelecionada !== 'Todas' && styles.valorFiltroCockpitAtivo,
              ]}
              numberOfLines={1}
            >
              {categoriaSelecionada}
            </Text>
          </View>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={18}
            color={
              categoriaSelecionada !== 'Todas'
                ? CORES.laranjaCs
                : CORES.textoSecundario
            }
          />
        </TouchableOpacity>

        {/* Botão de Raridade */}
        <TouchableOpacity
          style={[
            styles.botaoFiltroCockpit,
            raridadeSelecionada !== 'Todas' && styles.botaoFiltroCockpitAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setModalRaridadeAberto(true)}
        >
          <View style={styles.conteudoFiltroCockpit}>
            <Text style={styles.rotuloFiltroCockpit}>RARIDADE</Text>
            <View style={styles.linhaValorRaridade}>
              {raridadeSelecionada !== 'Todas' && (
                <View
                  style={[
                    styles.pontoRaridadeFiltro,
                    {
                      backgroundColor:
                        CORES.raridades[raridadeSelecionada] || CORES.laranjaCs,
                    },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.valorFiltroCockpit,
                  raridadeSelecionada !== 'Todas' && styles.valorFiltroCockpitAtivo,
                ]}
                numberOfLines={1}
              >
                {raridadeSelecionada}
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={18}
            color={
              raridadeSelecionada !== 'Todas'
                ? CORES.laranjaCs
                : CORES.textoSecundario
            }
          />
        </TouchableOpacity>

        {/* Botão de Reset Rápido quando houver filtro ativo */}
        {temFiltroAtivo && (
          <TouchableOpacity
            style={styles.botaoResetCockpit}
            activeOpacity={0.7}
            onPress={limparFiltros}
            accessibilityLabel="Limpar todos os filtros"
          >
            <MaterialIcons name="filter-alt-off" size={18} color={CORES.laranjaCs} />
          </TouchableOpacity>
        )}
      </View>

      {/* LISTA VIRTUALIZADA OTIMIZADA COM FLATLIST */}
      <FlatList
        style={styles.listaPrincipal}
        contentContainerStyle={styles.conteudoLista}
        data={skinsFiltradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SkinCard item={item} onPress={() => handleSelecionarSkin(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <View style={styles.circuloIconeVazio}>
              <MaterialIcons name="search-off" size={40} color={CORES.textoMudo} />
            </View>
            <Text style={styles.vazioTitulo}>Nenhuma skin encontrada</Text>
            <Text style={styles.vazioSubtitulo}>
              Não encontramos nenhum armamento correspondente aos filtros ou termos
              digitados.
            </Text>
            {temFiltroAtivo && (
              <TouchableOpacity
                style={styles.botaoResetarVazio}
                activeOpacity={0.7}
                onPress={limparFiltros}
              >
                <MaterialIcons name="restart-alt" size={18} color={CORES.textoInvertido} />
                <Text style={styles.textoBotaoResetarVazio}>LIMPAR TODOS OS FILTROS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* MODAL COCKPIT: ESCOLHA DE CATEGORIA */}
      <Modal
        visible={modalCategoriaAberto}
        onRequestClose={() => setModalCategoriaAberto(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalCabecalho}>
            <View>
              <Text style={styles.modalTitulo}>SELECIONAR CATEGORIA</Text>
              <Text style={styles.modalSubtitulo}>
                Filtre por tipo de armamento no arsenal
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalBotaoFecharIcone}
              activeOpacity={0.7}
              onPress={() => setModalCategoriaAberto(false)}
            >
              <MaterialIcons name="close" size={20} color={CORES.textoPrincipal} />
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.listaModal}
            contentContainerStyle={styles.conteudoListaModal}
            data={CATEGORIAS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const ativa = item === categoriaSelecionada;
              return (
                <TouchableOpacity
                  style={[
                    styles.opcaoModal,
                    ativa && styles.opcaoModalAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategoriaSelecionada(item);
                    setModalCategoriaAberto(false);
                  }}
                >
                  <View style={styles.opcaoModalConteudo}>
                    <Text
                      style={[
                        styles.textoOpcaoModal,
                        ativa && styles.textoOpcaoModalAtiva,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                  {ativa && (
                    <MaterialIcons name="check" size={18} color={CORES.laranjaCs} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.modalRodape}>
            <TouchableOpacity
              style={styles.botaoConfirmarModal}
              activeOpacity={0.7}
              onPress={() => setModalCategoriaAberto(false)}
            >
              <Text style={styles.textoBotaoConfirmarModal}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL COCKPIT: ESCOLHA DE RARIDADE */}
      <Modal
        visible={modalRaridadeAberto}
        onRequestClose={() => setModalRaridadeAberto(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalCabecalho}>
            <View>
              <Text style={styles.modalTitulo}>SELECIONAR RARIDADE</Text>
              <Text style={styles.modalSubtitulo}>
                Padrão de patentes e raridades oficiais CS2
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalBotaoFecharIcone}
              activeOpacity={0.7}
              onPress={() => setModalRaridadeAberto(false)}
            >
              <MaterialIcons name="close" size={20} color={CORES.textoPrincipal} />
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.listaModal}
            contentContainerStyle={styles.conteudoListaModal}
            data={RARIDADES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const ativa = item === raridadeSelecionada;
              const corRaridade = CORES.raridades[item] || CORES.textoSecundario;

              return (
                <TouchableOpacity
                  style={[
                    styles.opcaoModal,
                    ativa && styles.opcaoModalAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setRaridadeSelecionada(item);
                    setModalRaridadeAberto(false);
                  }}
                >
                  <View style={styles.opcaoModalConteudo}>
                    {item !== 'Todas' && (
                      <View
                        style={[
                          styles.pontoRaridadeOpcao,
                          { backgroundColor: corRaridade },
                        ]}
                      />
                    )}
                    <Text
                      style={[
                        styles.textoOpcaoModal,
                        item !== 'Todas' && { color: corRaridade },
                        ativa && styles.textoOpcaoModalAtiva,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                  {ativa && (
                    <MaterialIcons name="check" size={18} color={CORES.laranjaCs} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.modalRodape}>
            <TouchableOpacity
              style={styles.botaoConfirmarModal}
              activeOpacity={0.7}
              onPress={() => setModalRaridadeAberto(false)}
            >
              <Text style={styles.textoBotaoConfirmarModal}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    backgroundColor: CORES.fundoApp,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.xl,
  },
  boxStatus: {
    alignItems: 'center',
    padding: ESPACAMENTO.xl,
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.lg,
    width: '100%',
  },
  textoStatusTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: ESPACAMENTO.md,
  },
  textoStatusSub: {
    color: CORES.textoSecundario,
    fontSize: 12,
    textAlign: 'center',
    marginTop: ESPACAMENTO.xs,
  },
  boxErro: {
    alignItems: 'center',
    padding: ESPACAMENTO.xl,
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: BORDAS.lg,
    width: '100%',
  },
  textoErroTitulo: {
    color: CORES.erro,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: ESPACAMENTO.sm,
  },
  textoErroSub: {
    color: CORES.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: ESPACAMENTO.md,
  },
  botaoRecarregar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.laranjaCs,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BORDAS.md,
    gap: 8,
  },
  textoBotaoRecarregar: {
    color: CORES.textoInvertido,
    fontSize: 13,
    fontWeight: '800',
  },
  // CABEÇALHO
  cabecalho: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.sm,
  },
  linhaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeContador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDAS.pill,
  },
  pontoContador: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CORES.laranjaCs,
    marginRight: 6,
  },
  textoBadgeContador: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitulo: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  // BARRA DE BUSCA
  barraBuscaContainer: {
    paddingHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.sm,
    marginBottom: ESPACAMENTO.sm,
  },
  campoBuscaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingHorizontal: ESPACAMENTO.md,
    height: 44,
  },
  iconeBusca: {
    marginRight: 8,
  },
  campoBusca: {
    flex: 1,
    color: CORES.textoPrincipal,
    fontSize: 14,
    paddingVertical: 0,
  },
  botaoLimparInput: {
    padding: 4,
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: BORDAS.pill,
  },
  // COCKPIT DE FILTROS
  cockpitFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACAMENTO.lg,
    marginBottom: ESPACAMENTO.md,
    gap: 8,
  },
  botaoFiltroCockpit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  botaoFiltroCockpitAtivo: {
    borderColor: CORES.laranjaCs,
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
  },
  conteudoFiltroCockpit: {
    flex: 1,
    marginRight: 4,
  },
  rotuloFiltroCockpit: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  valorFiltroCockpit: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  valorFiltroCockpitAtivo: {
    color: CORES.laranjaCs,
  },
  linhaValorRaridade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  pontoRaridadeFiltro: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  botaoResetCockpit: {
    width: 44,
    height: 44,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    borderRadius: BORDAS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // LISTA
  listaPrincipal: {
    flex: 1,
  },
  conteudoLista: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingBottom: ESPACAMENTO.xxl + 8,
  },
  separador: {
    height: 10,
  },
  // ESTADO VAZIO
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: ESPACAMENTO.lg,
  },
  circuloIconeVazio: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
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
    lineHeight: 18,
    marginBottom: ESPACAMENTO.lg,
  },
  botaoResetarVazio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.laranjaCs,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: BORDAS.md,
    gap: 6,
  },
  textoBotaoResetarVazio: {
    color: CORES.textoInvertido,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // MODAIS
  modalSafeArea: {
    flex: 1,
    backgroundColor: CORES.fundoApp,
  },
  modalCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ESPACAMENTO.lg,
    paddingVertical: ESPACAMENTO.lg,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },
  modalTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modalSubtitulo: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  modalBotaoFecharIcone: {
    width: 36,
    height: 36,
    borderRadius: BORDAS.sm,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listaModal: {
    flex: 1,
  },
  conteudoListaModal: {
    padding: ESPACAMENTO.lg,
    gap: 8,
  },
  opcaoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  opcaoModalAtiva: {
    borderColor: CORES.laranjaCs,
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
  },
  opcaoModalConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pontoRaridadeOpcao: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  textoOpcaoModal: {
    color: CORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '600',
  },
  textoOpcaoModalAtiva: {
    color: CORES.laranjaCs,
    fontWeight: '800',
  },
  modalRodape: {
    padding: ESPACAMENTO.lg,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  botaoConfirmarModal: {
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  textoBotaoConfirmarModal: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
