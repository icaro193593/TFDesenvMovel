import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  obterSkinsClassifiedComPreco,
  obterMoedaSelecionada,
  converterValorMoeda,
  formatarPrecoMoeda,
} from '../services/priceService';

let cacheSkinsSessao = null;
let recordeSessao = 0;

export function decorarSkinComMoeda(skin, moeda) {
  if (!skin) return null;
  const valorAtual = converterValorMoeda(skin.valorUsd, 'USD', moeda);
  const precoFormatado = formatarPrecoMoeda(valorAtual, moeda);
  return {
    ...skin,
    valorAtual,
    precoFormatado,
  };
}

export function sortearNovaSkin(pool, idBase, recentesIds = []) {
  if (!pool || pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const tamanhoJanela = Math.min(10, Math.max(1, pool.length - 2));
  const ultimosRecentes = (recentesIds || []).slice(-tamanhoJanela);
  const setRecentes = new Set(ultimosRecentes);

  let candidatos = pool.filter((s) => s && s.id !== idBase && !setRecentes.has(s.id));

  if (candidatos.length === 0) {
    candidatos = pool.filter((s) => s && s.id !== idBase);
  }

  if (candidatos.length === 0) {
    candidatos = pool;
  }

  const indiceAleatorio = Math.floor(Math.random() * candidatos.length);
  return candidatos[indiceAleatorio];
}

export function _limparCacheSessaoParaTestes() {
  cacheSkinsSessao = null;
  recordeSessao = 0;
}
export function _definirCacheSkinsSessaoParaTestes(skins) {
  cacheSkinsSessao = skins;
}
export function _obterRecordeSessao() {
  return recordeSessao;
}

export default function useHigherOrLower() {
  const [skinBase, setSkinBase] = useState(null);
  const [skinComparada, setSkinComparada] = useState(null);
  const [pontuacao, setPontuacao] = useState(0);
  const [recorde, setRecorde] = useState(recordeSessao);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fase, setFase] = useState('jogando');
  const [resultadoRodada, setResultadoRodada] = useState(null);

  const timerTransicaoRef = useRef(null);
  const poolRef = useRef(cacheSkinsSessao || []);
  const recentesRef = useRef([]);
  const moedaRef = useRef(moedaAtual);
  moedaRef.current = moedaAtual;
  const faseRef = useRef(fase);
  faseRef.current = fase;
  const skinBaseRef = useRef(skinBase);
  skinBaseRef.current = skinBase;
  const skinComparadaRef = useRef(skinComparada);
  skinComparadaRef.current = skinComparada;
  const pontuacaoRef = useRef(pontuacao);
  pontuacaoRef.current = pontuacao;

  const iniciarRodadaComPool = useCallback((pool, moeda) => {
    if (!pool || pool.length < 2) return;

    if (timerTransicaoRef.current) {
      clearTimeout(timerTransicaoRef.current);
      timerTransicaoRef.current = null;
    }

    const baseRaw = pool[Math.floor(Math.random() * pool.length)];
    const compRaw = sortearNovaSkin(pool, baseRaw.id, [baseRaw.id]);

    const baseDecorada = decorarSkinComMoeda(baseRaw, moeda);
    const compDecorada = decorarSkinComMoeda(compRaw, moeda);

    recentesRef.current = [baseRaw.id, compRaw.id];
    skinBaseRef.current = baseDecorada;
    skinComparadaRef.current = compDecorada;
    setSkinBase(baseDecorada);
    setSkinComparada(compDecorada);

    pontuacaoRef.current = 0;
    setPontuacao(0);
    setRecorde(recordeSessao);
    setResultadoRodada(null);
    faseRef.current = 'jogando';
    setFase('jogando');
    setError(null);
    setIsLoading(false);
  }, []);

  const carregarSkins = useCallback(
    async (forcar = false) => {
      if (timerTransicaoRef.current) {
        clearTimeout(timerTransicaoRef.current);
        timerTransicaoRef.current = null;
      }

      const moeda = await obterMoedaSelecionada();
      setMoedaAtual(moeda);
      moedaRef.current = moeda;

      if (cacheSkinsSessao && cacheSkinsSessao.length >= 2 && !forcar) {
        poolRef.current = cacheSkinsSessao;
        iniciarRodadaComPool(cacheSkinsSessao, moeda);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const skins = await obterSkinsClassifiedComPreco(moeda);
        if (!skins || skins.length < 2) {
          throw new Error('Não foi possível carregar skins com preço válido.');
        }
        cacheSkinsSessao = skins;
        poolRef.current = skins;
        iniciarRodadaComPool(skins, moeda);
      } catch (err) {
        setError(err?.message || 'Erro ao carregar skins.');
        setIsLoading(false);
      }
    },
    [iniciarRodadaComPool]
  );

  useEffect(() => {
    carregarSkins(false);

    return () => {
      if (timerTransicaoRef.current) {
        clearTimeout(timerTransicaoRef.current);
        timerTransicaoRef.current = null;
      }
    };
  }, [carregarSkins]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        const moedaSalva = await obterMoedaSelecionada();
        if (!ativo) return;

        if (moedaSalva && moedaSalva !== moedaRef.current) {
          moedaRef.current = moedaSalva;
          setMoedaAtual(moedaSalva);
          setSkinBase((prev) => (prev ? decorarSkinComMoeda(prev, moedaSalva) : null));
          setSkinComparada((prev) => (prev ? decorarSkinComMoeda(prev, moedaSalva) : null));
        }
      })();

      return () => {
        ativo = false;
      };
    }, [])
  );

  const palpitar = useCallback((escolha) => {
    if (faseRef.current !== 'jogando') return;
    const base = skinBaseRef.current;
    const comp = skinComparadaRef.current;
    if (!base || !comp) return;

    const baseVal = Number(base.valorAtual.toFixed(2));
    const compVal = Number(comp.valorAtual.toFixed(2));

    const acertou =
      compVal === baseVal || (escolha === 'maior' ? compVal > baseVal : compVal < baseVal);

    faseRef.current = 'revelando';
    setFase('revelando');
    setResultadoRodada(acertou ? 'acerto' : 'erro');

    if (acertou) {
      const novaPontuacao = pontuacaoRef.current + 1;
      pontuacaoRef.current = novaPontuacao;
      setPontuacao(novaPontuacao);

      if (novaPontuacao > recordeSessao) {
        recordeSessao = novaPontuacao;
        setRecorde(novaPontuacao);
      }

      if (timerTransicaoRef.current) {
        clearTimeout(timerTransicaoRef.current);
      }

      timerTransicaoRef.current = setTimeout(() => {
        const proximaBase = skinComparadaRef.current;
        const novosRecentes = [...recentesRef.current, proximaBase.id];
        const proximaCompRaw = sortearNovaSkin(poolRef.current, proximaBase.id, novosRecentes);
        const proximaComp = decorarSkinComMoeda(proximaCompRaw, moedaRef.current);

        novosRecentes.push(proximaComp.id);
        recentesRef.current = novosRecentes;

        skinBaseRef.current = proximaBase;
        skinComparadaRef.current = proximaComp;
        setSkinBase(proximaBase);
        setSkinComparada(proximaComp);
        setResultadoRodada(null);
        faseRef.current = 'jogando';
        setFase('jogando');
      }, 1400);
    } else {
      if (timerTransicaoRef.current) {
        clearTimeout(timerTransicaoRef.current);
      }

      timerTransicaoRef.current = setTimeout(() => {
        faseRef.current = 'gameover';
        setFase('gameover');
      }, 1400);
    }
  }, []);

  const jogarNovamente = useCallback(() => {
    if (timerTransicaoRef.current) {
      clearTimeout(timerTransicaoRef.current);
      timerTransicaoRef.current = null;
    }

    if (cacheSkinsSessao && cacheSkinsSessao.length >= 2) {
      iniciarRodadaComPool(cacheSkinsSessao, moedaRef.current);
    } else {
      carregarSkins(false);
    }
  }, [iniciarRodadaComPool, carregarSkins]);

  const tentarNovamente = useCallback(() => {
    if (timerTransicaoRef.current) {
      clearTimeout(timerTransicaoRef.current);
      timerTransicaoRef.current = null;
    }

    cacheSkinsSessao = null;
    carregarSkins(true);
  }, [carregarSkins]);

  return {
    skinBase,
    skinComparada,
    pontuacao,
    recorde,
    moedaAtual,
    isLoading,
    error,
    fase,
    resultadoRodada,
    mostrarPrecoComparada: fase !== 'jogando',
    botoesDesabilitados: fase !== 'jogando',
    palpitar,
    jogarNovamente,
    tentarNovamente,
  };
}
