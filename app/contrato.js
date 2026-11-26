import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Modal, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import ContractSlot from '../components/ContractSlot';
import { obterPrecoSkin, obterMoedaSelecionada, formatarPrecoMoeda } from '../services/priceService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const URL_API_SKINS = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const RARIDADES_BLOQUEADAS = ['covert', 'contraband', 'extraordinary'];

const HIERARQUIA_RARIDADES = [
  { id: 'rarity_common_weapon', name: 'Consumer Grade', cor: '#b0c3d9' },
  { id: 'rarity_uncommon_weapon', name: 'Industrial Grade', cor: '#5e98d9' },
  { id: 'rarity_rare_weapon', name: 'Mil-Spec Grade', cor: '#4b69ff' },
  { id: 'rarity_mythical_weapon', name: 'Restricted', cor: '#8847ff' },
  { id: 'rarity_legendary_weapon', name: 'Classified', cor: '#d32ce6' },
  { id: 'rarity_ancient_weapon', name: 'Covert', cor: '#eb4b4b' },
];

function ehItemBloqueado(item) {
  const raridade = (item?.rarity?.name || '').toLowerCase();
  return (
    RARIDADES_BLOQUEADAS.includes(raridade) ||
    Boolean(item?.isFacaOuLuva) ||
    Boolean(item?.name && item.name.startsWith('★'))
  );
}

function obterRaridadeSuperior(nomeRaridade) {
  const idx = HIERARQUIA_RARIDADES.findIndex(
    (r) => r.name.toLowerCase() === (nomeRaridade || '').toLowerCase()
  );
  return idx >= 0 && idx < HIERARQUIA_RARIDADES.length - 1 ? HIERARQUIA_RARIDADES[idx + 1] : null;
}

