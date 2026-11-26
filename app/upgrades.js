import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CORES } from '../constants/cs2Theme';
import {
  UPGRADES_CONFIG,
  UPGRADES_PADRAO,
  comprarUpgrade,
  formatarBRLNaMoeda,
  obterSaldoBRL,
  obterUpgrades,
} from '../services/economyService';
import { obterMoedaSelecionada } from '../services/priceService';

export default function TelaUpgrades() {
  const [saldo, setSaldo] = useState(0);
  const [upgrades, setUpgrades] = useState(UPGRADES_PADRAO);
  const [moedaAtual, setMoedaAtual] = useState('USD');
  const [comprandoId, setComprandoId] = useState(null);
  const [erro, setErro] = useState(null);

  const carregarDados = useCallback(async () => {
    const [saldoAtual, upgradesAtuais, moedaSelecionada] = await Promise.all([
      obterSaldoBRL(),
      obterUpgrades(),
      obterMoedaSelecionada(),
    ]);
    setSaldo(saldoAtual);
    setUpgrades(upgradesAtuais);
    setMoedaAtual(moedaSelecionada);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  const handleComprar = async (config) => {
    if (comprandoId) return;
    setComprandoId(config.id);
    setErro(null);

    try {
      const nivelAtual = upgrades[config.id] || 0;
      const custoAtual = config.custos[nivelAtual] ?? 0;
      const resultado = await comprarUpgrade(config.id);
      if (resultado.ok) {
        setSaldo(resultado.novoSaldo);
        setUpgrades(resultado.novosUpgrades);
      } else {
        const erroTexto =
          typeof resultado.erro === 'string' && resultado.erro.includes('Saldo insuficiente')
            ? `Saldo insuficiente (${formatarBRLNaMoeda(saldo, moedaAtual)}). Necessário: ${formatarBRLNaMoeda(custoAtual, moedaAtual)}.`
            : resultado.erro || 'Não foi possível concluir a compra.';
        setErro(erroTexto);
      }
    } finally {
      setComprandoId(null);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        <View style={styles.cardSaldo}>
          <Text style={styles.rotuloSaldo}>Saldo disponível</Text>
          <Text style={styles.valorSaldo}>{formatarBRLNaMoeda(saldo, moedaAtual)}</Text>
        </View>

        {erro && (
          <View style={styles.bannerErro}>
            <Text style={styles.textoErro}>{erro}</Text>
          </View>
        )}

        {UPGRADES_CONFIG.map((config) => {
          const nivelAtual = upgrades[config.id] || 0;
          const nivelMaximo = config.custos.length;
          const estaNoMaximo = nivelAtual >= nivelMaximo;
          const custo = estaNoMaximo ? null : config.custos[nivelAtual];
          const podeComprar = !estaNoMaximo && saldo >= custo && comprandoId === null;
          const possuiValoresBRL = Array.isArray(config.valoresBRL);
          const labelAtual = possuiValoresBRL
            ? formatarBRLNaMoeda(config.valoresBRL[nivelAtual] ?? 0, moedaAtual)
            : config.niveisLabel[nivelAtual] || '-';
          const labelProximo = !estaNoMaximo
            ? possuiValoresBRL
              ? formatarBRLNaMoeda(config.valoresBRL[nivelAtual + 1] ?? 0, moedaAtual)
              : config.niveisLabel[nivelAtual + 1]
            : null;

          return (
            <View key={config.id} style={styles.cardUpgrade}>
              <View style={styles.cabecalhoCard}>
                <Text style={styles.nomeUpgrade}>{config.nome}</Text>
                <View style={styles.badgeNivel}>
                  <Text style={styles.textoBadgeNivel}>
                    Nível {nivelAtual} / {nivelMaximo}
                  </Text>
                </View>
              </View>

              <Text style={styles.descricaoUpgrade}>{config.descricao}</Text>

              <View style={styles.linhaEfeitos}>
                <Text style={styles.textoEfeito}>Atual: {labelAtual}</Text>
                {!estaNoMaximo && (
                  <Text style={styles.textoProximo}>Próximo: {labelProximo}</Text>
                )}
              </View>

              {estaNoMaximo ? (
                <View style={styles.botaoMaximo}>
                  <Text style={styles.textoBotaoMaximo}>Nível Máximo</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.botaoComprar,
                    !podeComprar && styles.botaoDesabilitado,
                  ]}
                  activeOpacity={0.75}
                  disabled={!podeComprar}
                  onPress={() => handleComprar(config)}
                >
                  <Text
                    style={[
                      styles.textoBotaoComprar,
                      !podeComprar && styles.textoBotaoDesabilitado,
                    ]}
                  >
                    Comprar - {formatarBRLNaMoeda(custo, moedaAtual)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  container: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  conteudo: {
    padding: 16,
    paddingBottom: 28,
  },
  cardSaldo: {
    backgroundColor: CORES.azulPrincipal,
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  rotuloSaldo: {
    color: CORES.azulClaro,
    fontSize: 14,
    fontWeight: '600',
  },
  valorSaldo: {
    color: CORES.branco,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  bannerErro: {
    backgroundColor: CORES.erroClaro,
    borderColor: CORES.erro,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  textoErro: {
    color: CORES.erro,
    fontSize: 14,
    fontWeight: '600',
  },
  cardUpgrade: {
    backgroundColor: CORES.branco,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 16,
    marginBottom: 12,
  },
  cabecalhoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  nomeUpgrade: {
    flex: 1,
    color: CORES.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeNivel: {
    backgroundColor: CORES.azulClaro,
    borderWidth: 1,
    borderColor: CORES.azulBorda,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoBadgeNivel: {
    color: CORES.azulPrincipal,
    fontSize: 12,
    fontWeight: 'bold',
  },
  descricaoUpgrade: {
    color: CORES.textoSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  linhaEfeitos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORES.fundo,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  textoEfeito: {
    color: CORES.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoProximo: {
    color: CORES.azulPrincipal,
    fontSize: 13,
    fontWeight: '600',
  },
  botaoComprar: {
    backgroundColor: CORES.azulPrincipal,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    backgroundColor: CORES.borda,
  },
  textoBotaoComprar: {
    color: CORES.branco,
    fontSize: 15,
    fontWeight: 'bold',
  },
  textoBotaoDesabilitado: {
    color: CORES.textoSecundario,
  },
  botaoMaximo: {
    backgroundColor: CORES.sucessoClaro,
    borderWidth: 1,
    borderColor: CORES.sucesso,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  textoBotaoMaximo: {
    color: CORES.sucesso,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
