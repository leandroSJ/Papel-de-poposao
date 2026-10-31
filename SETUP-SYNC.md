# Sincronização e compartilhamento da lista

A lista usa o mesmo projeto Firebase do TechQueue (`filaarius`) e o login Google já existente.

- Lista pessoal: `shoppingLists/{uid}`.
- Lista compartilhada: `sharedShoppingLists/{listId}`.
- Cada participante entra com sua própria conta Google.
- Os itens são sincronizados em tempo real pelo Firestore.

## Publicar as regras do Firestore

O arquivo de regras no GitHub é uma referência. Para aplicar as permissões no banco:

1. Abra o projeto `filaarius` no [Firebase Console](https://console.firebase.google.com/).
2. Entre em **Firestore Database → Rules**.
3. Dentro de `match /databases/{database}/documents { ... }`, mantenha as funções e regras que já existem para o TechQueue e acrescente os dois blocos abaixo.
4. Clique em **Publish**.

A regra antiga da lista pessoal deve ser mantida:

```text
match /shoppingLists/{userId} {
  allow read, create, update: if activeGoogleUser() && request.auth.uid == userId;
  allow delete: if false;
}
```

Acrescente também a regra da lista compartilhada:

```text
match /sharedShoppingLists/{listId} {
  allow read: if activeGoogleUser()
    && request.auth.uid in resource.data.members;

  allow create: if activeGoogleUser()
    && request.resource.data.ownerUid == request.auth.uid
    && request.resource.data.members == [request.auth.uid]
    && request.resource.data.inviteToken is string
    && request.resource.data.items is list;

  allow update: if activeGoogleUser() && (
    (
      request.auth.uid in resource.data.members
      && request.resource.data.members == resource.data.members
      && request.resource.data.inviteToken == resource.data.inviteToken
      && request.resource.data.ownerUid == resource.data.ownerUid
      && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['items', 'updatedAt', 'joinProof'])
    )
    ||
    (
      request.resource.data.joinProof == resource.data.inviteToken
      && request.resource.data.members.size() == resource.data.members.size() + 1
      && request.resource.data.members.hasAll(resource.data.members)
      && request.resource.data.members.hasAny([request.auth.uid])
      && request.resource.data.inviteToken == resource.data.inviteToken
      && request.resource.data.ownerUid == resource.data.ownerUid
      && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['members', 'joinProof'])
    )
  );

  allow delete: if false;
}
```

A função `activeGoogleUser()` já existe nas regras atuais do TechQueue. Não a remova nem substitua. Ela continua sendo aplicada tanto às listas pessoais quanto às compartilhadas.

## Como compartilhar

1. Abra a lista e entre com sua conta Google.
2. Clique em **Conta conectada → Compartilhar lista por link**.
3. Copie o convite e envie pelo WhatsApp para a outra pessoa.
4. A outra pessoa abre o link e entra com a própria conta Google.
5. Depois de aceitar, os dois passam a ver e alterar a mesma lista em tempo real.

O link funciona como um convite: qualquer pessoa que o receber poderá entrar. Envie somente para pessoas de confiança. O identificador da lista e o código do convite são aleatórios; o conteúdo só pode ser lido por participantes autenticados.

## Login Google

O provedor Google deve continuar ativado em **Authentication → Sign-in method**. O endereço `leandrosj.github.io` precisa estar na lista de domínios autorizados em **Authentication → Settings → Authorized domains**.

## Listas que já existiam

Ao criar o primeiro compartilhamento, os itens que já estão carregados na lista pessoal são copiados para a nova lista compartilhada. A lista pessoal original não é apagada. O identificador da lista compartilhada fica salvo neste navegador; em outro aparelho, basta abrir novamente o link de convite para entrar.

Se houver uma lista local diferente da lista da nuvem, o aplicativo apresenta a escolha entre usar a nuvem, usar o aparelho ou mesclar os itens antes de sincronizar.
