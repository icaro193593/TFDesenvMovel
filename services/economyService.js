import AsyncStorage from '@react-native-async-storage/async-storage';
import { converterValorMoeda, formatarPrecoMoeda } from './priceService';

export const STORAGE_KEY_SALDO = '@garbskins_saldo_brl';
export const STORAGE_KEY_UPGRADES = '@garbskins_upgrades';
export const STORAGE_KEY_INVENTARIO = '@inventario_skins';

export const UPGRADES_PADRAO = {
  multiCaixas: 0,
  pularRaridade: 0,
  menosItemContrato: 0,
  oddsEspecial: 0,
  itemDobrado: 0,
  bonusHigherLower: 0,
};

export const UPGRADES_CONFIG = [
  {
    id: 'multiCaixas',
    nome: 'Abrir Múltiplas Caixas',
    descricao: 'Roletar 2 ou 3 caixas ao mesmo tempo.',
    custos: [2000, 15000],
    niveisLabel: ['1 caixa', '2 caixas', '3 caixas'],
  },
  {
    id: 'pularRaridade',
    nome: 'Pular Raridade no Contrato',
    descricao: 'Chance no contrato de troca de pular uma raridade extra.',
    custos: [500, 1000, 1500, 2000, 2500],
    niveisLabel: ['0%', '10%', '20%', '30%', '40%', '50%'],
  },
  {
    id: 'menosItemContrato',
    nome: 'Contrato com 1 Item a Menos',
    descricao: 'Permite fazer o contrato de troca com 2 skins em vez de 3.',
    custos: [50000],
    niveisLabel: ['3 itens', '2 itens'],
  },
  {
    id: 'oddsEspecial',
    nome: 'Aumentar Odds de Item Especial',
    descricao: 'Aumenta a chance de item especial raro nas caixas.',
    custos: [1000, 2000, 3000, 4000, 5000],
    niveisLabel: ['0,26%', '1%', '2%', '3%', '4%', '5%'],
  },
  {
    id: 'itemDobrado',
    nome: 'Item Dobrado na Caixa',
    descricao: 'Chance de conseguir a skin dobrada (2x) ao abrir uma caixa.',
    custos: [1000, 3000, 9000, 15000, 20000],
    niveisLabel: ['0%', '5%', '10%', '15%', '20%', '25%'],
  },
  {
    id: 'bonusHigherLower',
    nome: 'Recompensa Higher or Lower',
    descricao: 'Cada rodada de acerto no Higher or Lower rende saldo.',
    custos: [1000, 3000, 9000, 15000, 20000],
    niveisLabel: ['R$ 0', 'R$ 50', 'R$ 100', 'R$ 150', 'R$ 200', 'R$ 250'],
    valoresBRL: [0, 50, 100, 150, 200, 250],
  },
];

