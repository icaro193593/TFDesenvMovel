import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import CaseCard from '../components/CaseCard';
import RouletteItem from '../components/RouletteItem';
import {
  CORES,
  ESPACAMENTO,
  BORDAS,
} from '../constants/cs2Theme';
import {
  obterPrecoSkin,
  obterMoedaSelecionada,
  formatarPrecoMoeda,
  converterValorMoeda,
} from '../services/priceService';

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
  { tipo: 'milspec', peso: 0.7992, nome: 'Mil-Spec Grade', cor: '#4B69FF' },
  { tipo: 'restricted', peso: 0.1598, nome: 'Restricted', cor: '#8847FF' },
  { tipo: 'classified', peso: 0.0320, nome: 'Classified', cor: '#D32CE6' },
  { tipo: 'covert', peso: 0.0064, nome: 'Covert', cor: '#EB4B4B' },
  { tipo: 'special', peso: 0.0026, nome: '★ Special Rare Item', cor: '#FFD700' },
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
  const [moedaAtual, setMoedaAtual] = useState('USD');

  // Aba selecionada na visualização de conteúdo da caixa ('todas' ou 'raras')
  const [abaConteudo, setAbaConteudo] = useState('todas');

  // Referência do FlatList da esteira para controle de scroll
  const roletaRef = useRef(null);
  // Referência para guardar o identificador do setInterval da animação
  const timerAnimacaoRef = useRef(null);
  // Referência da skin ativa mais recente e fila para serializar gravações no inventário
  const skinAtivaIdRef = useRef(null);
  const filaInventarioRef = useRef(Promise.resolve());

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
    obterMoedaSelecionada().then((moeda) => {
      setMoedaAtual(moeda);
    });

    // Limpeza de timers ao desmontar o componente (Seção 4.4 do Tutorial)
    return () => {
      if (timerAnimacaoRef.current) {
        clearInterval(timerAnimacaoRef.current);
      }
    };
  }, []);

  // Recarrega a moeda ativa sempre que a tela de caixas ganha foco
  useFocusEffect(
    useCallback(() => {
      obterMoedaSelecionada().then((moeda) => {
        setMoedaAtual(moeda);
      });
    }, [])
  );

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
    skinAtivaIdRef.current = null;

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
    // Adiciona uma pequena variação aleatória suave (-18 a +18px)
    const paddingInicial = 12;
    const variacao = (Math.random() - 0.5) * 36;
    const offsetCentro =
      paddingInicial +
      INDICE_VENCEDOR * PASSO_ROLETA +
      LARGURA_CARD_ROLETA / 2 -
      larguraViewport / 2 +
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

      // Curva cúbica: desacelera realisticamente imitando a roleta do jogo
      const ease = 1 - Math.pow(1 - progresso, 3);
      const deslocamentoAtual = Math.max(0, offsetCentro * ease);

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

        // Prepara os dados completos do prêmio com identificador único
        const idUnico = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const premioCompleto = {
          ...skinVencedora,
          idUnico,
          idInventario: idUnico,
          floatValor: resultado.floatValor,
          wearNome: resultado.wearNome,
          isStatTrak: resultado.isStatTrak,
          isFacaOuLuva: resultado.isFacaOuLuva,
          nomeCaixaOrigem: caixaSelecionada.name,
        };
        skinAtivaIdRef.current = idUnico;
        setSkinGanha(premioCompleto);

        // Salva automaticamente no inventário antes mesmo do preço carregar
        salvarSkinAutomaticaNoInventario(premioCompleto);

        // Dispara busca do preço via API PriceEmpire (com fallback) e atualiza a entrada salva
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
        if (skinAtivaIdRef.current === item.idUnico) {
          setDadosPreco(resposta);
          if (resposta?.moeda) {
            setMoedaAtual(resposta.moeda);
          }
        }
        atualizarPrecoSkinNoInventario(item.idUnico, resposta);
      })
      .catch(() => {
        const valorUsdFallback = 15.0;
        const valorConvertido = converterValorMoeda(
          valorUsdFallback,
          'USD',
          moedaAtual
        );
        const precoFallback = {
          precoFormatado: formatarPrecoMoeda(valorConvertido, moedaAtual),
          fonte: 'Mercado CS2 (Estimado)',
          valorNumerico: valorConvertido,
          valorUsd: valorUsdFallback,
          moeda: moedaAtual,
        };
        if (skinAtivaIdRef.current === item.idUnico) {
          setDadosPreco(precoFallback);
        }
        atualizarPrecoSkinNoInventario(item.idUnico, precoFallback);
      })
      .finally(() => {
        if (skinAtivaIdRef.current === item.idUnico) {
          setBuscandoPreco(false);
        }
      });
  };

  // Serializa leituras/escritas em @inventario_skins para evitar concorrência
  const enfileirarOperacaoInventario = (operacao) => {
    filaInventarioRef.current = filaInventarioRef.current
      .then(operacao)
      .catch((err) => {
        console.error('Erro ao atualizar o inventário:', err);
      });
    return filaInventarioRef.current;
  };

  // 6. Salvar skin automaticamente no AsyncStorage (Inventário) ao revelar
  const salvarSkinAutomaticaNoInventario = (item) => {
    if (!item?.idUnico) return;

    const moedaInicial = moedaAtual || 'USD';
    const itemParaSalvar = {
      ...item,
      idUnico: item.idUnico,
      idInventario: item.idInventario || item.idUnico,
      dataObtencao: new Date().toLocaleDateString('pt-BR'),
      preco: formatarPrecoMoeda(0, moedaInicial),
      valorNumerico: 0,
      valorUsd: 0,
      moeda: moedaInicial,
    };

    enfileirarOperacaoInventario(async () => {
      const dados = await AsyncStorage.getItem('@inventario_skins');
      const listaBruta = dados ? JSON.parse(dados) : [];
      const listaAtual = Array.isArray(listaBruta) ? listaBruta : [];

      if (listaAtual.some((entry) => entry.idUnico === item.idUnico)) {
        return;
      }

      listaAtual.unshift(itemParaSalvar);
      await AsyncStorage.setItem('@inventario_skins', JSON.stringify(listaAtual));
    });
  };

  // Atualiza o preço real da skin já salva no inventário usando seu idUnico
  const atualizarPrecoSkinNoInventario = (idUnico, precoDados) => {
    if (!idUnico || !precoDados) return;

    const moedaItem = precoDados.moeda || moedaAtual || 'USD';
    const valorUsdItem =
      typeof precoDados.valorUsd === 'number'
        ? precoDados.valorUsd
        : typeof precoDados.valorNumerico === 'number'
        ? converterValorMoeda(precoDados.valorNumerico, moedaItem, 'USD')
        : 15.0;
    const valorNumericoItem =
      typeof precoDados.valorNumerico === 'number'
        ? precoDados.valorNumerico
        : converterValorMoeda(valorUsdItem, 'USD', moedaItem);
    const precoItem =
      precoDados.precoFormatado ||
      formatarPrecoMoeda(valorNumericoItem, moedaItem);

    enfileirarOperacaoInventario(async () => {
      const dados = await AsyncStorage.getItem('@inventario_skins');
      const listaBruta = dados ? JSON.parse(dados) : [];
      if (!Array.isArray(listaBruta)) return;

      const indice = listaBruta.findIndex((entry) => entry.idUnico === idUnico);
      if (indice === -1) return;

      listaBruta[indice] = {
        ...listaBruta[indice],
        preco: precoItem,
        valorNumerico: valorNumericoItem,
        valorUsd: valorUsdItem,
        moeda: moedaItem,
      };

      await AsyncStorage.setItem('@inventario_skins', JSON.stringify(listaBruta));
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
        <ActivityIndicator size="large" color={CORES.laranjaCs} />
        <Text style={styles.textoCarregando}>Carregando caixas do CS2...</Text>
      </SafeAreaView>
    );
  }

  // Tela de erro de conexão
  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <MaterialIcons name="error-outline" size={44} color={CORES.erro} />
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
          {/* Barra Superior de Navegação para Voltar */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            activeOpacity={0.75}
            onPress={() => {
              if (timerAnimacaoRef.current) {
                clearInterval(timerAnimacaoRef.current);
              }
              setIsSpinning(false);
              setCaixaSelecionada(null);
            }}
          >
            <View style={styles.iconeVoltarContainer}>
              <MaterialIcons name="arrow-back" size={18} color={CORES.laranjaCs} />
            </View>
            <Text style={styles.textoBotaoVoltar}>Voltar para todas as caixas</Text>
          </TouchableOpacity>

          {/* Card de Cabeçalho da Caixa Selecionada */}
          <View style={styles.cabecalhoCaixa}>
            <View style={styles.containerImagemCaixaTopo}>
              {caixaSelecionada.image ? (
                <Image
                  source={{ uri: caixaSelecionada.image }}
                  style={styles.imagemCaixaTopo}
                  resizeMode="contain"
                />
              ) : (
                <MaterialIcons name="inventory-2" size={36} color={CORES.textoMudo} />
              )}
            </View>

            <View style={styles.infoCaixaTopo}>
              <Text style={styles.nomeCaixaTopo} numberOfLines={2}>
                {caixaSelecionada.name}
              </Text>
              <View style={styles.linhaResumoCaixa}>
                <View style={styles.badgeResumoSkins}>
                  <Text style={styles.textoResumoSkins}>
                    {skinsCaixa.length} skins
                  </Text>
                </View>
                {rarasCaixa.length > 0 && (
                  <View style={styles.badgeResumoRaras}>
                    <Text style={styles.textoResumoRaras}>
                      ★ {rarasCaixa.length} raras
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* CÂMARA DA ROLETA (DISPLAY TÁTICO CS2) */}
          <View
            style={styles.containerRoleta}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              if (width > 0) setLarguraViewport(width);
            }}
          >
            <View style={styles.topoRoleta}>
              <View style={styles.linhaTituloRoleta}>
                <MaterialIcons name="casino" size={16} color={CORES.laranjaCs} />
                <Text style={styles.tituloRoleta}>SIMULADOR DE ROLETA</Text>
              </View>
              <Text style={styles.subtituloRoleta}>
                {isSpinning ? 'Girando a esteira... Boa sorte!' : 'Pressione abrir para sortear uma skin'}
              </Text>
            </View>

            {/* Moldura Metálica e Marcador Central de Precisão */}
            <View style={styles.areaEsteira}>
              {/* Marcador Superior Laranja */}
              <View style={styles.marcadorSuperior} />
              {/* Linha Central Vertical com Glow */}
              <View style={styles.linhaCentral} />
              {/* Marcador Inferior Laranja */}
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

            {/* Botão de Ação Gigante Tático: ABRIR CAIXA */}
            <TouchableOpacity
              style={[
                styles.botaoAbrirCaixa,
                isSpinning && styles.botaoAbrirDesativado,
              ]}
              activeOpacity={0.8}
              disabled={isSpinning}
              onPress={iniciarAbertura}
            >
              {isSpinning ? (
                <ActivityIndicator size="small" color={CORES.textoInvertido} />
              ) : (
                <MaterialIcons name="vpn-key" size={22} color={CORES.textoInvertido} />
              )}
              <Text style={styles.textoBotaoAbrirCaixa}>
                {isSpinning ? 'ABRINDO CAIXA...' : 'ABRIR CAIXA'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEÇÃO: SKINS CONTIDAS NA CAIXA */}
          <View style={styles.secaoConteudo}>
            <View style={styles.cabecalhoSecao}>
              <Text style={styles.tituloSecao}>Conteúdo da Caixa</Text>

              {/* Chips de Seleção de Aba */}
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

            {/* Grade refinada com as skins contidas na caixa */}
            <View style={styles.gradeSkins}>
              {listaExibicao.map((item, index) => {
                const corRaridade = item.rarity?.color || CORES.azulCs;
                return (
                  <View
                    key={`${item.id}-${index}`}
                    style={styles.cardSkinGrade}
                  >
                    {/* Barra de cor de raridade interna integrada */}
                    <View
                      style={[
                        styles.indicadorRaridadeGrade,
                        { backgroundColor: corRaridade },
                      ]}
                    />

                    {/* Imagem da Skin em câmara escura */}
                    <View style={styles.containerImagemGrade}>
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
                    </View>

                    {/* Informações detalhadas da Skin */}
                    <View style={styles.infoSkinGrade}>
                      <Text style={styles.nomeSkinGrade} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={styles.linhaRaridadeGrade}>
                        <View
                          style={[
                            styles.pontoRaridade,
                            { backgroundColor: corRaridade },
                          ]}
                        />
                        <Text
                          style={[styles.raridadeSkinGrade, { color: corRaridade }]}
                          numberOfLines={1}
                        >
                          {item.rarity?.name || 'Raridade Oficial'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* MODAL DE REVELAÇÃO DA SKIN (POPUP APÓS ABRIR) */}
        <Modal
          visible={modalRevelacaoAberto}
          animationType="fade"
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
                    (skinGanha?.isFacaOuLuva ? CORES.ouro : CORES.laranjaCs),
                },
              ]}
            >
              <Text style={styles.modalParabens}>RECOMPENSA OBTIDA!</Text>
              <Text style={styles.modalSubparabens} numberOfLines={1}>
                Caixa: {caixaSelecionada?.name}
              </Text>

              {/* Tag StatTrak™ ou Item Especial */}
              {skinGanha?.isStatTrak && (
                <View style={styles.badgeStatTrak}>
                  <Text style={styles.textoBadgeStatTrak}>StatTrak™</Text>
                </View>
              )}

              {/* Imagem Monumental da Skin Ganha */}
              <View style={styles.modalContainerImagem}>
                {skinGanha?.image && (
                  <Image
                    source={{ uri: skinGanha.image }}
                    style={styles.modalImagem}
                    resizeMode="contain"
                  />
                )}
              </View>

              {/* Informações Principais da Skin */}
              <Text style={styles.modalNomeSkin}>{skinGanha?.name}</Text>

              <View
                style={[
                  styles.badgeRaridadeModal,
                  {
                    backgroundColor:
                      skinGanha?.rarity?.color ||
                      (skinGanha?.isFacaOuLuva ? CORES.ouro : CORES.azulCs),
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

              {/* Box de Preço Dinâmico via PriceEmpire */}
              <View style={styles.boxPreco}>
                <Text style={styles.tituloBoxPreco}>VALOR ESTIMADO DE MERCADO</Text>
                {buscandoPreco ? (
                  <View style={styles.linhaCarregandoPreco}>
                    <ActivityIndicator size="small" color={CORES.laranjaCs} />
                    <Text style={styles.textoCarregandoPreco}>
                      Consultando PriceEmpire...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.linhaPreco}>
                    <Text style={styles.valorPreco}>
                      {dadosPreco?.precoFormatado || formatarPrecoMoeda(0, moedaAtual)}
                    </Text>
                    <Text style={styles.fontePreco}>
                      {dadosPreco?.fonte ? `via ${dadosPreco.fonte}` : 'via PriceEmpire'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Feedback de Armazenamento no Inventário */}
              <View style={styles.linhaSalvoAutomatico}>
                <MaterialIcons name="check-circle" size={15} color={CORES.sucesso} />
                <Text style={styles.textoSalvoAutomatico}>
                  Salvo automaticamente no seu inventário
                </Text>
              </View>

              {/* Ações do Modal */}
              <View style={styles.acoesModal}>
                <TouchableOpacity
                  style={styles.botaoAbrirNovamente}
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalRevelacaoAberto(false);
                    setTimeout(() => {
                      iniciarAbertura();
                    }, 400);
                  }}
                >
                  <MaterialIcons name="refresh" size={20} color={CORES.textoInvertido} />
                  <Text style={styles.textoBotaoAbrirNovamente}>Abrir Outra</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoGuardarInventario}
                  activeOpacity={0.8}
                  onPress={() => setModalRevelacaoAberto(false)}
                >
                  <MaterialIcons name="inventory" size={18} color={CORES.textoPrincipal} />
                  <Text style={styles.textoBotaoGuardarInventario}>
                    Guardar no Inventário
                  </Text>
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
      {/* Cabeçalho Superior da Tela */}
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.titulo}>Abertura de Caixas</Text>
          <Text style={styles.contador}>
            {caixasFiltradas.length}{' '}
            {caixasFiltradas.length === 1 ? 'caixa disponível' : 'caixas disponíveis'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botaoIrInventario}
          activeOpacity={0.7}
          onPress={() => router.push('/inventario')}
        >
          <MaterialIcons name="backpack" size={20} color={CORES.laranjaCs} />
        </TouchableOpacity>
      </View>

      {/* Barra de Busca Tática */}
      <View style={styles.barraBusca}>
        <MaterialIcons
          name="search"
          size={20}
          color={CORES.textoMudo}
          style={styles.iconeBusca}
        />
        <TextInput
          style={styles.campoBusca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar caixa (ex: Kilowatt, Dreams, Revolution)..."
          placeholderTextColor={CORES.textoMudo}
        />
        {busca.length > 0 && (
          <TouchableOpacity
            style={styles.botaoLimpar}
            activeOpacity={0.7}
            onPress={() => setBusca('')}
          >
            <MaterialIcons name="close" size={18} color={CORES.textoSecundario} />
          </TouchableOpacity>
        )}
      </View>

      {/* Seletor de Tipo com Chips Táticos */}
      <View style={styles.linhaFiltroTipo}>
        <TouchableOpacity
          style={[
            styles.chipFiltro,
            somenteArmas && styles.chipFiltroAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setSomenteArmas(true)}
        >
          <MaterialIcons
            name="security"
            size={14}
            color={somenteArmas ? CORES.textoInvertido : CORES.textoSecundario}
          />
          <Text
            style={[
              styles.textoChipFiltro,
              somenteArmas && styles.textoChipFiltroAtivo,
            ]}
          >
            Caixas de Armas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chipFiltro,
            !somenteArmas && styles.chipFiltroAtivo,
          ]}
          activeOpacity={0.7}
          onPress={() => setSomenteArmas(false)}
        >
          <MaterialIcons
            name="grid-view"
            size={14}
            color={!somenteArmas ? CORES.textoInvertido : CORES.textoSecundario}
          />
          <Text
            style={[
              styles.textoChipFiltro,
              !somenteArmas && styles.textoChipFiltroAtivo,
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
            <MaterialIcons name="search-off" size={48} color={CORES.textoMudo} />
            <Text style={styles.vazioTitulo}>Nenhuma caixa encontrada.</Text>
            <Text style={styles.vazioSubtitulo}>
              Tente buscar por outro termo ou selecione todas as caixas.
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
    color: CORES.textoSecundario,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: ESPACAMENTO.md,
  },
  textoErro: {
    color: CORES.erro,
    fontSize: 15,
    textAlign: 'center',
    marginTop: ESPACAMENTO.md,
    marginBottom: ESPACAMENTO.lg,
  },
  botaoRecarregar: {
    backgroundColor: CORES.laranjaCs,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: BORDAS.md,
  },
  textoBotaoRecarregar: {
    color: CORES.textoInvertido,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.sm,
  },
  titulo: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  contador: {
    color: CORES.textoSecundario,
    fontSize: 13,
    marginTop: 2,
  },
  botaoIrInventario: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: ESPACAMENTO.sm,
    borderRadius: BORDAS.md,
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.xs,
    marginBottom: ESPACAMENTO.sm,
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingHorizontal: ESPACAMENTO.md,
    height: 46,
  },
  iconeBusca: {
    marginRight: ESPACAMENTO.sm,
  },
  campoBusca: {
    flex: 1,
    color: CORES.textoPrincipal,
    fontSize: 14,
  },
  botaoLimpar: {
    padding: ESPACAMENTO.xs,
  },
  linhaFiltroTipo: {
    flexDirection: 'row',
    paddingHorizontal: ESPACAMENTO.lg,
    marginBottom: ESPACAMENTO.sm,
    gap: ESPACAMENTO.sm,
  },
  chipFiltro: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.sm,
    paddingVertical: 8,
    paddingHorizontal: ESPACAMENTO.sm,
    gap: 6,
  },
  chipFiltroAtivo: {
    backgroundColor: CORES.laranjaCs,
    borderColor: CORES.laranjaCs,
  },
  textoChipFiltro: {
    color: CORES.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  textoChipFiltroAtivo: {
    color: CORES.textoInvertido,
    fontWeight: 'bold',
  },
  gradeCaixas: {
    paddingHorizontal: ESPACAMENTO.sm,
    paddingBottom: ESPACAMENTO.hero,
  },
  vazioContainer: {
    alignItems: 'center',
    padding: ESPACAMENTO.hero,
    marginTop: 30,
    gap: ESPACAMENTO.sm,
  },
  vazioTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
  },
  vazioSubtitulo: {
    color: CORES.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  botaoAcao: {
    backgroundColor: CORES.laranjaCs,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BORDAS.md,
  },
  textoBotaoAcao: {
    color: CORES.textoInvertido,
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Estilos da Tela de Abertura da Caixa Selecionada
  scrollAbertura: {
    flex: 1,
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACAMENTO.lg,
    paddingVertical: ESPACAMENTO.md,
    gap: ESPACAMENTO.sm,
  },
  iconeVoltarContainer: {
    width: 28,
    height: 28,
    borderRadius: BORDAS.sm,
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoVoltar: {
    color: CORES.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  cabecalhoCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    marginHorizontal: ESPACAMENTO.lg,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  containerImagemCaixaTopo: {
    width: 72,
    height: 66,
    backgroundColor: CORES.fundoInput,
    borderRadius: BORDAS.sm,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemCaixaTopo: {
    width: 64,
    height: 58,
  },
  infoCaixaTopo: {
    flex: 1,
    marginLeft: ESPACAMENTO.md,
  },
  nomeCaixaTopo: {
    color: CORES.textoPrincipal,
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  linhaResumoCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  badgeResumoSkins: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.borda,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDAS.sm,
  },
  textoResumoSkins: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeResumoRaras: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDAS.sm,
  },
  textoResumoRaras: {
    color: CORES.ouro,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Câmara da Roleta
  containerRoleta: {
    backgroundColor: CORES.fundoSuperficie,
    marginHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.md,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  topoRoleta: {
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  linhaTituloRoleta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tituloRoleta: {
    color: CORES.laranjaCs,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtituloRoleta: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 3,
  },
  areaEsteira: {
    height: 164,
    backgroundColor: '#070A0F',
    borderRadius: BORDAS.md,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
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
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CORES.laranjaCs,
    zIndex: 20,
  },
  linhaCentral: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignSelf: 'center',
    width: 2,
    backgroundColor: CORES.laranjaCs,
    opacity: 0.65,
    zIndex: 10,
  },
  marcadorInferior: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CORES.laranjaCs,
    zIndex: 20,
  },
  conteudoRoleta: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  botaoAbrirCaixa: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 14,
    marginTop: ESPACAMENTO.md,
    gap: ESPACAMENTO.sm,
  },
  botaoAbrirDesativado: {
    opacity: 0.7,
  },
  textoBotaoAbrirCaixa: {
    color: CORES.textoInvertido,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },

  // Seção de Conteúdo da Caixa
  secaoConteudo: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.xl,
    paddingBottom: ESPACAMENTO.hero,
  },
  cabecalhoSecao: {
    marginBottom: ESPACAMENTO.md,
  },
  tituloSecao: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
  },
  abasConteudo: {
    flexDirection: 'row',
    marginTop: ESPACAMENTO.sm,
    gap: ESPACAMENTO.sm,
  },
  abaItem: {
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.sm,
    paddingVertical: 6,
    paddingHorizontal: ESPACAMENTO.md,
  },
  abaItemAtiva: {
    backgroundColor: CORES.fundoCardElevado,
    borderColor: CORES.laranjaCs,
  },
  textoAba: {
    color: CORES.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  textoAbaAtiva: {
    color: CORES.laranjaCs,
    fontWeight: 'bold',
  },
  gradeSkins: {
    gap: ESPACAMENTO.sm,
  },
  cardSkinGrade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  indicadorRaridadeGrade: {
    width: 3,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  containerImagemGrade: {
    width: 68,
    height: 52,
    backgroundColor: CORES.fundoInput,
    borderRadius: BORDAS.sm,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  imagemSkinGrade: {
    width: 62,
    height: 46,
  },
  semImagemGrade: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemGrade: {
    color: CORES.textoMudo,
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoSkinGrade: {
    flex: 1,
    marginLeft: ESPACAMENTO.md,
  },
  nomeSkinGrade: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  linhaRaridadeGrade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  pontoRaridade: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  raridadeSkinGrade: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Modal de Revelação da Skin
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 14, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CORES.fundoCard,
    borderRadius: BORDAS.lg,
    borderWidth: 2,
    padding: ESPACAMENTO.xl,
    alignItems: 'center',
  },
  modalParabens: {
    color: CORES.laranjaCs,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalSubparabens: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
    marginBottom: ESPACAMENTO.sm,
  },
  badgeStatTrak: {
    backgroundColor: 'rgba(245, 130, 32, 0.15)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: BORDAS.sm,
    marginBottom: ESPACAMENTO.xs,
  },
  textoBadgeStatTrak: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalContainerImagem: {
    width: '100%',
    height: 140,
    backgroundColor: CORES.fundoInput,
    borderRadius: BORDAS.md,
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: ESPACAMENTO.md,
    padding: ESPACAMENTO.sm,
  },
  modalImagem: {
    width: '92%',
    height: 120,
  },
  modalNomeSkin: {
    color: CORES.textoPrincipal,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeRaridadeModal: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: BORDAS.sm,
    marginTop: 6,
  },
  textoBadgeRaridadeModal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalCondicao: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 6,
  },
  boxPreco: {
    width: '100%',
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  tituloBoxPreco: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linhaCarregandoPreco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACAMENTO.sm,
    marginTop: 6,
  },
  textoCarregandoPreco: {
    color: CORES.textoSecundario,
    fontSize: 13,
  },
  linhaPreco: {
    alignItems: 'center',
    marginTop: 4,
  },
  valorPreco: {
    color: CORES.sucesso,
    fontSize: 22,
    fontWeight: 'bold',
  },
  fontePreco: {
    color: CORES.textoMudo,
    fontSize: 11,
    marginTop: 2,
  },
  linhaSalvoAutomatico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: ESPACAMENTO.md,
  },
  textoSalvoAutomatico: {
    color: CORES.sucesso,
    fontSize: 12,
    fontWeight: '600',
  },
  acoesModal: {
    width: '100%',
    marginTop: ESPACAMENTO.lg,
    gap: ESPACAMENTO.sm,
  },
  botaoAbrirNovamente: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 12,
    gap: 6,
  },
  textoBotaoAbrirNovamente: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: 'bold',
  },
  botaoGuardarInventario: {
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 10,
    gap: 6,
  },
  textoBotaoGuardarInventario: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '600',
  },
});
