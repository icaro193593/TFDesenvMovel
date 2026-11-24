import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CaseCard from '../components/CaseCard';
import RouletteItem from '../components/RouletteItem';
import { obterPrecoSkin } from '../services/priceService';

// Endereço oficial da API ByMykel CSGO-API com todas as caixas do jogo
const URL_API_CRATES =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json';

// Largura fixa de cada card na esteira da roleta (em pixels)
const LARGURA_CARD_ROLETA = 130;
const MARGEM_CARD_ROLETA = 8;
const PASSO_ROLETA = LARGURA_CARD_ROLETA + MARGEM_CARD_ROLETA;

// Posição fixa do item vencedor na esteira (índice 38 de 50 itens)
const INDICE_VENCEDOR = 38;
const TOTAL_ITENS_ROLETA = 50;

// Probabilidades oficiais do CS2 para abertura de caixas
const PROBABILIDADES = [
  { tipo: 'milspec', peso: 0.7992, nome: 'Mil-Spec Grade', cor: '#4b69ff' },
  { tipo: 'restricted', peso: 0.1598, nome: 'Restricted', cor: '#8847ff' },
  { tipo: 'classified', peso: 0.0320, nome: 'Classified', cor: '#d32ce6' },
  { tipo: 'covert', peso: 0.0064, nome: 'Covert', cor: '#eb4b4b' },
  { tipo: 'special', peso: 0.0026, nome: '★ Special Rare Item', cor: '#ffd700' },
];

