import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PRICEMPIRE = '@pricempire_api_key';

export const STORAGE_KEY_MOEDA = '@moeda_selecionada';

const CACHE_PRECOS_TTL_MS = 10 * 60 * 1000;
const cachePrecos = new Map();
const requisicoesEmAndamento = new Map();

function aguardarMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const TAXAS_CAMBIO = {
  USD: 1,
  BRL: 5.80,
  EUR: 0.92,
};

const STEAM_CURRENCY_IDS = {
  USD: 1,
  EUR: 3,
  BRL: 7,
};

function validarMoeda(moeda) {
  if (typeof moeda !== 'string') return null;
  const codigo = moeda.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(TAXAS_CAMBIO, codigo) ? codigo : null;
}

export async function obterMoedaSelecionada() {
  try {
    const salva = await AsyncStorage.getItem(STORAGE_KEY_MOEDA);
    return validarMoeda(salva) || 'USD';
  } catch (err) {
    return 'USD';
  }
}

export async function salvarMoedaSelecionada(moeda) {
  const moedaValida = validarMoeda(moeda) || 'USD';
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MOEDA, moedaValida);
  } catch (err) {

  }
  return moedaValida;
}

export function formatarPrecoMoeda(valor, moeda = 'USD') {
  const moedaValida = validarMoeda(moeda) || 'USD';
  const numero = Number(valor);
  const valorSeguro = Number.isFinite(numero) ? numero : 0;
  const fixado = valorSeguro.toFixed(2);

  if (moedaValida === 'BRL') {
    return `R$ ${fixado.replace('.', ',')} BRL`;
  }
  if (moedaValida === 'EUR') {
    return `€ ${fixado.replace('.', ',')} EUR`;
  }
  return `$ ${fixado} USD`;
}

export function converterValorMoeda(valor, moedaOrigem = 'USD', moedaDestino = 'USD') {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;

  const origem = validarMoeda(moedaOrigem) || 'USD';
  const destino = validarMoeda(moedaDestino) || 'USD';

  if (origem === destino) {
    return Number(numero.toFixed(2));
  }

  const valorEmUsd = numero / TAXAS_CAMBIO[origem];
  const valorConvertido = valorEmUsd * TAXAS_CAMBIO[destino];
  return Number(valorConvertido.toFixed(2));
}

