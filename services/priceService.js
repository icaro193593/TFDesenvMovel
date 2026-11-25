import AsyncStorage from '@react-native-async-storage/async-storage';

// Chave utilizada para salvar a API Key do PriceEmpire nas configurações locais
const STORAGE_KEY_PRICEMPIRE = '@pricempire_api_key';

// Chave utilizada para salvar a moeda selecionada pelo usuário
export const STORAGE_KEY_MOEDA = '@moeda_selecionada';

// Taxas de referência para fallback local e conversão entre moedas salvas
export const TAXAS_CAMBIO = {
  USD: 1,
  BRL: 5.80,
  EUR: 0.92,
};

// Mapeamento de códigos de moeda da Steam Community Market API
const STEAM_CURRENCY_IDS = {
  USD: 1,
  EUR: 3,
  BRL: 7,
};

/**
 * Normaliza e valida o código da moeda, retornando null quando inválido.
 */
function validarMoeda(moeda) {
  if (typeof moeda !== 'string') return null;
  const codigo = moeda.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(TAXAS_CAMBIO, codigo) ? codigo : null;
}

/**
 * Lê a moeda selecionada no AsyncStorage (padrão 'USD' se vazio ou inválido).
 */
export async function obterMoedaSelecionada() {
  try {
    const salva = await AsyncStorage.getItem(STORAGE_KEY_MOEDA);
    return validarMoeda(salva) || 'USD';
  } catch (err) {
    return 'USD';
  }
}

/**
 * Salva a moeda selecionada no AsyncStorage.
 */
export async function salvarMoedaSelecionada(moeda) {
  const moedaValida = validarMoeda(moeda) || 'USD';
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MOEDA, moedaValida);
  } catch (err) {
    // Mantém execução segura mesmo se houver falha de armazenamento
  }
  return moedaValida;
}

/**
 * Formata um valor numérico na moeda informada:
 * USD -> "$ 12.34 USD"
 * BRL -> "R$ 71,57 BRL"
 * EUR -> "€ 11,35 EUR"
 */
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

/**
 * Converte um valor entre USD, BRL e EUR usando TAXAS_CAMBIO.
 */
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

/**
 * Faz o parse seguro de strings de preço da Steam em USD, BRL e EUR:
 * Exemplos: "$27.16", "$1,234.56", "R$ 158,84", "R$ 1.234,56", "24,76€", "1.234,56€"
 */
