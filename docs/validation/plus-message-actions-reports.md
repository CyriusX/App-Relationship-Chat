# Ações de mensagens próprias

Branch: `fix/plus-message-actions-reports`. Sem nova migração; utiliza as tabelas e a outbox existentes.

`PATCH /v1/messages/:messageId` aceita `content` e `expectedEditedAt` opcional (null para a revisão original). Só o autor pode editar texto, até 900.000 ms após o envio original, inclusive. Conflito de revisão e prazo expirado retornam 409. Conteúdo já aplicado é repetição sem novo horário/evento. A revisão avança mesmo quando o relógio não avança um milissegundo.

`DELETE /v1/messages/:messageId` é lógico e idempotente. Exige autor, participação e sessão ativa; não exige assinatura, disponibilidade ou ausência de bloqueio do interlocutor. Releitura após o bloqueio dos participantes impede edição concorrente de ressuscitar conteúdo excluído. Alteração e evento são persistidos na mesma transação, com os limites já usados no envio (timeout 20 s, maxWait 15 s).

HTTP e comandos legados Socket.io usam o mesmo caso de uso. A outbox publica o estado atual da mensagem e usa o conteúdo atualizado na notificação ainda não enviada. Mensagens excluídas não são notificadas.

As rotas de mensagens fornecem `X-Server-Time` em ISO para a indicação de prazo no app, sem confiar no relógio do dispositivo. O servidor permanece a autoridade.

Validação: 82 testes passaram e TypeScript sem erros. A rodada local HTTP/socket/banco confirmou concorrência, repetição, autoria, bloqueios e exclusão; a execução completa no Neon encontrou lentidão/timeouts e é registrada separadamente. Evidências nativas e relatório estão no aplicativo em `docs/validation/plus-message-actions-reports/`.

Após restaurar o ambiente original, a repetição no Neon confirmou sete cenários, mas a corrida de edição/exclusão recebeu 503 por timeout de 5 s na validação da conta Chat → CORE. Os 16 cenários completos e as telas nativas foram validados na base local isolada; a execução integral no Neon permanece pendente.
