# Sincronização da lista com o Firebase da fila

A lista usa o mesmo Firebase do TechQueue (`filaarius`), o login Google existente e o Firestore. Cada conta armazena sua própria lista no documento `shoppingLists/{uid}`; isso fica separado dos documentos usados pela fila.

## Publicar a regra do Firestore

O arquivo de regras no GitHub é apenas a cópia de referência. Para aplicar a permissão no banco:

1. Abra o projeto `filaarius` no [Firebase Console](https://console.firebase.google.com/).
2. Entre em **Firestore Database → Rules**.
3. Dentro de `match /databases/{database}/documents { ... }`, adicione este bloco junto às outras coleções:

```text
match /shoppingLists/{userId} {
  allow read, create, update: if activeGoogleUser() && request.auth.uid == userId;
  allow delete: if false;
}
```

4. Clique em **Publish**.

`activeGoogleUser()` já é a função usada pelas regras do TechQueue para aceitar contas Google ativas e respeitar bloqueios cadastrados no projeto.

## Login Google

O provedor Google deve continuar ativado em **Authentication → Sign-in method**. O endereço `leandrosj.github.io` precisa estar na lista de domínios autorizados em **Authentication → Settings → Authorized domains**. Use a mesma conta Google na fila e na lista.

Se já existir uma lista local e outra na nuvem, a tela permite escolher uma ou mesclar antes de sincronizar.
