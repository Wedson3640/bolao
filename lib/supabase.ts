import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipo espelhando a tabela no banco
export type ParticipanteDB = {
  id: number;
  nome: string;
  placar_brasil: string;
  placar_haiti: string;
  pago: boolean;
  criado_em: string;
};

export type ResultadoJogoDB = {
  id: number;
  brasil: string | null;
  haiti: string | null;
};
