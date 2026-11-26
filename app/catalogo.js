import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SkinCard from '../components/SkinCard';
import { CORES } from '../constants/cs2Theme';

const URL_API_SKINS =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const RARIDADES = [
  'Todas',
  'Consumer Grade',
  'Industrial Grade',
  'Mil-Spec Grade',
  'Restricted',
  'Classified',
  'Covert',
];

export default function CatalogoScreen() {
  const [skins, setSkins] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [raridadeSelecionada, setRaridadeSelecionada] = useState('Todas');

  const carregarSkins = () => {
    setCarregando(true);
    setErro(null);
    fetch(URL_API_SKINS)
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar o catálogo.');
        return res.json();
      })
      .then((dados) => setSkins(Array.isArray(dados) ? dados : []))
      .catch((err) => setErro(err.message || 'Erro de conexão.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarSkins();
  }, []);

  const skinsFiltradas = skins.filter((item) => {
    const termo = busca.trim().toLowerCase();
    const nomeSkin = (item.name || '').toLowerCase();
    const nomeArma = (item.weapon?.name || '').toLowerCase();
    const bateBusca = termo === '' || nomeSkin.includes(termo) || nomeArma.includes(termo);
    const bateRaridade =
      raridadeSelecionada === 'Todas' || item.rarity?.name === raridadeSelecionada;
    return bateBusca && bateRaridade;
  });

  if (carregando) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color={CORES.azulPrincipal} />
        <Text style={styles.textoStatus}>Carregando skins...</Text>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoErro}>{erro}</Text>
        <TouchableOpacity style={styles.botaoTentar} activeOpacity={0.7} onPress={carregarSkins}>
          <Text style={styles.textoBotaoTentar}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.topo}>
        <View style={styles.linhaBusca}>
          <TextInput
            style={styles.inputBusca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar skin ou arma..."
            placeholderTextColor={CORES.textoSecundario}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity style={styles.botaoLimpar} activeOpacity={0.7} onPress={() => setBusca('')}>
              <Text style={styles.textoLimpar}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linhaChips}>
          {RARIDADES.map((raridade) => {
            const ativa = raridade === raridadeSelecionada;
            return (
              <TouchableOpacity
                key={raridade}
                style={[styles.chip, ativa && styles.chipAtivo]}
                activeOpacity={0.7}
                onPress={() => setRaridadeSelecionada(raridade)}
              >
                <Text style={[styles.textoChip, ativa && styles.textoChipAtivo]}>{raridade}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={skinsFiltradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.conteudoLista}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        renderItem={({ item }) => (
          <SkinCard
            item={item}
            onPress={() =>
              router.push({ pathname: '/detalhes', params: { skin: JSON.stringify(item) } })
            }
          />
        )}
        ListEmptyComponent={<Text style={styles.textoVazio}>Nenhuma skin encontrada.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  centralizado: { flex: 1, backgroundColor: CORES.fundo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoStatus: { marginTop: 12, fontSize: 15, color: CORES.textoSecundario },
  textoErro: { fontSize: 15, color: CORES.erro, textAlign: 'center', marginBottom: 14 },
  botaoTentar: { backgroundColor: CORES.azulPrincipal, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  textoBotaoTentar: { color: CORES.branco, fontSize: 14, fontWeight: 'bold' },
  topo: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 8 },
  linhaBusca: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputBusca: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: CORES.texto,
  },
  botaoLimpar: {
    marginLeft: 8,
    backgroundColor: CORES.azulClaro,
    borderWidth: 1,
    borderColor: CORES.azulBorda,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  textoLimpar: { color: CORES.azulPrincipal, fontSize: 13, fontWeight: '600' },
  linhaChips: { marginBottom: 4 },
  chip: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  chipAtivo: { backgroundColor: CORES.azulPrincipal, borderColor: CORES.azulPrincipal },
  textoChip: { fontSize: 13, color: CORES.texto },
  textoChipAtivo: { color: CORES.branco, fontWeight: '600' },
  conteudoLista: { paddingHorizontal: 14, paddingBottom: 20 },
  textoVazio: { textAlign: 'center', marginTop: 40, fontSize: 15, color: CORES.textoSecundario },
});
