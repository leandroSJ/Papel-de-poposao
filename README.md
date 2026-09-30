# Grana — Lista de compras

Uma lista de compras responsiva, feita com Vite e Tailwind CSS. Organize os produtos por categoria, acompanhe os preços e marque o que já colocou no carrinho.

## Recursos

- Categorias para café da manhã, almoço, material de limpeza, hortifruti e outros.
- Adicionar, editar e excluir produtos.
- Informar quantidade, unidade, preço unitário e local de compra.
- Marcar itens comprados com checkbox e acompanhar o progresso.
- Total estimado e valor pendente atualizados automaticamente.
- Busca por nome e filtros por categoria.
- Dados salvos no `localStorage` do navegador.
- Layout responsivo para celular, tablet e desktop.

## Executar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## GitHub Pages

O workflow em `.github/workflows/deploy.yml` compila e publica o site automaticamente a cada push na branch `main`. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como origem.
