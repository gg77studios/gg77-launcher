# SDK de conquistas

Todo jogo aberto pelo launcher ganha um objeto `window.GG77`, injetado pelo próprio launcher antes de a página carregar. Fora do launcher (no navegador comum) ele não existe, então o jogo continua funcionando normalmente.

## Liberar uma conquista

```js
window.GG77?.unlock("primeira-vitoria", {
  title: "Primeiro sangue",
  description: "Vença a primeira luta.",
});
```

- `id`: texto curto, só letras, números, `-` e `_` (até 48 caracteres).
- `title` e `description`: opcionais quando a conquista já está cadastrada no catálogo do launcher (`src/lib/catalog.ts`). Para jogos adicionados pelo usuário, que não têm catálogo, o launcher usa o que vier aqui.
- Chamar de novo com o mesmo `id` não faz nada: a conquista já está liberada.
- A chamada devolve uma `Promise`. Ela falha se a página não estiver numa janela de jogo do launcher.

O jogo é identificado pela janela, não por um parâmetro. Uma página nunca consegue liberar conquista de outro jogo.

## Saber se está dentro do launcher

```js
if (window.GG77?.inLauncher) {
  // por exemplo: esconder o botão "baixe o launcher"
}
```

O evento `gg77:ready` é disparado em `window` quando o SDK está pronto.

## Exemplo no Idle Legends (React)

```ts
// client/src/lib/launcher.ts
declare global {
  interface Window {
    GG77?: { unlock: (id: string, info?: { title?: string; description?: string }) => Promise<void> };
  }
}

export function unlock(id: string) {
  window.GG77?.unlock(id).catch(() => {});
}

// onde o jogo já detecta o evento:
// if (player.level >= 10) unlock("nivel-10");
```

Os ids cadastrados para o Idle Legends estão em `src/lib/catalog.ts`: os 10 feitos do jogo (`feat_*`) e 6 momentos do launcher (`primeira-vitoria`, `nivel-10`, `lendario`, `evento`, `arena-top3`, `hall-da-fama`). A integração do jogo fica em `client/src/lib/launcher.js` no repositório do Idle Legends.

## Cadastrar um jogo novo no catálogo

1. Adicione o jogo em `CATALOG` (`src/lib/catalog.ts`) com `id`, `title`, `url`, as imagens em `public/games/<id>/` e a lista de conquistas.
2. Gere uma nova versão do launcher.

Jogos fora do catálogo também podem ser adicionados por cada pessoa, pelo botão "Adicionar jogo" da biblioteca.
