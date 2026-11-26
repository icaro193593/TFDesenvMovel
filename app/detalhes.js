import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CORES } from '../constants/cs2Theme';

const STORAGE_KEY_INVENTARIO = '@inventario_skins';

function lerSkinParam(paramSkin) {
  if (!paramSkin) return null;
  const bruto = Array.isArray(paramSkin) ? paramSkin[0] : paramSkin;
  if (typeof bruto === 'object') return bruto;
  try {
    const parsed = JSON.parse(bruto);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export default function DetalhesScreen() {
  const params = useLocalSearchParams();
  const [salvando, setSalvando] = useState(false);
  const [adicionado, setAdicionado] = useState(false);

  const skin = lerSkinParam(params.skin);
  const voltar = () => (router.canGoBack() ? router.back() : router.push('/catalogo'));

  if (!skin) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoVazio}>Nenhuma skin selecionada.</Text>
        <TouchableOpacity style={styles.botaoVoltar} activeOpacity={0.7} onPress={voltar}>
          <Text style={styles.textoBotaoVoltar}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const nome = skin.name || 'Skin sem nome';
  const arma = skin.weapon?.name || '';
  const categoria = skin.category?.name || '';
  const linhaArma = [arma, categoria].filter(Boolean).join(' - ') || 'CS2';
  const nomeRaridade = skin.rarity?.name || 'Comum';
  const corRaridade = CORES.raridades?.[nomeRaridade] || skin.rarity?.color || CORES.azulPrincipal;

  const adicionarAoInventario = async () => {
    if (salvando || adicionado) return;
    setSalvando(true);
    try {
      const dados = await AsyncStorage.getItem(STORAGE_KEY_INVENTARIO);
      const listaAtual = dados ? JSON.parse(dados) : [];
      const listaSegura = Array.isArray(listaAtual) ? listaAtual : [];
      const ehFacaOuLuva =
        categoria === 'Knives' || categoria === 'Gloves' || nome.includes('Knife') || nome.includes('Gloves');

      const novoItem = {
        idInventario: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        id: String(skin.id || ''),
        name: String(nome),
        image: skin.image ? String(skin.image) : '',
        weapon: { name: arma },
        category: { name: categoria },
        rarity: { name: nomeRaridade, color: corRaridade },
        floatValor: 0.25,
        wearNome: 'Field-Tested',
        stattrak: skin.stattrak === true,
        isStatTrak: skin.stattrak === true,
        isFacaOuLuva: ehFacaOuLuva,
        collections: Array.isArray(skin.collections) ? skin.collections : undefined,
        timestamp: Date.now(),
        dataObtencao: new Date().toLocaleDateString('pt-BR'),
        nomeCaixaOrigem: 'Catálogo',
      };

      await AsyncStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify([novoItem, ...listaSegura]));
      setAdicionado(true);
      Alert.alert('Adicionado', `A skin "${nome}" foi salva no seu inventário.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a skin ao inventário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.cardImagem}>
        {skin.image ? (
          <Image source={{ uri: skin.image }} style={styles.imagem} resizeMode="contain" />
        ) : (
          <View style={styles.semImagem}>
            <Text style={styles.textoSemImagem}>Sem imagem</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.nome}>{nome}</Text>
        <Text style={styles.armaCategoria}>{linhaArma}</Text>
        <Text style={[styles.raridade, { color: corRaridade }]}>{nomeRaridade}</Text>
        {skin.stattrak === true && <Text style={styles.stattrak}>Disponível em StatTrak</Text>}
      </View>

      <TouchableOpacity
        style={[styles.botaoPrincipal, adicionado && styles.botaoAdicionado]}
        activeOpacity={0.7}
        onPress={adicionarAoInventario}
        disabled={salvando || adicionado}
      >
        <Text style={styles.textoBotaoPrincipal}>
          {adicionado ? 'Adicionado' : 'Adicionar ao Inventário'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botaoVoltar} activeOpacity={0.7} onPress={voltar}>
        <Text style={styles.textoBotaoVoltar}>Voltar</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo, padding: 16 },
  centralizado: { flex: 1, backgroundColor: CORES.fundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoVazio: { fontSize: 16, color: CORES.textoSecundario, marginBottom: 16 },
  cardImagem: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 14 },
  imagem: { width: '100%', height: 170 },
  semImagem: { height: 170, justifyContent: 'center', alignItems: 'center' },
  textoSemImagem: { fontSize: 14, color: CORES.textoSecundario },
  cardInfo: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, borderRadius: 8, padding: 16, marginBottom: 16 },
  nome: { fontSize: 20, fontWeight: 'bold', color: CORES.texto },
  armaCategoria: { fontSize: 14, color: CORES.textoSecundario, marginTop: 4 },
  raridade: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  stattrak: { fontSize: 13, fontWeight: '600', color: CORES.aviso, marginTop: 8 },
  botaoPrincipal: { backgroundColor: CORES.azulPrincipal, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  botaoAdicionado: { backgroundColor: CORES.sucesso },
  textoBotaoPrincipal: { color: CORES.branco, fontSize: 15, fontWeight: 'bold' },
  botaoVoltar: { backgroundColor: CORES.branco, borderWidth: 1, borderColor: CORES.borda, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  textoBotaoVoltar: { color: CORES.texto, fontSize: 15, fontWeight: '600' },
});
