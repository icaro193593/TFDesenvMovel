# CS2 SkinWiki & Market Browser

Aplicativo em **React Native / Expo (JavaScript)** para consulta de skins de *Counter-Strike 2*, simulação de abertura de caixas, contratos de troca e acompanhamento de cotações de mercado.

> **Estado atual:** Navegação configurada via **Expo Router** e **Drawer Navigator** (7 telas, sendo 6 visíveis no Drawer e 1 tela de detalhes oculta). Já estão implementados: **Catálogo (`app/catalogo.js`)**, **Abertura de Caixas (`app/caixas.js`)**, **Inventário (`app/inventario.js`)**, **Configurações (`app/configuracoes.js`)** e o arquivo **`requirements.txt`** com as especificações de ambiente e dependências (com busca, filtros, roleta animada, persistência via `AsyncStorage`, suporte a câmbio em `USD`, `BRL` e `EUR` e consumo das APIs do CS2). As telas `Contrato de Trocas` e `Detalhes da Skin` seguem em esqueleto.

## Páginas do Aplicativo (7 telas)

1. **Início (`app/index.js`)**  
   Tela de entrada (*hub* principal) exibida ao abrir o aplicativo. Contém botões de redirecionamento direto para as 5 funcionalidades independentes (`Catálogo`, `Abertura de Caixas`, `Contrato de Trocas`, `Inventário` e `Configurações`), complementando o menu lateral (*Drawer*).

2. **Catálogo (`app/catalogo.js`)**  
   Lista as skins do CS2 com busca por nome da arma ou skin e filtros combináveis por categoria (pistolas, rifles, facas, luvas, etc.) e raridade.

3. **Abertura de Caixas (`app/caixas.js`)**  
   Simulador em que o usuário escolhe uma caixa e o app sorteia a raridade, a skin correspondente e um valor de *float* aleatório (definindo o estado de conservação), exibindo o valor de mercado do item obtido na moeda selecionada e permitindo guardá-lo no inventário local.

4. **Contrato de Trocas (`app/contrato.js`)**  
   Simulador de *Trade-Up Contract* para selecionar 10 skins de mesma raridade. Calcula em tempo real as probabilidades de retorno por coleção, o *float* resultante com base na média das entradas e compara o custo total dos insumos com o preço da skin sorteada.

5. **Inventário (`app/inventario.js`)**  
   Exibe as skins guardadas localmente no dispositivo (via `AsyncStorage`), com busca por skin, arma ou caixa, ordenação por recentes ou preço, cálculo do valor total estimado na moeda ativa e opções para remover itens individualmente ou limpar o inventário.

6. **Detalhes da Skin (`app/detalhes.js` — oculta do Drawer)**  
   Tela oculta no menu lateral (*Drawer*) e sem atalho isolado na página inicial, sendo acessada apenas ao tocar em uma skin nas outras telas. Mostra imagem ampliada, descrição, coleção/caixa de origem, faixa de *float* e tabela de preços por estado de conservação.

7. **Configurações (`app/configuracoes.js`)**  
   Permite trocar o câmbio utilizado nas cotações das skins (**USD**, **BRL** ou **EUR**) e conta com botão para limpar cache / resetar sessão com modal de confirmação (apagando o inventário e os dados locais armazenados no dispositivo).

## Como Executar

Consulte [`requirements.txt`](./requirements.txt) para a lista completa de requisitos de ambiente, dependências e APIs externas.

```bash
npm install
npx expo start
```
