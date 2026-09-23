# Atividade Semana Academica

| | |
|---|---|
| Sessão | `ses_f36055c9cffeACeBRHClzyvLFI` |
| Pasta | Documents/Default Project |
| Período | 22/09 13:37 → 22/09 14:59 |
| Modelo | opencode/mimo-v2.6-flash-free |
| Requisições ao modelo | 43 |
| Tokens de entrada / saída | 90.824 / 22.874 |
| Skills | grilling |
| Subagentes | — |
| Execuções de teste | 0 vermelhas, 0 verdes |
| TDD | 0 ciclo(s) vermelho → verde · 0 teste(s) que já nasceram verdes · 0 vez(es) teste e código juntos |
| Arquivos editados | 0 de teste, 0 de código, 1 de entrevista, 6 de spec, 0 de contexto, 0 de auditoria |
| Alertas | — |

## Linha do tempo

- `22/09 13:37` **prompt** — Quero começar o projeto Semana Acadêmica do zero. Clone o repositório base https://github.com/gustavo-qss/semana-academica na pasta em que estamos trabalhando em /home/giroto/DevFaculdade e, depois, entre nele. Por enquanto não altere nada. Só confira se o clone deu certo e me mostre como o repositório está organizado. Ainda não vamos começar a desenvolver.
- `22/09 13:38` **prompt** — Beleza. Agora vamos começar a primeira rodada de entrevistas do módulo M2. Leia o contrato-api.md e use a skill grilling para conduzir a entrevista comigo sobre as regras de negócio do M2 — inscrições e lista de espera. Faça as perguntas uma por vez, como numa conversa normal. Não implemente nada, não crie a spec ainda e não tente responder por mim. Quando surgir alguma questão cuja resposta depe…
- `22/09 13:38` carrega a skill **grilling**
- `22/09 13:48` **prompt** — Quando não houver vaga, a inscrição já entra como em_espera, no fim da fila. Se houver vaga, ela entra como confirmada. A lotação não é considerada um erro. RN-205.
- `22/09 13:49` **prompt** — Quando uma vaga é liberada, o primeiro participante da fila de espera é automaticamente convocado. Ele passa para convocada e tem 2 horas para confirmar. RN-211.
- `22/09 13:50` **prompt** — o próximo da fila é convocado automaticamente, em cascata. RN-213.
- `22/09 13:51` **prompt** — Se duas vagas forem liberadas, os primeiros participantes da fila podem ser convocados conforme cada vaga fica disponível. Não é necessário esperar uma convocação expirar para convocar o próximo. RN-211.
- `22/09 13:53` **prompt** — Quando alguém sai da frente da fila, a posição dos demais é recalculada. A posição 1 continua sendo a do próximo participante a ser convocado, seguindo a ordem de chegada. RN-216.
- `22/09 13:54` **prompt** — A inscrição pode ser cancelada pelo participante até a atividade começar, independentemente de estar confirmada, em espera ou convocada. Inscrições já canceladas ou expiradas não podem ser canceladas novamente. RN-209 e RN-210.
- `22/09 13:54` **prompt** — A confirmação só pode ser feita enquanto a convocação estiver válida. Dentro desse prazo, ela refaz as verificações de conflito de horário e limite de minicursos. Se a convocação estiver vencida, a confirmação é recusada com CONVOCACAO_EXPIRADA. RN-214 e RN-215.
- `22/09 13:54` **prompt** — A ordem de precedência é: atividade inexistente (404) → atividade cancelada → inscrições encerradas → bloqueio (quando aplicável) → já inscrito → conflito de horário → limite de minicursos. RN-208.
- `22/09 13:55` **prompt** — Quando uma inscrição convocada é cancelada, a vaga liberada é oferecida automaticamente ao primeiro participante da fila de espera, seguindo a mesma lógica de convocação. RN-211.
- `22/09 13:56` **prompt** — O limite é de 3 minicursos ocupando vaga ao mesmo tempo, considerando inscrições confirmadas e convocadas. Inscrições em espera não contam. RN-207.
- `22/09 13:56` **prompt** — Ao ocupar uma vaga, tanto uma inscrição confirmada quanto uma convocada contam para o conflito de horário. A regra vale independentemente de a outra atividade ser palestra ou minicurso. Quem está apenas em espera não é verificado. RN-206.
- `22/09 13:57` **prompt** — Quem cancelou pode se inscrever novamente na mesma atividade, entrando pelo fim da fila. RN-204.
- `22/09 13:58` **prompt** — O início é definido pelo início do primeiro encontro da atividade. A partir desse horário, a inscrição não pode mais ser cancelada. RN-209.
- `22/09 13:59` **prompt** — As inscrições se encerram 30 minutos antes do início do primeiro encontro da atividade. RN-202.
- `22/09 13:59` **prompt** — A regra de precedência entre CONFLITO_DE_HORARIO e LIMITE_DE_MINICURSOS não está definida no documento de requisitos.
- `22/09 14:01` **prompt** — Quando uma inscrição confirmada é cancelada, a vaga liberada convoca automaticamente o primeiro participante da fila de espera, seguindo a mesma cascata. RN-211.
- `22/09 14:01` **prompt** — Quem teve a convocação expirada pode se inscrever novamente na mesma atividade, pois a restrição de uma inscrição ativa não se aplica à inscrição expirada. RN-204 e RN-213.
- `22/09 14:02` **prompt** — ocupadas = confirmada + convocada. emEspera = em_espera. Inscrições canceladas ou expiradas não ocupam vaga e não entram na contagem da fila de espera. RN-204 e RN-205.
- `22/09 14:02` **prompt** — Um participante só pode consultar as próprias inscrições. Se tentar consultar a inscrição de outro participante, a resposta deve ser 404, e não 403. RN-218. quantas perguntas ainda faltam?
- `22/09 14:03` **prompt** — sim
- `22/09 14:03` **prompt** — Ao confirmar dentro do prazo, a inscrição passa de convocada para confirmada e deixa de ocupar a posição de convocação. RN-214.
- `22/09 14:04` **prompt** — O documento não define a precedência entre INSCRICAO_INATIVA e ATIVIDADE_JA_INICIADA nesse caso.
- `22/09 14:04` **prompt** — A expiração e a cascata devem acontecer mesmo sem ninguém acessar o sistema; a convocação seguinte é processada a partir do vencimento, sem depender de uma requisição. RN-213.
- `22/09 14:05` **prompt** — O documento não define o que acontece com as inscrições em_espera ou convocada quando chega o início do primeiro encontro da atividade.
- `22/09 14:05` **prompt** — O bloqueio é uma regra do M5. No M2, deve ser tratado apenas como ponto de integração previsto pelo RN-208; a definição e o comportamento do bloqueio ficam para o M5. RN-208 e RN-507.
- `22/09 14:06` **prompt** — A convocação vencida prevalece: a confirmação deve ser recusada como CONVOCACAO_EXPIRADA, sem aplicar as verificações de conflito de horário ou limite de minicursos. RN-215.
- `22/09 14:12` **prompt** — Pode confirmar o resumo, mas faça dois ajustes antes de encerrar: No item 5, não trate “convocações em paralelo, uma por vaga” como regra fechada. O RN-211 diz que toda vaga liberada convoca o primeiro participante da fila de espera, mas não especifica explicitamente o comportamento de múltiplas vagas liberadas simultaneamente. No item 7, não trate “fila recalculada” como regra explícita. O RN-21…
- `22/09 14:13` **prompt** — Use a skill to-spec. Escreva specs/M2-inscricoes.md a partir de entrevistas/M2-inscricoes.md. Cada regra deve citar a pergunta correspondente (P-xx) e, quando a regra vier do documento de requisitos, citar também a RN-xxx. Não invente regras para os três PENDENTEs; mantenha-os explicitamente como pendências. Inclua também a observação aberta sobre múltiplas vagas liberadas ao mesmo tempo. Depois …
- `22/09 14:14` edita entrevista `/home/giroto/DevFaculdade/semana-academica/entrevistas/M2-inscricoes.md`
- `22/09 14:15` edita spec `/home/giroto/DevFaculdade/semana-academica/specs/M2-inscricoes.md` (6×)
- `22/09 14:58` **prompt** — faço isso pelo github web ou erminal
- `22/09 14:59` **prompt** — eu nao clonei o repo do meu amigo
- `22/09 14:59` **prompt** — esse é o do prof
