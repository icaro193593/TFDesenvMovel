# Garbskins CS2

Aplicativo móvel desenvolvido em **React Native** com **Expo** e **Expo Router** para explorar skins de *Counter-Strike 2*, simular abertura de caixas com roleta animada, executar contratos de troca (*Trade-Up*), gerenciar inventário e saldo virtual, jogar *Higher or Lower* e evoluir mecânicas do sistema por meio de upgrades permanentes.

## Autores / Disciplina

- **Disciplina:** Desenvolvimento Móvel
- **Alunos:**
  - Bernardo Vizeu de Miranda
  - Ícaro de Alencar Araripe Andrade

---

## Explicação Didática das Páginas do Sistema

O aplicativo conta com **9 telas** organizadas sob um menu lateral (*Drawer*) configurado no layout raiz (`app/_layout.js`), sendo 8 telas acessíveis diretamente pelo menu e 1 tela de detalhes oculta da listagem do Drawer.

### Layout e Navegação (`app/_layout.js`)

- **Objetivo:** Centralizar a navegação do aplicativo e padronizar o cabeçalho superior e o menu lateral em todas as telas.
- **Como funciona:** Utiliza `SafeAreaProvider`, `StatusBar` e o componente `Drawer` do `expo-router/drawer`, com ícones da biblioteca `@expo/vector-icons` (`MaterialIcons`). Registra todas as 9 rotas do diretório `app/`, mantendo a rota `detalhes` oculta do menu (`drawerItemStyle: { display: 'none' }`).

### 1. Início (`app/index.js`)

- **Objetivo para o usuário:** Servir como tela inicial (*hub*) com acesso rápido às principais áreas do aplicativo, sem depender apenas do menu lateral.
- **Como usar:** Ao abrir o app, o usuário visualiza o cabeçalho de identificação e 7 botões diretos para navegar até **Catálogo**, **Abertura de Caixas**, **Contrato de Trocas**, **Inventário**, **Higher or Lower**, **Upgrades** e **Configurações**.
- **Recursos técnicos:** Navegação programática com `router.push` (`expo-router`), `SafeAreaView` e `ScrollView`.

### 2. Catálogo (`app/catalogo.js`)

- **Objetivo para o usuário:** Permitir a consulta completa das skins do CS2, com busca textual e filtros combináveis por categoria de arma e raridade.
- **Como usar:** Digite o nome da arma ou da skin na barra de busca e, se desejar, abra os seletores de **Categoria** (`Pistols`, `Rifles`, `SMGs`, `Heavy`, `Knives`, `Gloves`, `Equipment`) e **Raridade** (`Consumer Grade` até `Extraordinary`). O contador no topo é atualizado em tempo real conforme os filtros aplicados.
- **Recursos técnicos:** Consumo da API ByMykel (`skins.json`) via `fetch`, renderização performática com `FlatList`, componente `CartaoSkin`, modais de seleção de filtros, indicador de carregamento (`ActivityIndicator`), tratamento de erro com tentativa de recarregamento e estado vazio com limpeza rápida de filtros.

### 3. Detalhes da Skin (`app/detalhes.js`)

- **Objetivo para o usuário:** Rota reservada para a exibição detalhada de uma skin específica fora do menu lateral principal.
- **Estado atual e uso:** Registrada no `Drawer` como tela oculta (`drawerItemStyle: { display: 'none' }`). Na versão atual do projeto, encontra-se como tela estrutural simples (*placeholder* inicial) exibindo o título `"Detalhes da skin"`, pronta para receber expansões futuras de visualização individual de itens.
- **Recursos técnicos:** Rota gerenciada pelo Expo Router (`app/detalhes.js`), ocultada da listagem do Drawer em `app/_layout.js`.

### 4. Abertura de Caixas (`app/caixas.js`)

- **Objetivo para o usuário:** Simular a abertura de caixas, cápsulas e pacotes de souvenir do CS2 com sorteio probabilístico de raridade, desgaste (*float*) e versão `StatTrak™`.
- **Como usar:**
  1. Pesquise e selecione uma caixa na grade de 2 colunas.
  2. Se o upgrade **Abrir Múltiplas Caixas** estiver ativo, escolha abrir `1x`, `2x` ou `3x` roletas simultâneas.
  3. Toque em **Abrir Caixa** para iniciar a animação da roleta. Ao finalizar, os itens sorteados são exibidos em um modal com suas respectivas cotações e adicionados automaticamente ao inventário local.
  4. No próprio modal de resultado, é possível **Vender** cada skin individualmente, usar **Vender todas** (quando houver mais de uma) ou iniciar uma nova abertura.
