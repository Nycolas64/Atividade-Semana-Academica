# AI Prompts, Agents, Skills, and SDD Overview

| | |
|---|---|
| Sessão | `ses_f969b75b2ffe5p8Ab79OLrXwo1` |
| Pasta | Documents/Default Project |
| Período | 03/09 19:29 → 03/09 21:51 |
| Modelo | google/gemini-3.5-flash-lite, google/gemini-3.8-flash, google/gemini-3.7-flash |
| Requisições ao modelo | 62 |
| Tokens de entrada / saída | 691.517 / 57.364 |
| Skills | customize-opencode |
| Subagentes | — |
| Execuções de teste | 0 vermelhas, 0 verdes |
| TDD | 0 ciclo(s) vermelho → verde · 0 teste(s) que já nasceram verdes · 0 vez(es) teste e código juntos |
| Arquivos editados | 1 de teste, 10 de código, 0 de entrevista, 0 de spec, 0 de contexto, 0 de auditoria |
| Alertas | — |

## Linha do tempo

- `03/09 19:48` **prompt** — Can you teach me about all of this: Prompt | Instructions | per session Agents | General rules | per repo Skills | Repeated instructions | global or local SDD | special instructions | per task TDD | tests before development | always
- `03/09 19:51` **prompt** — Can you bake me a PDF teaching all of that in brazilian portuguese at the path /home/giroto/Documents/Faculdade - Unifil/Estágio Obrigatório/B2 with the melhor didatica possivel please?
- `03/09 19:51` edita código `/tmp/generate_pdf.py`
- `03/09 19:56` **prompt** — Add subagents to it
- `03/09 19:56` edita código `/tmp/generate_pdf.py` (2×)
- `03/09 20:17` **prompt** — Good! Can you improve the doc? adding info on how to use it properly along opencode?
- `03/09 20:17` edita código `/tmp/generate_pdf.py` (2×)
- `03/09 20:18` **prompt** — That doesn't look very detailed... I wanted a step by step guide on all of them
- `03/09 20:19` edita código `/tmp/generate_pdf.py`
- `03/09 20:20` **prompt** — Still feels incomplete, the steps were supposed to be mixed along the topics, not all at once in the end also it feels cheap, doesn't have references on where to click, which screens to reach inside the OpenCode application or what files I should be taking care
- `03/09 20:21` edita código `/tmp/generate_pdf.py`
- `03/09 21:26` **prompt** — you're still being too general, I need a proper guide. when I read this, I don't know which buttons to click to use it strongly along my opencode
- `03/09 21:26` carrega a skill **customize-opencode**
- `03/09 21:42` **prompt** — preciso de imagens no documento, screenshots do opencode/sistema sendo usado em cada etapa explique o que é todo/todowrite lá também
- `03/09 21:44` edita teste `/tmp/test_render.py`
- `03/09 21:44` edita código `/tmp/generate_diagrams.py`
- `03/09 21:45` edita código `/tmp/generate_master_pdf.py` (2×)
- `03/09 21:50` **prompt** — Você gerou as telas ou usou prints da internet?
- `03/09 21:51` **prompt** — não me parecem telas reais do opencode. preciso de prints reais
