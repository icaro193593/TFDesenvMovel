import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import CaseCard from '../components/CaseCard';
import RouletteItem from '../components/RouletteItem';
import { CORES } from '../constants/cs2Theme';
import { obterMoedaSelecionada, obterPrecoSkin, formatarPrecoMoeda } from '../services/priceService';

const URL_API_CRATES = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json';
const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const LARGURA_CARD = 120;
const PASSO_ROLETA = LARGURA_CARD + 8;
const INDICE_VENCEDOR = 36;
const TOTAL_ITENS_ROLETA = 45;

const PROBABILIDADES = [
  { tipo: 'mil-spec', peso: 0.7992 },
  { tipo: 'restricted', peso: 0.1598 },
  { tipo: 'classified', peso: 0.032 },
  { tipo: 'covert', peso: 0.0064 },
  { tipo: 'special', peso: 0.0026 },
];

const limparTexto = (t) => (t || '').replace(/[\u2605\u2122]/g, '').trim();
const obterCorRaridade = (item) =>
  item?.rarity?.color || CORES.raridades?.[item?.rarity?.name] || CORES.azulPrincipal;

export default function CaixasScreen() {
  const [caixas, setCaixas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [caixaSelecionada, setCaixaSelecionada] = useState(null);
  const [itensRoleta, setItensRoleta] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [larguraViewport, setLarguraViewport] = useState(320);
  const [indiceDestacado, setIndiceDestacado] = useState(null);
  const [skinGanha, setSkinGanha] = useState(null);
  const [precoFormatado, setPrecoFormatado] = useState('');
  const [buscandoPreco, setBuscandoPreco] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [moedaAtual, setMoedaAtual] = useState('USD');

  const roletaRef = useRef(null);
  const timerAnimacaoRef = useRef(null);
  const timerModalRef = useRef(null);
  const sorteioAtivoRef = useRef(null);

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
    obterMoedaSelecionada().then(setMoedaAtual);
    return limparTimers;
  }, []);

  useFocusEffect(useCallback(() => { obterMoedaSelecionada().then(setMoedaAtual); }, []));

  useEffect(() => {
    const skins = caixaSelecionada?.contains || [];
    if (!caixaSelecionada || skins.length === 0) return;
    setItensRoleta(
      Array.from({ length: TOTAL_ITENS_ROLETA }, (_, i) => {
        const s = skins[Math.floor(Math.random() * skins.length)];
        return { ...s, idUnico: `preview-${i}-${s.id}` };
      })
    );
    setIndiceDestacado(null);
    roletaRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [caixaSelecionada]);

  const sortearSkin = (caixa) => {
    const rand = Math.random();
    let acumulado = 0;
    let tipoSorteado = PROBABILIDADES[0].tipo;
    for (const prob of PROBABILIDADES) {
      acumulado += prob.peso;
      if (rand <= acumulado) {
        tipoSorteado = prob.tipo;
        break;
      }
    }
    const raras = caixa.contains_rare || [];
    const skins = caixa.contains || [];
    const ehEspecial = tipoSorteado === 'special' && raras.length > 0;
    const candidatas = ehEspecial
      ? raras
      : skins.filter((s) => (s.rarity?.name || '').toLowerCase().includes(tipoSorteado));
    const pool = candidatas.length > 0 ? candidatas : skins;
    const skin = pool[Math.floor(Math.random() * pool.length)];

    const floatValor = Number((Math.random() * 0.999 + 0.001).toFixed(6));
    let wearNome = 'Battle-Scarred';
    if (floatValor < 0.07) wearNome = 'Factory New';
    else if (floatValor < 0.15) wearNome = 'Minimal Wear';
    else if (floatValor < 0.38) wearNome = 'Field-Tested';
    else if (floatValor < 0.45) wearNome = 'Well-Worn';

    return { skin, floatValor, wearNome, isStatTrak: Math.random() < 0.1, isFacaOuLuva: ehEspecial };
  };

  const salvarNoInventario = async (premio, precoInfo) => {
    try {
      const dados = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
      const lista = dados ? JSON.parse(dados) : [];
      const inventario = Array.isArray(lista) ? lista : [];
      const valorUsd = typeof precoInfo?.valorUsd === 'number' ? precoInfo.valorUsd : 0;
      const valorNumerico = typeof precoInfo?.valorNumerico === 'number' ? precoInfo.valorNumerico : valorUsd;
      const moeda = precoInfo?.moeda || moedaAtual || 'USD';
      const preco = precoInfo?.precoFormatado || formatarPrecoMoeda(valorNumerico, moeda);

      inventario.unshift({
        idInventario: premio.idInventario,
        idUnico: premio.idInventario,
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
        collections: premio.collections || [],
        dataObtencao: new Date().toLocaleDateString('pt-BR'),
        timestamp: Date.now(),
        origem: 'caixa',
      });
      await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(inventario));
    } catch (e) {
      // Mantém execução segura se o AsyncStorage falhar
    }
  };

  const iniciarAbertura = () => {
    if (isSpinning || !caixaSelecionada) return;
    limparTimers();
    setIsSpinning(true);
    setIndiceDestacado(null);
    setSkinGanha(null);
    setPrecoFormatado('');

    const resultado = sortearSkin(caixaSelecionada);
    const skinsBase = caixaSelecionada.contains || [];
    setItensRoleta(
      Array.from({ length: TOTAL_ITENS_ROLETA }, (_, i) => {
        const s = i === INDICE_VENCEDOR ? resultado.skin : skinsBase[Math.floor(Math.random() * skinsBase.length)];
        return { ...s, idUnico: `spin-${i}-${s?.id || i}` };
      })
    );
    roletaRef.current?.scrollToOffset({ offset: 0, animated: false });

    const variacao = (Math.random() - 0.5) * 30;
    const offsetFinal = 12 + INDICE_VENCEDOR * PASSO_ROLETA + 4 + LARGURA_CARD / 2 - larguraViewport / 2 + variacao;
    const inicio = Date.now();

    timerAnimacaoRef.current = setInterval(() => {
      const progresso = Math.min(1, (Date.now() - inicio) / 4200);
      const ease = 1 - Math.pow(1 - progresso, 3);
      roletaRef.current?.scrollToOffset({ offset: Math.max(0, offsetFinal * ease), animated: false });

      if (progresso >= 1) {
        clearInterval(timerAnimacaoRef.current);
        timerAnimacaoRef.current = null;
        setIsSpinning(false);
        setIndiceDestacado(INDICE_VENCEDOR);

        const idInventario = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const premio = { ...resultado.skin, ...resultado, idInventario };
        sorteioAtivoRef.current = idInventario;
        setSkinGanha(premio);
        setBuscandoPreco(true);

        obterPrecoSkin(premio.name, premio.rarity?.name || 'Mil-Spec Grade', premio.wearNome, premio.isStatTrak, moedaAtual)
          .catch(() => ({
            precoFormatado: formatarPrecoMoeda(0, moedaAtual),
            valorNumerico: 0,
            valorUsd: 0,
            moeda: moedaAtual,
          }))
          .then((precoInfo) => {
            if (sorteioAtivoRef.current === idInventario) {
              setPrecoFormatado(precoInfo.precoFormatado);
              setBuscandoPreco(false);
            }
            salvarNoInventario(premio, precoInfo);
          });

        timerModalRef.current = setTimeout(() => setModalVisivel(true), 500);
      }
    }, 16);
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

        <View
          style={styles.areaRoleta}
          onLayout={(e) => e.nativeEvent.layout.width > 0 && setLarguraViewport(e.nativeEvent.layout.width)}
        >
          <View style={styles.linhaCentral} />
          <FlatList
            ref={roletaRef}
            data={itensRoleta}
            keyExtractor={(item, index) => item.idUnico || `${item.id}-${index}`}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.conteudoRoleta}
            renderItem={({ item, index }) => (
              <RouletteItem item={item} largura={LARGURA_CARD} isDestaque={indiceDestacado === index} />
            )}
          />
        </View>

        <TouchableOpacity
          style={[styles.botaoAbrir, isSpinning && styles.botaoDesativado]}
          disabled={isSpinning}
          onPress={iniciarAbertura}
        >
          <Text style={styles.textoBotaoAzul}>{isSpinning ? 'Abrindo...' : 'Abrir Caixa'}</Text>
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
              <Text style={styles.modalTitulo}>Você ganhou</Text>
              {skinGanha?.image ? (
                <Image source={{ uri: skinGanha.image }} style={styles.modalImagem} resizeMode="contain" />
              ) : (
                <Text style={styles.semImagem}>Sem imagem</Text>
              )}
              <Text style={styles.modalNome}>
                {skinGanha?.isStatTrak ? 'StatTrak ' : ''}{limparTexto(skinGanha?.name)}
              </Text>
              <Text style={[styles.modalRaridade, { color: obterCorRaridade(skinGanha) }]}>
                {limparTexto(skinGanha?.rarity?.name || 'Special Rare Item')}
              </Text>
              {buscandoPreco ? (
                <ActivityIndicator size="small" color={CORES.azulPrincipal} style={styles.modalPreco} />
              ) : (
                <Text style={styles.modalPreco}>{precoFormatado || formatarPrecoMoeda(0, moedaAtual)}</Text>
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
        renderItem={({ item }) => <CaseCard item={item} onPress={setCaixaSelecionada} />}
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
  topoCaixa: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  botaoVoltar: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  textoVoltar: { color: CORES.azulPrincipal, fontWeight: 'bold' },
  nomeCaixa: { flex: 1, color: CORES.texto, fontSize: 16, fontWeight: 'bold' },
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
  modalFundo: { flex: 1, backgroundColor: CORES.modalFundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: CORES.branco, borderRadius: 10, padding: 18, alignItems: 'center' },
  modalTitulo: { color: CORES.texto, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalImagem: { width: 200, height: 110, marginBottom: 10 },
  modalNome: { color: CORES.texto, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalRaridade: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  modalPreco: { color: CORES.sucesso, fontSize: 20, fontWeight: 'bold', marginVertical: 12 },
  acoesModal: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  botaoModalPrimario: { flex: 1, backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  botaoModalSecundario: { flex: 1, backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  textoBotaoSecundario: { color: CORES.texto, fontWeight: 'bold', fontSize: 14 },
});