export default function ContratoScreen() {
  const [inventario, setInventario] = useState([]);
  const [catalogoSkins, setCatalogoSkins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [skinsContrato, setSkinsContrato] = useState([]);
  const [raridadeBloqueada, setRaridadeBloqueada] = useState(null);
  const [mensagemAviso, setMensagemAviso] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [skinGerada, setSkinGerada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    fetch(URL_API_SKINS)
      .then((res) => (res.ok ? res.json() : []))
      .then((dados) => {
        if (Array.isArray(dados)) {
          setCatalogoSkins(dados.filter((s) => s && s.id && s.name && s.rarity?.name));
        }
      })
      .catch((err) => console.error('Erro ao carregar catalogo:', err));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      Promise.all([AsyncStorage.getItem(STORAGE_KEY_INVENTARIO), obterMoedaSelecionada()])
        .then(([dados, moeda]) => {
          setMoedaAtual(moeda);
          const lista = dados ? JSON.parse(dados) : [];
          setInventario(Array.isArray(lista) ? lista : []);
        })
        .catch(() => setInventario([]))
        .finally(() => setIsLoading(false));
    }, [])
  );

  const limparContrato = () => {
    setSkinsContrato([]);
    setRaridadeBloqueada(null);
    setMensagemAviso(null);
  };

  const removerSkinDoContrato = (skin) => {
    const idRemover = skin.idInventario || skin.id;
    const novaLista = skinsContrato.filter((s) => (s.idInventario || s.id) !== idRemover);
    setSkinsContrato(novaLista);
    if (novaLista.length === 0) setRaridadeBloqueada(null);
    setMensagemAviso(null);
  };

  const selecionarSkinParaContrato = (skin) => {
    const idItem = skin.idInventario || skin.id;
    if (skinsContrato.some((s) => (s.idInventario || s.id) === idItem)) {
      removerSkinDoContrato(skin);
      return;
    }
    if (skinsContrato.length >= 3) return setMensagemAviso('O contrato ja possui 3 skins.');
    if (ehItemBloqueado(skin)) return setMensagemAviso('Esta skin nao pode entrar no contrato.');

    const raridade = skin.rarity?.name || '';
    if (skinsContrato.length === 0) {
      setRaridadeBloqueada(raridade);
      setSkinsContrato([skin]);
      setMensagemAviso(null);
      return;
    }
    if (raridade.toLowerCase() !== (raridadeBloqueada || '').toLowerCase()) {
      return setMensagemAviso(`Selecione apenas skins ${raridadeBloqueada}.`);
    }
    setSkinsContrato((prev) => [...prev, skin]);
    setMensagemAviso(null);
  };

  const assinarContrato = async () => {
    if (skinsContrato.length !== 3 || isSigning) return;
    const raridadeSuperior = obterRaridadeSuperior(skinsContrato[0].rarity?.name);
    if (!raridadeSuperior) return setMensagemAviso('Nao foi possivel definir a raridade superior.');

    const candidatas = catalogoSkins.filter(
      (s) => s.rarity?.name?.toLowerCase() === raridadeSuperior.name.toLowerCase() && !s.name.startsWith('★')
    );
    if (candidatas.length === 0) return setMensagemAviso('Catalogo ainda carregando. Tente novamente.');

    setIsSigning(true);
    setMensagemAviso(null);

    try {
      const idsColecoes = new Set();
      skinsContrato.forEach((skin) => {
        const doCatalogo = catalogoSkins.find(
          (c) => c.id === skin.id || c.name.toLowerCase() === (skin.name || '').toLowerCase()
        );
        const col = doCatalogo?.collections?.[0] || skin.collections?.[0];
        if (col?.id) idsColecoes.add(col.id);
      });

      const daMesmaColecao = candidatas.filter((s) => s.collections?.some((c) => idsColecoes.has(c.id)));
      const pool = daMesmaColecao.length > 0 ? daMesmaColecao : candidatas;
      const skinSorteada = pool[Math.floor(Math.random() * pool.length)];
      const wearPadrao = 'Field-Tested';
      const precoRes = await obterPrecoSkin(skinSorteada.name, raridadeSuperior.name, wearPadrao, false, moedaAtual);
      const valorNumerico = precoRes?.valorNumerico || 25.0;

      const novaSkin = {
        id: skinSorteada.id,
        name: skinSorteada.name,
        image: skinSorteada.image,
        rarity: { id: raridadeSuperior.id, name: raridadeSuperior.name, color: raridadeSuperior.cor },
        floatValor: 0.25,
        wearNome: wearPadrao,
        isStatTrak: false,
        isFacaOuLuva: false,
        nomeCaixaOrigem: 'Contrato de Trocas',
        preco: precoRes?.precoFormatado || formatarPrecoMoeda(valorNumerico, moedaAtual),
        valorNumerico,
        valorUsd: precoRes?.valorUsd || 25.0,
        moeda: moedaAtual,
        idInventario: `contrato-${skinSorteada.id}-${Date.now()}`,
        timestamp: Date.now(),
        dataObtencao: new Date().toLocaleDateString('pt-BR'),
      };

      const idsUsados = new Set(skinsContrato.map((s) => s.idInventario || s.id));
      const dados = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
      const listaAtual = dados ? JSON.parse(dados) : [];
      const restante = listaAtual.filter((item) => !idsUsados.has(item.idInventario || item.id));
      restante.unshift(novaSkin);
      await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(restante));

      setInventario(restante);
      setSkinGerada(novaSkin);
      limparContrato();
      setModalAberto(true);
    } catch {
      setMensagemAviso('Erro ao assinar contrato. Tente novamente.');
    } finally {
      setIsSigning(false);
    }
  };

  const itensFiltrados = inventario.filter((item) => {
    if (ehItemBloqueado(item)) return false;
    return !raridadeBloqueada || (item.rarity?.name || '').toLowerCase() === raridadeBloqueada.toLowerCase();
  });

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
        <Text style={styles.textoSecundario}>Carregando contrato...</Text>
      </SafeAreaView>
    );
  }

  const cabecalhoLista = (
    <View style={styles.cabecalho}>
      <Text style={styles.instrucao}>Escolha 3 skins da mesma raridade</Text>
      {mensagemAviso ? <Text style={styles.aviso}>{mensagemAviso}</Text> : null}

      <View style={styles.linhaSlots}>
        {[0, 1, 2].map((indice) => (
          <ContractSlot key={indice} item={skinsContrato[indice] || null} indice={indice} onRemover={removerSkinDoContrato} />
        ))}
      </View>

      <View style={styles.linhaBotoes}>
        <TouchableOpacity
          style={[styles.botaoAssinar, (skinsContrato.length < 3 || isSigning) && styles.botaoDesabilitado]}
          activeOpacity={0.8}
          disabled={skinsContrato.length < 3 || isSigning}
          onPress={assinarContrato}
        >
          {isSigning ? <ActivityIndicator size="small" color={CORES.branco} /> : <Text style={styles.textoBotaoBranco}>Assinar Contrato</Text>}
        </TouchableOpacity>

        {skinsContrato.length >= 1 ? (
          <TouchableOpacity style={styles.botaoLimpar} onPress={limparContrato}>
            <Text style={styles.textoLimpar}>Limpar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.tituloLista}>Inventário</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const idItem = item.idInventario || item.id;
    const selecionada = skinsContrato.some((s) => (s.idInventario || s.id) === idItem);
    const nomeRaridade = item.rarity?.name || 'Comum';
    const corRaridade = item.rarity?.color || CORES.raridades[nomeRaridade] || CORES.azulBorda;

    return (
      <TouchableOpacity style={[styles.card, selecionada && styles.cardSelecionado]} activeOpacity={0.7} onPress={() => selecionarSkinParaContrato(item)}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.imagemItem} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImagem}>
            <Text style={styles.textoSecundario}>CS2</Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <Text style={styles.nomeItem} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.raridadeItem, { color: corRaridade }]} numberOfLines={1}>{nomeRaridade}</Text>
        </View>
        {selecionada ? <Text style={styles.textoSelecionada}>Selecionada</Text> : null}
      </TouchableOpacity>
    );
  };

  const renderListaVazia = () => (
    <View style={styles.vazioBox}>
      <Text style={styles.textoVazio}>
        {raridadeBloqueada ? `Sem outras skins da raridade ${raridadeBloqueada}.` : 'Nenhuma skin elegível no inventário.'}
      </Text>
      <TouchableOpacity style={styles.botaoVazio} onPress={raridadeBloqueada ? limparContrato : () => router.push('/caixas')}>
        <Text style={styles.textoBotaoBranco}>{raridadeBloqueada ? 'Limpar seleção' : 'Abrir Caixas'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <FlatList
        data={itensFiltrados}
        keyExtractor={(item, index) => String(item.idInventario || item.id || index)}
        renderItem={renderItem}
        ListHeaderComponent={cabecalhoLista}
        ListEmptyComponent={renderListaVazia}
        contentContainerStyle={styles.conteudoLista}
      />

      <Modal visible={modalAberto} transparent animationType="fade" onRequestClose={() => setModalAberto(false)}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Nova Skin</Text>
            {skinGerada?.image ? <Image source={{ uri: skinGerada.image }} style={styles.modalImagem} resizeMode="contain" /> : null}
            <Text style={styles.modalNome}>{skinGerada?.name}</Text>
            <Text style={[styles.modalRaridade, { color: skinGerada?.rarity?.color || CORES.azulPrincipal }]}>{skinGerada?.rarity?.name}</Text>
            <Text style={styles.modalPreco}>{skinGerada?.preco || formatarPrecoMoeda(0, moedaAtual)}</Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoModalPrimario} onPress={() => { limparContrato(); setModalAberto(false); }}>
                <Text style={styles.textoBotaoBranco}>Novo Contrato</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoModalSecundario} onPress={() => setModalAberto(false)}>
                <Text style={styles.textoBotaoFechar}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CORES.fundo },
  conteudoLista: { padding: 16, paddingBottom: 24 },
  cabecalho: { marginBottom: 8 },
  instrucao: { fontSize: 15, fontWeight: '600', color: CORES.texto, marginBottom: 10 },
  aviso: { backgroundColor: CORES.avisoClaro, borderWidth: 1, borderColor: CORES.aviso, borderRadius: 6, padding: 8, color: CORES.texto, fontSize: 13, marginBottom: 10 },
  linhaSlots: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 12 },
  linhaBotoes: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  botaoAssinar: { flex: 1, backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoDesabilitado: { backgroundColor: CORES.borda },
  textoBotaoBranco: { color: CORES.branco, fontSize: 14, fontWeight: 'bold' },
  botaoLimpar: { backgroundColor: CORES.erroClaro, borderWidth: 1, borderColor: CORES.erro, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14 },
  textoLimpar: { color: CORES.erro, fontSize: 13, fontWeight: '600' },
  tituloLista: { fontSize: 16, fontWeight: 'bold', color: CORES.texto, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, padding: 10, marginBottom: 8 },
  cardSelecionado: { backgroundColor: CORES.sucessoClaro, borderColor: CORES.sucesso },
  imagemItem: { width: 52, height: 38, marginRight: 10 },
  placeholderImagem: { width: 52, height: 38, marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: CORES.fundo, borderRadius: 4 },
  infoItem: { flex: 1, marginRight: 8 },
  nomeItem: { fontSize: 14, fontWeight: '600', color: CORES.texto },
  raridadeItem: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  textoSelecionada: { fontSize: 12, fontWeight: 'bold', color: CORES.sucesso },
  textoSecundario: { fontSize: 12, color: CORES.textoSecundario, marginTop: 6 },
  vazioBox: { alignItems: 'center', paddingVertical: 24 },
  textoVazio: { fontSize: 14, color: CORES.textoSecundario, marginBottom: 12 },
  botaoVazio: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  modalFundo: { flex: 1, backgroundColor: CORES.modalFundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: CORES.branco, borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: CORES.texto, marginBottom: 10 },
  modalImagem: { width: 170, height: 105, marginBottom: 10 },
  modalNome: { fontSize: 16, fontWeight: 'bold', color: CORES.texto, textAlign: 'center' },
  modalRaridade: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  modalPreco: { fontSize: 18, fontWeight: 'bold', color: CORES.sucesso, marginTop: 8, marginBottom: 16 },
  modalBotoes: { width: '100%', gap: 8 },
  botaoModalPrimario: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoModalSecundario: { backgroundColor: CORES.azulClaro, borderWidth: 1, borderColor: CORES.azulBorda, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  textoBotaoFechar: { color: CORES.azulPrincipal, fontSize: 14, fontWeight: '600' },
});