- **Recursos técnicos:** Consome `crates.json` da API ByMykel, renderiza a grade com `FlatList` e `CartaoCaixa`, anima até 3 roletas horizontais com `FlatList` e `ItemRoleta` usando curva de desaceleração cúbica, aplica probabilidades por peso (incluindo itens especiais de `contains_rare` influenciados pelo upgrade `oddsEspecial` e chance de duplicação via `itemDobrado`), consulta cotações com `priceService.obterPrecoSkin`, persiste os itens obtidos no `AsyncStorage` (`@inventario_skins`) e integra vendas e saldo via `economyService`.

### 5. Contrato de Trocas (`app/contrato.js`)

- **Objetivo para o usuário:** Simular o *Trade-Up Contract*, permitindo sacrificar skins repetidas ou de menor valor do inventário para gerar uma skin de raridade imediatamente superior.
- **Como usar:**
  1. Selecione na lista de itens elegíveis do seu inventário a quantidade necessária de skins da mesma raridade (por padrão **3 skins**, ou **2 skins** caso o upgrade **Contrato com 1 Item a Menos** tenha sido comprado). Itens `Covert`, `Contraband`, `Extraordinary`, facas e luvas (`★`) são bloqueados automaticamente.
  2. Ao preencher os espaços, toque em **Assinar Contrato**.
  3. O sistema sorteia uma skin da raridade seguinte (com chance de pular 1 raridade extra se o upgrade **Pular Raridade no Contrato** estiver ativo), dando preferência às coleções das skins usadas como entrada.
  4. O item gerado é salvo no inventário e exibido no modal, onde pode ser vendido imediatamente ou mantido para novos contratos.
- **Recursos técnicos:** Integra `AsyncStorage` (`@inventario_skins`), API ByMykel (`skins.json`), componente `EspacoContrato`, cálculo de faixa de *float* compatível com o desgaste da skin, `priceService` (`obterPrecoSkin`, `obterMoedaSelecionada`) e `economyService` (`obterUpgrades`, `obterEfeitosUpgrades`, `venderSkinDoInventario`).

### 6. Inventário (`app/inventario.js`)

- **Objetivo para o usuário:** Centralizar todas as skins obtidas nas aberturas de caixa e contratos de troca, permitindo consultar patrimônio, filtrar itens e convertê-los em saldo virtual.
- **Como usar:**
  - Visualize no topo o saldo atual, a quantidade total de skins e o valor total estimado do inventário na moeda selecionada.
  - Utilize a barra de busca (por nome da skin, caixa de origem ou estado de conservação) e o botão **Ordenar** (`Maior preço`, `Menor preço`, `Mais recente`, `Menos recente`).
  - Em cada cartão, toque em **Vender** para converter a skin em saldo ou em **Remover** para descartá-la sem venda. No resumo superior, também é possível usar **Vender tudo** (com confirmação) ou **Limpar**.
- **Recursos técnicos:** Leitura e gravação persistente via `AsyncStorage` (`@inventario_skins`), atualização automática ao focar a tela (`useFocusEffect`), `FlatList`, `Modal` para ordenação e confirmação de venda em lote, além das funções de precificação e venda de `priceService` e `economyService`.

### 7. Higher or Lower (`app/higherlower.js`)

- **Objetivo para o usuário:** Propor um minigame de comparação de preços entre skins reais do CS2, desafiando o jogador a acumular a maior sequência de acertos e, opcionalmente, ganhar saldo por rodada.
- **Como usar:**
  - Duas skins são exibidas lado a lado/empilhadas: a skin base mostra seu preço e a segunda exibe `???`.
  - Toque em **Mais Cara** ou **Mais Barata** para palpitar se a segunda skin vale mais ou menos que a primeira.
  - Ao acertar, a pontuação sobe, o recorde é atualizado e a segunda skin passa a ser a nova base da rodada seguinte. Se o upgrade **Recompensa Higher or Lower** estiver ativo, cada acerto credita bônus no saldo. Ao errar, um modal de **Fim de Jogo** exibe a pontuação, o recorde e o ganho acumulado na partida.
- **Recursos técnicos:** Hook personalizado `useHigherOrLower`, componente `CartaoMaiorMenor`, carregamento de skins com preço via `priceService.obterSkinsClassifiedComPreco`, persistência do recorde histórico no `AsyncStorage` (`@higher_lower_recorde_historico`) e integração com saldo e bônus do `economyService`.

### 8. Upgrades (`app/upgrades.js`)

