import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Modal, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import EspacoContrato from '../components/EspacoContrato';
import { obterPrecoSkin, obterMoedaSelecionada, formatarPrecoMoeda } from '../services/priceService';
import {
  obterSaldoBRL,
  obterUpgrades,
  obterEfeitosUpgrades,
  formatarBRLNaMoeda,
  formatarValorVendaSkin,
  venderSkinDoInventario,
} from '../services/economyService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const URL_API_SKINS = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const RARIDADES_BLOQUEADAS = ['covert', 'contraband', 'extraordinary'];
const RARIDADES_ADESIVO = ['high grade', 'remarkable', 'exotic', 'base grade'];

const ORDEM_RARIDADES = [
  { id: 'rarity_common_weapon', name: 'Consumer Grade', cor: '#b0c3d9' },
  { id: 'rarity_uncommon_weapon', name: 'Industrial Grade', cor: '#5e98d9' },
  { id: 'rarity_rare_weapon', name: 'Mil-Spec Grade', cor: '#4b69ff' },
  { id: 'rarity_mythical_weapon', name: 'Restricted', cor: '#8847ff' },
  { id: 'rarity_legendary_weapon', name: 'Classified', cor: '#d32ce6' },
  { id: 'rarity_ancient_weapon', name: 'Covert', cor: '#eb4b4b' },
];

const EFEITOS_PADRAO = {
  quantidadeCaixas: 1,
  chancePularRaridade: 0,
  itensNecessariosContrato: 3,
  chanceItemEspecial: 0,
  chanceItemDobrado: 0,
  bonusHigherLowerBRL: 0,
};

const FAIXAS_WEAR = {
  'Factory New': [0.0, 0.069999],
  'Minimal Wear': [0.07, 0.149999],
  'Field-Tested': [0.15, 0.379999],
  'Well-Worn': [0.38, 0.449999],
  'Battle-Scarred': [0.45, 0.999999],
};

function selecionarWearEFloat(skin) {
  const wearsDisponiveis = Array.isArray(skin?.wears) ? skin.wears : [];
  let wearNome = 'Field-Tested';

  if (wearsDisponiveis.length > 0) {
    const nomes = wearsDisponiveis.map((w) => w?.name).filter(Boolean);
    if (nomes.includes('Field-Tested')) {
      wearNome = 'Field-Tested';
    } else if (nomes.includes('Minimal Wear')) {
      wearNome = 'Minimal Wear';
    } else if (nomes.includes('Factory New')) {
      wearNome = 'Factory New';
    } else {
      wearNome = wearsDisponiveis[0]?.name || 'Field-Tested';
    }
  }

  const minRaw = skin?.min_float ?? 0.01;
  const maxRaw = skin?.max_float ?? 0.99;
  const minSkin = Number.isFinite(Number(minRaw)) ? Number(minRaw) : 0.01;
  const maxSkin = Math.max(minSkin, Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : 0.99);

  const [wearMin, wearMax] = FAIXAS_WEAR[wearNome] || [0.15, 0.379999];
  const inicio = Math.max(minSkin, wearMin);
  const fim = Math.min(maxSkin, wearMax);

  const floatBruto =
    inicio <= fim
      ? inicio + Math.random() * (fim - inicio)
      : minSkin + Math.random() * (maxSkin - minSkin);

  const floatValor = Math.min(maxSkin, Math.max(minSkin, Number(floatBruto.toFixed(6))));
  return { wearNome, floatValor };
}

function ehAdesivo(item) {
  if (!item) return false;
  const id = String(item.id || '').toLowerCase().trim();
  const nome = String(item.name || '').trim();
  const origem = String(item.nomeCaixaOrigem || '').trim();
  const raridade = String(item.rarity?.name || '').toLowerCase().trim();

  if (/^(sticker|patch|graffiti|music_kit|collectible)-/.test(id)) return true;
  if (/^(sticker|patch|sealed graffiti|music kit)\s*\|/i.test(nome)) return true;
  if (/sticker|capsule|autograph/i.test(origem)) return true;
  if (RARIDADES_ADESIVO.includes(raridade)) return true;

  return false;
}

function ehItemBloqueado(item) {
  const raridade = (item?.rarity?.name || '').toLowerCase();
  return (
    RARIDADES_BLOQUEADAS.includes(raridade) ||
    Boolean(item?.isFacaOuLuva) ||
    Boolean(item?.name && item.name.startsWith('★'))
  );
}

function ehElegivelParaContrato(item) {
  return !ehItemBloqueado(item) && !ehAdesivo(item);
}

