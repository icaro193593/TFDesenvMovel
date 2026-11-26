import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import ContractSlot from '../components/ContractSlot';
import {
  obterPrecoSkin,
  obterMoedaSelecionada,
  formatarPrecoMoeda,
  converterValorMoeda,
} from '../services/priceService';
import { CORES, ESPACAMENTO, BORDAS } from '../constants/cs2Theme';

// Chave do inventário do usuário no AsyncStorage
const STORAGE_KEY_INVENTARIO = '@inventario_skins';

// Endereço oficial da API ByMykel para cruzar coleções e skins
const URL_API_SKINS =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

// Hierarquia oficial estrita de raridades do CS2 para contratos de troca
const HIERARQUIA_RARIDADES = [
  { id: 'rarity_common_weapon', name: 'Consumer Grade', cor: '#b0c3d9' },
  { id: 'rarity_uncommon_weapon', name: 'Industrial Grade', cor: '#5e98d9' },
  { id: 'rarity_rare_weapon', name: 'Mil-Spec Grade', cor: '#4b69ff' },
  { id: 'rarity_mythical_weapon', name: 'Restricted', cor: '#8847ff' },
  { id: 'rarity_legendary_weapon', name: 'Classified', cor: '#d32ce6' },
  { id: 'rarity_ancient_weapon', name: 'Covert', cor: '#eb4b4b' },
];

/**
 * Retorna a raridade imediatamente superior ou null caso já seja a máxima (Covert).
 */
function obterRaridadeSuperior(nomeRaridade) {
  const index = HIERARQUIA_RARIDADES.findIndex(
    (r) => r.name.toLowerCase() === (nomeRaridade || '').toLowerCase()
  );
  if (index === -1 || index >= HIERARQUIA_RARIDADES.length - 1) {
    return null;
  }
  return HIERARQUIA_RARIDADES[index + 1];
}