- **Objetivo para o usuário:** Permitir que o jogador invista o saldo obtido com vendas e minigames em melhorias permanentes que ampliam probabilidades, reduzem exigências e desbloqueiam recursos nas demais telas.
- **Como usar:** Confira o saldo disponível no cartão superior e toque em **Comprar** nos upgrades desejados sempre que possuir saldo suficiente. Os custos e valores de recompensa exibidos nos cartões adaptam-se automaticamente à moeda escolhida nas **Configurações** (`USD`, `BRL` ou `EUR`), utilizando as taxas de conversão do `priceService` (`1 USD = 5,80 BRL = 0,92 EUR`).
- **Recursos técnicos:** Consome `UPGRADES_CONFIG`, `obterSaldoBRL`, `obterUpgrades`, `comprarUpgrade` e `formatarBRLNaMoeda` de `services/economyService.js`, além de `obterMoedaSelecionada` de `services/priceService.js`, persistindo saldo e níveis no `AsyncStorage`.

#### Tabela de Upgrades Disponíveis

| Upgrade | Níveis (do inicial ao máximo) | Efeito nas Outras Telas | Valores-Base em BRL (adaptam-se ao câmbio selecionado) |
| :--- | :--- | :--- | :--- |
| **Abrir Múltiplas Caixas** (`multiCaixas`) | Nível 0 a 2 (`1 caixa`, `2 caixas`, `3 caixas`) | Libera o seletor de quantidade (`1x`, `2x`, `3x`) e roletas simultâneas em **Abertura de Caixas** (`app/caixas.js`). | Custo dos níveis: R$ 2.000,00 (Nível 1) e R$ 15.000,00 (Nível 2) |
| **Pular Raridade no Contrato** (`pularRaridade`) | Nível 0 a 5 (`0%`, `10%`, `20%`, `30%`, `40%`, `50%`) | Concede chance de avançar duas raridades em vez de uma ao assinar um contrato em **Contrato de Trocas** (`app/contrato.js`). | Custo dos níveis: R$ 500,00 / R$ 1.000,00 / R$ 1.500,00 / R$ 2.000,00 / R$ 2.500,00 |
| **Contrato com 1 Item a Menos** (`menosItemContrato`) | Nível 0 a 1 (`3 itens`, `2 itens`) | Reduz de 3 para 2 a quantidade mínima de skins exigidas no **Contrato de Trocas** (`app/contrato.js`). | Custo do nível 1: R$ 50.000,00 |
| **Aumentar Odds de Item Especial** (`oddsEspecial`) | Nível 0 a 5 (`0,26%`, `1%`, `2%`, `3%`, `4%`, `5%`) | Aumenta a probabilidade de sortear um item raro especial (`contains_rare`) em **Abertura de Caixas** (`app/caixas.js`). | Custo dos níveis: R$ 1.000,00 / R$ 2.000,00 / R$ 3.000,00 / R$ 4.000,00 / R$ 5.000,00 |
| **Item Dobrado na Caixa** (`itemDobrado`) | Nível 0 a 5 (`0%`, `5%`, `10%`, `15%`, `20%`, `25%`) | Concede chance de receber a skin sorteada em dobro (2x) por caixa aberta em **Abertura de Caixas** (`app/caixas.js`). | Custo dos níveis: R$ 1.000,00 / R$ 3.000,00 / R$ 9.000,00 / R$ 15.000,00 / R$ 20.000,00 |
| **Recompensa Higher or Lower** (`bonusHigherLower`) | Nível 0 a 5 (`R$ 0`, `R$ 50`, `R$ 100`, `R$ 150`, `R$ 200`, `R$ 250`) | Concede saldo extra a cada acerto consecutivo em **Higher or Lower** (`app/higherlower.js`). | Bônus por acerto: R$ 0,00 a R$ 250,00; Custo dos níveis: R$ 1.000,00 / R$ 3.000,00 / R$ 9.000,00 / R$ 15.000,00 / R$ 20.000,00 |

### 9. Configurações (`app/configuracoes.js`)

- **Objetivo para o usuário:** Permitir ajustar o câmbio utilizado em todo o aplicativo e oferecer uma forma segura de reiniciar os dados locais.
- **Como usar:**
  - Em **Câmbio (Moeda)**, toque no seletor e escolha entre **Dólar (`USD`)**, **Real (`BRL`)** ou **Euro (`EUR`)**.
  - Em **Sessão e Cache**, toque em **Limpar Cache e Resetar Sessão** e confirme no modal para apagar inventário, saldo, upgrades, recorde histórico e preferências salvas (restaurando o padrão `USD`).
- **Recursos técnicos:** Persistência de moeda em `@moeda_selecionada` via `AsyncStorage`, limpeza completa do armazenamento com `AsyncStorage.clear()` e modais de seleção (`FlatList`) e confirmação.

---

## Estrutura Atualizada do Projeto

