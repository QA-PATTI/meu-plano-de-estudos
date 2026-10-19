-- Dados de exemplo do Meu Plano de Estudos.
-- Este script é opcional e não deve ser executado automaticamente em produção.
-- Execute primeiro o database/schema.sql.
-- Executar este arquivo mais de uma vez cria tarefas repetidas.
-- O backend não lê este arquivo ao iniciar.

BEGIN;

INSERT INTO tarefas (titulo, descricao, materia, data_prevista, status) VALUES
  (
    'Aprender HTML',
    'Conhecer a estrutura de uma página: títulos, parágrafos, links, imagens e formulários.',
    'HTML',
    CURRENT_DATE - 7,
    'Concluído'
  ),
  (
    'Estudar CSS',
    'Praticar seletores, o modelo de caixa, cores e um layout simples com Flexbox.',
    'CSS',
    CURRENT_DATE + 3,
    'Estudando'
  ),
  (
    'Praticar JavaScript',
    'Manipular o DOM, escutar eventos e atualizar a página sem recarregá-la.',
    'JavaScript',
    CURRENT_DATE + 10,
    'A estudar'
  ),
  (
    'Entender APIs REST',
    'Aprender os métodos GET, POST, PUT e DELETE e trocar dados em JSON.',
    'APIs',
    CURRENT_DATE + 14,
    'A estudar'
  ),
  (
    'Aprender backend com Node.js',
    'Criar uma API com Express e guardar os dados em um banco PostgreSQL.',
    'Backend',
    CURRENT_DATE + 21,
    'A estudar'
  );

COMMIT;