export default function ContratoScreen() {
  // Inventário completo do usuário carregado do AsyncStorage
  const [inventario, setInventario] = useState([]);
  const [isLoadingInventario, setIsLoadingInventario] = useState(true);
  const [moedaAtual, setMoedaAtual] = useState('USD');

  // Catálogo completo de skins da API com mapa de coleções
  const [catalogoCarregado, setCatalogoCarregado] = useState(false);
  const [mapaSkins, setMapaSkins] = useState(new Map());
  const [catalogoPorColecaoRaridade, setCatalogoPorColecaoRaridade] = useState(new Map());

  // Estado do Contrato: até 3 skins selecionadas e raridade travada
  const [skinsContrato, setSkinsContrato] = useState([]);
  const [raridadeBloqueada, setRaridadeBloqueada] = useState(null);

  // Estados de feedback, busca e execução do contrato
  const [buscaInventario, setBuscaInventario] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState(null);
  const [isSigning, setIsSigning] = useState(false);

  // Estado da skin gerada no contrato e modal de resultado
  const [skinGerada, setSkinGerada] = useState(null);
  const [dadosPrecoGerada, setDadosPrecoGerada] = useState(null);
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);

  // 1. Carrega o catálogo completo da API ByMykel para vincular coleções e tiers superiores
  useEffect(() => {
    fetch(URL_API_SKINS)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao conectar com a API de skins.');
        return res.json();
      })
      .then((skins) => {
        const mapaId = new Map();
        const mapaPorColRaridade = new Map();

        skins.forEach((skin) => {
          if (!skin || !skin.id) return;
          mapaId.set(skin.id, skin);
          if (skin.name) {
            mapaId.set(skin.name.toLowerCase(), skin);
          }

          if (skin.collections && skin.collections.length > 0 && skin.rarity?.name) {
            skin.collections.forEach((col) => {
              const chave = `${col.id}:${skin.rarity.name.toLowerCase()}`;
              if (!mapaPorColRaridade.has(chave)) {
                mapaPorColRaridade.set(chave, []);
              }
              mapaPorColRaridade.get(chave).push(skin);
            });
          }
        });

        setMapaSkins(mapaId);
        setCatalogoPorColecaoRaridade(mapaPorColRaridade);
        setCatalogoCarregado(true);
      })
      .catch((err) => {
        console.error('Erro ao carregar catálogo para contrato:', err);
      });
  }, []);

  // 2. Carrega e atualiza o inventário do usuário e a moeda ativa sempre que entrar na tela
  const carregarInventarioEMoeda = useCallback(() => {
    setIsLoadingInventario(true);
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
      obterMoedaSelecionada(),
    ])
      .then(([dados, moeda]) => {
        setMoedaAtual(moeda);
        if (dados) {
          const lista = JSON.parse(dados);
          setInventario(Array.isArray(lista) ? lista : []);
        } else {
          setInventario([]);
        }
      })
      .catch((err) => {
        console.error('Erro ao ler inventário para contrato:', err);
        setInventario([]);
      })
      .finally(() => {
        setIsLoadingInventario(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarInventarioEMoeda();
    }, [carregarInventarioEMoeda])
  );

  // Limpa mensagens temporárias de aviso após 3.5 segundos
  useEffect(() => {
    if (mensagemAviso) {
      const timer = setTimeout(() => {
        setMensagemAviso(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [mensagemAviso]);

  // Formata o valor da skin na moeda atualmente ativa
  const obterPrecoFormatadoItem = (item) => {
    const moedaItem = item.moeda || 'USD';
    if (moedaItem === moedaAtual && typeof item.valorNumerico === 'number') {
      return formatarPrecoMoeda(item.valorNumerico, moedaAtual);
    }
    if (typeof item.valorUsd === 'number') {
      const convertido = converterValorMoeda(item.valorUsd, 'USD', moedaAtual);
      return formatarPrecoMoeda(convertido, moedaAtual);
    }
    if (typeof item.valorNumerico === 'number') {
      const convertido = converterValorMoeda(item.valorNumerico, moedaItem, moedaAtual);
      return formatarPrecoMoeda(convertido, moedaAtual);
    }
    return item.preco || formatarPrecoMoeda(0, moedaAtual);
  };

  // 3. Adicionar skin ao contrato (com bloqueio estrito de raridade)
  const selecionarSkinParaContrato = (skin) => {
    if (skinsContrato.length >= 3) {
      setMensagemAviso('O contrato já possui 3 skins selecionadas. Remova uma para trocar.');
      return;
    }

    // Verifica se já está selecionada no contrato (pelo id único do inventário)
    const idItem = skin.idInventario || skin.id;
    const jaEstaNoContrato = skinsContrato.some(
      (s) => (s.idInventario || s.id) === idItem
    );
    if (jaEstaNoContrato) {
      removerSkinDoContrato(skin);
      return;
    }

    const nomeRaridade = skin.rarity?.name || '';

    // Proíbe itens Covert, Facas ou Luvas (que não possuem raridade superior)
    if (
      nomeRaridade.toLowerCase() === 'covert' ||
      skin.isFacaOuLuva ||
      (skin.name && skin.name.startsWith('★'))
    ) {
      setMensagemAviso(
        'Skins Covert e Facas/Luvas já estão na raridade máxima e não podem entrar no contrato.'
      );
      return;
    }

    // Se for a 1ª skin, trava a raridade do contrato
    if (skinsContrato.length === 0) {
      setRaridadeBloqueada(nomeRaridade);
      setSkinsContrato([skin]);
      setMensagemAviso(null);
      return;
    }

    // Se já houver 1 ou 2 skins, proíbe qualquer skin que não seja da mesma raridade
    if (nomeRaridade.toLowerCase() !== raridadeBloqueada?.toLowerCase()) {
      setMensagemAviso(
        `Raridade incompatível! Você só pode selecionar skins da raridade "${raridadeBloqueada}".`
      );
      return;
    }

    // Mesma raridade: adiciona ao contrato
    setSkinsContrato((prev) => [...prev, skin]);
    setMensagemAviso(null);
  };

  // 4. Remover skin do contrato (e desbloquear raridade se esvaziar)
  const removerSkinDoContrato = (skinParaRemover) => {
    const idRemover = skinParaRemover.idInventario || skinParaRemover.id;
    const novaLista = skinsContrato.filter(
      (s) => (s.idInventario || s.id) !== idRemover
    );
    setSkinsContrato(novaLista);

    // Se não sobrar nenhuma skin, libera a trava de raridade
    if (novaLista.length === 0) {
      setRaridadeBloqueada(null);
    }
  };

  // Limpa todos os slots do contrato
  const limparContrato = () => {
    setSkinsContrato([]);
    setRaridadeBloqueada(null);
    setMensagemAviso(null);
  };

  // 5. Execução do Contrato de Troca com as 3 skins
  const assinarContrato = () => {
    if (skinsContrato.length !== 3) {
      setMensagemAviso('O contrato precisa de exatamente 3 skins para ser assinado.');
      return;
    }

    const raridadeAtualNome = skinsContrato[0].rarity?.name;
    const raridadeSuperiorObj = obterRaridadeSuperior(raridadeAtualNome);

    if (!raridadeSuperiorObj) {
      setMensagemAviso('Não foi possível determinar a raridade superior desta combinação.');
      return;
    }

    setIsSigning(true);

    // A. Mapeia a coleção de cada uma das 3 skins de entrada
    const colecoesEntrada = skinsContrato.map((skin) => {
      let skinCompleta = mapaSkins.get(skin.id);
      if (!skinCompleta && skin.name) {
        skinCompleta = mapaSkins.get(skin.name.toLowerCase());
      }

      if (skinCompleta?.collections && skinCompleta.collections.length > 0) {
        return skinCompleta.collections[0];
      }
      if (skin.collections && skin.collections.length > 0) {
        return skin.collections[0];
      }
      return null;
    });

    // B. Sorteia aleatoriamente 1 das 3 skins de entrada (1/3 de probabilidade por coleção)
    const indiceSorteado = Math.floor(Math.random() * 3);
    const colecaoEscolhida = colecoesEntrada[indiceSorteado];

    // C. Busca as skins da raridade superior da coleção sorteada
    let poolCandidatas = [];
    if (colecaoEscolhida) {
      const chave = `${colecaoEscolhida.id}:${raridadeSuperiorObj.name.toLowerCase()}`;
      poolCandidatas = catalogoPorColecaoRaridade.get(chave) || [];
    }

    // Fallback: se a coleção sorteada não tiver item superior, tenta as outras 2 coleções
    if (poolCandidatas.length === 0) {
      colecoesEntrada.forEach((col) => {
        if (col && poolCandidatas.length === 0) {
          const chave = `${col.id}:${raridadeSuperiorObj.name.toLowerCase()}`;
          const candidatas = catalogoPorColecaoRaridade.get(chave) || [];
          if (candidatas.length > 0) {
            poolCandidatas = candidatas;
          }
        }
      });
    }

    // Fallback geral de segurança: se nenhuma das 3 coleções tiver tier superior
    if (poolCandidatas.length === 0) {
      const todasChaves = Array.from(catalogoPorColecaoRaridade.keys());
      const chavesRaridade = todasChaves.filter((k) =>
        k.endsWith(`:${raridadeSuperiorObj.name.toLowerCase()}`)
      );
      chavesRaridade.forEach((k) => {
        const itens = catalogoPorColecaoRaridade.get(k) || [];
        poolCandidatas.push(...itens);
      });
    }

    if (poolCandidatas.length === 0) {
      setIsSigning(false);
      setMensagemAviso('Erro: Nenhuma skin superior encontrada no catálogo da API.');
      return;
    }

    // D. Sorteia a skin vencedora entre as candidatas da coleção
    const skinSorteada =
      poolCandidatas[Math.floor(Math.random() * poolCandidatas.length)];

    // E. Cálculo oficial de Float do CS2 baseado na média das 3 entradas
    const mediaFloats =
      skinsContrato.reduce(
        (soma, s) => soma + (Number(s.floatValor) || 0.18),
        0
      ) / 3;

    const minFloat = Number(skinSorteada.min_float ?? 0.0);
    const maxFloat = Number(skinSorteada.max_float ?? 1.0);
    const floatFinal = Number(
      (mediaFloats * (maxFloat - minFloat) + minFloat).toFixed(6)
    );

    // Determina a condição de desgaste (Wear)
    let wearFinal = 'Field-Tested';
    if (floatFinal < 0.07) wearFinal = 'Factory New';
    else if (floatFinal < 0.15) wearFinal = 'Minimal Wear';
    else if (floatFinal < 0.38) wearFinal = 'Field-Tested';
    else if (floatFinal < 0.45) wearFinal = 'Well-Worn';
    else wearFinal = 'Battle-Scarred';

    // F. Regra StatTrak™: proporcional aos itens inseridos
    const qtdStatTrak = skinsContrato.filter((s) => s.isStatTrak).length;
    const isStatTrakFinal =
      qtdStatTrak === 3 || (qtdStatTrak > 0 && Math.random() < qtdStatTrak / 3);

    // G. Consulta o valor de mercado na moeda ativa via PriceEmpire / Steam
    obterPrecoSkin(
      skinSorteada.name,
      raridadeSuperiorObj.name,
      wearFinal,
      isStatTrakFinal,
      moedaAtual
    )
      .then((precoResultado) => {
        setDadosPrecoGerada(precoResultado);

        // Monta o novo item que entrará no inventário
        const novaSkin = {
          id: skinSorteada.id,
          name: skinSorteada.name,
          image: skinSorteada.image,
          rarity: {
            id: raridadeSuperiorObj.id,
            name: raridadeSuperiorObj.name,
            color: raridadeSuperiorObj.cor,
          },
          floatValor: floatFinal,
          wearNome: wearFinal,
          isStatTrak: isStatTrakFinal,
          isFacaOuLuva: false,
          nomeCaixaOrigem: colecaoEscolhida?.name || 'Contrato de Trocas',
          preco: precoResultado?.precoFormatado || formatarPrecoMoeda(25.0, moedaAtual),
          valorNumerico: precoResultado?.valorNumerico || 25.0,
          valorUsd: precoResultado?.valorUsd || 25.0,
          moeda: moedaAtual,
          idInventario: `contrato-${skinSorteada.id}-${Date.now()}`,
          timestamp: Date.now(),
          dataObtencao: new Date().toLocaleDateString('pt-BR'),
        };

        setSkinGerada(novaSkin);

        // H. Deleta as 3 skins usadas do inventário e adiciona a nova skin
        const idsUsados = new Set(
          skinsContrato.map((s) => s.idInventario || s.id)
        );

        return AsyncStorage.getItem(STORAGE_KEY_INVENTARIO).then((dados) => {
          const listaAtual = dados ? JSON.parse(dados) : [];
          // Remove as 3 skins utilizadas
          const listaRestante = listaAtual.filter(
            (item) => !idsUsados.has(item.idInventario || item.id)
          );
          // Adiciona a nova skin no início
          listaRestante.unshift(novaSkin);
          return AsyncStorage.setItem(
            STORAGE_KEY_INVENTARIO,
            JSON.stringify(listaRestante)
          ).then(() => {
            setInventario(listaRestante);
          });
        });
      })
      .then(() => {
        // Limpa os slots do contrato e abre o modal de premiação
        setSkinsContrato([]);
        setRaridadeBloqueada(null);
        setIsSigning(false);
        setModalResultadoAberto(true);
      })
      .catch((err) => {
        console.error('Erro ao processar contrato de trocas:', err);
        setIsSigning(false);
        setMensagemAviso('Ocorreu um erro ao processar o contrato. Tente novamente.');
      });
  };

  // Informações da raridade superior calculada para as 3 skins
  const raridadeSuperiorAlvo = raridadeBloqueada
    ? obterRaridadeSuperior(raridadeBloqueada)
    : null;

  // Filtragem do inventário do usuário na tela:
  // REGRA FUNDAMENTAL JÁ APROVADA: Quando uma skin é selecionada, oculta COMPLETAMENTE
  // todas as skins de outras raridades! Apenas skins compatíveis da mesma raridade ficam visíveis.
  const itensInventarioFiltrados = inventario.filter((item) => {
    const nomeRaridade = (item.rarity?.name || '').toLowerCase();
    const ehCovertOuFaca =
      nomeRaridade === 'covert' ||
      item.isFacaOuLuva ||
      (item.name && item.name.startsWith('★'));

    // Itens Covert e Facas/Luvas nunca podem ser usados em contratos de troca
    if (ehCovertOuFaca) {
      return false;
    }

    // Se já houver uma raridade travada pelo contrato, faz todas as outras raridades sumirem
    if (raridadeBloqueada && nomeRaridade !== raridadeBloqueada.toLowerCase()) {
      return false;
    }

    // Filtro por texto da busca
    const termo = buscaInventario.trim().toLowerCase();
    if (!termo) return true;
    const nome = (item.name || '').toLowerCase();
    return nome.includes(termo) || nomeRaridade.includes(termo);
  });

  // Tela de carregamento do inventário e catálogo
  if (isLoadingInventario && !catalogoCarregado) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.laranjaCs} />
        <Text style={styles.textoCarregando}>Carregando Contrato de Trocas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView
        style={styles.scrollPrincipal}
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho da Página */}
        <View style={styles.cabecalhoPagina}>
          <View style={styles.linhaTituloPagina}>
            <View style={styles.circuloIconeCabecalho}>
              <MaterialIcons name="swap-horizontal-circle" size={22} color={CORES.laranjaCs} />
            </View>
            <View style={styles.infoCabecalho}>
              <Text style={styles.tituloPagina}>Contrato de Trocas</Text>
              <Text style={styles.subtituloPagina}>
                Combine 3 skins da mesma raridade para receber 1 de tier superior
              </Text>
            </View>
          </View>
        </View>

        {/* Mensagem de Aviso Flutuante */}
        {mensagemAviso && (
          <View style={styles.bannerAviso}>
            <MaterialIcons name="warning-amber" size={18} color={CORES.laranjaBrilhante} />
            <Text style={styles.textoBannerAviso}>{mensagemAviso}</Text>
          </View>
        )}

        {/* ÁREA DA CAIXA DO CONTRATO */}
        <View style={styles.cardAreaContrato}>
          {/* Topo da Caixa: Título, Indicador de Raridade e Contador */}
          <View style={styles.linhaTopoContrato}>
            <View style={styles.colunaInfoContrato}>
              <Text style={styles.rotuloSkinsContrato}>SKINS PARA CONTRATO</Text>
              {raridadeBloqueada ? (
                <View style={styles.linhaRaridadeBloqueada}>
                  <Text style={styles.subrotuloRaridade}>Raridade travada: </Text>
                  <View style={[styles.badgeRaridadeTravada, { backgroundColor: `${CORES.raridades[raridadeBloqueada] || CORES.azulAco}25`, borderColor: `${CORES.raridades[raridadeBloqueada] || CORES.azulAco}70` }]}>
                    <Text style={[styles.textoBadgeRaridadeTravada, { color: CORES.raridades[raridadeBloqueada] || CORES.azulClaro }]}>
                      {raridadeBloqueada}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.subrotuloRaridade}>
                  Selecione a 1ª skin para travar a raridade
                </Text>
              )}
            </View>

            <View style={styles.linhaContadorAcoes}>
              <View
                style={[
                  styles.badgeContador,
                  skinsContrato.length === 3 && styles.badgeContadorCompleto,
                ]}
              >
                <Text
                  style={[
                    styles.textoContador,
                    skinsContrato.length === 3 && styles.textoContadorCompleto,
                  ]}
                >
                  {skinsContrato.length}/3
                </Text>
              </View>

              {skinsContrato.length > 0 && (
                <TouchableOpacity
                  style={styles.botaoLimparSlots}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={limparContrato}
                >
                  <MaterialIcons name="delete-outline" size={16} color={CORES.erro} />
                  <Text style={styles.textoLimparSlots}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* CAIXA COM OS 3 SLOTS DO CONTRATO */}
          <View style={styles.containerSlots}>
            <ContractSlot
              item={skinsContrato[0] || null}
              indice={0}
              onRemover={removerSkinDoContrato}
            />
            <ContractSlot
              item={skinsContrato[1] || null}
              indice={1}
              onRemover={removerSkinDoContrato}
            />
            <ContractSlot
              item={skinsContrato[2] || null}
              indice={2}
              onRemover={removerSkinDoContrato}
            />
          </View>

          {/* Prévia da Raridade Superior Esperada */}
          {raridadeSuperiorAlvo && (
            <View style={styles.boxResultadoPrevia}>
              <MaterialIcons name="military-tech" size={20} color={raridadeSuperiorAlvo.cor} />
              <Text style={styles.textoResultadoPrevia}>Resultado garantido:</Text>
              <View style={[styles.badgePreviaRaridade, { backgroundColor: `${raridadeSuperiorAlvo.cor}25`, borderColor: `${raridadeSuperiorAlvo.cor}80` }]}>
                <Text style={[styles.textoBadgePreviaRaridade, { color: raridadeSuperiorAlvo.cor }]}>
                  {raridadeSuperiorAlvo.name}
                </Text>
              </View>
            </View>
          )}

          {/* BOTÃO PARA ASSINAR O CONTRATO (HABILITADO AO COMPLETAR 3/3) */}
          <TouchableOpacity
            style={[
              styles.botaoAssinar,
              (skinsContrato.length !== 3 || isSigning) && styles.botaoAssinarDesabilitado,
            ]}
            activeOpacity={0.8}
            disabled={skinsContrato.length !== 3 || isSigning}
            onPress={assinarContrato}
          >
            {isSigning ? (
              <ActivityIndicator size="small" color={CORES.textoInvertido} />
            ) : (
              <MaterialIcons
                name="history-edu"
                size={22}
                color={skinsContrato.length === 3 ? CORES.textoInvertido : CORES.textoMudo}
              />
            )}
            <Text
              style={[
                styles.textoBotaoAssinar,
                skinsContrato.length !== 3 && styles.textoBotaoAssinarDesabilitado,
              ]}
            >
              {isSigning ? 'PROCESSANDO CONTRATO...' : 'ASSINAR CONTRATO DE TROCA'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEÇÃO INFERIOR: INVENTÁRIO DO USUÁRIO */}
        <View style={styles.secaoInventario}>
          <View style={styles.cabecalhoSecaoInventario}>
            <View style={styles.infoSecaoInventario}>
              <Text style={styles.tituloInventario}>Meu Inventário</Text>
              <Text style={styles.subtituloInventario}>
                {raridadeBloqueada
                  ? `Mostrando apenas skins "${raridadeBloqueada}"`
                  : 'Toque em uma skin para adicionar aos slots'}
              </Text>
            </View>
            <View style={styles.badgeQtdSkins}>
              <Text style={styles.totalSkinsBadge}>
                {itensInventarioFiltrados.length} {raridadeBloqueada ? 'compatíveis' : 'skins'}
              </Text>
            </View>
          </View>

          {/* Campo de Busca no Inventário */}
          {inventario.length > 0 && (
            <View style={styles.barraBusca}>
              <MaterialIcons name="search" size={20} color={CORES.textoMudo} style={styles.iconeBusca} />
              <TextInput
                style={styles.campoBusca}
                value={buscaInventario}
                onChangeText={setBuscaInventario}
                placeholder="Buscar por skin ou arma no inventário..."
                placeholderTextColor={CORES.textoMudo}
              />
              {buscaInventario.length > 0 && (
                <TouchableOpacity
                  style={styles.botaoLimparBusca}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setBuscaInventario('')}
                >
                  <MaterialIcons name="close" size={16} color={CORES.textoSecundario} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lista de Skins do Inventário */}
          {itensInventarioFiltrados.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.circuloIconeVazioGeral}>
                <MaterialIcons name="inventory-2" size={40} color={CORES.laranjaCs} />
              </View>
              <Text style={styles.vazioTitulo}>
                {inventario.length === 0
                  ? 'Seu inventário está vazio'
                  : raridadeBloqueada
                  ? `Sem outras skins da raridade "${raridadeBloqueada}"`
                  : 'Nenhuma skin encontrada para essa busca.'}
              </Text>
              <Text style={styles.vazioSubtitulo}>
                {inventario.length === 0
                  ? 'Abra caixas para colecionar skins e usá-las em contratos de troca!'
                  : raridadeBloqueada
                  ? 'Você não possui mais skins desta raridade no inventário para completar os 3 slots.'
                  : 'Tente buscar com outro nome de arma ou limpe o filtro.'}
              </Text>

              {inventario.length === 0 ? (
                <TouchableOpacity
                  style={styles.botaoAcaoVazio}
                  activeOpacity={0.7}
                  onPress={() => router.push('/caixas')}
                >
                  <MaterialIcons name="vpn-key" size={18} color={CORES.textoInvertido} />
                  <Text style={styles.textoBotaoAcaoVazio}>Abrir Caixas Agora</Text>
                </TouchableOpacity>
              ) : raridadeBloqueada ? (
                <TouchableOpacity
                  style={styles.botaoAcaoVazio}
                  activeOpacity={0.7}
                  onPress={limparContrato}
                >
                  <MaterialIcons name="refresh" size={18} color={CORES.textoInvertido} />
                  <Text style={styles.textoBotaoAcaoVazio}>Limpar Filtro e Contrato</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.gradeInventario}>
              {itensInventarioFiltrados.map((item) => {
                const idItem = item.idInventario || item.id;
                const selecionadaNoContrato = skinsContrato.some(
                  (s) => (s.idInventario || s.id) === idItem
                );

                const nomeRaridade = item.rarity?.name || 'Raridade Oficial';
                const corRaridade =
                  item.rarity?.color ||
                  CORES.raridades[nomeRaridade] ||
                  CORES.azulAco;

                return (
                  <TouchableOpacity
                    key={idItem}
                    style={[
                      styles.cardItemInventario,
                      selecionadaNoContrato && styles.cardSelecionado,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selecionarSkinParaContrato(item)}
                  >
                    {/* Imagem da Skin em container escuro */}
                    <View style={styles.containerImagemInv}>
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.imagemSkinInv}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.semImagemInv}>
                          <Text style={styles.textoSemImagemInv}>CS2</Text>
                        </View>
                      )}
                    </View>

                    {/* Informações da Skin */}
                    <View style={styles.infoSkinInv}>
                      <View style={styles.linhaNomeInv}>
                        {item.isStatTrak && (
                          <Text style={styles.tagStatTrak}>ST™ </Text>
                        )}
                        <Text style={styles.nomeSkinInv} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>

                      {/* Chip de raridade com borda completa (sem faixa unilateral) */}
                      <View style={styles.linhaTagsInv}>
                        <View style={[styles.chipRaridadeItem, { backgroundColor: `${corRaridade}22`, borderColor: `${corRaridade}66` }]}>
                          <Text style={[styles.textoChipRaridadeItem, { color: corRaridade }]}>
                            {nomeRaridade}
                          </Text>
                        </View>

                        {item.wearNome && (
                          <Text style={styles.condicaoInv}>{item.wearNome}</Text>
                        )}
                      </View>

                      <Text style={styles.precoInv}>
                        {obterPrecoFormatadoItem(item)}
                      </Text>
                    </View>

                    {/* Indicador de Status: No Contrato / Botão Adicionar */}
                    <View style={styles.colunaAcaoInv}>
                      {selecionadaNoContrato ? (
                        <View style={styles.badgeSelecionada}>
                          <MaterialIcons name="check" size={14} color="#FFFFFF" />
                          <Text style={styles.textoBadgeSelecionada}>No contrato</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeAdicionar}>
                          <MaterialIcons name="add" size={14} color={CORES.laranjaCs} />
                          <Text style={styles.textoBadgeAdicionar}>Adicionar</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE RESULTADO DO CONTRATO DE TROCAS */}
      <Modal
        visible={modalResultadoAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalResultadoAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View
            style={[
              styles.modalCard,
              { borderColor: skinGerada?.rarity?.color || CORES.laranjaCs },
            ]}
          >
            <View style={styles.circuloSucessoModal}>
              <MaterialIcons name="emoji-events" size={28} color={CORES.ouro} />
            </View>

            <Text style={styles.modalTituloSucesso}>CONTRATO REALIZADO!</Text>
            <Text style={styles.modalSubtituloSucesso}>
              As 3 skins foram consumidas e você recebeu uma skin superior:
            </Text>

            {/* Tag StatTrak™ quando presente */}
            {skinGerada?.isStatTrak && (
              <View style={styles.badgeModalStatTrak}>
                <Text style={styles.textoBadgeModalStatTrak}>StatTrak™</Text>
              </View>
            )}

            {/* Imagem nítida da Skin Gerada */}
            <View style={styles.containerImagemModal}>
              {skinGerada?.image && (
                <Image
                  source={{ uri: skinGerada.image }}
                  style={styles.imagemModalSkin}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Nome da Skin */}
            <Text style={styles.modalNomeSkin}>{skinGerada?.name}</Text>

            {/* Chip da Raridade Superior */}
            <View
              style={[
                styles.chipModalRaridade,
                {
                  backgroundColor: `${skinGerada?.rarity?.color || CORES.laranjaCs}25`,
                  borderColor: skinGerada?.rarity?.color || CORES.laranjaCs,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoChipModalRaridade,
                  { color: skinGerada?.rarity?.color || CORES.laranjaCs },
                ]}
              >
                {skinGerada?.rarity?.name || 'Raridade Superior'}
              </Text>
            </View>

            <Text style={styles.modalCondicao}>
              {skinGerada?.wearNome} • Float: {skinGerada?.floatValor}
            </Text>

            {skinGerada?.nomeCaixaOrigem && (
              <Text style={styles.modalColecaoOrigem}>
                Coleção: {skinGerada.nomeCaixaOrigem}
              </Text>
            )}

            {/* Card com Cotação de Preço Oficial */}
            <View style={styles.modalBoxPreco}>
              <Text style={styles.modalTituloBoxPreco}>VALOR DE MERCADO ESTIMADO</Text>
              <Text style={styles.modalValorPreco}>
                {dadosPrecoGerada?.precoFormatado || formatarPrecoMoeda(25.0, moedaAtual)}
              </Text>
              <Text style={styles.modalFontePreco}>
                via {dadosPrecoGerada?.fonte || 'PriceEmpire API'}
              </Text>
            </View>

            <Text style={styles.avisoInventarioModal}>
              ✓ Esta skin já foi adicionada ao seu inventário!
            </Text>

            {/* Ações do Modal */}
            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.botaoModalNovoContrato}
                activeOpacity={0.7}
                onPress={() => setModalResultadoAberto(false)}
              >
                <MaterialIcons name="refresh" size={18} color={CORES.textoInvertido} />
                <Text style={styles.textoBotaoModalNovoContrato}>Novo Contrato</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoModalVerInventario}
                activeOpacity={0.7}
                onPress={() => {
                  setModalResultadoAberto(false);
                  router.push('/inventario');
                }}
              >
                <MaterialIcons name="inventory" size={18} color={CORES.textoPrincipal} />
                <Text style={styles.textoBotaoModalVerInventario}>Ver no Inventário</Text>
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
  scrollPrincipal: {
    flex: 1,
  },
  conteudoScroll: {
    paddingBottom: 40,
  },
  cabecalhoPagina: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.md,
    paddingBottom: ESPACAMENTO.sm,
  },
  linhaTituloPagina: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circuloIconeCabecalho: {
    width: 42,
    height: 42,
    borderRadius: BORDAS.pill,
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ESPACAMENTO.md,
  },
  infoCabecalho: {
    flex: 1,
  },
  tituloPagina: {
    color: CORES.textoPrincipal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtituloPagina: {
    color: CORES.textoSecundario,
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 18,
  },
  bannerAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    marginHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.sm,
    gap: ESPACAMENTO.sm,
  },
  textoBannerAviso: {
    flex: 1,
    color: CORES.laranjaBrilhante,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Área da Caixa do Contrato
  cardAreaContrato: {
    backgroundColor: CORES.fundoSuperficie,
    marginHorizontal: ESPACAMENTO.lg,
    marginTop: ESPACAMENTO.md,
    borderRadius: BORDAS.lg,
    padding: ESPACAMENTO.md,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  linhaTopoContrato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  colunaInfoContrato: {
    flex: 1,
    marginRight: ESPACAMENTO.sm,
  },
  rotuloSkinsContrato: {
    color: CORES.laranjaCs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  linhaRaridadeBloqueada: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
    gap: 4,
  },
  subrotuloRaridade: {
    color: CORES.textoSecundario,
    fontSize: 11,
  },
  badgeRaridadeTravada: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  textoBadgeRaridadeTravada: {
    fontSize: 10,
    fontWeight: '800',
  },
  linhaContadorAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACAMENTO.sm,
  },
  badgeContador: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeContadorCompleto: {
    backgroundColor: CORES.laranjaCs,
    borderColor: CORES.laranjaBrilhante,
  },
  textoContador: {
    color: CORES.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
  },
  textoContadorCompleto: {
    color: CORES.textoInvertido,
    fontWeight: '900',
  },
  botaoLimparSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: BORDAS.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 2,
  },
  textoLimparSlots: {
    color: CORES.erro,
    fontSize: 11,
    fontWeight: '700',
  },
  containerSlots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  boxResultadoPrevia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    borderRadius: BORDAS.sm,
    padding: ESPACAMENTO.sm,
    marginTop: ESPACAMENTO.md,
    gap: 6,
  },
  textoResultadoPrevia: {
    color: CORES.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  badgePreviaRaridade: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  textoBadgePreviaRaridade: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  botaoAssinar: {
    backgroundColor: CORES.laranjaCs,
    borderWidth: 1.5,
    borderColor: CORES.laranjaBrilhante,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 13,
    marginTop: ESPACAMENTO.md,
    gap: ESPACAMENTO.sm,
  },
  botaoAssinarDesabilitado: {
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  textoBotaoAssinar: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  textoBotaoAssinarDesabilitado: {
    color: CORES.textoMudo,
    fontWeight: '700',
  },

  // Seção do Inventário
  secaoInventario: {
    paddingHorizontal: ESPACAMENTO.lg,
    paddingTop: ESPACAMENTO.lg,
  },
  cabecalhoSecaoInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.sm,
  },
  infoSecaoInventario: {
    flex: 1,
  },
  tituloInventario: {
    color: CORES.textoPrincipal,
    fontSize: 18,
    fontWeight: '800',
  },
  subtituloInventario: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  badgeQtdSkins: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
  },
  totalSkinsBadge: {
    color: CORES.laranjaBrilhante,
    fontSize: 11,
    fontWeight: '800',
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoInput,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    paddingHorizontal: ESPACAMENTO.md,
    height: 42,
    marginBottom: ESPACAMENTO.md,
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
  gradeInventario: {
    gap: ESPACAMENTO.sm,
  },
  cardItemInventario: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.fundoCard,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.sm,
  },
  cardSelecionado: {
    borderColor: CORES.sucesso,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  containerImagemInv: {
    width: 68,
    height: 52,
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: BORDAS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.bordaSuave,
  },
  imagemSkinInv: {
    width: 62,
    height: 46,
  },
  semImagemInv: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemInv: {
    color: CORES.textoMudo,
    fontSize: 10,
    fontWeight: '700',
  },
  infoSkinInv: {
    flex: 1,
    marginLeft: ESPACAMENTO.md,
    marginRight: ESPACAMENTO.xs,
  },
  linhaNomeInv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatTrak: {
    color: CORES.laranjaCs,
    fontSize: 12,
    fontWeight: '900',
  },
  nomeSkinInv: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  linhaTagsInv: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  chipRaridadeItem: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  textoChipRaridadeItem: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  condicaoInv: {
    color: CORES.textoSecundario,
    fontSize: 10,
  },
  precoInv: {
    color: CORES.sucesso,
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 3,
  },
  colunaAcaoInv: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badgeSelecionada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.sucesso,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: BORDAS.sm,
    gap: 3,
  },
  textoBadgeSelecionada: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    borderWidth: 1,
    borderColor: CORES.laranjaCs,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: BORDAS.sm,
    gap: 3,
  },
  textoBadgeAdicionar: {
    color: CORES.laranjaCs,
    fontSize: 10.5,
    fontWeight: '800',
  },
  vazioContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: ESPACAMENTO.lg,
  },
  circuloIconeVazioGeral: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: CORES.fundoSuperficie,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.md,
  },
  vazioTitulo: {
    color: CORES.textoPrincipal,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  vazioSubtitulo: {
    color: CORES.textoSecundario,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: ESPACAMENTO.lg,
    lineHeight: 18,
  },
  botaoAcaoVazio: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: BORDAS.md,
    gap: ESPACAMENTO.sm,
  },
  textoBotaoAcaoVazio: {
    color: CORES.textoInvertido,
    fontWeight: '900',
    fontSize: 13,
  },

  // Modal de Resultado do Contrato
  modalFundo: {
    flex: 1,
    backgroundColor: CORES.fundoModal,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ESPACAMENTO.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CORES.fundoSuperficie,
    borderRadius: BORDAS.xl,
    borderWidth: 2,
    padding: ESPACAMENTO.xl,
    alignItems: 'center',
  },
  circuloSucessoModal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.ouro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ESPACAMENTO.sm,
  },
  modalTituloSucesso: {
    color: CORES.laranjaCs,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSubtituloSucesso: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeModalStatTrak: {
    backgroundColor: CORES.laranjaEscuro,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  textoBadgeModalStatTrak: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  containerImagemModal: {
    width: '100%',
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  imagemModalSkin: {
    width: '90%',
    height: 115,
  },
  modalNomeSkin: {
    color: CORES.textoPrincipal,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  chipModalRaridade: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 6,
  },
  textoChipModalRaridade: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalCondicao: {
    color: CORES.textoSecundario,
    fontSize: 12,
    marginTop: 6,
  },
  modalColecaoOrigem: {
    color: CORES.textoMudo,
    fontSize: 11,
    marginTop: 2,
  },
  modalBoxPreco: {
    width: '100%',
    backgroundColor: CORES.fundoCard,
    borderRadius: BORDAS.md,
    padding: ESPACAMENTO.md,
    marginTop: ESPACAMENTO.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  modalTituloBoxPreco: {
    color: CORES.textoMudo,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalValorPreco: {
    color: CORES.sucesso,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  modalFontePreco: {
    color: CORES.textoMudo,
    fontSize: 10,
    marginTop: 1,
  },
  avisoInventarioModal: {
    color: CORES.sucesso,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: ESPACAMENTO.md,
    textAlign: 'center',
  },
  modalAcoes: {
    width: '100%',
    marginTop: ESPACAMENTO.md,
    gap: ESPACAMENTO.sm,
  },
  botaoModalNovoContrato: {
    backgroundColor: CORES.laranjaCs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 12,
    gap: 6,
  },
  textoBotaoModalNovoContrato: {
    color: CORES.textoInvertido,
    fontSize: 14,
    fontWeight: '800',
  },
  botaoModalVerInventario: {
    backgroundColor: CORES.fundoCardElevado,
    borderWidth: 1,
    borderColor: CORES.bordaDestaque,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDAS.md,
    paddingVertical: 11,
    gap: 6,
  },
  textoBotaoModalVerInventario: {
    color: CORES.textoPrincipal,
    fontSize: 13,
    fontWeight: '700',
  },
});
