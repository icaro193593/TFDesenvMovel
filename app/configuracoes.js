import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  obterMoedaSelecionada,
  salvarMoedaSelecionada,
} from '../services/priceService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';
const STORAGE_KEY_RECORDE = '@higher_lower_recorde_historico';
const MOEDAS = ['USD', 'BRL', 'EUR'];

export default function ConfiguracoesScreen() {
  const [moedaSelecionada, setMoedaSelecionada] = useState('USD');
  const [totalSkins, setTotalSkins] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const carregarDados = async () => {
        try {
          const [moeda, dados] = await Promise.all([
            obterMoedaSelecionada(),
            AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
          ]);
          setMoedaSelecionada(moeda || 'USD');
          const lista = dados ? JSON.parse(dados) : [];
          setTotalSkins(Array.isArray(lista) ? lista.length : 0);
        } catch (err) {
          setTotalSkins(0);
        }
      };

      carregarDados();
    }, [])
  );

  const selecionarMoeda = async (moeda) => {
    const salva = await salvarMoedaSelecionada(moeda);
    setMoedaSelecionada(salva);
  };

  const limparDados = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY_INVENTARIO, STORAGE_KEY_RECORDE]);
      setTotalSkins(0);
      Alert.alert('Pronto', 'Dados locais removidos com sucesso.');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível limpar os dados locais.');
    }
  };

  const confirmarLimpeza = () => {
    Alert.alert(
      'Limpar dados',
      'Deseja apagar todas as skins do inventário e o recorde salvo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar dados', style: 'destructive', onPress: limparDados },
      ]
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Moeda</Text>
          <View style={styles.linhaMoedas}>
            {MOEDAS.map((moeda) => {
              const ativa = moeda === moedaSelecionada;
              return (
                <TouchableOpacity
                  key={moeda}
                  style={[styles.botaoMoeda, ativa ? styles.moedaAtiva : styles.moedaInativa]}
                  onPress={() => selecionarMoeda(moeda)}
                >
                  <Text style={[styles.textoMoeda, ativa ? styles.textoAtivo : styles.textoInativo]}>
                    {moeda}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.titulo}>Dados</Text>
          <Text style={styles.infoDados}>Skins no inventário: {totalSkins}</Text>
          <TouchableOpacity style={styles.botaoLimpar} onPress={confirmarLimpeza}>
            <Text style={styles.textoBotaoLimpar}>Limpar dados</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.rodape}>Garbskins CS2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  conteudo: { padding: 16, gap: 16 },
  card: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 16,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: CORES.texto, marginBottom: 12 },
  linhaMoedas: { flexDirection: 'row', gap: 10 },
  botaoMoeda: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.azulBorda,
  },
  moedaAtiva: { backgroundColor: CORES.azulPrincipal },
  moedaInativa: { backgroundColor: CORES.azulClaro },
  textoMoeda: { fontSize: 14, fontWeight: '700' },
  textoAtivo: { color: CORES.branco },
  textoInativo: { color: CORES.azulPrincipal },
  infoDados: { fontSize: 14, color: CORES.texto, marginBottom: 14 },
  botaoLimpar: {
    backgroundColor: CORES.erro,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  textoBotaoLimpar: { color: CORES.branco, fontSize: 14, fontWeight: '700' },
  rodape: { fontSize: 12, color: CORES.textoSecundario, textAlign: 'center', marginTop: 8 },
});
