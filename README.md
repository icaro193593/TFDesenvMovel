# CS2 SkinWiki & Market Browser

Aplicativo em **React Native / Expo (JavaScript)** para consulta de skins de *Counter-Strike 2*, simulação de abertura de caixas, contratos de troca, minigames e acompanhamento de cotações de mercado.

> **Estado atual:** Navegação configurada via **Expo Router** e **Drawer Navigator** (8 telas no total, sendo 7 visíveis no menu Drawer e 1 tela de detalhes oculta). Já estão totalmente implementados: **Catálogo (`app/catalogo.js`)**, **Abertura de Caixas (`app/caixas.js`)**, **Inventário (`app/inventario.js`)**, **Higher or Lower (`app/higherlower.js`)**, **Configurações (`app/configuracoes.js`)** e o arquivo **`requirements.txt`** com as especificações de ambiente e dependências (com busca, filtros combináveis, roleta animada, persistência via `AsyncStorage`, suporte a câmbio em `USD`, `BRL` e `EUR`, minigame com cotações e consumo de APIs externas do CS2). As telas **Contrato de Trocas (`app/contrato.js`)** e **Detalhes da Skin (`app/detalhes.js`)** seguem em desenvolvimento.

## Estrutura do Projeto

A organização de diretórios e arquivos reais do projeto é apresentada a seguir:

```text
TF/
├── app/
│   ├── _layout.js             # Layout raiz com configuração do Drawer Navigator
│   ├── index.js               # Início / Hub principal com atalhos para as funcionalidades
│   ├── catalogo.js            # Consulta e filtragem do catálogo de skins
│   ├── caixas.js              # Simulador de abertura de caixas com roleta animada
│   ├── contrato.js            # Simulador de Contrato de Trocas (Trade-Up) [em desenvolvimento]
│   ├── inventario.js          # Inventário local persistido via AsyncStorage
│   ├── higherlower.js         # Minigame Higher or Lower com skins de raridade Classified
│   ├── detalhes.js            # Detalhes completos da skin [em desenvolvimento - oculta do Drawer]
│   └── configuracoes.js       # Configurações de câmbio (USD/BRL/EUR) e reset de sessão
├── components/
│   ├── CaseCard.js            # Card de exibição de caixas para seleção
│   ├── HigherLowerCard.js     # Card com imagem, nome, wear e preço para o minigame
│   ├── RouletteItem.js        # Item estilizado da esteira giratória de caixas
│   └── SkinCard.js            # Card de exibição das skins com badge de raridade
├── hooks/
│   └── useHigherOrLower.js    # Hook com a lógica de rodadas, pontuação e recorde do minigame
├── services/
│   └── priceService.js        # Serviço de cotações de preços de mercado e conversão de moedas
├── app.json                   # Configurações do Expo e metadados do aplicativo
├── package.json               # Dependências do projeto e scripts npm
├── package-lock.json          # Trava de versões das dependências
├── requirements.txt           # Especificação detalhada de ambiente, dependências e APIs
└── README.md                  # Documentação do projeto
```

## Páginas do Aplicativo (8 telas)

1. **Início (`app/index.js`)**  
   Tela de entrada (*hub* principal) exibida ao abrir o aplicativo. Contém botões de redirecionamento direto para as 6 funcionalidades independentes (`Catálogo`, `Abertura de Caixas`, `Contrato de Trocas`, `Inventário`, `Higher or Lower` e `Configurações`), complementando o menu lateral (*Drawer*).

2. **Catálogo (`app/catalogo.js`)**  
   Lista as skins do CS2 com busca por nome da arma ou skin e filtros combináveis por categoria (pistolas, rifles, facas, luvas, etc.) e raridade.

3. **Abertura de Caixas (`app/caixas.js`)**  
   Simulador em que o usuário escolhe uma caixa e o app sorteia a raridade, a skin correspondente e um valor de *float* aleatório (definindo o estado de conservação), exibindo o valor de mercado do item obtido na moeda selecionada e permitindo guardá-lo no inventário local.

4. **Contrato de Trocas (`app/contrato.js`)** *(em desenvolvimento)*  
   Simulador de *Trade-Up Contract* para selecionar 10 skins de mesma raridade. Calcula em tempo real as probabilidades de retorno por coleção, o *float* resultante com base na média das entradas e compara o custo total dos insumos com o preço da skin sorteada.

5. **Inventário (`app/inventario.js`)**  
   Exibe as skins guardadas localmente no dispositivo (via `AsyncStorage`), com busca por skin, arma ou caixa, ordenação por recentes ou preço, cálculo do valor total estimado na moeda ativa e opções para remover itens individualmente ou limpar o inventário.

6. **Higher or Lower (`app/higherlower.js`)**  
   Minigame com skins de raridade *Classified* (rosa) consultando preços de mercado, com pontuação atual e recorde em cache de sessão. O jogador avalia duas skins consecutivas e tenta adivinhar se a segunda possui valor maior ou menor que a primeira.

7. **Detalhes da Skin (`app/detalhes.js` — oculta do Drawer)** *(em desenvolvimento)*  
   Tela oculta no menu lateral (*Drawer*) e sem atalho isolado na página inicial, sendo acessada apenas ao tocar em uma skin nas outras telas. Mostra imagem ampliada, descrição, coleção/caixa de origem, faixa de *float* e tabela de preços por estado de conservação.

8. **Configurações (`app/configuracoes.js`)**  
   Permite trocar o câmbio utilizado nas cotações das skins (**USD**, **BRL** ou **EUR**) e conta com botão para limpar cache / resetar sessão com modal de confirmação (apagando o inventário e os dados locais armazenados no dispositivo).

## Como Executar

Consulte [`requirements.txt`](./requirements.txt) para a lista completa de requisitos de ambiente, dependências e APIs externas.

```bash
npm install
npx expo start
```
