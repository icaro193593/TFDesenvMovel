# CS2 SkinWiki & Market Browser

Aplicativo em **React Native / Expo (JavaScript)** para consulta de skins de *Counter-Strike 2*, simulação de abertura de caixas, contratos de troca e acompanhamento de cotações de mercado.

> **Estado atual:** Navegação configurada via **Expo Router** e **Drawer Navigator** (9 telas), com a tela **Catálogo (`app/catalogo.js`)** implementada com busca, filtros e consumo da API ByMykel CSGO-API (demais telas ainda em esqueleto).

## Páginas do Aplicativo (9 telas)

1. **Início (`app/index.js`)**  
   Tela de entrada (*hub* principal) exibida ao abrir o aplicativo. Contém botões de redirecionamento direto para as 7 funcionalidades independentes, complementando o menu lateral (*Drawer*).

2. **Catálogo (`app/catalogo.js`)**  
   Lista as skins do CS2 com busca por nome da arma ou skin e filtros combináveis por categoria (pistolas, rifles, facas, luvas, etc.) e raridade.

3. **Coleções e Caixas (`app/colecoes.js`)**  
   Exibe todas as caixas (*Weapon Cases*) e coleções de mapas/operações disponíveis; ao selecionar uma delas, lista suas skins ordenadas por raridade.

4. **Abertura de Caixas (`app/caixas.js`)**  
   Simulador em que o usuário escolhe uma caixa ou coleção e o app sorteia a raridade, a skin correspondente e um valor de *float* aleatório (definindo o estado de conservação), exibindo também o valor de mercado do item obtido.

5. **Contrato de Trocas (`app/contrato.js`)**  
   Simulador de *Trade-Up Contract* para selecionar 10 skins de mesma raridade. Calcula em tempo real as probabilidades de retorno por coleção, o *float* resultante com base na média das entradas e compara o custo total dos insumos com o preço da skin sorteada.

6. **Inventário (`app/inventario.js`)**  
   Gerador de *loadout* completo que sorteia 1 Faca, 1 Luva, 1 Glock-18, 1 USP-S, 1 AK-47, 1 M4A1-S e 1 AWP, mostrando estados de conservação, preços individuais e o valor total do kit.

7. **Favoritos (`app/favoritos.js`)**  
   Exibe as skins salvas localmente no dispositivo (via `AsyncStorage`), permitindo consulta offline aos metadados e atualização de cotações em lote.

8. **Detalhes da Skin (`app/detalhes.js` — oculta do Drawer)**  
   Tela oculta no menu lateral (*Drawer*) e sem atalho isolado na página inicial, sendo acessada apenas ao tocar em uma skin nas outras telas. Mostra imagem ampliada, descrição, coleção/caixa de origem, faixa de *float*, tabela de preços por estado de conservação e botão para favoritar.

9. **Configurações (`app/configuracoes.js`)**  
   Permite definir a moeda das cotações (USD, BRL, EUR, etc.), alternar o provedor de API de preços e limpar o cache local e os favoritos salvos.

## Como Executar


```bash
npm install
npx expo start
```