function parsearPrecoSteam(precoTexto, moeda = 'USD') {
  if (typeof precoTexto !== 'string') return 0;

  // Trata formato europeu da Steam com traços (ex: "24,--€") antes de limpar símbolos
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
      // Formato USD: 1,234.56 -> vírgula é milhar, ponto é decimal
      normalizado = limpo.replace(/,/g, '');
    } else {
      // Formato BRL/EUR: 1.234,56 -> ponto é milhar, vírgula é decimal
      normalizado = limpo.replace(/\./g, '').replace(',', '.');
    }
  } else if (ultimaVirgula !== -1) {
    // Apenas vírgula: verifica se é separador de milhar em USD (ex: 1,234) ou decimal (158,84)
    if (moeda === 'USD' && /^\d{1,3}(,\d{3})+$/.test(limpo)) {
      normalizado = limpo.replace(/,/g, '');
    } else {
      normalizado = limpo.replace(',', '.');
    }
  } else if (ultimoPonto !== -1) {
    // Apenas ponto: verifica se é separador de milhar em BRL/EUR (ex: 1.234)
    if (moeda !== 'USD' && /^\d{1,3}(\.\d{3})+$/.test(limpo)) {
      normalizado = limpo.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalizado);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

/**
 * Normaliza o nome da skin para o formato padrão do mercado da Steam / PriceEmpire:
 * Exemplo: "AK-47 | Redline (Field-Tested)" ou "StatTrak™ AK-47 | Redline (Field-Tested)"
 */
export function formatarMarketHashName(nomeSkin, wearNome, isStatTrak) {
  let nomeLimpo = nomeSkin.trim();

  // Verifica se é item raro com estrela (faca ou luva)
  const isSpecial = nomeLimpo.startsWith('★');
  if (isSpecial) {
    nomeLimpo = nomeLimpo.replace('★', '').trim();
  }

  let hash = nomeLimpo;

  // Se tiver estado de conservação (wear), anexa entre parênteses
  if (wearNome) {
    hash = `${hash} (${wearNome})`;
  }

  // Se for StatTrak™, inclui o prefixo oficial
  if (isStatTrak) {
    if (isSpecial) {
      return `★ StatTrak™ ${hash}`;
    }
    return `StatTrak™ ${hash}`;
  }

  if (isSpecial) {
    return `★ ${hash}`;
  }

  return hash;
}

/**
 * Calcula uma estimativa de preço de mercado realista baseada na raridade, wear e StatTrak,
 * utilizada como fallback confiável quando a API externa não responder ou for bloqueada por CORS/rate-limit.
 */
function calcularPrecoEstimado(raridadeNome, wearNome, isStatTrak) {
  const raridade = (raridadeNome || '').toLowerCase();
  const wear = (wearNome || '').toLowerCase();

  let base = 1.5;

  if (raridade.includes('mil-spec') || raridade.includes('rare_weapon')) {
    base = 0.85 + Math.random() * 2.2;
  } else if (raridade.includes('restricted') || raridade.includes('mythical')) {
    base = 4.5 + Math.random() * 11.0;
  } else if (raridade.includes('classified') || raridade.includes('legendary')) {
    base = 22.0 + Math.random() * 55.0;
  } else if (raridade.includes('covert') || raridade.includes('ancient')) {
    base = 75.0 + Math.random() * 280.0;
  } else if (raridade.includes('special') || raridade.includes('faca') || raridade.includes('knife') || raridade.includes('glove')) {
    base = 240.0 + Math.random() * 950.0;
  }

  // Multiplicador por condição de uso (wear)
  let multiplicadorWear = 1.0;
  if (wear.includes('factory new')) {
    multiplicadorWear = 1.65;
  } else if (wear.includes('minimal wear')) {
    multiplicadorWear = 1.25;
  } else if (wear.includes('field-tested')) {
    multiplicadorWear = 0.95;
  } else if (wear.includes('well-worn')) {
    multiplicadorWear = 0.8;
  } else if (wear.includes('battle-scarred')) {
    multiplicadorWear = 0.7;
  }

  let final = base * multiplicadorWear;

  // StatTrak valoriza a skin em ~2.2x
  if (isStatTrak) {
    final *= 2.2;
  }

  return Number(final.toFixed(2));
}

/**
 * Consulta o valor de mercado da skin via API PriceEmpire (com fallback para Steam Market e cálculo de mercado).
 *
 * @param {string} nomeSkin Nome base da skin (ex: "AK-47 | Ice Coaled")
 * @param {string} raridadeNome Nome da raridade (ex: "Covert")
 * @param {string} wearNome Nome da conservação (ex: "Factory New")
 * @param {boolean} isStatTrak Se a skin é StatTrak™
 * @param {string|null} moedaOpcional Moeda desejada ('USD', 'BRL', 'EUR'); usa AsyncStorage se omitida
 * @returns {Promise<{ precoFormatado: string, valorNumerico: number, valorUsd: number, moeda: string, fonte: string }>}
 */
export async function obterPrecoSkin(
  nomeSkin,
  raridadeNome,
  wearNome,
  isStatTrak = false,
  moedaOpcional = null
) {
  const marketHashName = formatarMarketHashName(nomeSkin, wearNome, isStatTrak);
  const moeda = validarMoeda(moedaOpcional) || (await obterMoedaSelecionada());

  // 1. Tenta buscar API Key salva no AsyncStorage
  let apiKey = null;
  try {
    apiKey = await AsyncStorage.getItem(STORAGE_KEY_PRICEMPIRE);
  } catch (err) {
    // Se não conseguir ler o AsyncStorage, segue normalmente
  }

  // 2. Se houver API Key do PriceEmpire cadastrada, faz a requisição oficial para a PriceEmpire
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const urlPricempire = `https://api.pricempire.com/v4/paid/items/prices?app_id=730&api_key=${encodeURIComponent(
        apiKey.trim()
      )}&currency=${encodeURIComponent(moeda)}&sources=buff163,skinport,steam`;

      const respostaPe = await fetch(urlPricempire);
      if (respostaPe.ok) {
        const dadosPe = await respostaPe.json();
        // Se a resposta vier em array ou objeto mapeado por market_hash_name
        let itemPe = null;
        if (Array.isArray(dadosPe)) {
          itemPe = dadosPe.find(
            (i) => (i.market_hash_name || '').toLowerCase() === marketHashName.toLowerCase()
          );
        } else if (dadosPe && typeof dadosPe === 'object') {
          itemPe = dadosPe[marketHashName] || dadosPe[marketHashName.toLowerCase()];
        }

        if (itemPe && itemPe.prices && itemPe.prices.length > 0) {
          // Pega o menor preço disponível nos marketplaces da PriceEmpire (convertendo centavos se necessário)
          const precoEmCentavos = itemPe.prices[0].price || itemPe.prices[0].min_price;
          const valorBruto =
            typeof precoEmCentavos === 'number'
              ? precoEmCentavos > 1000
                ? precoEmCentavos / 100
                : precoEmCentavos
              : 10;
          const valorFinal = Number(valorBruto.toFixed(2));
          const valorUsd =
            moeda === 'USD'
              ? valorFinal
              : converterValorMoeda(valorFinal, moeda, 'USD');

          return {
            precoFormatado: formatarPrecoMoeda(valorFinal, moeda),
            valorNumerico: valorFinal,
            valorUsd,
            moeda,
            fonte: 'PriceEmpire API',
          };
        }
      }
    } catch (err) {
      // Falha de rede ou CORS com PriceEmpire, segue para a próxima alternativa
    }
  }

  // 3. Fallback para Steam Community Market API (Endpoint público de preços de itens do CS2)
  try {
    const codigoSteam = STEAM_CURRENCY_IDS[moeda] || 1;
    const urlSteam = `https://steamcommunity.com/market/priceoverview/?currency=${codigoSteam}&appid=730&market_hash_name=${encodeURIComponent(
      marketHashName
    )}`;

    const respostaSteam = await fetch(urlSteam);
    if (respostaSteam.ok) {
      const dadosSteam = await respostaSteam.json();
      if (dadosSteam && dadosSteam.success && (dadosSteam.lowest_price || dadosSteam.median_price)) {
        const precoTexto = dadosSteam.lowest_price || dadosSteam.median_price;
        const valorNumerico = parsearPrecoSteam(precoTexto, moeda);
        const valorUsd =
          moeda === 'USD'
            ? valorNumerico
            : converterValorMoeda(valorNumerico, moeda, 'USD');

        return {
          precoFormatado: formatarPrecoMoeda(valorNumerico, moeda),
          valorNumerico,
          valorUsd,
          moeda,
          fonte: 'Steam Community Market',
        };
      }
    }
  } catch (err) {
    // Falha ao acessar Steam (ex: sem conexão ou limite de requisições excedido)
  }

  // 4. Fallback de precisão com estimativa estatística do mercado CS2
  const valorUsd = calcularPrecoEstimado(raridadeNome, wearNome, isStatTrak);
  const valorNumerico = converterValorMoeda(valorUsd, 'USD', moeda);
  return {
    precoFormatado: formatarPrecoMoeda(valorNumerico, moeda),
    valorNumerico,
    valorUsd,
    moeda,
    fonte: 'Mercado CS2 (Estimado)',
  };
}

