import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CORES } from '../constants/cs2Theme';

// Lista das telas principais do aplicativo
const OPCOES_MENU = [
  { titulo: 'Catálogo', rota: '/catalogo' },
  { titulo: 'Abertura de Caixas', rota: '/caixas' },
  { titulo: 'Contrato de Trocas', rota: '/contrato' },
  { titulo: 'Inventário', rota: '/inventario' },
  { titulo: 'Higher or Lower', rota: '/higherlower' },
  { titulo: 'Configurações', rota: '/configuracoes' },
];

export default function InicioScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* Cabeçalho simples de apresentação do app */}
        <View style={styles.caixaTopo}>
          <Text style={styles.titulo}>Garbskins CS2</Text>
          <Text style={styles.subtitulo}>Catálogo e ferramentas de CS2</Text>
        </View>

        {/* Botões de navegação para as funcionalidades */}
        <View style={styles.listaBotoes}>
          {OPCOES_MENU.map((item) => (
            <TouchableOpacity
              key={item.rota}
              style={styles.botaoMenu}
              activeOpacity={0.7}
              onPress={() => router.push(item.rota)}
            >
              <Text style={styles.textoBotao}>{item.titulo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  conteudo: {
    padding: 16,
  },
  caixaTopo: {
    backgroundColor: CORES.azulPrincipal,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CORES.branco,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 15,
    color: CORES.azulClaro,
  },
  listaBotoes: {
    gap: 12,
  },
  botaoMenu: {
    backgroundColor: CORES.azulClaro,
    borderWidth: 1,
    borderColor: CORES.azulBorda,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CORES.azulPrincipal,
  },
});
