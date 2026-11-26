import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CartaoMaiorMenor from '../components/CartaoMaiorMenor';
import useHigherOrLower from '../hooks/useHigherOrLower';
import {
  obterSaldoBRL,
  adicionarSaldoBRL,
  obterUpgrades,
  obterEfeitosUpgrades,
  formatarBRLNaMoeda,
} from '../services/economyService';
import { obterMoedaSelecionada } from '../services/priceService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_RECORDE = '@higher_lower_recorde_historico';

export default function TelaMaiorMenor() {
  const {
    skinBase,
    skinComparada,
    pontuacao,
    recorde: recordeSessao,
    isLoading,
    error,
    fase,
    resultadoRodada,
    mostrarPrecoComparada,
    botoesDesabilitados,
    palpitar,
    jogarNovamente,
    tentarNovamente,
  } = useHigherOrLower();

  const [recordePersistido, setRecordePersistido] = useState(0);
  const [saldoBRL, setSaldoBRL] = useState(0);
  const [bonusPorAcerto, setBonusPorAcerto] = useState(0);
  const [ganhoPartida, setGanhoPartida] = useState(0);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const ultimaPontuacaoPremiadaRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      Promise.all([obterSaldoBRL(), obterUpgrades(), obterMoedaSelecionada()])
        .then(([saldo, upgrades, moeda]) => {
          if (!ativo) return;
          setSaldoBRL(saldo);
          setBonusPorAcerto(obterEfeitosUpgrades(upgrades).bonusHigherLowerBRL);
          setMoedaAtual(moeda);
        })
        .catch(() => {});

      return () => {
        ativo = false;
      };
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_RECORDE)
      .then((valor) => {
        const numero = parseInt(valor, 10);
        if (!isNaN(numero)) setRecordePersistido(numero);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pontuacao === 0) {
      ultimaPontuacaoPremiadaRef.current = 0;
      setGanhoPartida(0);
      return;
    }

    if (pontuacao > ultimaPontuacaoPremiadaRef.current) {
      const acertosNovos = pontuacao - ultimaPontuacaoPremiadaRef.current;
      ultimaPontuacaoPremiadaRef.current = pontuacao;

      if (bonusPorAcerto > 0) {
        const ganho = bonusPorAcerto * acertosNovos;
        setGanhoPartida((prev) => prev + ganho);
        adicionarSaldoBRL(ganho)
          .then((novoSaldo) => {
            if (typeof novoSaldo === 'number') {
              setSaldoBRL(novoSaldo);
            } else {
              setSaldoBRL((prev) => prev + ganho);
            }
          })
          .catch(() => {});
      }
    }
  }, [pontuacao, bonusPorAcerto]);

  useEffect(() => {
    const maior = Math.max(recordeSessao, pontuacao);
    if (maior > recordePersistido) {
      setRecordePersistido(maior);
      AsyncStorage.setItem(STORAGE_KEY_RECORDE, String(maior)).catch(() => {});
    }
  }, [recordeSessao, pontuacao, recordePersistido]);

  const recordeExibido = Math.max(recordePersistido, recordeSessao, pontuacao);
  const bateuNovoRecorde = pontuacao >= recordeExibido && pontuacao > 0;

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centro}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
        <Text style={styles.textoCarregando}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centro}>
        <Text style={styles.textoErro}>Erro ao carregar.</Text>
        <TouchableOpacity style={styles.botaoAzul} activeOpacity={0.7} onPress={tentarNovamente}>
          <Text style={styles.textoBotao}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <View style={styles.placar}>
          <View style={styles.placarLinha}>
            <Text style={styles.textoPlacar}>Pontos: {pontuacao}</Text>
            <Text style={styles.textoPlacar}>Recorde: {recordeExibido}</Text>
          </View>
          <View style={styles.placarEconomia}>
            <Text style={styles.textoSaldo}>Saldo: {formatarBRLNaMoeda(saldoBRL, moedaAtual)}</Text>
            {bonusPorAcerto > 0 && (
              <Text style={styles.textoBonus}>Bônus por acerto: +{formatarBRLNaMoeda(bonusPorAcerto, moedaAtual)}</Text>
            )}
          </View>
        </View>

        {fase === 'revelando' && resultadoRodada && (
          <Text style={[styles.feedback, resultadoRodada === 'acerto' ? styles.textoAcerto : styles.textoErroFeedback]}>
            {resultadoRodada === 'acerto'
              ? bonusPorAcerto > 0
                ? `Acertou! +${formatarBRLNaMoeda(bonusPorAcerto, moedaAtual)}`
                : 'Acertou!'
              : 'Errou!'}
          </Text>
        )}

        <CartaoMaiorMenor skin={skinBase} />
        <Text style={styles.vs}>VS</Text>
        <CartaoMaiorMenor
          skin={skinComparada}
          ocultarPreco={!mostrarPrecoComparada}
          destaqueEstado={resultadoRodada}
        />

        <View style={styles.botoes}>
          <TouchableOpacity
            style={[styles.botao, styles.botaoMaisCara, botoesDesabilitados && styles.desabilitado]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('maior')}
          >
            <Text style={styles.textoBotao}>Mais Cara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoMaisBarata, botoesDesabilitados && styles.desabilitado]}
            activeOpacity={0.7}
            disabled={botoesDesabilitados}
            onPress={() => palpitar('menor')}
          >
            <Text style={styles.textoBotao}>Mais Barata</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={fase === 'gameover'} transparent animationType="fade" onRequestClose={jogarNovamente}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Fim de Jogo</Text>
            <Text style={styles.modalTexto}>Pontuação: {pontuacao}</Text>
            <Text style={styles.modalTexto}>Recorde: {recordeExibido}</Text>
            {ganhoPartida > 0 && (
              <Text style={styles.modalGanho}>Ganho na partida: {formatarBRLNaMoeda(ganhoPartida, moedaAtual)}</Text>
            )}
            {bateuNovoRecorde && <Text style={styles.novoRecorde}>Novo recorde!</Text>}

            <TouchableOpacity style={[styles.botaoAzul, styles.botaoModal]} activeOpacity={0.7} onPress={jogarNovamente}>
              <Text style={styles.textoBotao}>Jogar Novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  centro: { flex: 1, backgroundColor: CORES.fundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCarregando: { marginTop: 10, fontSize: 15, color: CORES.texto },
  textoErro: { fontSize: 16, color: CORES.erro, marginBottom: 14, textAlign: 'center' },
  conteudo: { padding: 16 },
  placar: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  placarLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placarEconomia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
    paddingTop: 6,
  },
  textoPlacar: { fontSize: 15, fontWeight: 'bold', color: CORES.texto },
  textoSaldo: { fontSize: 13, fontWeight: 'bold', color: CORES.sucesso },
  textoBonus: { fontSize: 12, color: CORES.textoSecundario },
  feedback: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  textoAcerto: { color: CORES.sucesso },
  textoErroFeedback: { color: CORES.erro },
  vs: { fontSize: 15, fontWeight: 'bold', color: CORES.textoSecundario, textAlign: 'center', marginVertical: 10 },
  botoes: { flexDirection: 'row', gap: 12, marginTop: 16 },
  botao: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  botaoMaisCara: { backgroundColor: CORES.sucesso },
  botaoMaisBarata: { backgroundColor: CORES.erro },
  desabilitado: { opacity: 0.5 },
  botaoAzul: { backgroundColor: CORES.azulPrincipal, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  botaoModal: { width: '100%', alignItems: 'center', marginTop: 16 },
  textoBotao: { color: CORES.branco, fontSize: 15, fontWeight: 'bold' },
  modalFundo: { flex: 1, backgroundColor: CORES.modalFundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 320, backgroundColor: CORES.branco, borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: CORES.texto, marginBottom: 10 },
  modalTexto: { fontSize: 16, color: CORES.texto, marginBottom: 4 },
  modalGanho: { fontSize: 15, fontWeight: 'bold', color: CORES.sucesso, marginTop: 4 },
  novoRecorde: { fontSize: 15, fontWeight: 'bold', color: CORES.sucesso, marginTop: 6 },
});
