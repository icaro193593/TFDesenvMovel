import { useState, useEffect, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import ContractSlot from '../components/ContractSlot';
import { obterPrecoSkin } from '../services/priceService';

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

  // 2. Carrega e atualiza o inventário do usuário sempre que entrar na tela
  const carregarInventario = useCallback(() => {
    setIsLoadingInventario(true);
    AsyncStorage.getItem(STORAGE_KEY_INVENTARIO)
      .then((dados) => {
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
      carregarInventario();
    }, [carregarInventario])
  );

  // Limpa mensagens temporárias de aviso após 3 segundos
  useEffect(() => {
    if (mensagemAviso) {
      const timer = setTimeout(() => {
        setMensagemAviso(null);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [mensagemAviso]);

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

    // G. Consulta o valor de mercado via PriceEmpire / Steam
    obterPrecoSkin(skinSorteada.name, raridadeSuperiorObj.name, wearFinal, isStatTrakFinal)
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
          preco: precoResultado?.precoFormatado || '$ 25.00 USD',
          valorNumerico: precoResultado?.valorNumerico || 25.0,
          idInventario: `contrato-${skinSorteada.id}-${Date.now()}`,
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
  // Quando uma skin é selecionada, oculta COMPLETAMENTE todas as skins de outras raridades
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
        <ActivityIndicator size="large" color="#F58220" />
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
          <Text style={styles.tituloPagina}>Contrato de Trocas</Text>
          <Text style={styles.subtituloPagina}>
            Combine 3 skins da mesma raridade para receber 1 de tier superior
          </Text>
        </View>

        {/* Mensagem de Aviso Flutuante */}
        {mensagemAviso && (
          <View style={styles.bannerAviso}>
            <MaterialIcons name="info-outline" size={18} color="#C95F08" />
            <Text style={styles.textoBannerAviso}>{mensagemAviso}</Text>
          </View>
        )}

        {/* ÁREA DA CAIXA DO CONTRATO */}
        <View style={styles.cardAreaContrato}>
          {/* Topo da Caixa: Título e Contador de Skins */}
          <View style={styles.linhaTopoContrato}>
            <View>
              <Text style={styles.rotuloSkinsContrato}>SKINS PARA CONTRATO</Text>
              {raridadeBloqueada ? (
                <Text style={styles.subrotuloRaridade}>
                  Raridade travada: <Text style={styles.destaqueRaridade}>{raridadeBloqueada}</Text>
                </Text>
              ) : (
                <Text style={styles.subrotuloRaridade}>
                  Escolha qualquer skin para travar a raridade
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
                  onPress={limparContrato}
                >
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

          {/* Prévia do Resultado do Contrato */}
          {raridadeSuperiorAlvo && (
            <View style={styles.boxResultadoPrevia}>
              <MaterialIcons name="trending-up" size={18} color="#F58220" />
              <Text style={styles.textoResultadoPrevia}>
                Resultado garantido: Skin de raridade{' '}
                <Text style={{ color: raridadeSuperiorAlvo.cor, fontWeight: 'bold' }}>
                  {raridadeSuperiorAlvo.name}
                </Text>
              </Text>
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
              <ActivityIndicator size="small" color="#0F1923" />
            ) : (
              <MaterialIcons
                name="history-edu"
                size={22}
                color={skinsContrato.length === 3 ? '#0F1923' : '#64748B'}
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
            <View>
              <Text style={styles.tituloInventario}>Meu Inventário</Text>
              <Text style={styles.subtituloInventario}>
                {raridadeBloqueada
                  ? `Mostrando apenas skins ${raridadeBloqueada}`
                  : 'Toque em uma skin para adicionar aos slots'}
              </Text>
            </View>
            <Text style={styles.totalSkinsBadge}>
              {itensInventarioFiltrados.length} {raridadeBloqueada ? 'compatíveis' : 'skins'}
            </Text>
          </View>

          {/* Campo de Busca no Inventário */}
          {inventario.length > 0 && (
            <View style={styles.barraBusca}>
              <TextInput
                style={styles.campoBusca}
                value={buscaInventario}
                onChangeText={setBuscaInventario}
                placeholder="Buscar no inventário por skin ou arma..."
                placeholderTextColor="#5D79AE"
              />
              {buscaInventario.length > 0 && (
                <TouchableOpacity
                  style={styles.botaoLimparBusca}
                  activeOpacity={0.7}
                  onPress={() => setBuscaInventario('')}
                >
                  <Text style={styles.textoLimparBusca}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lista de Skins do Inventário */}
          {itensInventarioFiltrados.length === 0 ? (
            <View style={styles.vazioContainer}>
              <MaterialIcons name="inventory-2" size={44} color="#68A3E5" />
              <Text style={styles.vazioTitulo}>
                {inventario.length === 0
                  ? 'Seu inventário está vazio'
                  : raridadeBloqueada
                  ? `Sem outras skins da raridade "${raridadeBloqueada}"`
                  : 'Nenhuma skin compatível encontrada.'}
              </Text>
              <Text style={styles.vazioSubtitulo}>
                {inventario.length === 0
                  ? 'Abra caixas para colecionar skins e usá-las em contratos de troca!'
                  : raridadeBloqueada
                  ? 'Você não possui mais skins dessa raridade no inventário para completar os 3 slots.'
                  : 'Tente buscar com outro nome de arma ou skin.'}
              </Text>
              {inventario.length === 0 ? (
                <TouchableOpacity
                  style={styles.botaoIrCaixas}
                  activeOpacity={0.7}
                  onPress={() => router.push('/caixas')}
                >
                  <MaterialIcons name="vpn-key" size={18} color="#0F1923" />
                  <Text style={styles.textoBotaoIrCaixas}>Abrir Caixas Agora</Text>
                </TouchableOpacity>
              ) : raridadeBloqueada ? (
                <TouchableOpacity
                  style={styles.botaoIrCaixas}
                  activeOpacity={0.7}
                  onPress={limparContrato}
                >
                  <MaterialIcons name="refresh" size={18} color="#0F1923" />
                  <Text style={styles.textoBotaoIrCaixas}>Limpar Filtro e Contrato</Text>
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

                const nomeRaridade = item.rarity?.name || '';
                const corRaridade = item.rarity?.color || '#2B6CB0';

                return (
                  <TouchableOpacity
                    key={idItem}
                    style={[
                      styles.cardItemInventario,
                      { borderLeftColor: corRaridade },
                      selecionadaNoContrato && styles.cardSelecionado,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selecionarSkinParaContrato(item)}
                  >
                    {/* Imagem da Skin */}
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

                      <Text style={[styles.raridadeInv, { color: corRaridade }]}>
                        {nomeRaridade}
                      </Text>

                      {item.wearNome && (
                        <Text style={styles.condicaoInv}>{item.wearNome}</Text>
                      )}

                      <Text style={styles.precoInv}>
                        {item.preco || '$ 0.00 USD'}
                      </Text>
                    </View>

                    {/* Indicador de Status: Adicionada ao Contrato / Adicionar */}
                    <View style={styles.colunaAcaoInv}>
                      {selecionadaNoContrato ? (
                        <View style={styles.badgeSelecionada}>
                          <MaterialIcons name="check" size={14} color="#FFFFFF" />
                          <Text style={styles.textoBadgeSelecionada}>No contrato</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeAdicionar}>
                          <MaterialIcons name="add" size={14} color="#1E4C8A" />
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

      {/* MODAL DE RESULTADO DO CONTRATO */}
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
              { borderColor: skinGerada?.rarity?.color || '#F58220' },
            ]}
          >
            <Text style={styles.modalTituloSucesso}>CONTRATO REALIZADO!</Text>
            <Text style={styles.modalSubtituloSucesso}>
              As 3 skins foram consumidas e você recebeu:
            </Text>

            {/* Tag StatTrak™ */}
            {skinGerada?.isStatTrak && (
              <View style={styles.badgeModalStatTrak}>
                <Text style={styles.textoBadgeModalStatTrak}>StatTrak™</Text>
              </View>
            )}

            {/* Imagem da Skin Gerada */}
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

            {/* Badge da Raridade Superior */}
            <View
              style={[
                styles.badgeModalRaridade,
                { backgroundColor: skinGerada?.rarity?.color || '#4b69ff' },
              ]}
            >
              <Text style={styles.textoBadgeModalRaridade}>
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

            {/* Card com Cotação de Preço */}
            <View style={styles.modalBoxPreco}>
              <Text style={styles.modalTituloBoxPreco}>VALOR DE MERCADO</Text>
              <Text style={styles.modalValorPreco}>
                {dadosPrecoGerada?.precoFormatado || '$ 0.00 USD'}
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
                <MaterialIcons name="refresh" size={18} color="#0F1923" />
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
                <MaterialIcons name="inventory" size={18} color="#1E4C8A" />
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
  scrollPrincipal: {
    flex: 1,
  },
  conteudoScroll: {
    paddingBottom: 40,
  },
  cabecalhoPagina: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tituloPagina: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtituloPagina: {
    color: '#2B6CB0',
    fontSize: 13,
    marginTop: 2,
  },
  bannerAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  textoBannerAviso: {
    flex: 1,
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },

  // Área da Caixa do Contrato
  cardAreaContrato: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linhaTopoContrato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rotuloSkinsContrato: {
    color: '#F58220',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  subrotuloRaridade: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  destaqueRaridade: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  linhaContadorAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeContador: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeContadorCompleto: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  textoContador: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  textoContadorCompleto: {
    color: '#0F1923',
    fontWeight: 'bold',
  },
  botaoLimparSlots: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  textoLimparSlots: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  containerSlots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  boxResultadoPrevia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    gap: 6,
  },
  textoResultadoPrevia: {
    color: '#E2E8F0',
    fontSize: 11,
    flex: 1,
  },
  botaoAssinar: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  botaoAssinarDesabilitado: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textoBotaoAssinar: {
    color: '#0F1923',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textoBotaoAssinarDesabilitado: {
    color: '#64748B',
  },

  // Seção do Inventário
  secaoInventario: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cabecalhoSecaoInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloInventario: {
    color: '#1E4C8A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  subtituloInventario: {
    color: '#2B6CB0',
    fontSize: 12,
    marginTop: 1,
  },
  totalSkinsBadge: {
    backgroundColor: '#EBF4FC',
    color: '#1E4C8A',
    fontSize: 11,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  campoBusca: {
    flex: 1,
    color: '#1E3A5F',
    fontSize: 13,
  },
  botaoLimparBusca: {
    paddingHorizontal: 4,
  },
  textoLimparBusca: {
    color: '#2B6CB0',
    fontSize: 11,
    fontWeight: '600',
  },
  gradeInventario: {
    gap: 8,
  },
  cardItemInventario: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderLeftWidth: 5,
    borderRadius: 8,
    padding: 8,
  },
  cardSelecionado: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  cardIncompativel: {
    opacity: 0.4,
  },
  containerImagemInv: {
    width: 65,
    height: 50,
    backgroundColor: '#EBF4FC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemSkinInv: {
    width: 60,
    height: 45,
  },
  semImagemInv: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSemImagemInv: {
    color: '#2B6CB0',
    fontSize: 10,
  },
  infoSkinInv: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  linhaNomeInv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatTrak: {
    color: '#C95F08',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nomeSkinInv: {
    color: '#1E3A5F',
    fontSize: 13,
    fontWeight: 'bold',
  },
  raridadeInv: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  condicaoInv: {
    color: '#5D79AE',
    fontSize: 10,
    marginTop: 1,
  },
  precoInv: {
    color: '#059669',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  colunaAcaoInv: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badgeSelecionada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  textoBadgeSelecionada: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#68A3E5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 2,
  },
  textoBadgeAdicionar: {
    color: '#1E4C8A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeNaoPermitida: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  textoBadgeNaoPermitida: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
  },
  badgeIncompativel: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  textoBadgeIncompativel: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '600',
  },
  vazioContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  vazioTitulo: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  vazioSubtitulo: {
    color: '#2B6CB0',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  botaoIrCaixas: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    gap: 6,
  },
  textoBotaoIrCaixas: {
    color: '#0F1923',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Modal de Resultado do Contrato
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
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
  modalTituloSucesso: {
    color: '#F58220',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalSubtituloSucesso: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeModalStatTrak: {
    backgroundColor: '#C95F08',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  textoBadgeModalStatTrak: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  containerImagemModal: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  imagemModalSkin: {
    width: '90%',
    height: 110,
  },
  modalNomeSkin: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeModalRaridade: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  textoBadgeModalRaridade: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalCondicao: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  modalColecaoOrigem: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  modalBoxPreco: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTituloBoxPreco: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalValorPreco: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalFontePreco: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  avisoInventarioModal: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  modalAcoes: {
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  botaoModalNovoContrato: {
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 11,
    gap: 6,
  },
  textoBotaoModalNovoContrato: {
    color: '#0F1923',
    fontSize: 14,
    fontWeight: 'bold',
  },
  botaoModalVerInventario: {
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
  textoBotaoModalVerInventario: {
    color: '#1E4C8A',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