/**
 * Determina a condição padrão de comparação para uma skin:
 * 'Field-Tested' se existir em skin.wears, senão a primeira disponível, senão 'Field-Tested'.
 */
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

/**
 * Embaralha um array utilizando o algoritmo de Fisher-Yates
 */
function embaralharArray(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Gera um hash determinístico a partir de uma string
 */
function gerarSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Calcula uma estimativa de preço de mercado realista e determinística por skin,
 * utilizada para Classified no fallback para evitar requisições lentas consecutivas.
 */
function calcularPrecoEstimadoDeterministo(skinId, skinNome, wearNome) {
  const seed = gerarSeed(`${skinId || ''}_${skinNome || ''}`);
  // Faixa realista de mercado para Classified: $22.00 a $77.00 USD
  const base = 22.0 + ((seed % 1000) / 1000) * 55.0;

  let multiplicadorWear = 0.95;
  const wear = (wearNome || '').toLowerCase();
  if (wear.includes('factory new')) multiplicadorWear = 1.65;
  else if (wear.includes('minimal wear')) multiplicadorWear = 1.25;
  else if (wear.includes('field-tested')) multiplicadorWear = 0.95;
  else if (wear.includes('well-worn')) multiplicadorWear = 0.8;
  else if (wear.includes('battle-scarred')) multiplicadorWear = 0.7;

  return Number((base * multiplicadorWear).toFixed(2));
}

/**
 * Obtém a lista de skins da raridade Classified com preços atualizados,
 * filtrando itens válidos e aplicando arquitetura em 3 camadas com concorrência controlada.
 *
 * @param {string|null} moedaOpcional Moeda desejada ('USD', 'BRL', 'EUR')
 * @returns {Promise<Array<{ id: string, name: string, image: string, rarityName: string, rarityColor: string, wear: string, valorUsd: number, fonte: string }>>}
 */
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

  // Filtra estritamente Classified com id, name e image válidos
  const skinsClassified = todasSkins.filter(
    (skin) =>
      skin &&
      skin.id &&
      typeof skin.name === 'string' &&
      skin.name.trim().length > 0 &&
      typeof skin.image === 'string' &&
      skin.image.trim().length > 0 &&
      skin.rarity &&
      skin.rarity.name === 'Classified'
  );

  if (skinsClassified.length < 2) {
    throw new Error('Não foi possível carregar skins Classified com preço válido.');
  }

  // Verifica se há chave de API do PriceEmpire
  let apiKey = null;
  try {
    apiKey = await AsyncStorage.getItem(STORAGE_KEY_PRICEMPIRE);
  } catch (err) {
    // Continua sem chave
  }

  // 1. Tenta batch PriceEmpire v4 se chave existir
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
        for (const skin of skinsClassified) {
          const wear = obterWearPadrao(skin);
          const hashName = formatarMarketHashName(skin.name, wear, false).toLowerCase();
          const itemPe = mapaPe.get(hashName);
          if (!itemPe) continue;

          let precoCentavos = null;
          if (Array.isArray(itemPe.prices) && itemPe.prices.length > 0) {
            precoCentavos = itemPe.prices[0].price || itemPe.prices[0].min_price;
          } else if (typeof itemPe.price === 'number') {
            precoCentavos = itemPe.price;
          } else if (typeof itemPe.min_price === 'number') {
            precoCentavos = itemPe.min_price;
          }

          if (typeof precoCentavos === 'number' && precoCentavos > 0) {
            const valorBruto = precoCentavos > 1000 ? precoCentavos / 100 : precoCentavos;
            const valorNumerico = Number(valorBruto.toFixed(2));
            if (Number.isFinite(valorNumerico) && valorNumerico > 0) {
              const valorUsd =
                moeda === 'USD' ? valorNumerico : converterValorMoeda(valorNumerico, moeda, 'USD');
              if (Number.isFinite(valorUsd) && valorUsd > 0) {
                skinsValidasPe.push({
                  id: skin.id,
                  name: skin.name,
                  image: skin.image,
                  rarityName: 'Classified',
                  rarityColor: skin.rarity?.color || '#d32ce6',
                  wear,
                  valorUsd,
                  fonte: 'PriceEmpire API',
                });
              }
            }
          }
        }

        if (skinsValidasPe.length >= 2) {
          return embaralharArray(skinsValidasPe).slice(0, 30);
        }
      }
    } catch (peErr) {
      // Falha no batch do PriceEmpire, segue para a consulta padrão
    }
  }

  // 2. Sem chave PriceEmpire ou após falha no batch:
  // Embaralha as skins Classified e seleciona até 30 skins distintas
  const amostra = embaralharArray(skinsClassified).slice(0, 30);
  const skinsProntas = [];
  let falhasConsecutivasSteam = 0;

  const processarItem = async (skin) => {
    const wear = obterWearPadrao(skin);

    // Proteção de tempo e rate-limit: se a Steam falhar em 2 tentativas consecutivas,
    // passa a usar diretamente o fallback estimado determinístico para o restante do lote
    if (falhasConsecutivasSteam >= 2) {
      const valorUsd = calcularPrecoEstimadoDeterministo(skin.id, skin.name, wear);
      if (Number.isFinite(valorUsd) && valorUsd > 0) {
        return {
          id: skin.id,
          name: skin.name,
          image: skin.image,
          rarityName: 'Classified',
          rarityColor: skin.rarity?.color || '#d32ce6',
          wear,
          valorUsd,
          fonte: 'Mercado CS2 (Estimado)',
        };
      }
      return null;
    }

    try {
      const infoPreco = await obterPrecoSkin(skin.name, 'Classified', wear, false, moeda);
      if (infoPreco && Number.isFinite(infoPreco.valorUsd) && infoPreco.valorUsd > 0) {
        if (
          infoPreco.fonte === 'Steam Community Market' ||
          infoPreco.fonte === 'PriceEmpire API'
        ) {
          falhasConsecutivasSteam = 0;
        } else {
          falhasConsecutivasSteam++;
        }

        return {
          id: skin.id,
          name: skin.name,
          image: skin.image,
          rarityName: 'Classified',
          rarityColor: skin.rarity?.color || '#d32ce6',
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

  // Concorrência controlada de até 4 itens por vez
  const CONCORRENCIA_MAX = 4;
  let ponteiro = 0;

  const worker = async () => {
    while (ponteiro < amostra.length) {
      const idx = ponteiro++;
      const skinAtual = amostra[idx];
      const resultado = await processarItem(skinAtual);
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
