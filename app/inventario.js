import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { converterValorMoeda, formatarPrecoMoeda, obterMoedaSelecionada } from '../services/priceService';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';

// Extrai o timestamp para ordenar as skins mais recentes primeiro
const obterTimestamp = (item) => {
  if (typeof item?.timestamp === 'number') return item.timestamp;
  if (typeof item?.criadoEm === 'number') return item.criadoEm;
  const match = String(item?.idInventario || item?.idUnico || '').match(/^(\d{12,16})/);
  return match ? Number(match[1]) : 0;
};

export default function InventarioScreen() {
  const [itens, setItens] = useState([]);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const carregarInventario = async () => {
        try {
          const [dados, moeda] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY_INVENTARIO),
            obterMoedaSelecionada(),
          ]);
          setMoedaAtual(moeda || 'USD');
          const lista = dados ? JSON.parse(dados) : [];
          setItens(
            Array.isArray(lista)
              ? [...lista].sort((a, b) => obterTimestamp(b) - obterTimestamp(a))
              : []
          );
        } catch (err) {
          setItens([]);
        } finally {
          setIsLoading(false);
        }
      };

      carregarInventario();
    }, [])
  );

  const obterValorNaMoedaAtual = (item) => {
    const moedaItem = item.moeda || 'USD';
    if (moedaItem === moedaAtual && typeof item.valorNumerico === 'number') {
      return item.valorNumerico;
    }
    if (typeof item.valorUsd === 'number') {
      return converterValorMoeda(item.valorUsd, 'USD', moedaAtual);
    }
    const valorBase = typeof item.valorNumerico === 'number' ? item.valorNumerico : 0;
    return converterValorMoeda(valorBase, moedaItem, moedaAtual);
  };

  const confirmarRemocao = (indexAlvo, nomeSkin) => {
    Alert.alert('Remover skin', `Deseja remover "${nomeSkin}" do inventário?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const novaLista = itens.filter((_, idx) => idx !== indexAlvo);
          setItens(novaLista);
          try {
            await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(novaLista));
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível remover a skin.');
          }
        },
      },
    ]);
  };

  const confirmarLimpeza = () => {
    Alert.alert('Limpar tudo', 'Deseja remover todas as skins do inventário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar tudo',
        style: 'destructive',
        onPress: async () => {
          setItens([]);
          try {
            await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify([]));
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível limpar o inventário.');
          }
        },
      },
    ]);
  };

  const valorTotal = itens.reduce((soma, item) => soma + obterValorNaMoedaAtual(item), 0);

  const renderizarItem = ({ item, index }) => {
    const nomeRaridade = item.rarity?.name || 'Comum';
    const corRaridade = item.rarity?.color || CORES.raridades?.[nomeRaridade] || CORES.azulBorda;
    const ehStatTrak = Boolean(item.isStatTrak || item.stattrak);
    const nomeLimpo = (item.name || '').replace(/[\u2122\u2605]/g, '').trim();
    const nomeExibido = `${ehStatTrak ? 'ST ' : ''}${nomeLimpo}`;

    return (
      <View style={[styles.cardItem, { borderLeftColor: corRaridade }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.imagemSkin} resizeMode="contain" />
        ) : (
          <View style={[styles.imagemSkin, styles.semImagemBox]}>
            <Text style={styles.semImagemTexto}>CS2</Text>
          </View>
        )}

        <View style={styles.infoItem}>
          <Text style={styles.nomeSkin} numberOfLines={1}>{nomeExibido}</Text>
          <Text style={[styles.raridade, { color: corRaridade }]} numberOfLines={1}>
            {nomeRaridade}
          </Text>
          <View style={styles.rodapeItem}>
            <Text style={styles.preco}>
              {formatarPrecoMoeda(obterValorNaMoedaAtual(item), moedaAtual)}
            </Text>
            <TouchableOpacity onPress={() => confirmarRemocao(index, nomeExibido)}>
              <Text style={styles.textoRemover}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && itens.length === 0) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.cardResumo}>
        <View>
          <Text style={styles.rotuloResumo}>Valor total</Text>
          <Text style={styles.valorResumo}>{formatarPrecoMoeda(valorTotal, moedaAtual)}</Text>
          <Text style={styles.quantidade}>
            {itens.length} {itens.length === 1 ? 'skin' : 'skins'}
          </Text>
        </View>

        {itens.length > 0 && (
          <TouchableOpacity style={styles.botaoLimpar} onPress={confirmarLimpeza}>
            <Text style={styles.textoLimpar}>Limpar tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item, index) => String(item.idInventario || item.id || index)}
        renderItem={renderizarItem}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Text style={styles.textoVazio}>Seu inventário está vazio.</Text>
            <TouchableOpacity style={styles.botaoCaixas} onPress={() => router.push('/caixas')}>
              <Text style={styles.textoBotaoCaixas}>Abrir Caixas</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CORES.fundo },
  cardResumo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda,
    borderRadius: 10, marginHorizontal: 16, marginTop: 14, padding: 14,
  },
  rotuloResumo: { fontSize: 13, color: CORES.textoSecundario },
  valorResumo: { fontSize: 21, fontWeight: '700', color: CORES.sucesso, marginTop: 2 },
  quantidade: { fontSize: 13, color: CORES.textoSecundario, marginTop: 4 },
  botaoLimpar: {
    backgroundColor: CORES.erroClaro, borderWidth: 1, borderColor: CORES.erro,
    borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10,
  },
  textoLimpar: { color: CORES.erro, fontSize: 12, fontWeight: '700' },
  lista: { padding: 16, gap: 10 },
  cardItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.branco,
    borderWidth: 1, borderColor: CORES.borda, borderLeftWidth: 4, borderRadius: 10, padding: 10,
  },
  imagemSkin: { width: 56, height: 42, borderRadius: 6, backgroundColor: CORES.fundo, marginRight: 12 },
  semImagemBox: { justifyContent: 'center', alignItems: 'center' },
  semImagemTexto: { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario },
  infoItem: { flex: 1 },
  nomeSkin: { fontSize: 14, fontWeight: '700', color: CORES.texto },
  raridade: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  rodapeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  preco: { fontSize: 14, fontWeight: '700', color: CORES.sucesso },
  textoRemover: { fontSize: 13, fontWeight: '600', color: CORES.erro },
  vazio: { alignItems: 'center', paddingVertical: 40 },
  textoVazio: { fontSize: 15, color: CORES.textoSecundario, marginBottom: 14 },
  botaoCaixas: { backgroundColor: CORES.azulPrincipal, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  textoBotaoCaixas: { color: CORES.branco, fontSize: 14, fontWeight: '700' },
});
