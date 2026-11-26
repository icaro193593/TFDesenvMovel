// Sistema de Design Oficial do CS2 SkinWiki
// Baseado nos princípios de Craft Impeccável:
// - Paleta coesa e contrastante (fundo tático escuro, detalhes em aço e laranja CS2)
// - Tipografia hierárquica e legível
// - Bordas limpas sem faixas unilaterais
// - Total conformidade com o TUTORIAL_REACT_NATIVE.md (Pure JavaScript)

export const CORES = {
  // Fundos estruturais em camadas
  fundoApp: '#0B0E14',
  fundoSuperficie: '#131924',
  fundoCard: '#182232',
  fundoCardElevado: '#1F2C40',
  fundoInput: '#101622',
  fundoModal: 'rgba(5, 8, 14, 0.88)',

  // Bordas e divisores
  borda: '#25354D',
  bordaDestaque: '#3D5478',
  bordaSuave: '#1A2638',

  // Acentos principais do CS2
  laranjaCs: '#F58220',
  laranjaBrilhante: '#FF9538',
  laranjaEscuro: '#B8590D',
  azulCs: '#1E4C8A',
  azulAco: '#2A68B8',
  azulClaro: '#60A5FA',

  // Textos com contraste verificado
  textoPrincipal: '#FFFFFF',
  textoSecundario: '#9EB1D0',
  textoMudo: '#667C9E',
  textoInvertido: '#0B0E14',

  // Estados semânticos
  sucesso: '#10B981',
  erro: '#EF4444',
  alerta: '#F59E0B',
  ouro: '#FFD700',

  // Raridades Oficiais do Counter-Strike 2
  raridades: {
    'Consumer Grade': '#B0C3D9',
    'Industrial Grade': '#5E98D9',
    'Mil-Spec Grade': '#4B69FF',
    'Restricted': '#8847FF',
    'Classified': '#D32CE6',
    'Covert': '#EB4B4B',
    'Contraband': '#E4AE39',
    'Extraordinary': '#FFD700',
    '★ Special Rare Item': '#FFD700',
  },
};

export const ESPACAMENTO = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const BORDAS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};
