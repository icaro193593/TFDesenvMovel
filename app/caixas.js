import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import CartaoCaixa from '../components/CartaoCaixa';
import ItemRoleta from '../components/ItemRoleta';
import { CORES } from '../constants/cs2Theme';
import { obterMoedaSelecionada, obterPrecoSkin, formatarPrecoMoeda } from '../services/priceService';
import {
  obterSaldoBRL,
  obterUpgrades,
  obterEfeitosUpgrades,
  formatarBRLNaMoeda,
  formatarValorVendaSkin,
  calcularValorVendaBRL,
  venderSkinDoInventario,
  venderVariasSkinsDoInventario,
} from '../services/economyService';

const URL_API_CRATES = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json';
const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const LARGURA_CARD = 120;
const PASSO_ROLETA = LARGURA_CARD + 8;
const INDICE_VENCEDOR = 36;
const TOTAL_ITENS_ROLETA = 45;
const MAX_ROLETAS = 3;

const PROBABILIDADES_BASE = [
  { tipo: 'mil-spec', peso: 0.7992 },
  { tipo: 'restricted', peso: 0.1598 },
  { tipo: 'classified', peso: 0.032 },
  { tipo: 'covert', peso: 0.0064 },
];

const PROBABILIDADES_CAPSULA = [
  { tipo: 'high grade', peso: 0.7992 },
  { tipo: 'remarkable', peso: 0.1598 },
  { tipo: 'exotic', peso: 0.032 },
  { tipo: 'extraordinary', peso: 0.0064 },
];

const FAIXAS_WEAR_PADRAO = [
  { nome: 'Factory New', peso: 0.14, min: 0.001, max: 0.069 },
  { nome: 'Minimal Wear', peso: 0.24, min: 0.07, max: 0.149 },
  { nome: 'Field-Tested', peso: 0.33, min: 0.15, max: 0.379 },
  { nome: 'Well-Worn', peso: 0.15, min: 0.38, max: 0.449 },
  { nome: 'Battle-Scarred', peso: 0.14, min: 0.45, max: 0.99 },
];

const FAIXAS_WEAR_FLOAT_LOCKED = [
  { nome: 'Factory New', peso: 0.65, min: 0.001, max: 0.069 },
  { nome: 'Minimal Wear', peso: 0.35, min: 0.07, max: 0.149 },
];

const detectarTipoCaixa = (caixa) => {
  const tipo = caixa?.type || '';
  const isCapsulaAdesivo = /sticker|autograph/i.test(tipo);
  const isSouvenir = /souvenir/i.test(tipo);
  const isSemDesgaste =
    isCapsulaAdesivo || /graffiti|patch|pin|music|collectible/i.test(tipo);
  return { isCapsulaAdesivo, isSouvenir, isSemDesgaste };
};

const sortearPorPeso = (entradas) => {
  const somaTotal = entradas.reduce((acc, item) => acc + item.peso, 0);
  if (somaTotal <= 0 || entradas.length === 0) return entradas[0] || null;
  const alvo = Math.random() * somaTotal;
  let acumulado = 0;
  for (const entrada of entradas) {
    acumulado += entrada.peso;
    if (alvo <= acumulado) return entrada;
  }
  return entradas[entradas.length - 1];
};

const sortearDesgaste = (nomeSkin) => {
  const ehFloatLocked =
    /fade|doppler|marble fade|tiger tooth|hot rod|knight|slaughter|autotronic|damascus steel/i.test(
      nomeSkin || ''
    );
  const faixas = ehFloatLocked ? FAIXAS_WEAR_FLOAT_LOCKED : FAIXAS_WEAR_PADRAO;
  const faixa = sortearPorPeso(faixas);
  const floatValor = Number((faixa.min + Math.random() * (faixa.max - faixa.min)).toFixed(6));
  return { floatValor, wearNome: faixa.nome };
};

