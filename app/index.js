import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InicioScreen() {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        {/* Caixa simples de título no topo */}
        <View style={styles.topo}>
          <Text style={styles.titulo}>CS2 SkinWiki</Text>
          <Text style={styles.subtitulo}>Catálogo e ferramentas de CS2</Text>
        </View>

        {/* Botão principal em laranja CS2 */}
        <TouchableOpacity style={styles.botaoPrincipal} activeOpacity={0.7} onPress={() => router.push('/catalogo')}>
          <Text style={styles.textoBotaoPrincipal}>Catálogo</Text>
        </TouchableOpacity>

        {/* Botões simples das demais telas */}
        <TouchableOpacity style={styles.botao} activeOpacity={0.7} onPress={() => router.push('/caixas')}>
          <Text style={styles.textoBotao}>Abertura de Caixas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} activeOpacity={0.7} onPress={() => router.push('/contrato')}>
          <Text style={styles.textoBotao}>Contrato de Trocas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} activeOpacity={0.7} onPress={() => router.push('/inventario')}>
          <Text style={styles.textoBotao}>Inventário</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} activeOpacity={0.7} onPress={() => router.push('/higherlower')}>
          <Text style={styles.textoBotao}>Higher or Lower</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} activeOpacity={0.7} onPress={() => router.push('/configuracoes')}>
          <Text style={styles.textoBotao}>Configurações</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  conteudo: {
    padding: 16,
    paddingBottom: 24,
  },
  topo: {
    backgroundColor: '#1E4C8A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#EBF4FC',
    fontSize: 14,
    marginTop: 4,
  },
  botaoPrincipal: {
    backgroundColor: '#F58220',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  textoBotaoPrincipal: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botao: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