```text
TF/
├── app/
│   ├── _layout.js             # Layout raiz com Drawer Navigator e registro das 9 telas
│   ├── index.js               # Tela inicial (Hub) com atalhos para as funcionalidades
│   ├── catalogo.js            # Consulta de skins com busca e filtros por categoria/raridade
│   ├── caixas.js              # Simulador de abertura de caixas com até 3 roletas animadas
│   ├── contrato.js            # Simulador de Contrato de Trocas (Trade-Up) com upgrades
│   ├── inventario.js          # Inventário local persistido com busca, ordenação e venda
│   ├── higherlower.js         # Minigame Higher or Lower com recorde e bônus de saldo
│   ├── upgrades.js            # Loja de 6 upgrades permanentes integrados à economia
│   ├── detalhes.js            # Rota de detalhes da skin (oculta do Drawer; placeholder)
│   └── configuracoes.js       # Seleção de câmbio (USD/BRL/EUR) e reset da sessão
├── components/
│   ├── CartaoCaixa.js         # Card de caixa exibido na grade de seleção
│   ├── CartaoMaiorMenor.js    # Card de skin com preço/ocultação para o Higher or Lower
│   ├── CartaoSkin.js          # Card de exibição de skin no Catálogo
│   ├── EspacoContrato.js      # Slot visual de entrada de skin no Contrato de Trocas
│   └── ItemRoleta.js          # Item estilizado da esteira animada de abertura de caixas
├── constants/
│   └── cs2Theme.js            # Paleta de cores do tema e cores oficiais por raridade
├── hooks/
│   └── useHigherOrLower.js    # Hook de estado, sorteio, cache de sessão e regras do minigame
├── services/
│   ├── economyService.js      # Gerenciamento de saldo, upgrades, efeitos e vendas
│   └── priceService.js        # Consulta de cotações, cache em memória, fallback e câmbio
├── app.json                   # Configurações do Expo e metadados do aplicativo
├── package.json               # Dependências do projeto e scripts npm
├── package-lock.json          # Trava de versões das dependências
├── requirements.txt           # Especificação detalhada de ambiente, dependências e APIs
└── README.md                  # Documentação do projeto
```

---

## Tecnologias, APIs e Persistência Local

- **Framework e Runtime:** Expo (`~54.0.0`), React (`19.1.0`), React Native (`0.81.5`) e suporte Web (`react-native-web`).
- **Navegação:** Expo Router (`~6.0.24`) com Drawer Navigator (`@react-navigation/drawer` `^7.5.0`), `@react-navigation/native`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens` e `react-native-safe-area-context`.
- **Ícones e Interface:** `@expo/vector-icons` (`MaterialIcons`), `expo-font` e `expo-status-bar`.
- **APIs Externas e Precificação (`services/priceService.js`):**
  - **ByMykel CSGO-API:** Fornece os catálogos públicos em JSON de skins (`skins.json`) e caixas/cápsulas (`crates.json`), sem necessidade de chave de API.
  - **Steam Community Market API (`priceoverview`):** Utilizada para consulta de preços de mercado por `market_hash_name` e moeda (`USD`, `EUR`, `BRL`), com suporte opcional à **PriceEmpire API** caso uma chave esteja salva em `@pricempire_api_key`.
  - **Cache e Fallback Determinístico:** O `priceService.js` mantém cache em memória com TTL de 10 minutos (`CACHE_PRECOS_TTL_MS`), deduplicação de requisições concorrentes, tentativa alternativa de desgaste (*Factory New* / *Minimal Wear*) e fallback determinístico local (`calcularFallbackDeterministico`) baseado em raridade, desgaste, `StatTrak™` e hash do nome da skin caso a API externa esteja indisponível ou limitada por *rate-limit*.
- **Persistência Local (`@react-native-async-storage/async-storage` `2.2.0`):**
  - `@inventario_skins`: Lista de skins salvas no inventário do usuário.
  - `@moeda_selecionada`: Código do câmbio ativo (`USD`, `BRL` ou `EUR`).
  - `@garbskins_saldo_brl`: Saldo virtual acumulado (armazenado em BRL e convertido na exibição).
  - `@garbskins_upgrades`: Níveis comprados de cada um dos 6 upgrades.
  - `@higher_lower_recorde_historico`: Maior pontuação histórica no minigame *Higher or Lower*.

---

## Como Executar o Projeto

Para mais detalhes sobre versões de ambiente e dependências, consulte [`requirements.txt`](./requirements.txt).

```bash
cd TF
npm install
npx expo start
```

Após iniciar o servidor do Expo, você também pode utilizar os scripts configurados em `package.json` (`npm start`, `npm run android`, `npm run ios` ou `npm run web`) ou escanear o QR Code pelo aplicativo **Expo Go**.
