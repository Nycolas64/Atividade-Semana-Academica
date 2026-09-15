import { criarServidor } from './app.js';

const PORT = process.env.PORT || 3000;
const app = criarServidor();

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