function parsearPrecoSteam(precoTexto, moeda = 'USD') {
  if (typeof precoTexto !== 'string') return 0;

  const limpo = precoTexto
    .replace(/,--/g, ',00')
    .replace(/\.--/g, '.00')
    .replace(/[^\d.,]/g, '')
    .trim();

  if (!limpo) return 0;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');

  let normalizado = limpo;

  if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
    if (ultimoPonto > ultimaVirgula) {

      normalizado = limpo.replace(/,/g, '');
    } else {

      normalizado = limpo.replace(/\./g, '').replace(',', '.');
    }
  } else if (ultimaVirgula !== -1) {

    if (moeda === 'USD' && /^\d{1,3}(,\d{3})+$/.test(limpo)) {
      normalizado = limpo.replace(/,/g, '');
    } else {
      normalizado = limpo.replace(',', '.');
    }
  } else if (ultimoPonto !== -1) {

    if (moeda !== 'USD' && /^\d{1,3}(\.\d{3})+$/.test(limpo)) {
      normalizado = limpo.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalizado);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function analisarTipoItem(skinNome, opcoes = {}) {
  const nomeLimpo = String(skinNome || '').trim();
  const { tipoCaixa = '', isSouvenir = false, isFacaOuLuva = false } = opcoes || {};
  const tipoStr = String(tipoCaixa || '');

  const ehAdesivo = /sticker|autograph/i.test(tipoStr) || /^Sticker\s*\|/i.test(nomeLimpo);
  const ehPatch = !ehAdesivo && (/patch/i.test(tipoStr) || /^Patch\s*\|/i.test(nomeLimpo));
  const ehGrafite =
    !ehAdesivo &&
    !ehPatch &&
    (/graffiti/i.test(tipoStr) || /^Sealed Graffiti\s*\|/i.test(nomeLimpo));
  const ehPin = !ehAdesivo && !ehPatch && !ehGrafite && /pin|collectible/i.test(tipoStr);
  const ehMusicKit =
    !ehAdesivo &&
    !ehPatch &&
    !ehGrafite &&
    !ehPin &&
    (/music/i.test(tipoStr) || /music kit/i.test(nomeLimpo));

  const ehSouvenir =
    !ehAdesivo &&
    !ehPatch &&
    !ehGrafite &&
    !ehPin &&
    !ehMusicKit &&
    (Boolean(isSouvenir) || /souvenir/i.test(tipoStr) || /^Souvenir\s+/i.test(nomeLimpo));

  const ehLuva = /gloves|hand wraps/i.test(nomeLimpo);
  const temEstrela = nomeLimpo.startsWith('★') || Boolean(isFacaOuLuva);
  const nomeSemEstrela = nomeLimpo.replace(/^★\s*/, '').trim();
  const ehFacaVanilla =
    !ehAdesivo &&
    !ehPatch &&
    !ehGrafite &&
    !ehPin &&
    !ehMusicKit &&
    !ehSouvenir &&
    !ehLuva &&
    temEstrela &&
    !nomeSemEstrela.includes(' | ');

  const aceitaWear =
    !ehAdesivo && !ehPatch && !ehGrafite && !ehPin && !ehMusicKit && !ehFacaVanilla;

  const permiteStatTrak =
    !ehAdesivo && !ehPatch && !ehGrafite && !ehPin && !ehSouvenir && !ehLuva;

  return {
    nomeLimpo,
    nomeSemEstrela,
    ehAdesivo,
    ehPatch,
    ehGrafite,
    ehPin,
    ehMusicKit,
    ehSouvenir,
    ehLuva,
    temEstrela,
    ehFacaVanilla,
    aceitaWear,
    permiteStatTrak,
  };
}

export function formatarMarketHashName(
  skinNome,
  wearNome = 'Field-Tested',
  isStatTrak = false,
  opcoes = {}
) {
  const info = analisarTipoItem(skinNome, opcoes);
  const { nomeLimpo } = info;

  if (!nomeLimpo) return '';

  if (info.ehAdesivo) {
    return /^Sticker\s*\|/i.test(nomeLimpo) ? nomeLimpo : `Sticker | ${nomeLimpo}`;
  }

  if (info.ehPatch) {
    return /^Patch\s*\|/i.test(nomeLimpo) ? nomeLimpo : `Patch | ${nomeLimpo}`;
  }

  if (info.ehGrafite) {
    if (/^Sealed Graffiti\s*\|/i.test(nomeLimpo)) {
      return nomeLimpo;
    }
    if (/^Graffiti\s*\|/i.test(nomeLimpo)) {
      return nomeLimpo.replace(/^Graffiti\s*\|/i, 'Sealed Graffiti |');
    }
    return `Sealed Graffiti | ${nomeLimpo}`;
  }

  if (info.ehPin) {
    return nomeLimpo;
  }

  if (info.ehMusicKit) {
    const jaTemStatTrak = /StatTrak™/i.test(nomeLimpo);
    if (jaTemStatTrak) {
      return nomeLimpo;
    }
    return isStatTrak ? `StatTrak™ ${nomeLimpo}` : nomeLimpo;
  }

  if (info.ehFacaVanilla) {
    const corpoVanilla = info.nomeSemEstrela.replace(/^StatTrak™\s+/i, '').trim();
    const aplicarSt = Boolean(isStatTrak) || /^StatTrak™\s+/i.test(info.nomeSemEstrela);
    return aplicarSt ? `★ StatTrak™ ${corpoVanilla}` : `★ ${corpoVanilla}`;
  }

  const wearLimpo = typeof wearNome === 'string' ? wearNome.trim() : '';
  const sufixoWear = wearLimpo ? ` (${wearLimpo})` : '';

  if (info.ehSouvenir) {
    const corpoSouvenir = /^Souvenir\s+/i.test(info.nomeSemEstrela)
      ? info.nomeSemEstrela
      : `Souvenir ${info.nomeSemEstrela}`;
    return `${corpoSouvenir}${sufixoWear}`;
  }

  if (info.ehLuva) {
    return info.temEstrela
      ? `★ ${info.nomeSemEstrela}${sufixoWear}`
      : `${info.nomeSemEstrela}${sufixoWear}`;
  }

  const jaTemStatTrak = /^StatTrak™\s+/i.test(info.nomeSemEstrela);
  const corpoSkin = info.nomeSemEstrela.replace(/^StatTrak™\s+/i, '').trim();
  const aplicarStatTrak = Boolean(isStatTrak) || jaTemStatTrak;

  if (info.temEstrela) {
    return aplicarStatTrak
      ? `★ StatTrak™ ${corpoSkin}${sufixoWear}`
      : `★ ${corpoSkin}${sufixoWear}`;
  }

  return aplicarStatTrak ? `StatTrak™ ${corpoSkin}${sufixoWear}` : `${corpoSkin}${sufixoWear}`;
}

function calcularHashDeterministico(str) {
  const texto = String(str || '');
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash << 5) - hash + texto.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function interpolarFaixaHash(fatorHash, min, max) {
  return min + fatorHash * (max - min);
}

function calcularFallbackDeterministico({
  skinId = '',
  skinNome = '',
  raridadeNome = '',
  wearNome = '',
  isStatTrak = false,
  opcoes = {},
}) {
  const info = analisarTipoItem(skinNome, opcoes);
  const nomeLower = info.nomeLimpo.toLowerCase();
  const raridadeLower = String(raridadeNome || '').toLowerCase();
  const wearLimpo = typeof wearNome === 'string' ? wearNome.trim() : '';
  const wearLower = wearLimpo.toLowerCase();

  const chaveHash = info.nomeLimpo || String(skinId || raridadeNome || 'item');
  const hash = calcularHashDeterministico(chaveHash);
  const fatorHash = (hash % 1000) / 1000;

  let baseUsd = null;
  let ehItemHistoricoSemMultiplicador = false;

  if (nomeLower.includes('katowice 2014')) {
    ehItemHistoricoSemMultiplicador = true;
    if (nomeLower.includes('(holo)')) {
      if (nomeLower.includes('ibuypower')) baseUsd = 55000;
      else if (nomeLower.includes('titan')) baseUsd = 50000;
      else if (nomeLower.includes('reason')) baseUsd = 35000;
      else if (nomeLower.includes('vox')) baseUsd = 20000;
      else if (nomeLower.includes('dignitas')) baseUsd = 16000;
      else if (nomeLower.includes('natus vincere')) baseUsd = 14000;
      else baseUsd = interpolarFaixaHash(fatorHash, 4500, 12000);
    } else if (nomeLower.includes('(foil)')) {
      baseUsd = interpolarFaixaHash(fatorHash, 1600, 2800);
    } else {
      if (nomeLower.includes('ibuypower')) baseUsd = 2400;
      else if (nomeLower.includes('titan')) baseUsd = 1800;
      else baseUsd = interpolarFaixaHash(fatorHash, 280, 750);
    }
  } else if (info.aceitaWear || info.ehFacaVanilla) {
    if (nomeLower.includes('dragon lore')) baseUsd = 8500;
    else if (nomeLower.includes('gungnir')) baseUsd = 9500;
    else if (nomeLower.includes('wild lotus')) baseUsd = 7500;
    else if (/\bhowl\b/i.test(nomeLower)) baseUsd = 5200;
    else if (/\bprince\b/i.test(nomeLower)) baseUsd = 3500;
    else if (nomeLower.includes('gold arabesque')) baseUsd = 2800;
    else if (nomeLower.includes('medusa')) baseUsd = 2600;
  }

  const ehFacaOuLuvaItem =
    Boolean(opcoes?.isFacaOuLuva) ||
    info.nomeLimpo.startsWith('★') ||
    raridadeLower.includes('extraordinary') ||
    nomeLower.includes('knife') ||
    nomeLower.includes('glove') ||
    nomeLower.includes('hand wraps');

  if (baseUsd === null && ehFacaOuLuvaItem) {
    baseUsd = interpolarFaixaHash(fatorHash, 160, 850);
  }

  if (baseUsd === null) {
    if (raridadeLower.includes('contraband')) {
      baseUsd = 4500;
    } else if (raridadeLower.includes('covert') || raridadeLower.includes('ancient')) {
      baseUsd = interpolarFaixaHash(fatorHash, 18, 110);
    } else if (raridadeLower.includes('classified') || raridadeLower.includes('legendary')) {
      baseUsd = interpolarFaixaHash(fatorHash, 5, 32);
    } else if (raridadeLower.includes('restricted') || raridadeLower.includes('mythical')) {
      baseUsd = interpolarFaixaHash(fatorHash, 1.5, 8.5);
    } else if (raridadeLower.includes('mil-spec') || raridadeLower.includes('rare_weapon')) {
      baseUsd = interpolarFaixaHash(fatorHash, 0.25, 1.5);
    } else if (raridadeLower.includes('industrial')) {
      baseUsd = interpolarFaixaHash(fatorHash, 0.08, 0.4);
    } else if (raridadeLower.includes('consumer') || raridadeLower.includes('base')) {
      baseUsd = interpolarFaixaHash(fatorHash, 0.03, 0.12);
    } else if (raridadeLower.includes('exotic')) {
      baseUsd = interpolarFaixaHash(fatorHash, 12, 45);
    } else if (raridadeLower.includes('remarkable')) {
      baseUsd = interpolarFaixaHash(fatorHash, 1.8, 9);
    } else if (raridadeLower.includes('high grade')) {
      baseUsd = interpolarFaixaHash(fatorHash, 0.25, 1.4);
    } else {
      baseUsd = interpolarFaixaHash(fatorHash, 1.5, 8.5);
    }
  }

  let final = baseUsd;

  if (!ehItemHistoricoSemMultiplicador && info.aceitaWear && wearLimpo.length > 0) {
    let multiplicadorWear = 1.0;
    if (wearLower.includes('factory new')) multiplicadorWear = 1.45;
    else if (wearLower.includes('minimal wear')) multiplicadorWear = 1.2;
    else if (wearLower.includes('field-tested')) multiplicadorWear = 1.0;
    else if (wearLower.includes('well-worn')) multiplicadorWear = 0.9;
    else if (wearLower.includes('battle-scarred')) multiplicadorWear = 0.8;

    final *= multiplicadorWear;
  }

  if (!ehItemHistoricoSemMultiplicador && isStatTrak && info.permiteStatTrak) {
    final *= 1.45;
  }

  return Number(final.toFixed(2));
}

function calcularPrecoEstimado(
  raridadeNome,
  wearNome,
  isStatTrak = false,
  nomeSkin = '',
  opcoes = {}
) {
  return calcularFallbackDeterministico({
    skinNome: nomeSkin,
    raridadeNome,
    wearNome,
    isStatTrak,
    opcoes,
  });
}

async function consultarSteamPriceOverview(marketHashName, moeda) {
  try {
    const codigoSteam = STEAM_CURRENCY_IDS[moeda] || 1;
    const urlSteam = `https://steamcommunity.com/market/priceoverview/?currency=${codigoSteam}&appid=730&market_hash_name=${encodeURIComponent(
      marketHashName
    )}`;

    const respostaSteam = await fetch(urlSteam);
    if (!respostaSteam.ok) {
      return {
        valorNumerico: 0,
        okHttp: false,
        rateLimited: respostaSteam.status === 429,
        erroReal: true,
        status: respostaSteam.status,
      };
    }

    const dadosSteam = await respostaSteam.json();
    if (!dadosSteam || !dadosSteam.success) {
      return {
        valorNumerico: 0,
        okHttp: true,
        rateLimited: false,
        erroReal: false,
        status: 200,
      };
    }

    const lowest = parsearPrecoSteam(dadosSteam.lowest_price, moeda);
    const median = parsearPrecoSteam(dadosSteam.median_price, moeda);
    const volumeStr = String(dadosSteam.volume || '').replace(/[^\d]/g, '');
    const volume = volumeStr ? parseInt(volumeStr, 10) : null;

    let valorNumerico = 0;
    if (lowest > 0 && median > 0) {
      if (lowest > median * 1.6 || (volume !== null && volume <= 2)) {
        valorNumerico = median;
      } else {
        valorNumerico = lowest;
      }
    } else if (lowest > 0) {
      valorNumerico = lowest;
    } else if (median > 0) {
      valorNumerico = median;
    }

    return {
      valorNumerico,
      okHttp: true,
      rateLimited: false,
      erroReal: false,
      status: 200,
    };
  } catch (err) {
    return {
      valorNumerico: 0,
      okHttp: false,
      rateLimited: false,
      erroReal: true,
      status: 0,
    };
  }
}

function criarResultadoPreco(valorNumerico, moeda, fonte) {
  const valorSeguro = Number(Number(valorNumerico).toFixed(2));
  const valorUsd =
    moeda === 'USD' ? valorSeguro : converterValorMoeda(valorSeguro, moeda, 'USD');

  return {
    precoFormatado: formatarPrecoMoeda(valorSeguro, moeda),
    valorNumerico: valorSeguro,
    valorUsd,
    moeda,
    fonte,
  };
}

export async function obterPrecoSkin(
  nomeSkin,
  raridadeNome,
  wearNome,
  isStatTrak = false,
  moedaOpcional = null,
  opcoes = {}
) {
  const marketHashName = formatarMarketHashName(nomeSkin, wearNome, isStatTrak, opcoes);
  const moeda = validarMoeda(moedaOpcional) || (await obterMoedaSelecionada());
  const chaveCache = `${marketHashName}::${moeda}`;

  const entradaCache = cachePrecos.get(chaveCache);
  if (entradaCache) {
    if (Date.now() - entradaCache.timestamp < CACHE_PRECOS_TTL_MS) {
      return { ...entradaCache.dados };
    }
    cachePrecos.delete(chaveCache);
  }

  if (requisicoesEmAndamento.has(chaveCache)) {
    const resultadoPendente = await requisicoesEmAndamento.get(chaveCache);
    return { ...resultadoPendente };
  }

  const promessaConsulta = (async () => {
    const salvarNoCache = (chave, dados) => {
      cachePrecos.set(chave, {
        timestamp: Date.now(),
        dados: { ...dados },
      });
    };

    let apiKey = null;
    try {
      apiKey = await AsyncStorage.getItem(STORAGE_KEY_PRICEMPIRE);
    } catch (err) {

    }

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const urlPricempire = `https://api.pricempire.com/v4/paid/items/prices?app_id=730&api_key=${encodeURIComponent(
          apiKey.trim()
        )}&currency=${encodeURIComponent(moeda)}&sources=buff163,skinport,steam`;

        const respostaPe = await fetch(urlPricempire);
        if (respostaPe.ok) {
          const dadosPe = await respostaPe.json();
          let itemPe = null;
          if (Array.isArray(dadosPe)) {
            itemPe = dadosPe.find(
              (i) => (i.market_hash_name || '').toLowerCase() === marketHashName.toLowerCase()
            );
          } else if (dadosPe && typeof dadosPe === 'object') {
            itemPe = dadosPe[marketHashName] || dadosPe[marketHashName.toLowerCase()];
          }

          if (itemPe && itemPe.prices && itemPe.prices.length > 0) {
            const precoEmCentavos = itemPe.prices[0].price ?? itemPe.prices[0].min_price;
            if (
              typeof precoEmCentavos === 'number' &&
              Number.isFinite(precoEmCentavos) &&
              precoEmCentavos > 0
            ) {
              const valorFinal = Number((precoEmCentavos / 100).toFixed(2));
              const resultadoPe = criarResultadoPreco(valorFinal, moeda, 'PriceEmpire API');
              salvarNoCache(chaveCache, resultadoPe);
              return resultadoPe;
            }
          }
        }
      } catch (err) {

      }
    }

    let houveErroRealSteam = false;
    const steamRes = await consultarSteamPriceOverview(marketHashName, moeda);

    if (steamRes.valorNumerico > 0) {
      const resultadoSteam = criarResultadoPreco(
        steamRes.valorNumerico,
        moeda,
        'Steam Community Market'
      );
      salvarNoCache(chaveCache, resultadoSteam);
      return resultadoSteam;
    }

    if (steamRes.erroReal || steamRes.rateLimited) {
      houveErroRealSteam = true;
    } else if (steamRes.okHttp) {

      const infoItem = analisarTipoItem(nomeSkin, opcoes);
      const wearLimpo = typeof wearNome === 'string' ? wearNome.trim() : '';

      if (infoItem.aceitaWear && wearLimpo.length > 0) {
        const wearAlternativo = wearLimpo === 'Factory New' ? 'Minimal Wear' : 'Factory New';
        if (wearAlternativo !== wearLimpo) {
          const hashAlternativo = formatarMarketHashName(
            nomeSkin,
            wearAlternativo,
            isStatTrak,
            opcoes
          );
          const chaveAlt = `${hashAlternativo}::${moeda}`;
          const cacheAlt = cachePrecos.get(chaveAlt);

          if (cacheAlt && Date.now() - cacheAlt.timestamp < CACHE_PRECOS_TTL_MS) {
            salvarNoCache(chaveCache, cacheAlt.dados);
            return { ...cacheAlt.dados };
          }

          const altRes = await consultarSteamPriceOverview(hashAlternativo, moeda);
          if (altRes.valorNumerico > 0) {
            const resultadoAlt = criarResultadoPreco(
              altRes.valorNumerico,
              moeda,
              'Steam Community Market'
            );
            salvarNoCache(chaveAlt, resultadoAlt);
            salvarNoCache(chaveCache, resultadoAlt);
            return resultadoAlt;
          }

          if (altRes.erroReal || altRes.rateLimited) {
            houveErroRealSteam = true;
          }
        }
      }
    }

    const valorUsd = calcularPrecoEstimado(raridadeNome, wearNome, isStatTrak, nomeSkin, opcoes);
    const valorNumerico = converterValorMoeda(valorUsd, 'USD', moeda);
    const resultadoFallback = {
      precoFormatado: formatarPrecoMoeda(valorNumerico, moeda),
      valorNumerico,
      valorUsd,
      moeda,
      fonte: 'Mercado CS2 (Estimado)',
    };

    if (!houveErroRealSteam) {
      salvarNoCache(chaveCache, resultadoFallback);
    } else {
      Object.defineProperty(resultadoFallback, '_steamErroReal', {
        value: true,
        enumerable: false,
      });
    }

    return resultadoFallback;
  })();

  requisicoesEmAndamento.set(chaveCache, promessaConsulta);
  try {
    return await promessaConsulta;
  } finally {
    requisicoesEmAndamento.delete(chaveCache);
  }
}