const EFEITOS_PADRAO = {
  quantidadeCaixas: 1,
  chancePularRaridade: 0,
  itensNecessariosContrato: 10,
  chanceItemEspecial: 0.0026,
  chanceItemDobrado: 0,
  bonusHigherLowerBRL: 0,
};

const limparTexto = (t) => (t || '').replace(/[\u2605\u2122]/g, '').trim();
const obterCorRaridade = (item) =>
  item?.rarity?.color || CORES.raridades?.[item?.rarity?.name] || CORES.azulPrincipal;

const gerarEsteiraPreview = (skins) =>
  Array.from({ length: TOTAL_ITENS_ROLETA }, (_, i) => {
    const s = skins[Math.floor(Math.random() * skins.length)];
    return { ...s, idUnico: `preview-${i}-${s?.id || i}` };
  });

export default function TelaCaixas() {
  const [caixas, setCaixas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [caixaSelecionada, setCaixaSelecionada] = useState(null);
  const [itensRoletas, setItensRoletas] = useState([[], [], []]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [larguraViewport, setLarguraViewport] = useState(320);
  const [indicesDestacados, setIndicesDestacados] = useState([null, null, null]);
  const [skinsGanhas, setSkinsGanhas] = useState([]);
  const [idsVendidos, setIdsVendidos] = useState([]);
  const [buscandoPreco, setBuscandoPreco] = useState(false);
  const [vendendo, setVendendo] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [saldoBRL, setSaldoBRL] = useState(0);
  const [efeitos, setEfeitos] = useState(EFEITOS_PADRAO);
  const [qtdAbrir, setQtdAbrir] = useState(1);

  const roletaRefs = useRef([null, null, null]);
  const timerAnimacaoRef = useRef(null);
  const timerModalRef = useRef(null);
  const sorteioAtivoRef = useRef(null);
  const maxCaixasAnteriorRef = useRef(1);

  const limparTimers = () => {
    if (timerAnimacaoRef.current) clearInterval(timerAnimacaoRef.current);
    if (timerModalRef.current) clearTimeout(timerModalRef.current);
    timerAnimacaoRef.current = null;
    timerModalRef.current = null;
  };

  const carregarCaixas = () => {
    setIsLoading(true);
    setErro(null);
    fetch(URL_API_CRATES)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar caixas.');
        return res.json();
      })
      .then((dados) => setCaixas(dados.filter((c) => c.contains?.length > 0)))
      .catch((err) => setErro(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    carregarCaixas();
    return limparTimers;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      Promise.all([obterMoedaSelecionada(), obterSaldoBRL(), obterUpgrades()])
        .then(([moeda, saldo, upgrades]) => {
          if (!ativo) return;
          const novosEfeitos = obterEfeitosUpgrades(upgrades) || EFEITOS_PADRAO;
          const maxCaixas = Math.min(
            MAX_ROLETAS,
            Math.max(1, Number(novosEfeitos.quantidadeCaixas) || 1)
          );
          setMoedaAtual(moeda || 'USD');
          setSaldoBRL(typeof saldo === 'number' ? saldo : 0);
          setEfeitos(novosEfeitos);
          setQtdAbrir((atual) => {
            if (maxCaixas !== maxCaixasAnteriorRef.current) {
              maxCaixasAnteriorRef.current = maxCaixas;
              return maxCaixas;
            }
            return Math.min(atual, maxCaixas);
          });
        })
        .catch(() => {});
      return () => {
        ativo = false;
      };
    }, [])
  );

  useEffect(() => {
    const skins = caixaSelecionada?.contains || [];
    if (!caixaSelecionada || skins.length === 0) return;
    setItensRoletas([
      gerarEsteiraPreview(skins),
      gerarEsteiraPreview(skins),
      gerarEsteiraPreview(skins),
    ]);
    setIndicesDestacados([null, null, null]);
    roletaRefs.current.forEach((ref) => ref?.scrollToOffset({ offset: 0, animated: false }));
  }, [caixaSelecionada]);

  const sortearSkin = (caixa) => {
    const raras = caixa.contains_rare || [];
    const skins = caixa.contains || [];
    const { isSouvenir, isSemDesgaste } = detectarTipoCaixa(caixa);

    const presentesCapsula = PROBABILIDADES_CAPSULA.filter((prob) =>
      skins.some((s) => (s.rarity?.name || '').toLowerCase().includes(prob.tipo))
    );
    const temRaridadeSticker = presentesCapsula.length > 0;

    const temEspecial = !isSemDesgaste && !temRaridadeSticker && raras.length > 0;
    const chanceEspecial = temEspecial
      ? Math.min(1, Math.max(0, Number(efeitos?.chanceItemEspecial ?? 0.0026)))
      : 0;

    const presentes = temRaridadeSticker
      ? presentesCapsula
      : PROBABILIDADES_BASE.filter((prob) =>
          skins.some((s) => (s.rarity?.name || '').toLowerCase().includes(prob.tipo))
        );
    const somaPesos = presentes.reduce((acc, p) => acc + p.peso, 0);
    const restante = Math.max(0, 1 - chanceEspecial);

    const tabela = [];
    if (temEspecial && chanceEspecial > 0) {
      tabela.push({ tipo: 'special', peso: chanceEspecial });
    }
    if (presentes.length > 0 && somaPesos > 0) {
      for (const prob of presentes) {
        tabela.push({ tipo: prob.tipo, peso: (prob.peso / somaPesos) * restante });
      }
    } else if (restante > 0) {
      tabela.push({ tipo: 'qualquer', peso: restante });
    }

    const tipoSorteado = sortearPorPeso(tabela)?.tipo || 'qualquer';
    const ehEspecial = tipoSorteado === 'special' && temEspecial;
    const candidatas = ehEspecial
      ? raras
      : tipoSorteado === 'qualquer'
      ? skins
      : skins.filter((s) => (s.rarity?.name || '').toLowerCase().includes(tipoSorteado));
    const pool = candidatas.length > 0 ? candidatas : skins;
    const skin = pool[Math.floor(Math.random() * pool.length)];

    const nome = (skin?.name || '').trim();
    const isFacaVanilla = nome.startsWith('★') && !nome.includes('|');
    const isLuva = /gloves|hand wraps/i.test(nome);
    const isFacaOuLuva = ehEspecial || nome.startsWith('★');

    let floatValor = null;
    let wearNome = null;
    let isStatTrak = false;

    if (isSemDesgaste) {
      floatValor = null;
      wearNome = null;
      isStatTrak = false;
    } else if (isFacaVanilla) {
      floatValor = null;
      wearNome = null;
      isStatTrak = Math.random() < 0.1;
    } else {
      const desgaste = sortearDesgaste(nome);
      floatValor = desgaste.floatValor;
      wearNome = desgaste.wearNome;
      isStatTrak = isLuva || isSouvenir ? false : Math.random() < 0.1;
    }

    return { skin, floatValor, wearNome, isStatTrak, isFacaOuLuva };
  };

  const salvarVariasNoInventario = async (novosItens) => {
    try {
      const dados = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
      const lista = dados ? JSON.parse(dados) : [];
      const inventario = Array.isArray(lista) ? lista : [];
      const atualizado = [...novosItens, ...inventario];
      await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(atualizado));
    } catch (e) {

    }
  };

  const iniciarAbertura = () => {
    if (isSpinning || !caixaSelecionada) return;
    limparTimers();
    setIsSpinning(true);
    setIndicesDestacados([null, null, null]);
    setSkinsGanhas([]);
    setIdsVendidos([]);

    const caixaAtual = caixaSelecionada;
    const { isSouvenir } = detectarTipoCaixa(caixaAtual);
    const tipoCaixa = caixaAtual?.type || '';
    const nomeCaixaOrigem = caixaAtual?.name || 'Caixa';

    const maxPermitido = Math.min(
      MAX_ROLETAS,
      Math.max(1, Number(efeitos?.quantidadeCaixas) || 1)
    );
    const qtdRodada = Math.min(Math.max(1, qtdAbrir), maxPermitido);
    const skinsBase = caixaAtual.contains || [];

    const resultadosRodada = Array.from({ length: qtdRodada }, () => sortearSkin(caixaAtual));
    const novasEsteiras = [0, 1, 2].map((idx) => {
      if (idx >= qtdRodada) return itensRoletas[idx]?.length ? itensRoletas[idx] : gerarEsteiraPreview(skinsBase);
      const resultado = resultadosRodada[idx];
      return Array.from({ length: TOTAL_ITENS_ROLETA }, (_, i) => {
        const s =
          i === INDICE_VENCEDOR
            ? resultado.skin
            : skinsBase[Math.floor(Math.random() * skinsBase.length)];
        return { ...s, idUnico: `spin-${idx}-${i}-${s?.id || i}` };
      });
    });

    setItensRoletas(novasEsteiras);
    for (let idx = 0; idx < qtdRodada; idx++) {
      roletaRefs.current[idx]?.scrollToOffset({ offset: 0, animated: false });
    }

    const offsetsFinais = resultadosRodada.map(() => {
      const variacao = (Math.random() - 0.5) * 30;
      return 12 + INDICE_VENCEDOR * PASSO_ROLETA + 4 + LARGURA_CARD / 2 - larguraViewport / 2 + variacao;
    });
    const inicio = Date.now();

    timerAnimacaoRef.current = setInterval(() => {
      const progresso = Math.min(1, (Date.now() - inicio) / 4200);
      const ease = 1 - Math.pow(1 - progresso, 3);
      for (let idx = 0; idx < qtdRodada; idx++) {
        roletaRefs.current[idx]?.scrollToOffset({
          offset: Math.max(0, offsetsFinais[idx] * ease),
          animated: false,
        });
      }

      if (progresso >= 1) {
        clearInterval(timerAnimacaoRef.current);
        timerAnimacaoRef.current = null;
        setIsSpinning(false);
        setIndicesDestacados(
          [0, 1, 2].map((idx) => (idx < qtdRodada ? INDICE_VENCEDOR : null))
        );

        const rodadaId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sorteioAtivoRef.current = rodadaId;

        const chanceDobrado = Math.min(1, Math.max(0, Number(efeitos?.chanceItemDobrado) || 0));
        const premiosIniciais = [];
        resultadosRodada.forEach((resultado, idx) => {
          const dobrou = Math.random() < chanceDobrado;
          const copias = dobrou ? 2 : 1;
          for (let c = 0; c < copias; c++) {
            const idUnico = `${rodadaId}_${idx}_${c}`;
            premiosIniciais.push({
              ...resultado.skin,
              ...resultado,
              idInventario: idUnico,
              idUnico,
              dobrado: dobrou,
              caixaIndex: idx,
              corRaridade: obterCorRaridade(resultado.skin),
              precoUSD: 0,
              valorUsd: 0,
              valorNumerico: 0,
              moeda: moedaAtual,
              preco: formatarPrecoMoeda(0, moedaAtual),
            });
          }
        });

        setSkinsGanhas(premiosIniciais);
        setIdsVendidos([]);
        setBuscandoPreco(true);

        Promise.all(
          resultadosRodada.map((resultado) =>
            obterPrecoSkin(
              resultado.skin.name,
              resultado.skin.rarity?.name || 'Mil-Spec Grade',
              resultado.wearNome,
              resultado.isStatTrak,
              moedaAtual,
              {
                tipoCaixa,
                isSouvenir,
                isFacaOuLuva: resultado.isFacaOuLuva,
              }
            ).catch(() => ({
              precoFormatado: formatarPrecoMoeda(0, moedaAtual),
              valorNumerico: 0,
              valorUsd: 0,
              moeda: moedaAtual,
            }))
          )
        ).then(async (precosPorCaixa) => {
          const agora = Date.now();
          const dataObtencao = new Date().toLocaleDateString('pt-BR');
          const itensCompletos = premiosIniciais.map((premio) => {
            const precoInfo = precosPorCaixa[premio.caixaIndex];
            const valorUsd = typeof precoInfo?.valorUsd === 'number' ? precoInfo.valorUsd : 0;
            const valorNumerico =
              typeof precoInfo?.valorNumerico === 'number' ? precoInfo.valorNumerico : valorUsd;
            const moeda = precoInfo?.moeda || moedaAtual || 'USD';
            const preco = precoInfo?.precoFormatado || formatarPrecoMoeda(valorNumerico, moeda);

            return {
              idInventario: premio.idInventario,
              idUnico: premio.idUnico,
              id: premio.id,
              name: premio.name,
              image: premio.image,
              rarity: premio.rarity,
              corRaridade: obterCorRaridade(premio),
              precoUSD: valorUsd,
              valorUsd,
              valorNumerico,
              moeda,
              preco,
              floatValor: premio.floatValor,
              wearNome: premio.wearNome,
              isStatTrak: premio.isStatTrak,
              isFacaOuLuva: premio.isFacaOuLuva,
              dobrado: Boolean(premio.dobrado),
              collections: premio.collections || [],
              dataObtencao,
              timestamp: agora,
              origem: 'caixa',
              nomeCaixaOrigem,
            };
          });

          await salvarVariasNoInventario(itensCompletos);

          if (sorteioAtivoRef.current === rodadaId) {
            setSkinsGanhas(itensCompletos);
            setBuscandoPreco(false);
          }
        });

        timerModalRef.current = setTimeout(() => setModalVisivel(true), 500);
      }
    }, 16);
  };

  const venderUmaSkin = async (skin) => {
    if (buscandoPreco || vendendo || idsVendidos.includes(skin.idInventario)) return;
    setVendendo(true);
    try {
      const res = await venderSkinDoInventario(skin.idInventario, skin);
      if (res?.ok) {
        setIdsVendidos((prev) =>
          prev.includes(skin.idInventario) ? prev : [...prev, skin.idInventario]
        );
        if (typeof res.novoSaldo === 'number') setSaldoBRL(res.novoSaldo);
      }
    } finally {
      setVendendo(false);
    }
  };

  const venderTodasSkins = async () => {
    if (buscandoPreco || vendendo) return;
    const pendentes = skinsGanhas.filter((s) => !idsVendidos.includes(s.idInventario));
    if (pendentes.length === 0) return;
    setVendendo(true);
    try {
      const ids = pendentes.map((s) => s.idInventario);
      const res = await venderVariasSkinsDoInventario(ids);
      if (res?.ok) {
        setIdsVendidos((prev) => [...new Set([...prev, ...ids])]);
        if (typeof res.novoSaldo === 'number') setSaldoBRL(res.novoSaldo);
      }
    } finally {
      setVendendo(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
        <Text style={styles.textoSecundario}>Carregando caixas...</Text>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoErro}>{erro}</Text>
        <TouchableOpacity style={styles.botaoAzul} onPress={carregarCaixas}>
          <Text style={styles.textoBotaoAzul}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (caixaSelecionada) {
    const maxCaixas = Math.min(
      MAX_ROLETAS,
      Math.max(1, Number(efeitos?.quantidadeCaixas) || 1)
    );
    const qtdExibida = Math.min(Math.max(1, qtdAbrir), maxCaixas);
    const textoBotaoAbrir = isSpinning
      ? 'Abrindo...'
      : qtdExibida === 1
      ? 'Abrir Caixa'
      : `Abrir ${qtdExibida} Caixas`;

    const skinsNaoVendidas = skinsGanhas.filter((s) => !idsVendidos.includes(s.idInventario));
    const totalRestanteBRL = skinsNaoVendidas.reduce(
      (acc, s) => acc + calcularValorVendaBRL(s),
      0
    );

    const cabecalhoCaixa = (
      <View>
        <View style={styles.topoCaixa}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => {
              limparTimers();
              setIsSpinning(false);
              setModalVisivel(false);
              setCaixaSelecionada(null);
            }}
          >
            <Text style={styles.textoVoltar}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.nomeCaixa} numberOfLines={2}>{limparTexto(caixaSelecionada.name)}</Text>
        </View>

        <View style={styles.barraInfoEconomia}>
          <Text style={styles.textoSaldoBarra}>Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}</Text>
          {maxCaixas > 1 && (
            <View style={styles.seletorQtd}>
              {[1, 2, 3]
                .filter((n) => n <= maxCaixas)
                .map((n) => {
                  const ativo = qtdExibida === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      disabled={isSpinning}
                      onPress={() => setQtdAbrir(n)}
                      style={[
                        styles.botaoQtd,
                        ativo && styles.botaoQtdAtivo,
                        isSpinning && styles.botaoDesativado,
                      ]}
                    >
                      <Text style={[styles.textoQtd, ativo && styles.textoQtdAtivo]}>{n}x</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}
        </View>

        <View style={styles.containerRoletas}>
          {Array.from({ length: qtdExibida }, (_, idx) => (
            <View
              key={idx}
              style={styles.areaRoleta}
              onLayout={
                idx === 0
                  ? (e) => e.nativeEvent.layout.width > 0 && setLarguraViewport(e.nativeEvent.layout.width)
                  : undefined
              }
            >
              <View style={styles.linhaCentral} />
              <FlatList
                ref={(el) => {
                  roletaRefs.current[idx] = el;
                }}
                data={itensRoletas[idx] || []}
                keyExtractor={(item, index) => item.idUnico || `${idx}-${item.id}-${index}`}
                horizontal
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.conteudoRoleta}
                renderItem={({ item, index }) => (
                  <ItemRoleta
                    item={item}
                    largura={LARGURA_CARD}
                    isDestaque={indicesDestacados[idx] === index}
                  />
                )}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.botaoAbrir, isSpinning && styles.botaoDesativado]}
          disabled={isSpinning}
          onPress={iniciarAbertura}
        >
          <Text style={styles.textoBotaoAzul}>{textoBotaoAbrir}</Text>
        </TouchableOpacity>
        <Text style={styles.tituloSecao}>Possíveis itens</Text>
      </View>
    );

    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
        <FlatList
          data={caixaSelecionada.contains || []}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={cabecalhoCaixa}
          contentContainerStyle={styles.listaConteudo}
          renderItem={({ item }) => (
            <View style={styles.linhaSkin}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.imagemSkin} resizeMode="contain" />
              ) : (
                <Text style={styles.semImagem}>Sem imagem</Text>
              )}
              <View style={styles.infoSkin}>
                <Text style={styles.nomeSkin} numberOfLines={1}>{limparTexto(item.name)}</Text>
                <Text style={[styles.raridadeSkin, { color: obterCorRaridade(item) }]}>
                  {limparTexto(item.rarity?.name || 'Comum')}
                </Text>
              </View>
            </View>
          )}
        />

        <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
          <View style={styles.modalFundo}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>
                {skinsGanhas.length <= 1 ? 'Você ganhou' : `Você ganhou ${skinsGanhas.length} skins`}
              </Text>
              <Text style={styles.modalSaldo}>Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}</Text>

              <ScrollView style={styles.modalLista} contentContainerStyle={styles.modalListaConteudo}>
                {skinsGanhas.map((skin) => {
                  const jaVendida = idsVendidos.includes(skin.idInventario);
                  return (
                    <View key={skin.idInventario} style={styles.modalItemCard}>
                      <View style={styles.modalItemTopo}>
                        {skin.image ? (
                          <Image source={{ uri: skin.image }} style={styles.modalItemImagem} resizeMode="contain" />
                        ) : (
                          <Text style={styles.semImagem}>Sem imagem</Text>
                        )}
                        <View style={styles.modalItemInfo}>
                          {skin.dobrado && (
                            <View style={styles.seloDobrado}>
                              <Text style={styles.textoSeloDobrado}>DOBRADO (2x)!</Text>
                            </View>
                          )}
                          <Text style={styles.modalNomeItem} numberOfLines={2}>
                            {skin.isStatTrak ? 'StatTrak ' : ''}{limparTexto(skin.name)}
                          </Text>
                          <Text style={[styles.modalRaridadeItem, { color: obterCorRaridade(skin) }]}>
                            {limparTexto(skin.rarity?.name || 'Special Rare Item')}
                          </Text>
                          {buscandoPreco ? (
                            <ActivityIndicator size="small" color={CORES.azulPrincipal} style={styles.modalPrecoLoader} />
                          ) : (
                            <Text style={styles.modalPrecoItem}>
                              {skin.preco || formatarPrecoMoeda(0, moedaAtual)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.botaoVenderItem,
                          (jaVendida || buscandoPreco || vendendo) && styles.botaoVenderDesativado,
                        ]}
                        disabled={jaVendida || buscandoPreco || vendendo}
                        onPress={() => venderUmaSkin(skin)}
                      >
                        <Text style={jaVendida ? styles.textoBotaoVendido : styles.textoBotaoVender}>
                          {jaVendida ? 'Vendida' : `Vender (${formatarValorVendaSkin(skin, moedaAtual)})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              {skinsNaoVendidas.length > 1 && (
                <TouchableOpacity
                  style={[
                    styles.botaoVenderTodas,
                    (buscandoPreco || vendendo) && styles.botaoDesativado,
                  ]}
                  disabled={buscandoPreco || vendendo}
                  onPress={venderTodasSkins}
                >
                  <Text style={styles.textoBotaoAzul}>
                    Vender todas ({formatarBRLNaMoeda(totalRestanteBRL, moedaAtual)})
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.acoesModal}>
                <TouchableOpacity
                  style={styles.botaoModalPrimario}
                  onPress={() => {
                    setModalVisivel(false);
                    timerModalRef.current = setTimeout(iniciarAbertura, 300);
                  }}
                >
                  <Text style={styles.textoBotaoAzul}>Abrir outra</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botaoModalSecundario} onPress={() => setModalVisivel(false)}>
                  <Text style={styles.textoBotaoSecundario}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  const termo = busca.trim().toLowerCase();
  const caixasFiltradas = caixas.filter((c) => (termo === '' ? true : (c.name || '').toLowerCase().includes(termo)));

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <TextInput
        style={styles.campoBusca}
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar caixa..."
        placeholderTextColor={CORES.textoSecundario}
      />
      <FlatList
        data={caixasFiltradas}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gradeCaixas}
        renderItem={({ item }) => <CartaoCaixa item={item} onPress={setCaixaSelecionada} />}
        ListEmptyComponent={<Text style={styles.textoVazio}>Nenhuma caixa encontrada.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  centralizado: { flex: 1, backgroundColor: CORES.fundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoSecundario: { color: CORES.textoSecundario, marginTop: 10 },
  textoErro: { color: CORES.erro, textAlign: 'center', marginBottom: 12 },
  campoBusca: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, margin: 12, paddingHorizontal: 12, height: 42, color: CORES.texto },
  gradeCaixas: { paddingHorizontal: 6, paddingBottom: 20 },
  textoVazio: { color: CORES.textoSecundario, textAlign: 'center', marginTop: 32 },
  listaConteudo: { padding: 14, paddingBottom: 24 },
  topoCaixa: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  botaoVoltar: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  textoVoltar: { color: CORES.azulPrincipal, fontWeight: 'bold' },
  nomeCaixa: { flex: 1, color: CORES.texto, fontSize: 16, fontWeight: 'bold' },
  barraInfoEconomia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  textoSaldoBarra: { color: CORES.sucesso, fontWeight: 'bold', fontSize: 13 },
  seletorQtd: { flexDirection: 'row', gap: 6 },
  botaoQtd: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  botaoQtdAtivo: { backgroundColor: CORES.azulPrincipal, borderColor: CORES.azulPrincipal },
  textoQtd: { color: CORES.texto, fontWeight: 'bold', fontSize: 12 },
  textoQtdAtivo: { color: CORES.branco },
  containerRoletas: { gap: 8 },
  areaRoleta: { height: 132, backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  linhaCentral: { position: 'absolute', top: 0, bottom: 0, alignSelf: 'center', width: 2, backgroundColor: CORES.azulPrincipal, zIndex: 10 },
  conteudoRoleta: { alignItems: 'center', paddingHorizontal: 12 },
  botaoAbrir: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  botaoAzul: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  botaoDesativado: { opacity: 0.6 },
  textoBotaoAzul: { color: CORES.branco, fontWeight: 'bold', fontSize: 15 },
  tituloSecao: { color: CORES.texto, fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  linhaSkin: { flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, padding: 8, marginBottom: 8 },
  imagemSkin: { width: 54, height: 40 },
  semImagem: { color: CORES.textoSecundario, fontSize: 11 },
  infoSkin: { flex: 1, marginLeft: 10 },
  nomeSkin: { color: CORES.texto, fontSize: 14, fontWeight: 'bold' },
  raridadeSkin: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  modalFundo: { flex: 1, backgroundColor: CORES.modalFundo, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: CORES.branco, borderRadius: 10, padding: 16, alignItems: 'center' },
  modalTitulo: { color: CORES.texto, fontSize: 18, fontWeight: 'bold' },
  modalSaldo: { color: CORES.sucesso, fontSize: 13, fontWeight: 'bold', marginTop: 4, marginBottom: 10 },
  modalLista: { width: '100%', maxHeight: 320 },
  modalListaConteudo: { gap: 8, paddingBottom: 4 },
  modalItemCard: { backgroundColor: CORES.fundo, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, padding: 10 },
  modalItemTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalItemImagem: { width: 76, height: 54 },
  modalItemInfo: { flex: 1 },
  seloDobrado: { alignSelf: 'flex-start', backgroundColor: CORES.avisoClaro, borderWidth: 1, borderColor: CORES.aviso, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  textoSeloDobrado: { color: CORES.aviso, fontSize: 10, fontWeight: 'bold' },
  modalNomeItem: { color: CORES.texto, fontSize: 13, fontWeight: 'bold' },
  modalRaridadeItem: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  modalPrecoLoader: { alignSelf: 'flex-start', marginTop: 4 },
  modalPrecoItem: { color: CORES.sucesso, fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  botaoVenderItem: { marginTop: 8, backgroundColor: CORES.sucessoClaro, borderWidth: 1, borderColor: CORES.sucesso, borderRadius: 6, paddingVertical: 7, alignItems: 'center' },
  botaoVenderDesativado: { backgroundColor: CORES.branco, borderColor: CORES.borda },
  textoBotaoVender: { color: CORES.sucesso, fontWeight: 'bold', fontSize: 13 },
  textoBotaoVendido: { color: CORES.textoSecundario, fontWeight: 'bold', fontSize: 13 },
  botaoVenderTodas: { width: '100%', backgroundColor: CORES.sucesso, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  acoesModal: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  botaoModalPrimario: { flex: 1, backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  botaoModalSecundario: { flex: 1, backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  textoBotaoSecundario: { color: CORES.texto, fontWeight: 'bold', fontSize: 14 },
});