export default function TelaContrato() {
  const [inventario, setInventario] = useState([]);
  const [catalogoSkins, setCatalogoSkins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [saldoBRL, setSaldoBRL] = useState(0);
  const [efeitosUpgrades, setEfeitosUpgrades] = useState(EFEITOS_PADRAO);
  const [skinsContrato, setSkinsContrato] = useState([]);
  const [raridadeBloqueada, setRaridadeBloqueada] = useState(null);
  const [mensagemAviso, setMensagemAviso] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [skinGerada, setSkinGerada] = useState(null);
  const [pulouRaridade, setPulouRaridade] = useState(false);
  const [skinVendida, setSkinVendida] = useState(false);
  const [vendendoSkin, setVendendoSkin] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const itensNecessarios = efeitosUpgrades.itensNecessariosContrato || 3;
  const chancePularRaridade = efeitosUpgrades.chancePularRaridade || 0;
  const slots = Array.from({ length: itensNecessarios }, (_, i) => skinsContrato[i] || null);

  useEffect(() => {
    setSkinsContrato((prev) => {
      if (prev.length <= itensNecessarios) return prev;
      const ajustado = prev.slice(0, itensNecessarios);
      if (ajustado.length === 0) setRaridadeBloqueada(null);
      return ajustado;
    });
  }, [itensNecessarios]);

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
      Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
        obterMoedaSelecionada(),
        obterSaldoBRL(),
        obterUpgrades(),
      ])
        .then(([dados, moeda, saldo, upgrades]) => {
          setMoedaAtual(moeda);
          setSaldoBRL(typeof saldo === 'number' ? saldo : 0);
          const efeitos = obterEfeitosUpgrades(upgrades || {});
          setEfeitosUpgrades({ ...EFEITOS_PADRAO, ...efeitos });
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
    if (skinsContrato.length >= itensNecessarios) {
      return setMensagemAviso(`O contrato ja possui ${itensNecessarios} skins.`);
    }
    if (!ehElegivelParaContrato(skin)) return setMensagemAviso('Esta skin nao pode entrar no contrato.');

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

  const totalPreenchidos = skinsContrato.length;
  const podeAssinar = totalPreenchidos === itensNecessarios && !isSigning;

  const assinarContrato = async () => {
    if (!podeAssinar) return;

    const nomeRaridadeAtual = (skinsContrato[0].rarity?.name || '').toLowerCase();
    const idxAtual = ORDEM_RARIDADES.findIndex(
      (r) => r.name.toLowerCase() === nomeRaridadeAtual
    );
    if (idxAtual < 0 || idxAtual + 1 >= ORDEM_RARIDADES.length) {
      return setMensagemAviso('Nao foi possivel definir a raridade superior.');
    }

    let pulou =
      chancePularRaridade > 0 &&
      idxAtual + 2 < ORDEM_RARIDADES.length &&
      Math.random() < chancePularRaridade;

    let raridadeAlvo = pulou
      ? ORDEM_RARIDADES[idxAtual + 2]
      : ORDEM_RARIDADES[idxAtual + 1];

    let candidatas = catalogoSkins.filter(
      (s) =>
        s.rarity?.name?.toLowerCase() === raridadeAlvo.name.toLowerCase() &&
        !s.name.startsWith('★')
    );

    if (pulou && candidatas.length === 0) {
      pulou = false;
      raridadeAlvo = ORDEM_RARIDADES[idxAtual + 1];
      candidatas = catalogoSkins.filter(
        (s) =>
          s.rarity?.name?.toLowerCase() === raridadeAlvo.name.toLowerCase() &&
          !s.name.startsWith('★')
      );
    }

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
      const { wearNome: wearPadrao, floatValor } = selecionarWearEFloat(skinSorteada);
      const precoRes = await obterPrecoSkin(skinSorteada.name, raridadeAlvo.name, wearPadrao, false, moedaAtual);
      const valorNumerico = Number(precoRes?.valorNumerico) || 0;
      const valorUsd = Number(precoRes?.valorUsd) || 0;

      const novaSkin = {
        id: skinSorteada.id,
        name: skinSorteada.name,
        image: skinSorteada.image,
        rarity: { id: raridadeAlvo.id, name: raridadeAlvo.name, color: raridadeAlvo.cor },
        floatValor,
        wearNome: wearPadrao,
        isStatTrak: false,
        isFacaOuLuva: false,
        nomeCaixaOrigem: 'Contrato de Trocas',
        preco: precoRes?.precoFormatado || formatarPrecoMoeda(valorNumerico, moedaAtual),
        valorNumerico,
        valorUsd,
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
      setPulouRaridade(pulou);
      setSkinVendida(false);
      limparContrato();
      setModalAberto(true);
    } catch {
      setMensagemAviso('Erro ao assinar contrato. Tente novamente.');
    } finally {
      setIsSigning(false);
    }
  };

  const venderSkinGerada = async () => {
    if (!skinGerada || skinVendida || vendendoSkin) return;
    setVendendoSkin(true);
    try {
      const resultado = await venderSkinDoInventario(skinGerada.idInventario, skinGerada);
      if (resultado?.ok) {
        setSkinVendida(true);
        if (typeof resultado.novoSaldo === 'number') {
          setSaldoBRL(resultado.novoSaldo);
        }
        if (Array.isArray(resultado.novaLista)) {
          setInventario(resultado.novaLista);
        } else {
          setInventario((prev) =>
            prev.filter((item) => item.idInventario !== skinGerada.idInventario)
          );
        }
      }
    } finally {
      setVendendoSkin(false);
    }
  };

  const itensFiltrados = inventario.filter((item) => {
    if (!ehElegivelParaContrato(item)) return false;
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

  const detalhesUpgrade = [];
  if (itensNecessarios < 3) {
    detalhesUpgrade.push(`Contrato com ${itensNecessarios} skins`);
  }
  if (chancePularRaridade > 0) {
    detalhesUpgrade.push(`Chance de pular raridade: ${Math.round(chancePularRaridade * 100)}%`);
  }

  const cabecalhoLista = (
    <View style={styles.cabecalho}>
      <View style={styles.topoCabecalho}>
        <Text style={styles.instrucao}>Escolha {itensNecessarios} skins da mesma raridade</Text>
        <Text style={styles.saldoTexto}>Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}</Text>
      </View>
      {detalhesUpgrade.length > 0 ? (
        <Text style={styles.infoUpgrade}>{detalhesUpgrade.join(' | ')}</Text>
      ) : null}
      {mensagemAviso ? <Text style={styles.aviso}>{mensagemAviso}</Text> : null}

      <View style={styles.linhaSlots}>
        {slots.map((itemSlot, indice) => (
          <EspacoContrato key={indice} item={itemSlot} indice={indice} onRemover={removerSkinDoContrato} />
        ))}
      </View>

      <View style={styles.linhaBotoes}>
        <TouchableOpacity
          style={[styles.botaoAssinar, !podeAssinar && styles.botaoDesabilitado]}
          activeOpacity={0.8}
          disabled={!podeAssinar}
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
            <Text style={styles.modalSaldo}>Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}</Text>
            {pulouRaridade ? (
              <Text style={styles.modalAvisoRaridade}>Upgrade ativado: raridade pulada!</Text>
            ) : null}
            {skinGerada?.image ? <Image source={{ uri: skinGerada.image }} style={styles.modalImagem} resizeMode="contain" /> : null}
            <Text style={styles.modalNome}>{skinGerada?.name}</Text>
            <Text style={[styles.modalRaridade, { color: skinGerada?.rarity?.color || CORES.azulPrincipal }]}>{skinGerada?.rarity?.name}</Text>
            <Text style={styles.modalPreco}>{skinGerada?.preco || formatarPrecoMoeda(0, moedaAtual)}</Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={[styles.botaoModalVender, (skinVendida || vendendoSkin) && styles.botaoModalVenderDesabilitado]}
                activeOpacity={0.8}
                disabled={skinVendida || vendendoSkin}
                onPress={venderSkinGerada}
              >
                <Text style={styles.textoBotaoBranco}>
                  {skinVendida
                    ? 'Vendida!'
                    : vendendoSkin
                      ? 'Vendendo...'
                      : `Vender (${skinGerada ? formatarValorVendaSkin(skinGerada, moedaAtual) : formatarPrecoMoeda(0, moedaAtual)})`}
                </Text>
              </TouchableOpacity>
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
  topoCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  instrucao: { flex: 1, fontSize: 15, fontWeight: '600', color: CORES.texto },
  saldoTexto: { fontSize: 13, fontWeight: '700', color: CORES.sucesso },
  infoUpgrade: { fontSize: 12, color: CORES.azulPrincipal, fontWeight: '600', marginBottom: 10 },
  aviso: { backgroundColor: CORES.avisoClaro, borderWidth: 1, borderColor: CORES.aviso, borderRadius: 6, padding: 8, color: CORES.texto, fontSize: 13, marginBottom: 10 },
  linhaSlots: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 12, marginTop: 4 },
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
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: CORES.texto, marginBottom: 4 },
  modalSaldo: { fontSize: 13, fontWeight: '700', color: CORES.sucesso, marginBottom: 10 },
  modalAvisoRaridade: { backgroundColor: CORES.avisoClaro, borderWidth: 1, borderColor: CORES.aviso, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10, color: CORES.texto, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  modalImagem: { width: 170, height: 105, marginBottom: 10 },
  modalNome: { fontSize: 16, fontWeight: 'bold', color: CORES.texto, textAlign: 'center' },
  modalRaridade: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  modalPreco: { fontSize: 18, fontWeight: 'bold', color: CORES.sucesso, marginTop: 8, marginBottom: 16 },
  modalBotoes: { width: '100%', gap: 8 },
  botaoModalVender: { backgroundColor: CORES.sucesso, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoModalVenderDesabilitado: { backgroundColor: CORES.borda },
  botaoModalPrimario: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoModalSecundario: { backgroundColor: CORES.azulClaro, borderWidth: 1, borderColor: CORES.azulBorda, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  textoBotaoFechar: { color: CORES.azulPrincipal, fontSize: 14, fontWeight: '600' },
});
