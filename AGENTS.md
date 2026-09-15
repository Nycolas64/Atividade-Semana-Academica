Stack:Node.js, Express, SQLite (API) e interface Web.
Contrato: Seguir o contrato-api.md e o padrão de erro {"erro": "CODIGO", "mensagem": "..."}
Arquitetura: Controladores tratam apenas HTTP, regras de negócio e dados ficam em services.
Identificação: Validar o cabeçalho X-Usuario (retornar 401 USUARIO_DESCONHECIDO se ausente)
Tempo: Com MODO\_TESTE=1, usar o relógio de /_teste/relogio (nunca new Date())