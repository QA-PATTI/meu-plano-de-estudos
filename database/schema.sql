-- Esquema do Meu Plano de Estudos.
-- Cria a tabela somente se ela ainda não existir.
-- Este script não apaga dados e não recria tabelas.
-- Execute manualmente no editor SQL do Neon. O backend não roda este arquivo sozinho.

CREATE TABLE IF NOT EXISTS tarefas (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT,
  materia VARCHAR(100) NOT NULL,
  data_prevista DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'A estudar',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tarefas_status_valido CHECK (
    status IN ('A estudar', 'Estudando', 'Concluído')
  )
);