function obterWearPadrao(skin) {
  if (Array.isArray(skin?.wears) && skin.wears.length > 0) {
    const temFieldTested = skin.wears.some((w) => {
      const nome = typeof w === 'string' ? w : w?.name;
      return nome === 'Field-Tested';
    });
    if (temFieldTested) return 'Field-Tested';
    const primeiro = typeof skin.wears[0] === 'string' ? skin.wears[0] : skin.wears[0]?.name;
    if (primeiro) return primeiro;
  }
  return 'Field-Tested';
}

function embaralharArray(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function calcularPrecoEstimadoDeterministo(
  skinId,
  skinNome,
  wearNome,
  raridadeNome = '',
  isStatTrak = false,
  opcoes = {}
) {
  return calcularFallbackDeterministico({
    skinId,
    skinNome,
    raridadeNome,
    wearNome,
    isStatTrak,
    opcoes,
  });
}

export async function obterSkinsClassifiedComPreco(moedaOpcional = null) {
  const moeda = validarMoeda(moedaOpcional) || (await obterMoedaSelecionada());

  const URL_API_SKINS =
    'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

  let resposta;
  try {
    resposta = await fetch(URL_API_SKINS);
  } catch (redeErr) {
    throw new Error(`Falha de rede ao carregar skins do jogo: ${redeErr?.message || 'Sem conexão'}`);
  }

  if (!resposta || !resposta.ok) {
    throw new Error(
      `Erro ao buscar skins do jogo (HTTP ${resposta ? resposta.status : 'desconhecido'}).`
    );
  }

  let todasSkins;
  try {
    todasSkins = await resposta.json();
  } catch (jsonErr) {
    throw new Error('Falha ao processar a lista de skins retornada pela API.');
  }

  if (!Array.isArray(todasSkins)) {
    throw new Error('Formato inválido retornado pela API de skins.');
  }

  const skinsElegiveis = todasSkins.filter(
    (skin) =>
      skin &&
      skin.id &&
      typeof skin.name === 'string' &&
      skin.name.trim().length > 0 &&
      typeof skin.image === 'string' &&
      skin.image.trim().length > 0 &&
      skin.rarity &&
      typeof skin.rarity.name === 'string'
  );

  if (skinsElegiveis.length < 2) {
    throw new Error('Não foi possível carregar skins com preço válido.');
  }

  let apiKey = null;
  try {
    apiKey = await AsyncStorage.getItem(STORAGE_KEY_PRICEMPIRE);
  } catch (err) {

  }

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const urlPricempire = `https://api.pricempire.com/v4/paid/items/prices?app_id=730&api_key=${encodeURIComponent(
        apiKey.trim()
      )}&currency=${encodeURIComponent(moeda)}&sources=buff163,skinport,steam`;

      const respostaPe = await fetch(urlPricempire);
      if (respostaPe.ok) {
        const dadosPe = await respostaPe.json();
        const mapaPe = new Map();
        if (Array.isArray(dadosPe)) {
          for (const item of dadosPe) {
            if (item && item.market_hash_name) {
              mapaPe.set(String(item.market_hash_name).toLowerCase(), item);
            }
          }
        } else if (dadosPe && typeof dadosPe === 'object') {
          for (const [k, v] of Object.entries(dadosPe)) {
            if (k && v) {
              mapaPe.set(String(k).toLowerCase(), v);
            }
          }
        }

        const skinsValidasPe = [];
        for (const skin of skinsElegiveis) {
          const wear = obterWearPadrao(skin);
          const hashName = formatarMarketHashName(skin.name, wear, false).toLowerCase();
          const itemPe = mapaPe.get(hashName);
          if (!itemPe) continue;

          let precoCentavos = null;
          if (Array.isArray(itemPe.prices) && itemPe.prices.length > 0) {
            precoCentavos = itemPe.prices[0].price ?? itemPe.prices[0].min_price;
          } else if (typeof itemPe.price === 'number') {
            precoCentavos = itemPe.price;
          } else if (typeof itemPe.min_price === 'number') {
            precoCentavos = itemPe.min_price;
          }

          if (typeof precoCentavos === 'number' && Number.isFinite(precoCentavos) && precoCentavos > 0) {
            const valorBruto = precoCentavos / 100;
            const valorNumerico = Number(valorBruto.toFixed(2));
            if (Number.isFinite(valorNumerico) && valorNumerico > 0) {
              const valorUsd =
                moeda === 'USD' ? valorNumerico : converterValorMoeda(valorNumerico, moeda, 'USD');
              if (Number.isFinite(valorUsd) && valorUsd > 0) {
                skinsValidasPe.push({
                  id: skin.id,
                  name: skin.name,
                  image: skin.image,
                  rarityName: skin.rarity?.name || '',
                  rarityColor: skin.rarity?.color || '#2B6CB0',
                  wear,
                  valorUsd,
                  fonte: 'PriceEmpire API',
                });
              }
            }
          }
        }

        if (skinsValidasPe.length >= 2) {
          return embaralharArray(skinsValidasPe).slice(0, 35);
        }
      }
    } catch (peErr) {

    }
  }

  const amostra = embaralharArray(skinsElegiveis).slice(0, 35);
  const skinsProntas = [];
  let falhasConsecutivasSteam = 0;

  const processarItem = async (skin, idx) => {
    const wear = obterWearPadrao(skin);
    const raridadeNome = skin.rarity?.name || 'Mil-Spec Grade';

    if (falhasConsecutivasSteam >= 2) {
      const valorUsd = calcularPrecoEstimadoDeterministo(skin.id, skin.name, wear, raridadeNome);
      if (Number.isFinite(valorUsd) && valorUsd > 0) {
        return {
          id: skin.id,
          name: skin.name,
          image: skin.image,
          rarityName: raridadeNome,
          rarityColor: skin.rarity?.color || '#2B6CB0',
          wear,
          valorUsd,
          fonte: 'Mercado CS2 (Estimado)',
        };
      }
      return null;
    }

    if (idx > 0) {
      await aguardarMs(250);
    }

    try {
      const infoPreco = await obterPrecoSkin(skin.name, raridadeNome, wear, false, moeda);
      if (infoPreco && Number.isFinite(infoPreco.valorUsd) && infoPreco.valorUsd > 0) {
        if (
          infoPreco.fonte === 'Steam Community Market' ||
          infoPreco.fonte === 'PriceEmpire API'
        ) {
          falhasConsecutivasSteam = 0;
        } else if (infoPreco._steamErroReal) {
          falhasConsecutivasSteam++;
        }

        return {
          id: skin.id,
          name: skin.name,
          image: skin.image,
          rarityName: raridadeNome,
          rarityColor: skin.rarity?.color || '#2B6CB0',
          wear,
          valorUsd: infoPreco.valorUsd,
          fonte: infoPreco.fonte,
        };
      } else {
        falhasConsecutivasSteam++;
      }
    } catch (err) {
      falhasConsecutivasSteam++;
    }
    return null;
  };

  const CONCORRENCIA_MAX = 2;
  let ponteiro = 0;

  const worker = async () => {
    while (ponteiro < amostra.length) {
      const idx = ponteiro++;
      const skinAtual = amostra[idx];
      const resultado = await processarItem(skinAtual, idx);
      if (resultado && Number.isFinite(resultado.valorUsd) && resultado.valorUsd > 0) {
        skinsProntas.push(resultado);
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCORRENCIA_MAX, amostra.length) },
    () => worker()
  );
  await Promise.all(workers);

  const skinsValidas = skinsProntas.filter(
    (s) => s && Number.isFinite(s.valorUsd) && s.valorUsd > 0
  );

  if (skinsValidas.length < 2) {
    throw new Error('Não foi possível carregar skins Classified com preço válido.');
  }

  return skinsValidas;
}
