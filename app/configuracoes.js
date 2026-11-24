import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chave compartilhada com o serviço de conversão de moeda
const CHAVE_MOEDA = '@moeda_selecionada';
const MOEDAS_VALIDAS = ['USD', 'BRL', 'EUR'];

const OPCOES_MOEDA = [
  { codigo: 'USD', rotulo: 'Dólar (USD - $)' },
  { codigo: 'BRL', rotulo: 'Real (BRL - R$)' },
  { codigo: 'EUR', rotulo: 'Euro (EUR - €)' },
];

export default function ConfiguracoesScreen() {
  const [moedaSelecionada, setMoedaSelecionada] = useState('USD');
  const [modalMoedaAberto, setModalMoedaAberto] = useState(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);

  // Carrega a moeda salva ao abrir a tela (padrão USD)
  useEffect(() => {
    const carregarMoeda = async () => {
      try {
        const moedaSalva = await AsyncStorage.getItem(CHAVE_MOEDA);
        if (moedaSalva && MOEDAS_VALIDAS.includes(moedaSalva)) {
          setMoedaSelecionada(moedaSalva);
        }
      } catch (erro) {
        // Mantém o padrão USD se não conseguir ler do AsyncStorage
      }
    };

    carregarMoeda();
  }, []);

  // Salva a nova moeda imediatamente no AsyncStorage
  const selecionarMoeda = async (novaMoeda) => {
    try {
      await AsyncStorage.setItem(CHAVE_MOEDA, novaMoeda);
      setMoedaSelecionada(novaMoeda);
      setModalMoedaAberto(false);
    } catch (erro) {
      setModalMoedaAberto(false);
    }
  };

  // Apaga todos os dados locais e restaura o padrão inicial
  const confirmarLimparCache = async () => {
    try {
      await AsyncStorage.clear();
      setMoedaSelecionada('USD');
      setModalConfirmacaoAberto(false);
    } catch (erro) {
      setModalConfirmacaoAberto(false);
    }
  };

  const moedaAtual =
    OPCOES_MOEDA.find((opcao) => opcao.codigo === moedaSelecionada) ||
    OPCOES_MOEDA[0];

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        {/* Cabeçalho simples da tela */}
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Configurações</Text>
          <Text style={styles.subtitulo}>
            Preferências de exibição e dados do aplicativo
          </Text>
        </View>

        {/* Seção 1 — Câmbio / Moeda das Skins */}
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>Câmbio (Moeda)</Text>
          <Text style={styles.descricaoSecao}>
            Escolha a moeda usada nos preços das skins em todo o aplicativo.
          </Text>

          <TouchableOpacity
            style={styles.botaoDropdown}
            activeOpacity={0.7}
            onPress={() => setModalMoedaAberto(true)}
          >
            <Text style={styles.textoDropdown} numberOfLines={1}>
              {moedaAtual.rotulo}
            </Text>
            <Text style={styles.setaDropdown}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Seção 2 — Limpar Cache e Resetar Sessão */}
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>Sessão e Cache</Text>
          <Text style={styles.descricaoSecao}>
            Apaga todas as skins salvas no inventário e reseta a sessão do
            aplicativo.
          </Text>

          <TouchableOpacity
            style={styles.botaoReset}
            activeOpacity={0.7}
            onPress={() => setModalConfirmacaoAberto(true)}
          >
            <Text style={styles.textoBotaoReset}>
              Limpar Cache e Resetar Sessão
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de seleção de Moeda */}
      <Modal
        visible={modalMoedaAberto}
        onRequestClose={() => setModalMoedaAberto(false)}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalListaContainer}>
          <Text style={styles.modalListaTitulo}>Escolher Moeda</Text>
          <FlatList
            style={styles.listaModal}
            data={OPCOES_MOEDA}
            keyExtractor={(item) => item.codigo}
            renderItem={({ item }) => {
              const ativa = item.codigo === moedaSelecionada;
              return (
                <TouchableOpacity
                  style={[
                    styles.opcaoModal,
                    ativa && styles.opcaoModalAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => selecionarMoeda(item.codigo)}
                >
                  <Text
                    style={[
                      styles.textoOpcaoModal,
                      ativa && styles.textoOpcaoModalAtiva,
                    ]}
                  >
                    {item.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.botaoFecharModal}
            activeOpacity={0.7}
            onPress={() => setModalMoedaAberto(false)}
          >
            <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Modal de confirmação antes de apagar tudo */}
      <Modal
        visible={modalConfirmacaoAberto}
        onRequestClose={() => setModalConfirmacaoAberto(false)}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalConteudo}>
            <View style={styles.caixaAvisoModal}>
              <Text style={styles.modalTitulo}>
                Atenção: isso vai apagar tudo!
              </Text>
              <Text style={styles.modalDescricao}>
                Todas as skins do seu inventário, o cache e as configurações da
                sessão serão apagados. Essa ação não pode ser desfeita.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botaoConfirmarModal}
              activeOpacity={0.7}
              onPress={confirmarLimparCache}
            >
              <Text style={styles.textoBotaoConfirmarModal}>
                Sim, apagar tudo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoCancelarModal}
              activeOpacity={0.7}
              onPress={() => setModalConfirmacaoAberto(false)}
            >
              <Text style={styles.textoBotaoCancelarModal}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  cabecalho: {
    marginBottom: 16,
  },
  titulo: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#2B6CB0',
    fontSize: 14,
    marginTop: 4,
  },
  secao: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  tituloSecao: {
    color: '#1E4C8A',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  descricaoSecao: {
    color: '#1E3A5F',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  botaoDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 46,
  },
  textoDropdown: {
    flex: 1,
    color: '#1E4C8A',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 8,
  },
  setaDropdown: {
    color: '#1E4C8A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalListaContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalListaTitulo: {
    color: '#1E4C8A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  listaModal: {
    flex: 1,
  },
  opcaoModal: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#68A3E5',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  opcaoModalAtiva: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  textoOpcaoModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: '600',
  },
  textoOpcaoModalAtiva: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botaoFecharModal: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotaoFecharModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoReset: {
    backgroundColor: '#F58220',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotaoReset: {
    color: '#0F1923',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalConteudo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  caixaAvisoModal: {
    backgroundColor: '#FFF3E8',
    borderWidth: 1,
    borderColor: '#F58220',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  modalTitulo: {
    color: '#C95F08',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescricao: {
    color: '#0F1923',
    fontSize: 15,
    lineHeight: 22,
  },
  botaoConfirmarModal: {
    backgroundColor: '#F58220',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  textoBotaoConfirmarModal: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoCancelarModal: {
    backgroundColor: '#EBF4FC',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotaoCancelarModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