export function formatarBRL(valor) {
  const numero = Number(valor);
  const valorSeguro = Number.isFinite(numero) ? numero : 0;
  const negativo = valorSeguro < 0;
  const [inteiro, decimal] = Math.abs(valorSeguro).toFixed(2).split('.');
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${inteiroFormatado},${decimal}`;
}

export function converterBRLParaMoeda(valorBRL, moeda = 'BRL') {
  return converterValorMoeda(Number(valorBRL) || 0, 'BRL', moeda);
}

export function formatarBRLNaMoeda(valorBRL, moeda = 'BRL') {
  const convertido = converterValorMoeda(Number(valorBRL) || 0, 'BRL', moeda);
  return formatarPrecoMoeda(convertido, moeda);
}

export function formatarValorVendaSkin(item, moeda = 'BRL') {
  if (item?.moeda === moeda && Number(item?.valorNumerico) > 0) {
    return formatarPrecoMoeda(Number(item.valorNumerico), moeda);
  }
  const valorBRL = calcularValorVendaBRL(item);
  return formatarBRLNaMoeda(valorBRL, moeda);
}

export function calcularValorVendaBRL(item) {
  const valorNumerico = Number(item?.valorNumerico);
  if (item?.moeda === 'BRL' && Number.isFinite(valorNumerico) && valorNumerico > 0) {
    return Number(valorNumerico.toFixed(2));
  }

  const valorUsd = Number(item?.valorUsd);
  if (Number.isFinite(valorUsd) && valorUsd > 0) {
    return converterValorMoeda(valorUsd, 'USD', 'BRL');
  }

  const precoUSD = Number(item?.precoUSD);
  if (Number.isFinite(precoUSD) && precoUSD > 0) {
    return converterValorMoeda(precoUSD, 'USD', 'BRL');
  }

  if (Number.isFinite(valorNumerico) && valorNumerico > 0) {
    return converterValorMoeda(valorNumerico, item?.moeda || 'USD', 'BRL');
  }

  const raridadeBruta =
    (typeof item?.rarity?.name === 'string' && item.rarity.name) ||
    (typeof item?.rarity === 'string' && item.rarity) ||
    '';
  const raridade = raridadeBruta.toLowerCase();

  if (raridade.includes('contraband') || raridade.includes('extraordinary')) return 2500;
  if (raridade.includes('covert')) return 450;
  if (raridade.includes('classified')) return 120;
  if (raridade.includes('restricted')) return 35;
  if (raridade.includes('mil-spec')) return 12;
  if (raridade.includes('industrial')) return 5;
  if (raridade.includes('consumer')) return 2.5;

  return 15;
}

export async function obterSaldoBRL() {
  try {
    const salvo = await AsyncStorage.getItem(STORAGE_KEY_SALDO);
    if (salvo === null || salvo === undefined || salvo === '') return 0;
    const numero = Number(salvo);
    return Number.isFinite(numero) && numero >= 0 ? Number(numero.toFixed(2)) : 0;
  } catch (err) {
    return 0;
  }
}

export async function adicionarSaldoBRL(valor) {
  const saldoAtual = await obterSaldoBRL();
  const convertido = Number(valor) || 0;
  const incremento = Number.isFinite(convertido) ? Math.max(0, convertido) : 0;
  const novoSaldo = Number((saldoAtual + incremento).toFixed(2));

  try {
    await AsyncStorage.setItem(STORAGE_KEY_SALDO, String(novoSaldo));
  } catch (err) {

  }

  return novoSaldo;
}

export async function obterUpgrades() {
  const resultado = { ...UPGRADES_PADRAO };
  try {
    const salvo = await AsyncStorage.getItem(STORAGE_KEY_UPGRADES);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed && typeof parsed === 'object') {
        for (const config of UPGRADES_CONFIG) {
          const bruto = Number(parsed[config.id]);
          const nivel = Number.isFinite(bruto) ? Math.floor(bruto) : 0;
          resultado[config.id] = Math.max(0, Math.min(config.custos.length, nivel));
        }
      }
    }
  } catch (err) {
    return { ...UPGRADES_PADRAO };
  }
  return resultado;
}

export function obterEfeitosUpgrades(upgrades = UPGRADES_PADRAO) {
  const u = upgrades || UPGRADES_PADRAO;
  return {
    quantidadeCaixas: [1, 2, 3][u.multiCaixas] || 1,
    chancePularRaridade: [0, 0.1, 0.2, 0.3, 0.4, 0.5][u.pularRaridade] || 0,
    itensNecessariosContrato: u.menosItemContrato >= 1 ? 2 : 3,
    chanceItemEspecial: [0.0026, 0.01, 0.02, 0.03, 0.04, 0.05][u.oddsEspecial] ?? 0.0026,
    chanceItemDobrado: [0, 0.05, 0.1, 0.15, 0.2, 0.25][u.itemDobrado] || 0,
    bonusHigherLowerBRL: [0, 50, 100, 150, 200, 250][u.bonusHigherLower] || 0,
  };
}

export async function comprarUpgrade(upgradeId) {
  const config = UPGRADES_CONFIG.find((item) => item.id === upgradeId);
  if (!config) {
    return { ok: false, erro: 'Upgrade não encontrado.' };
  }

  const [saldo, upgrades] = await Promise.all([obterSaldoBRL(), obterUpgrades()]);
  const nivelAtual = upgrades[upgradeId] || 0;

  if (nivelAtual >= config.custos.length) {
    return { ok: false, erro: 'Upgrade já está no nível máximo.' };
  }

  const custo = config.custos[nivelAtual];
  if (saldo < custo) {
    return { ok: false, erro: 'Saldo insuficiente para comprar este upgrade.' };
  }

  const novoSaldo = Number((saldo - custo).toFixed(2));
  const novoNivel = nivelAtual + 1;
  const novosUpgrades = {
    ...upgrades,
    [upgradeId]: novoNivel,
  };

  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_SALDO, String(novoSaldo)),
      AsyncStorage.setItem(STORAGE_KEY_UPGRADES, JSON.stringify(novosUpgrades)),
    ]);
  } catch (err) {
    return { ok: false, erro: 'Não foi possível salvar a compra do upgrade.' };
  }

  return {
    ok: true,
    novoSaldo,
    novosUpgrades,
    novoNivel,
    custo,
  };
}

async function lerInventarioInterno() {
  try {
    const salvo = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
    if (!salvo) return [];
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export async function venderSkinDoInventario(idInventario, skinFallback = null) {
  const lista = await lerInventarioInterno();
  const encontrado = lista.find((i) => i && i.idInventario === idInventario);
  const valorBRL = calcularValorVendaBRL(encontrado || skinFallback);
  const novaLista = lista.filter((i) => !i || i.idInventario !== idInventario);

  try {
    await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(novaLista));
  } catch (err) {
    return { ok: false, erro: 'Não foi possível atualizar o inventário.' };
  }

  const novoSaldo = await adicionarSaldoBRL(valorBRL);

  return {
    ok: true,
    valorBRL,
    novoSaldo,
    novaLista,
  };
}

export async function venderVariasSkinsDoInventario(idsInventario) {
  const idsSet = new Set(Array.isArray(idsInventario) ? idsInventario : []);
  const lista = await lerInventarioInterno();

  const vendidas = [];
  const restantes = [];

  for (const item of lista) {
    if (item && idsSet.has(item.idInventario)) {
      vendidas.push(item);
    } else {
      restantes.push(item);
    }
  }

  const valorTotalBruto = vendidas.reduce(
    (acumulado, item) => acumulado + calcularValorVendaBRL(item),
    0
  );
  const valorTotalBRL = Number(valorTotalBruto.toFixed(2));

  try {
    await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(restantes));
  } catch (err) {
    return { ok: false, erro: 'Não foi possível atualizar o inventário.' };
  }

  const novoSaldo = await adicionarSaldoBRL(valorTotalBRL);

  return {
    ok: true,
    valorTotalBRL,
    quantidadeVendida: vendidas.length,
    novoSaldo,
    novaLista: restantes,
  };
}

export async function venderTodoInventario() {
  const inventario = await lerInventarioInterno();

  const valorTotalBruto = inventario.reduce(
    (acumulado, item) => acumulado + calcularValorVendaBRL(item),
    0
  );
  const valorTotalBRL = Number(valorTotalBruto.toFixed(2));

  try {
    await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify([]));
  } catch (err) {
    return { ok: false, erro: 'Não foi possível atualizar o inventário.' };
  }

  const novoSaldo = await adicionarSaldoBRL(valorTotalBRL);

  return {
    ok: true,
    valorTotalBRL,
    quantidadeVendida: inventario.length,
    novoSaldo,
    novaLista: [],
  };
}