export default function CaixasScreen() {
  // Lista de caixas carregadas da API
  const [caixas, setCaixas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros da tela inicial de caixas
  const [busca, setBusca] = useState('');
  const [somenteArmas, setSomenteArmas] = useState(true);

  // Estado da caixa atualmente selecionada para abertura (null = lista de caixas)
  const [caixaSelecionada, setCaixaSelecionada] = useState(null);

  // Estados da esteira da roleta
  const [itensRoleta, setItensRoleta] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [larguraViewport, setLarguraViewport] = useState(360);
  const [indiceDestacado, setIndiceDestacado] = useState(null);

  // Estados do resultado e modal de revelação da skin ganha
  const [skinGanha, setSkinGanha] = useState(null);
  const [dadosPreco, setDadosPreco] = useState(null);
  const [buscandoPreco, setBuscandoPreco] = useState(false);
  const [modalRevelacaoAberto, setModalRevelacaoAberto] = useState(false);
  const [salvoFavoritos, setSalvoFavoritos] = useState(false);

  // Aba selecionada na visualização de conteúdo da caixa ('todas' ou 'raras')
  const [abaConteudo, setAbaConteudo] = useState('todas');

  // Referência do FlatList da esteira para controle de scroll
  const roletaRef = useRef(null);
  // Referência para guardar o identificador do setInterval da animação
  const timerAnimacaoRef = useRef(null);

  // 1. Carrega todas as caixas da API do CS2
  const carregarCaixas = () => {
    setIsLoading(true);
    setError(null);

    fetch(URL_API_CRATES)
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error('Falha ao conectar com a API de caixas do CS2.');
        }
        return resposta.json();
      })
      .then((dados) => {
        // Filtra itens que possuem conteúdo de skins
        const caixasComSkins = dados.filter(
          (c) => c.contains && c.contains.length > 0
        );
        setCaixas(caixasComSkins);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    carregarCaixas();

    // Limpeza de timers ao desmontar o componente (Seção 4.4 do Tutorial)
    return () => {
      if (timerAnimacaoRef.current) {
        clearInterval(timerAnimacaoRef.current);
      }
    };
  }, []);

  // 2. Monta uma esteira inicial para a caixa selecionada
  useEffect(() => {
    if (caixaSelecionada) {
      prepararEsteiraInicial(caixaSelecionada);
    }
  }, [caixaSelecionada]);

  // Gera uma esteira de visualização estática antes de girar
  const prepararEsteiraInicial = (caixa) => {
    const skinsDisponiveis = caixa.contains || [];
    if (skinsDisponiveis.length === 0) return;

    const esteira = [];
    for (let i = 0; i < TOTAL_ITENS_ROLETA; i++) {
      const skinAleatoria =
        skinsDisponiveis[Math.floor(Math.random() * skinsDisponiveis.length)];
      esteira.push({
        ...skinAleatoria,
        idUnico: `preview-${i}-${skinAleatoria.id}`,
      });
    }
    setItensRoleta(esteira);
    setIndiceDestacado(null);
    if (roletaRef.current) {
      roletaRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  };

  // 3. Mecanismo de Sorteio com as probabilidades oficiais do CS2
  const sortearSkin = (caixa) => {
    const rand = Math.random();
    let acumulado = 0;
    let raridadeSorteada = PROBABILIDADES[0];

    for (let i = 0; i < PROBABILIDADES.length; i++) {
      acumulado += PROBABILIDADES[i].peso;
      if (rand <= acumulado) {
        raridadeSorteada = PROBABILIDADES[i];
        break;
      }
    }

    let skinEscolhida = null;
    let isFacaOuLuva = false;

    // Caso caia em Item Especial Raro (Faca / Luva)
    if (
      raridadeSorteada.tipo === 'special' &&
      caixa.contains_rare &&
      caixa.contains_rare.length > 0
    ) {
      const raras = caixa.contains_rare;
      skinEscolhida = raras[Math.floor(Math.random() * raras.length)];
      isFacaOuLuva = true;
    } else {
      // Filtra as skins normais da caixa que batem com a raridade sorteada
      const candidatas = (caixa.contains || []).filter((s) => {
        const nomeRaridade = (s.rarity?.name || '').toLowerCase();
        if (raridadeSorteada.tipo === 'milspec') return nomeRaridade.includes('mil-spec');
        if (raridadeSorteada.tipo === 'restricted') return nomeRaridade.includes('restricted');
        if (raridadeSorteada.tipo === 'classified') return nomeRaridade.includes('classified');
        if (raridadeSorteada.tipo === 'covert') return nomeRaridade.includes('covert');
        return false;
      });

      if (candidatas.length > 0) {
        skinEscolhida = candidatas[Math.floor(Math.random() * candidatas.length)];
      } else {
        // Fallback caso a caixa não tenha essa raridade específica
        const todas = caixa.contains || [];
        skinEscolhida = todas[Math.floor(Math.random() * todas.length)];
      }
    }

    // Sorteia condição de uso (wear) e float
    const floatValor = Number((Math.random() * 0.999 + 0.001).toFixed(6));
    let wearNome = 'Field-Tested';
    if (floatValor < 0.07) wearNome = 'Factory New';
    else if (floatValor < 0.15) wearNome = 'Minimal Wear';
    else if (floatValor < 0.38) wearNome = 'Field-Tested';
    else if (floatValor < 0.45) wearNome = 'Well-Worn';
    else wearNome = 'Battle-Scarred';

    // 10% de chance de ser StatTrak™
    const isStatTrak = Math.random() < 0.1;

    return {
      skin: skinEscolhida,
      floatValor,
      wearNome,
      isStatTrak,
      isFacaOuLuva,
    };
  };

  // 4. Executa a Animação da Roleta do CS2
  const iniciarAbertura = () => {
    if (isSpinning || !caixaSelecionada) return;

    // Reseta estados anteriores
    setIsSpinning(true);
    setIndiceDestacado(null);
    setSkinGanha(null);
    setDadosPreco(null);
    setSalvoFavoritos(false);

    // Sorteia a skin vencedora
    const resultado = sortearSkin(caixaSelecionada);
    const skinVencedora = resultado.skin;

    // Monta a esteira de 50 skins colocando a vencedora no índice 38
    const skinsBase = caixaSelecionada.contains || [];
    const novaEsteira = [];

    for (let i = 0; i < TOTAL_ITENS_ROLETA; i++) {
      if (i === INDICE_VENCEDOR) {
        novaEsteira.push({
          ...skinVencedora,
          idUnico: `vencedor-${i}-${skinVencedora.id}`,
        });
      } else {
        // Skins aleatórias com chance de incluir itens raros para criar suspense
        let itemSorteado;
        if (
          Math.random() < 0.05 &&
          caixaSelecionada.contains_rare &&
          caixaSelecionada.contains_rare.length > 0
        ) {
          const raras = caixaSelecionada.contains_rare;
          itemSorteado = raras[Math.floor(Math.random() * raras.length)];
        } else {
          itemSorteado = skinsBase[Math.floor(Math.random() * skinsBase.length)];
        }
        novaEsteira.push({
          ...itemSorteado,
          idUnico: `esteira-${i}-${itemSorteado?.id || i}`,
        });
      }
    }

    setItensRoleta(novaEsteira);

    // Reposiciona o FlatList no início
    if (roletaRef.current) {
      roletaRef.current.scrollToOffset({ offset: 0, animated: false });
    }

    // Calcula o deslocamento exato para centralizar o item vencedor sob a agulha
    // Adiciona uma pequena variação aleatória (-25 a +25px) para não parar sempre milimetricamente igual
    const variacao = (Math.random() - 0.5) * 50;
    const offsetCentro =
      INDICE_VENCEDOR * PASSO_ROLETA -
      larguraViewport / 2 +
      LARGURA_CARD_ROLETA / 2 +
      variacao;

    const duracaoTotal = 4600; // 4.6 segundos de rotação
    const tempoInicio = Date.now();

    // Inicia a animação de desaceleração suave (Ease-Out Cubic) via setInterval
    if (timerAnimacaoRef.current) {
      clearInterval(timerAnimacaoRef.current);
    }

    timerAnimacaoRef.current = setInterval(() => {
      const agora = Date.now();
      const tempoPassado = agora - tempoInicio;
      const progresso = Math.min(1, tempoPassado / duracaoTotal);

      // Curva cúbica: desacelera realisticamente imitando o jogo
      const ease = 1 - Math.pow(1 - progresso, 3);
      const deslocamentoAtual = offsetCentro * ease;

      if (roletaRef.current) {
        roletaRef.current.scrollToOffset({
          offset: deslocamentoAtual,
          animated: false,
        });
      }

      if (progresso >= 1) {
        clearInterval(timerAnimacaoRef.current);
        timerAnimacaoRef.current = null;
        setIsSpinning(false);
        setIndiceDestacado(INDICE_VENCEDOR);

        // Prepara os dados completos do prêmio
        const premioCompleto = {
          ...skinVencedora,
          floatValor: resultado.floatValor,
          wearNome: resultado.wearNome,
          isStatTrak: resultado.isStatTrak,
          isFacaOuLuva: resultado.isFacaOuLuva,
          nomeCaixaOrigem: caixaSelecionada.name,
        };
        setSkinGanha(premioCompleto);

        // Dispara busca do preço via API PriceEmpire (com fallback)
        buscarPrecoItem(premioCompleto);

        // Pequena pausa dramática de 700ms antes de abrir o modal revelador
        setTimeout(() => {
          setModalRevelacaoAberto(true);
        }, 700);
      }
    }, 16);
  };

  // 5. Consulta de Preço via API PriceEmpire
  const buscarPrecoItem = (item) => {
    setBuscandoPreco(true);
    setDadosPreco(null);

    const raridade = item.rarity?.name || 'Mil-Spec Grade';
    obterPrecoSkin(item.name, raridade, item.wearNome, item.isStatTrak)
      .then((resposta) => {
        setDadosPreco(resposta);
      })
      .catch(() => {
        setDadosPreco({
          precoFormatado: '$ 15.00 USD',
          fonte: 'Mercado CS2 (Estimado)',
          valorNumerico: 15.0,
        });
      })
      .finally(() => {
        setBuscandoPreco(false);
      });
  };

  // 6. Salvar skin aberta no AsyncStorage (Inventário)
  const salvarSkinNoInventario = () => {
    if (!skinGanha) return;

    AsyncStorage.getItem('@inventario_skins')
      .then((dados) => {
        const listaAtual = dados ? JSON.parse(dados) : [];
        const itemParaSalvar = {
          ...skinGanha,
          idInventario: `${skinGanha.id}-${Date.now()}`,
          dataObtencao: new Date().toLocaleDateString('pt-BR'),
          preco: dadosPreco ? dadosPreco.precoFormatado : '$ 15.00 USD',
          valorNumerico: dadosPreco?.valorNumerico || 15.0,
        };
        listaAtual.unshift(itemParaSalvar);
        return AsyncStorage.setItem(
          '@inventario_skins',
          JSON.stringify(listaAtual)
        );
      })
      .then(() => {
        setSalvoFavoritos(true);
      })
      .catch((err) => {
        console.error('Erro ao salvar no inventário:', err);
      });
  };

  // Filtragem das caixas na lista principal
  const caixasFiltradas = caixas.filter((item) => {
    const nome = (item.name || '').toLowerCase();
    const termo = busca.trim().toLowerCase();
    const bateTexto = termo === '' || nome.includes(termo);

    if (somenteArmas) {
      const ehArma =
        item.type === 'Case' ||
        (item.name && item.name.toLowerCase().includes('case'));
      return bateTexto && ehArma;
    }

    return bateTexto;
  });

  // Tela de carregamento inicial
  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.textoCarregando}>Carregando caixas do CS2...</Text>
      </SafeAreaView>
    );
  }

  // Tela de erro de conexão
  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoErro}>{error}</Text>
        <TouchableOpacity
          style={styles.botaoRecarregar}
          activeOpacity={0.7}
          onPress={carregarCaixas}
        >
          <Text style={styles.textoBotaoRecarregar}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MODO 1: DETALHES E ABERTURA DA CAIXA SELECIONADA
  // =========================================================================
  if (caixaSelecionada) {
    const skinsCaixa = caixaSelecionada.contains || [];
    const rarasCaixa = caixaSelecionada.contains_rare || [];
    const listaExibicao = abaConteudo === 'raras' ? rarasCaixa : skinsCaixa;

    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
        <ScrollView style={styles.scrollAbertura} showsVerticalScrollIndicator={false}>
          {/* Botão de navegação superior para retornar à lista de caixas */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            activeOpacity={0.7}
            onPress={() => {
              if (timerAnimacaoRef.current) {
                clearInterval(timerAnimacaoRef.current);
              }
              setIsSpinning(false);
              setCaixaSelecionada(null);
            }}
          >
            <MaterialIcons name="arrow-back" size={20} color="#1E4C8A" />
            <Text style={styles.textoBotaoVoltar}>Voltar para todas as caixas</Text>
          </TouchableOpacity>

          {/* Cabeçalho da Caixa Selecionada */}
          <View style={styles.cabecalhoCaixa}>
            {caixaSelecionada.image && (
              <Image
                source={{ uri: caixaSelecionada.image }}
                style={styles.imagemCaixaTopo}
                resizeMode="contain"
              />
            )}
            <View style={styles.infoCaixaTopo}>
              <Text style={styles.nomeCaixaTopo}>{caixaSelecionada.name}</Text>
              <Text style={styles.subtituloCaixaTopo}>
                {skinsCaixa.length} skins disponíveis + itens raros especiais
              </Text>
            </View>
          </View>

          {/* CÂMARA DA ROLETA (MECANISMO DO JOGO) */}
          <View
            style={styles.containerRoleta}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              if (width > 0) setLarguraViewport(width);
            }}
          >
            <View style={styles.topoRoleta}>
              <Text style={styles.tituloRoleta}>SIMULADOR DE ABERTURA</Text>
              <Text style={styles.subtituloRoleta}>
                {isSpinning ? 'Girando a caixa...' : 'Clique abaixo para abrir'}
              </Text>
            </View>

            {/* Marcador Central (Agulha Dourada Superior e Inferior) */}
            <View style={styles.areaEsteira}>
              <View style={styles.marcadorSuperior} />
              <View style={styles.linhaCentral} />
              <View style={styles.marcadorInferior} />

              {/* Esteira Horizontal de Skins */}
              <FlatList
                ref={roletaRef}
                data={itensRoleta}
                keyExtractor={(item, index) => item.idUnico || `${item.id}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.conteudoRoleta}
                renderItem={({ item, index }) => (
                  <RouletteItem
                    item={item}
                    largura={LARGURA_CARD_ROLETA}
                    isDestaque={indiceDestacado === index}
                  />
                )}
              />
            </View>

            {/* Botão de Ação: ABRIR CAIXA */}
            <TouchableOpacity
              style={[styles.botaoAbrirCaixa, isSpinning && styles.botaoAbrirDesativado]}
              activeOpacity={0.8}
              disabled={isSpinning}
              onPress={iniciarAbertura}
            >
              <MaterialIcons
                name={isSpinning ? 'hourglass-empty' : 'vpn-key'}
                size={22}
                color="#0F1923"
              />
              <Text style={styles.textoBotaoAbrirCaixa}>
                {isSpinning ? 'ABRINDO CAIXA...' : 'ABRIR CAIXA'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEÇÃO: SKINS CONTIDAS NA CAIXA */}
          <View style={styles.secaoConteudo}>
            <View style={styles.cabecalhoSecao}>
              <Text style={styles.tituloSecao}>Conteúdo da Caixa</Text>
              <View style={styles.abasConteudo}>
                <TouchableOpacity
                  style={[
                    styles.abaItem,
                    abaConteudo === 'todas' && styles.abaItemAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setAbaConteudo('todas')}
                >
                  <Text
                    style={[
                      styles.textoAba,
                      abaConteudo === 'todas' && styles.textoAbaAtiva,
                    ]}
                  >
                    Skins ({skinsCaixa.length})
                  </Text>
                </TouchableOpacity>

                {rarasCaixa.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.abaItem,
                      abaConteudo === 'raras' && styles.abaItemAtiva,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setAbaConteudo('raras')}
                  >
                    <Text
                      style={[
                        styles.textoAba,
                        abaConteudo === 'raras' && styles.textoAbaAtiva,
                      ]}
                    >
                      ★ Especiais Raras ({rarasCaixa.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Grade com todas as skins da caixa */}
            <View style={styles.gradeSkins}>
              {listaExibicao.map((item, index) => {
                const corRaridade = item.rarity?.color || '#2B6CB0';
                return (
                  <View
                    key={`${item.id}-${index}`}
                    style={[styles.cardSkinGrade, { borderLeftColor: corRaridade }]}
                  >
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.imagemSkinGrade}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.semImagemGrade}>
                        <Text style={styles.textoSemImagemGrade}>CS2</Text>
                      </View>
                    )}
                    <View style={styles.infoSkinGrade}>
                      <Text style={styles.nomeSkinGrade} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.raridadeSkinGrade, { color: corRaridade }]}
                        numberOfLines={1}
                      >
                        {item.rarity?.name || 'Raridade Oficial'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* MODAL DE REVELAÇÃO DA SKIN (ANIMAÇÃO AO RECEBER O ITEM) */}
        <Modal
          visible={modalRevelacaoAberto}
          animationType="slide"
          transparent
          onRequestClose={() => setModalRevelacaoAberto(false)}
        >
          <View style={styles.modalFundo}>
            <View
              style={[
                styles.modalCard,
                {
                  borderColor:
                    skinGanha?.rarity?.color ||
                    (skinGanha?.isFacaOuLuva ? '#FFD700' : '#F58220'),
                },
              ]}
            >
              <Text style={styles.modalParabens}>PARABÉNS!</Text>
              <Text style={styles.modalSubparabens}>Você abriu e recebeu:</Text>

              {/* Tag StatTrak™ ou Item Especial */}
              {skinGanha?.isStatTrak && (
                <View style={styles.badgeStatTrak}>
                  <Text style={styles.textoBadgeStatTrak}>StatTrak™</Text>
                </View>
              )}

              {/* Imagem em Destaque da Skin Ganha */}
              <View style={styles.modalContainerImagem}>
                {skinGanha?.image && (
                  <Image
                    source={{ uri: skinGanha.image }}
                    style={styles.modalImagem}
                    resizeMode="contain"
                  />
                )}
              </View>

              {/* Informações da Skin */}
              <Text style={styles.modalNomeSkin}>{skinGanha?.name}</Text>

              <View
                style={[
                  styles.badgeRaridadeModal,
                  {
                    backgroundColor:
                      skinGanha?.rarity?.color ||
                      (skinGanha?.isFacaOuLuva ? '#FFD700' : '#4b69ff'),
                  },
                ]}
              >
                <Text style={styles.textoBadgeRaridadeModal}>
                  {skinGanha?.rarity?.name || 'Item Especial Raro'}
                </Text>
              </View>

              <Text style={styles.modalCondicao}>
                {skinGanha?.wearNome} • Float: {skinGanha?.floatValor}
              </Text>

              {/* Card de Preço via API PriceEmpire */}
              <View style={styles.boxPreco}>
                <Text style={styles.tituloBoxPreco}>VALOR DE MERCADO</Text>
                {buscandoPreco ? (
                  <View style={styles.linhaCarregandoPreco}>
                    <ActivityIndicator size="small" color="#F58220" />
                    <Text style={styles.textoCarregandoPreco}>
                      Consultando PriceEmpire...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.linhaPreco}>
                    <Text style={styles.valorPreco}>
                      {dadosPreco?.precoFormatado || '$ 0.00 USD'}
                    </Text>
                    <Text style={styles.fontePreco}>
                      {dadosPreco?.fonte ? `via ${dadosPreco.fonte}` : 'via PriceEmpire'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ações do Modal */}
              <View style={styles.acoesModal}>
                <TouchableOpacity
                  style={styles.botaoAbrirNovamente}
                  activeOpacity={0.7}
                  onPress={() => {
                    setModalRevelacaoAberto(false);
                    setTimeout(() => {
                      iniciarAbertura();
                    }, 400);
                  }}
                >
                  <MaterialIcons name="refresh" size={18} color="#0F1923" />
                  <Text style={styles.textoBotaoAbrirNovamente}>Abrir Outra Vez</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botaoSalvarFavorito,
                    salvoFavoritos && styles.botaoSalvarFavoritoAtivo,
                  ]}
                  activeOpacity={0.7}
                  disabled={salvoFavoritos}
                  onPress={salvarSkinNoInventario}
                >
                  <MaterialIcons
                    name={salvoFavoritos ? 'check' : 'inventory-2'}
                    size={18}
                    color={salvoFavoritos ? '#FFFFFF' : '#1E4C8A'}
                  />
                  <Text
                    style={[
                      styles.textoBotaoSalvar,
                      salvoFavoritos && styles.textoBotaoSalvarAtivo,
                    ]}
                  >
                    {salvoFavoritos ? 'Guardado no Inventário!' : 'Guardar no Inventário'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoFecharModal}
                  activeOpacity={0.7}
                  onPress={() => setModalRevelacaoAberto(false)}
                >
                  <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MODO 2: LISTAGEM DE TODAS AS CAIXAS DO CS2
  // =========================================================================
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {/* Cabeçalho da tela de Caixas */}
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Abertura de Caixas</Text>
        <Text style={styles.contador}>
          {caixasFiltradas.length}{' '}
          {caixasFiltradas.length === 1 ? 'caixa disponível' : 'caixas disponíveis'}
        </Text>
      </View>

      {/* Barra de Busca de Caixas */}
      <View style={styles.barraBusca}>
        <TextInput
          style={styles.campoBusca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar caixa (ex: Kilowatt, Dreams, Revolution)..."
          placeholderTextColor="#5D79AE"
        />
        {busca.length > 0 && (
          <TouchableOpacity
            style={styles.botaoLimpar}
            activeOpacity={0.7}
            onPress={() => setBusca('')}
          >
            <Text style={styles.textoLimpar}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Seletor de Tipo: Caixas de Armas vs Todas as Caixas */}
      <View style={styles.linhaFiltroTipo}>
        <TouchableOpacity
          style={[
            styles.botaoFiltroTipo,
            somenteArmas && styles.botaoFiltroTipoAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setSomenteArmas(true)}
        >
          <Text
            style={[
              styles.textoFiltroTipo,
              somenteArmas && styles.textoFiltroTipoAtivo,
            ]}
          >
            Caixas de Armas (42)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botaoFiltroTipo,
            !somenteArmas && styles.botaoFiltroTipoAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setSomenteArmas(false)}
        >
          <Text
            style={[
              styles.textoFiltroTipo,
              !somenteArmas && styles.textoFiltroTipoAtivo,
            ]}
          >
            Todas as Caixas & Cápsulas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grade com todas as caixas */}
      <FlatList
        data={caixasFiltradas}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gradeCaixas}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CaseCard item={item} onPress={(caixa) => setCaixaSelecionada(caixa)} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <Text style={styles.vazioTitulo}>Nenhuma caixa encontrada.</Text>
            <Text style={styles.vazioSubtitulo}>
              Tente buscar por outro termo ou mude o filtro para todas as caixas.
            </Text>
            <TouchableOpacity
              style={styles.botaoAcao}
              activeOpacity={0.7}
              onPress={() => {
                setBusca('');
                setSomenteArmas(true);
              }}
            >
              <Text style={styles.textoBotaoAcao}>Redefinir busca</Text>
            </TouchableOpacity>
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
  textoErro: {
    color: '#EF4444',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  botaoRecarregar: {
    backgroundColor: '#F58220',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textoBotaoRecarregar: {
    color: '#0F1923',
    fontWeight: 'bold',
  },
  cabecalho: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titulo: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  contador: {
    color: '#2B6CB0',
    fontSize: 13,
    marginTop: 2,
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  campoBusca: {
    flex: 1,
    color: '#1E3A5F',
    fontSize: 14,
  },
  botaoLimpar: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  textoLimpar: {
    color: '#2B6CB0',
    fontSize: 12,
    fontWeight: '600',
  },
  linhaFiltroTipo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  botaoFiltroTipo: {
    flex: 1,
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  botaoFiltroTipoAtivo: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  textoFiltroTipo: {
    color: '#1E4C8A',
    fontSize: 12,
    fontWeight: '600',
  },
  textoFiltroTipoAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  gradeCaixas: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  vazioContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
  },
  vazioTitulo: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vazioSubtitulo: {
    color: '#2B6CB0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  botaoAcao: {
    backgroundColor: '#F58220',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textoBotaoAcao: {
    color: '#0F1923',
    fontWeight: 'bold',
  },

  // Estilos da Tela de Abertura da Caixa Selecionada
  scrollAbertura: {
    flex: 1,
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  textoBotaoVoltar: {
    color: '#1E4C8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cabecalhoCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FC',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#68A3E5',
  },
  imagemCaixaTopo: {
    width: 65,
    height: 60,
  },
  infoCaixaTopo: {
    flex: 1,
    marginLeft: 12,
  },
  nomeCaixaTopo: {
    color: '#1E3A5F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtituloCaixaTopo: {
    color: '#2B6CB0',
    fontSize: 12,
    marginTop: 2,
  },

  // Câmara da Roleta
  containerRoleta: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topoRoleta: {
    alignItems: 'center',
    marginBottom: 10,
  },
  tituloRoleta: {
    color: '#F58220',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtituloRoleta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  areaEsteira: {
    height: 160,
    backgroundColor: '#020617',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  marcadorSuperior: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F58220',
    zIndex: 10,
  },
  linhaCentral: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignSelf: 'center',
    width: 2,
    backgroundColor: '#F58220',
    opacity: 0.8,
    zIndex: 9,
  },
  marcadorInferior: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F58220',
    zIndex: 10,
  },
  conteudoRoleta: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  botaoAbrirCaixa: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  botaoAbrirDesativado: {
    opacity: 0.6,
  },
  textoBotaoAbrirCaixa: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Seção de Conteúdo da Caixa
  secaoConteudo: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  cabecalhoSecao: {
    marginBottom: 12,
  },
  tituloSecao: {
    color: '#1E4C8A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  abasConteudo: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  abaItem: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  abaItemAtiva: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  textoAba: {
    color: '#1E4C8A',
    fontSize: 12,
    fontWeight: '600',
  },
  textoAbaAtiva: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  gradeSkins: {
    gap: 8,
  },
  cardSkinGrade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 8,
  },
  imagemSkinGrade: {
    width: 65,
    height: 48,
    backgroundColor: '#EBF4FC',
    borderRadius: 4,
  },
  semImagemGrade: {
    width: 65,
    height: 48,
    backgroundColor: '#EBF4FC',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemGrade: {
    color: '#2B6CB0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoSkinGrade: {
    flex: 1,
    marginLeft: 10,
  },
  nomeSkinGrade: {
    color: '#1E3A5F',
    fontSize: 13,
    fontWeight: 'bold',
  },
  raridadeSkinGrade: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Modal de Revelação da Skin
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  modalParabens: {
    color: '#F58220',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalSubparabens: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  badgeStatTrak: {
    backgroundColor: '#C95F08',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
  },
  textoBadgeStatTrak: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalContainerImagem: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  modalImagem: {
    width: '90%',
    height: 130,
  },
  modalNomeSkin: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeRaridadeModal: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  textoBadgeRaridadeModal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalCondicao: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  boxPreco: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tituloBoxPreco: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linhaCarregandoPreco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  textoCarregandoPreco: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  linhaPreco: {
    alignItems: 'center',
    marginTop: 4,
  },
  valorPreco: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fontePreco: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  acoesModal: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  botaoAbrirNovamente: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  textoBotaoAbrirNovamente: {
    color: '#0F1923',
    fontSize: 15,
    fontWeight: 'bold',
  },
  botaoSalvarFavorito: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  botaoSalvarFavoritoAtivo: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  textoBotaoSalvar: {
    color: '#1E4C8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textoBotaoSalvarAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botaoFecharModal: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textoBotaoFecharModal: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
