import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartaoSkin from '../components/CartaoSkin';

const URL_API_SKINS =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const CATEGORIAS = [
  'Todas',
  'Pistols',
  'Rifles',
  'SMGs',
  'Heavy',
  'Knives',
  'Gloves',
  'Equipment',
];

const RARIDADES = [
  'Todas',
  'Consumer Grade',
  'Industrial Grade',
  'Mil-Spec Grade',
  'Restricted',
  'Classified',
  'Covert',
  'Contraband',
  'Extraordinary',
];

export default function TelaCatalogo() {

  const [skins, setSkins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  const [raridadeSelecionada, setRaridadeSelecionada] = useState('Todas');
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [modalRaridadeAberto, setModalRaridadeAberto] = useState(false);

  const carregarSkins = () => {
    setIsLoading(true);
    setError(null);

    fetch(URL_API_SKINS)
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error('Erro ao carregar as skins.');
        }
        return resposta.json();
      })
      .then((dados) => {
        setSkins(dados);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    carregarSkins();
  }, []);

  const limparFiltros = () => {
    setBusca('');
    setCategoriaSelecionada('Todas');
    setRaridadeSelecionada('Todas');
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.textoStatus}>Carregando skins do CS2...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centralizado}>
        <Text style={styles.textoErro}>{error}</Text>
        <TouchableOpacity
          style={styles.botaoAcao}
          activeOpacity={0.7}
          onPress={carregarSkins}
        >
          <Text style={styles.textoBotaoAcao}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const skinsFiltradas = skins.filter((item) => {
    const termo = busca.trim().toLowerCase();
    const nomeSkin = item.name ? item.name.toLowerCase() : '';
    const nomeArma = item.weapon?.name ? item.weapon.name.toLowerCase() : '';

    const bateBusca =
      termo === '' || nomeSkin.includes(termo) || nomeArma.includes(termo);
    const bateCategoria =
      categoriaSelecionada === 'Todas' ||
      item.category?.name === categoriaSelecionada;
    const bateRaridade =
      raridadeSelecionada === 'Todas' ||
      item.rarity?.name === raridadeSelecionada;

    return bateBusca && bateCategoria && bateRaridade;
  });

  const textoContador =
    skinsFiltradas.length === 1
      ? '1 skin encontrada'
      : `${skinsFiltradas.length} skins encontradas`;

  const categoriaFiltrada = categoriaSelecionada !== 'Todas';
  const raridadeFiltrada = raridadeSelecionada !== 'Todas';

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>

      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Catálogo de Skins</Text>
        <Text style={styles.contador}>{textoContador}</Text>
      </View>

      <View style={styles.barraBusca}>
        <TextInput
          style={styles.campoBusca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por skin ou arma..."
          placeholderTextColor="#5D79AE"
        />
        {busca.length > 0 && (
          <TouchableOpacity
            style={styles.botaoLimpar}
            activeOpacity={0.7}
            onPress={() => setBusca('')}
          >
            <Text style={styles.textoLimpar}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.linhaFiltros}>
        <View style={styles.colunaFiltro}>
          <Text style={styles.rotuloFiltro}>Categoria</Text>
          <TouchableOpacity
            style={[
              styles.botaoDropdown,
              categoriaFiltrada
                ? styles.dropdownCategoriaAtivo
                : styles.dropdownCategoriaPadrao,
            ]}
            activeOpacity={0.7}
            onPress={() => setModalCategoriaAberto(true)}
          >
            <Text
              style={[
                styles.textoDropdown,
                categoriaFiltrada
                  ? styles.textoDropdownCategoriaAtivo
                  : styles.textoDropdownCategoria,
              ]}
              numberOfLines={1}
            >
              {categoriaSelecionada}
            </Text>
            <Text
              style={[
                styles.setaDropdown,
                categoriaFiltrada
                  ? styles.textoDropdownCategoriaAtivo
                  : styles.textoDropdownCategoria,
              ]}
            >
              ▼
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.colunaFiltro}>
          <Text style={styles.rotuloFiltro}>Raridade</Text>
          <TouchableOpacity
            style={[
              styles.botaoDropdown,
              raridadeFiltrada
                ? styles.dropdownRaridadeAtivo
                : styles.dropdownRaridadePadrao,
            ]}
            activeOpacity={0.7}
            onPress={() => setModalRaridadeAberto(true)}
          >
            <Text
              style={[
                styles.textoDropdown,
                raridadeFiltrada
                  ? styles.textoDropdownRaridadeAtivo
                  : styles.textoDropdownRaridade,
              ]}
              numberOfLines={1}
            >
              {raridadeSelecionada}
            </Text>
            <Text
              style={[
                styles.setaDropdown,
                raridadeFiltrada
                  ? styles.textoDropdownRaridadeAtivo
                  : styles.textoDropdownRaridade,
              ]}
            >
              ▼
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.listaPrincipal}
        contentContainerStyle={styles.conteudoLista}
        data={skinsFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoSkin item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={() => (
          <View style={styles.vazioContainer}>
            <Text style={styles.vazioTitulo}>
              Nenhuma skin encontrada para essa busca.
            </Text>
            <Text style={styles.vazioSubtitulo}>
              Tente outro nome ou limpe os filtros selecionados.
            </Text>
            <TouchableOpacity
              style={styles.botaoAcao}
              activeOpacity={0.7}
              onPress={limparFiltros}
            >
              <Text style={styles.textoBotaoAcao}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal
        visible={modalCategoriaAberto}
        onRequestClose={() => setModalCategoriaAberto(false)}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Escolher Categoria</Text>
          <FlatList
            style={styles.listaModal}
            data={CATEGORIAS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const ativa = item === categoriaSelecionada;
              return (
                <TouchableOpacity
                  style={[
                    styles.opcaoModal,
                    ativa && styles.opcaoCategoriaAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategoriaSelecionada(item);
                    setModalCategoriaAberto(false);
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcaoModal,
                      ativa && styles.textoOpcaoCategoriaAtiva,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.botaoFecharModal}
            activeOpacity={0.7}
            onPress={() => setModalCategoriaAberto(false)}
          >
            <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalRaridadeAberto}
        onRequestClose={() => setModalRaridadeAberto(false)}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Escolher Raridade</Text>
          <FlatList
            style={styles.listaModal}
            data={RARIDADES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const ativa = item === raridadeSelecionada;
              return (
                <TouchableOpacity
                  style={[
                    styles.opcaoModal,
                    ativa && styles.opcaoRaridadeAtiva,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setRaridadeSelecionada(item);
                    setModalRaridadeAberto(false);
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcaoModal,
                      ativa && styles.textoOpcaoRaridadeAtiva,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.botaoFecharModal}
            activeOpacity={0.7}
            onPress={() => setModalRaridadeAberto(false)}
          >
            <Text style={styles.textoBotaoFecharModal}>Fechar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centralizado: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textoStatus: {
    color: '#1E4C8A',
    fontSize: 16,
    marginTop: 12,
  },
  textoErro: {
    color: '#C95F08',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  cabecalho: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titulo: {
    color: '#1E4C8A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  contador: {
    color: '#C95F08',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  campoBusca: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
    color: '#1E3A5F',
    fontSize: 15,
  },
  botaoLimpar: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  textoLimpar: {
    color: '#2B6CB0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  linhaFiltros: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  colunaFiltro: {
    flex: 1,
  },
  rotuloFiltro: {
    color: '#1E4C8A',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  botaoDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  dropdownCategoriaPadrao: {
    backgroundColor: '#EBF4FC',
    borderColor: '#2B6CB0',
  },
  dropdownCategoriaAtivo: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  dropdownRaridadePadrao: {
    backgroundColor: '#FFF3E8',
    borderColor: '#F58220',
  },
  dropdownRaridadeAtivo: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  textoDropdown: {
    flex: 1,
    fontSize: 14,
    marginRight: 6,
  },
  setaDropdown: {
    fontSize: 11,
  },
  textoDropdownCategoria: {
    color: '#1E4C8A',
    fontWeight: '600',
  },
  textoDropdownCategoriaAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textoDropdownRaridade: {
    color: '#C95F08',
    fontWeight: '600',
  },
  textoDropdownRaridadeAtivo: {
    color: '#0F1923',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalTitulo: {
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
  opcaoCategoriaAtiva: {
    backgroundColor: '#1E4C8A',
    borderColor: '#1E4C8A',
  },
  opcaoRaridadeAtiva: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  textoOpcaoModal: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: '600',
  },
  textoOpcaoCategoriaAtiva: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textoOpcaoRaridadeAtiva: {
    color: '#0F1923',
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
  listaPrincipal: {
    flex: 1,
  },
  conteudoLista: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  separador: {
    height: 10,
  },
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  vazioTitulo: {
    color: '#1E4C8A',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vazioSubtitulo: {
    color: '#2B6CB0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  botaoAcao: {
    backgroundColor: '#F58220',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textoBotaoAcao: {
    color: '#0F1923',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
