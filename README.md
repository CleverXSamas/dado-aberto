# Dado Aberto

Calculadora visual de probabilidades de dados para RPG. Monte a jogada em português — `3d6`, vantagem, melhores 3, explosões, sucessos — e veja a distribuição completa enquanto decide.

Inspirada na ideia do [AnyDice](https://anydice.com/), mas sem exigir uma linguagem de programação. É uma página estática, sem build, sem dependências e sem envio de dados para servidor.

## Como abrir

Basta abrir `index.html` no navegador.

Para uma experiência ideal — URL e área de transferência funcionando sem restrições do protocolo `file://` — sirva a pasta localmente:

```bash
# Python 3
python -m http.server 4173

# ou Node.js
npx serve .
```

Depois acesse `http://localhost:4173`.

## O que dá para fazer

- **Montar a rolagem visualmente**: quantidade de dados, tipo de dado, bônus e grupos extras.
- **Manter os maiores ou menores**: vantagem, desvantagem, `4d6` melhores 3 etc.
- **Dados explosivos**: ao tirar o valor máximo, role de novo e some.
- **Contar sucessos**: cada dado que alcança um valor conta um sucesso; o alvo geral é a quantidade de sucessos necessária.
- **Comparar com um alvo**: veja a chance de alcançar pelo menos o alvo, a chance exata e a distribuição completa.
- **Ler em linguagem simples**: a explicação traduz a notação e resume os números do painel.
- **Rolar de verdade**: além das probabilidades, há um botão para uma rolagem animada de verdade, com som de dado sintetizado no navegador. O botão **Som ligado/desligado** fica ao lado e a preferência é lembrada.
- **Duelo**: compare duas jogadas e veja a chance de A vencer, de empate, de B vencer e a distribuição da margem.
- **Compartilhar**: o link guarda a configuração da jogada; o tema, o som e a última configuração ficam no `localStorage`.
- **Tema claro e escuro**, layout responsivo e gráfico navegável por teclado.

### Atalhos prontos

Teste de d20, vantagem, desvantagem, atributos (`4d6` melhores 3), dano, poção de sucessos e dados explosivos.

## Como o cálculo funciona

O motor em `js/engine.js` trabalha com distribuições de probabilidade discretas exatas, representadas como `Map<resultado, probabilidade>`.

- **Soma de dados**: as distribuições são combinadas por convolução.
- **Manter maiores/menores**: uma programação dinâmica calcula a distribuição da soma dos `k` maiores ou menores dados, sem simulação.
- **Explosões**: a corrente geométrica é calculada até 64 níveis ou até a cauda restante ficar abaixo de `1e-16`; depois a distribuição é renormalizada. A cauda descartada é muito menor do que a precisão exibida.
- **Bônus**: desloca o resultado final. Em modo de sucessos, soma ou subtrai sucessos.
- **Grupos extras**: são calculados separadamente e somados ao grupo principal. Em modo de sucessos, cada grupo conta sucessos com o mesmo alvo por dado.
- **Ordem das operações**: explosões acontecem antes de manter maiores/menores; grupos extras entram depois.
- **Alvo**: a chance principal é `P(resultado ≥ alvo)`. A tabela mostra também a probabilidade exata e a cauda.
- **Duelo**: as duas distribuições são independentes; o motor calcula `P(A > B)`, `P(A = B)`, `P(B > A)` e a distribuição de `A − B`.

Os percentuais são arredondados apenas na exibição. O link compartilhado guarda a configuração, não os resultados.

## Estrutura

```text
dado-aberto/
├── index.html          # marcação, textos e ícones
├── css/
│   └── styles.css      # sistema visual, temas e responsividade
└── js/
    ├── engine.js       # motor exato de probabilidades
    ├── engine.test.js  # testes do motor (Node.js)
    └── app.js          # interface, gráficos, URL e modo duelo
```

## Testes

O motor não depende do navegador. Com Node.js instalado:

```bash
node js/engine.test.js
```

Os testes cobrem somas, manter maiores/menores, explosões, sucessos, distribuições condicionais e comparação de duelos. A interface foi verificada em navegador nos temas claro e escuro, em desktop e em viewports móveis.

## Limites da interface

- 1 a 20 dados no grupo principal e em cada grupo extra.
- Até 6 grupos extras.
- Dados de 4, 6, 8, 10, 12, 20 e 100 lados na interface.
- Bônus de −50 a +50.
- Alvo de −50 a 1000.
- No duelo, 1 a 12 dados por lado.
- O motor aceita dados de 2 a 1000 lados e até 40 dados por grupo quando usado diretamente.

## Compatibilidade e privacidade

Funciona em navegadores modernos (Chrome, Edge, Firefox e Safari recentes). As fontes vêm do Google Fonts; se a rede não estiver disponível, o site usa as fontes de fallback do sistema. Nenhum cálculo ou configuração é enviado para servidores. O tema, a preferência de som e a última jogada ficam apenas no armazenamento local do navegador. O som é gerado pela Web Audio API, sem arquivos de áudio externos; navegadores que bloqueiam áudio até uma interação liberam o som no primeiro clique em rolar.

Projeto independente, sem vínculo com o AnyDice. Feito com matemática, não com sorte.
