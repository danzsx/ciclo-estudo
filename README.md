# Ciclo — Aplicativo Inteligente de Estudos

O **Ciclo** é um aplicativo desktop e web moderno para organizar sessões de estudo por meio de um ciclo inteligente, dinâmico e equilibrado de disciplinas.

Diferente de um cronograma semanal rígido que gera culpa ao atrasar, o ciclo de estudos avança conforme o tempo real estudado e recomeça após a última matéria, priorizando disciplinas de maior peso e dificuldade sem abandonar os demais conteúdos.

---

## 1. Arquitetura e Tecnologias

A aplicação foi estruturada seguindo os princípios de **Clean Architecture** e separação total de responsabilidades, garantindo 100% de reaproveitamento da lógica de negócio para uma futura versão mobile (Android / iOS):

```
┌─────────────────────────────────────────────────────────┐
│                     CAMADA DE UI                        │
│          React 19 + TypeScript + Vanilla CSS            │
│  (Dashboard, Disciplinas, Meu Ciclo, Estudar, Histórico)│
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                 REPOSITÓRIO & PERSISTÊNCIA              │
│       StorageAdapter Contract (Tauri / LocalStorage)    │
│    (Fila de gravação atômica, migrações, backup JSON)   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  NÚCLEO DE DOMÍNIO PURO                 │
│                     (src/core/*.ts)                     │
│  - Algoritmo de distribuição ponderada com piso e teto  │
│  - Cronômetro timestamp resiliente a fechamentos/queda  │
│  - Validações, normalizações defensivas e estatísticas  │
│       * Zero dependências de UI, DOM ou Node.js *       │
└─────────────────────────────────────────────────────────┘
```

- **Lógica de Domínio (`src/core/`)**: TypeScript puro. Funções puras e determinísticas testadas com Vitest (56 testes unitários com 100% de cobertura dos fluxos centrais).
- **Persistência (`src/storage/`)**:
  - **Desktop Nativo (Tauri v2)**: Backend Rust com gravação atômica em disco (`ciclo-data.json.tmp` -> `rename`), rotação automática de cópia de segurança (`ciclo-data.bak.json`) e quarentena de arquivos corrompidos.
  - **Local Web / PWA**: Adaptador `LocalStorage` automático para desenvolvimento imediato e uso local sem depender de internet.
- **Interface e Design**: React 19, Lucide Icons, tipografia Inter & Outfit, suporte a temas Claro e Escuro (Dark Mode elegante), componentes glassmorphism e feedback instantâneo.

---

## 2. Como Executar

### Opção 1: Execução Rápida no Windows (Dois Cliques)
Dê um duplo clique no arquivo [`iniciar-ciclo.bat`](file:///c:/Users/nathu/OneDrive/Documentos/ciclo-de-estudo/ciclo-estudo/iniciar-ciclo.bat) na pasta raiz do projeto. Ele abrirá automaticamente o aplicativo no seu navegador padrão.

### Opção 2: Pelo Terminal
Na pasta do projeto, execute:
```bash
npm run dev
```
Em seguida, acesse no navegador: `http://localhost:5173`

---

## 3. Como Rodar os Testes

O projeto conta com suíte completa de testes automatizados com Vitest:
```bash
npm test
```
Para rodar os testes em modo contínuo (watch):
```bash
npm run test:watch
```

---

## 4. Como Gerar o Instalador Desktop para Windows (.msi e .exe)

O Ciclo está configurado com o **Tauri v2** para empacotar em um executável ultraleve para Windows:

1. Certifique-se de que o Visual Studio com o workload **"Desenvolvimento para desktop com C++"** (incluindo o MSVC v143 e o Windows 10/11 SDK) esteja instalado no seu computador.
2. Execute o comando:
   ```bash
   npm run app:build
   ```
3. O instalador final em formato `.msi` e executável `.exe` (NSIS) será gerado na pasta:
   ```
   src-tauri/target/release/bundle/msi/
   src-tauri/target/release/bundle/nsis/
   ```

---

## 5. Local de Armazenamento dos Dados

Os dados ficam salvos de forma 100% local no seu computador, preservando tudo ao fechar e reabrir:
- **No aplicativo Tauri desktop nativo**:
  `%APPDATA%\com.ciclo.app\ciclo-data.json`
- **No modo navegador local**:
  Armazenamento persistente `localStorage` com chave `ciclo:data` e cópia `ciclo:data:bak`.
- **Backups**: Você pode a qualquer momento clicar em **Ajustes > Exportar Backup (JSON)** para salvar um arquivo `.json` completo com suas disciplinas, histórico e ciclo.

---

## 6. Funcionalidades Implementadas

1. **Dashboard**: Resumo da próxima matéria, botão de início rápido, indicadores de estudo (tempo total, sessões concluídas, streak de dias) e gráfico diário de 7 dias.
2. **Cadastro de Disciplinas**: Inclusão, edição, exclusão e reordenação com nome, peso (1 a 5), dificuldade (fácil, média, difícil), duração personalizada por sessão e paleta de cores.
3. **Meu Ciclo Inteligente**:
   - Algoritmo de distribuição proporcional e ponderado (peso × dificuldade).
   - Limites de piso e teto para impedir que matérias dominem o ciclo ou sejam negligenciadas.
   - Intercalação automática para evitar repetição consecutiva da mesma matéria.
   - Explicação passo a passo em linguagem simples de por que cada disciplina recebeu aquele tempo.
4. **Estudar & Cronômetro**:
   - Cronômetro digital baseado em marcas de tempo (imune a travamentos e fechamento acidental).
   - Iniciar, pausar, retomar e concluir sessão.
   - Ajuste fino dos minutos estudados e bloco de anotações persistente.
5. **Histórico & Estatísticas**: Registro detalhado das sessões anteriores com filtro por matéria, tempo previsto vs. estudado, status (concluída, parcial, pulada) e edição de anotações.
6. **Ajustes & Backup**: Exportação e importação de backup em JSON, configuração de duração total do ciclo e alternância entre temas Claro, Escuro e Sistema.

---

## 7. Próximos Passos Recomendados para Versão Mobile (Android e iOS)

1. Como o diretório `src/core/` é puramente TypeScript e desacoplado da interface gráfica, ele pode ser copiado ou importado diretamente em um projeto **Tauri Mobile** (`npm run tauri android init` / `npm run tauri ios init`) ou **React Native / Expo**.
2. Criar um `StorageAdapter` móvel (usando SQLite local ou MMKV / AsyncStorage).
3. Implementar notificações nativas do sistema operacional no celular para avisar o estudante quando a sessão do cronômetro atingir a duração planejada.
