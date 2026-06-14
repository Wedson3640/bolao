-- ============================================================
-- Cole este SQL no Supabase → SQL Editor → Run
-- ============================================================

-- 1. Criar tabela de participantes
CREATE TABLE IF NOT EXISTS participantes (
  id           SERIAL PRIMARY KEY,
  nome         TEXT    NOT NULL,
  placar_brasil TEXT   NOT NULL DEFAULT '?',
  placar_haiti  TEXT   NOT NULL DEFAULT '?',
  pago         BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;

-- 3. Política pública: qualquer um pode ler e inserir
--    (admin da aplicação controla via senha no front-end)
CREATE POLICY "leitura_publica"
  ON participantes FOR SELECT USING (true);

CREATE POLICY "insercao_publica"
  ON participantes FOR INSERT WITH CHECK (true);

-- 4. Update e Delete apenas via service_role (ou libere se preferir)
CREATE POLICY "atualizacao_publica"
  ON participantes FOR UPDATE USING (true);

CREATE POLICY "exclusao_publica"
  ON participantes FOR DELETE USING (true);

-- 5. Habilitar Realtime para atualização ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE participantes;
