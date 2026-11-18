# Pesquisa e decisões: spec 005

## D1 — Tipo pelo conteúdo
Os primeiros bytes decidem o tipo (JPEG, PNG, WebP, HEIC, PDF), não a extensão nem o `Content-Type` enviado.
Um `.exe` renomeado para `.jpg` é recusado.

## D2 — Nome sorteado e pasta por mês
O arquivo vai para `ARQUIVOS_DIR/AAAA-MM/<uuid>.<ext>`; o nome original fica só no banco. Evita colisão, caminho
montado com dados da pessoa e listagem de nomes. A leitura confere que o caminho fica dentro da pasta.

## D3 — Acesso pela unidade
Cada arquivo guarda a unidade. Quem não vê a unidade recebe 404 (não 403), para não confirmar que o arquivo existe.

## D4 — Foto e conexão
A foto não entra na fila offline nesta spec: sem conexão, a tela avisa e a quantidade continua guardada. A fila de
fotos (IndexedDB) fica para a spec do offline real.

## D5 — Ordem de gravação e chaves estrangeiras
Achado ao testar no Postgres: o anexo era inserido antes do arquivo (sem `relationship`, o SQLAlchemy não sabe a
ordem). `salvar` passou a fazer flush, e os testes ligaram `PRAGMA foreign_keys=ON` para o SQLite pegar o mesmo erro.
