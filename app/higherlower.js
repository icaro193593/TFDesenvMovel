import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HigherLowerCard from '../components/HigherLowerCard';
import useHigherOrLower from '../hooks/useHigherOrLower';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_RECORDE = '@higher_lower_recorde_historico';

// Tela principal do minigame Higher or Lower
export default function HigherLowerScreen() {
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

  // Carrega o recorde salvo no aparelho ao abrir a tela
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_RECORDE)
      .then((valor) => {
        const numero = parseInt(valor, 10);
        if (!isNaN(numero)) setRecordePersistido(numero);
      })
      .catch(() => {});
  }, []);

  // Salva o novo recorde sempre que o jogador superar a marca anterior
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
          <Text style={styles.textoPlacar}>Pontos: {pontuacao}</Text>
          <Text style={styles.textoPlacar}>Recorde: {recordeExibido}</Text>
        </View>

        {fase === 'revelando' && resultadoRodada && (
          <Text style={[styles.feedback, resultadoRodada === 'acerto' ? styles.textoAcerto : styles.textoErroFeedback]}>
            {resultadoRodada === 'acerto' ? 'Acertou!' : 'Errou!'}
          </Text>
        )}

        <HigherLowerCard skin={skinBase} />
        <Text style={styles.vs}>VS</Text>
        <HigherLowerCard
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  textoPlacar: { fontSize: 15, fontWeight: 'bold', color: CORES.texto },
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
  novoRecorde: { fontSize: 15, fontWeight: 'bold', color: CORES.sucesso, marginTop: 6 },
});
