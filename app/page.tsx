"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { ParticipanteDB } from "@/lib/supabase";

type Participante = {
  id: number;
  nome: string;
  placarBrasil: string;
  placarHaiti: string;
  pago: boolean;
};

// Converte do formato do banco para o formato do componente
const fromDB = (p: ParticipanteDB): Participante => ({
  id: p.id,
  nome: p.nome,
  placarBrasil: p.placar_brasil,
  placarHaiti: p.placar_haiti,
  pago: p.pago,
});

// Capitaliza a primeira letra de cada palavra (nome e sobrenome)
const capitalizarNome = (texto: string) =>
  texto.toLowerCase().replace(/(?:^|\s)\S/g, (l) => l.toUpperCase());

const CHAVE_PIX   = "aristelacavalcante585@gmail.com";
const PAYLOAD_PIX = "00020101021126530014br.gov.bcb.pix0131aristelacavalcante585@gmail.com52040000530398654045.005802BR5918ARISTELA C S VERAS6008TERESINA62070503***63044E5C";
const QR_PIX_URL  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PAYLOAD_PIX)}`;
const SENHA_ADMIN = "Ar1st3l@";

export default function BolaoPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [carregando, setCarregando]       = useState(true);
  const [adminLogado, setAdminLogado]     = useState(false);
  const [senhaInput, setSenhaInput]       = useState("");
  const [mostrarLogin, setMostrarLogin]   = useState(false);
  const [novoNome, setNovoNome]           = useState("");
  const [novoPlacarBrasil, setNovoPlacarBrasil] = useState("");
  const [novoPlacarHaiti,  setNovoPlacarHaiti]  = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarPendentes, setMostrarPendentes]   = useState(false);
  const [confirmarExcluir, setConfirmarExcluir]   = useState<number | null>(null);

  // Modal Apostar
  const [mostrarApostar, setMostrarApostar] = useState(false);
  const [apostaNome, setApostaNome]         = useState("");
  const [apostaBrasil, setApostaBrasil]     = useState("");
  const [apostaHaiti, setApostaHaiti]       = useState("");
  const [apostaCopied, setApostaCopied]     = useState(false);
  const [apostaEnviada, setApostaEnviada]   = useState(false);
  const [apostaErro, setApostaErro]         = useState("");
  const [apostaEnviando, setApostaEnviando] = useState(false);

  // ── Buscar participantes do banco ──────────────────────────────
  const buscarParticipantes = useCallback(async () => {
    const { data, error } = await supabase
      .from("participantes")
      .select("*")
      .order("criado_em", { ascending: true });
    if (!error && data) setParticipantes(data.map(fromDB));
    setCarregando(false);
  }, []);

  useEffect(() => {
    buscarParticipantes();

    // Atualização em tempo real — reflete mudanças de outros dispositivos
    const canal = supabase
      .channel("participantes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => {
        buscarParticipantes();
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [buscarParticipantes]);

  // ── CRUD ──────────────────────────────────────────────────────
  const togglePagamento = async (id: number) => {
    if (!adminLogado) return;
    const atual = participantes.find((p) => p.id === id);
    if (!atual) return;
    // Optimistic update
    setParticipantes((prev) => prev.map((p) => p.id === id ? { ...p, pago: !p.pago } : p));
    await supabase.from("participantes").update({ pago: !atual.pago }).eq("id", id);
  };

  const adicionarParticipante = async () => {
    if (!novoNome.trim()) return;
    const { data, error } = await supabase
      .from("participantes")
      .insert({
        nome: capitalizarNome(novoNome.trim()),
        placar_brasil: novoPlacarBrasil || "?",
        placar_haiti:  novoPlacarHaiti  || "?",
        pago: false,
      })
      .select()
      .single();
    if (!error && data) setParticipantes((prev) => [...prev, fromDB(data)]);
    setNovoNome(""); setNovoPlacarBrasil(""); setNovoPlacarHaiti("");
    setMostrarFormulario(false);
  };

  const removerParticipante = async (id: number) => {
    setParticipantes((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("participantes").delete().eq("id", id);
  };

  const enviarAposta = async () => {
    if (!apostaNome.trim() || !apostaBrasil || !apostaHaiti) return;
    setApostaEnviando(true);
    setApostaErro("");
    const { data, error } = await supabase
      .from("participantes")
      .insert({
        nome: capitalizarNome(apostaNome.trim()),
        placar_brasil: apostaBrasil,
        placar_haiti:  apostaHaiti,
        pago: false,
      })
      .select()
      .single();
    setApostaEnviando(false);
    if (error) {
      setApostaErro("Erro ao salvar aposta. Tente novamente.");
      console.error("Supabase error:", error.message);
      return;
    }
    if (data) setParticipantes((prev) => [...prev, fromDB(data)]);
    setApostaEnviada(true);
  };

  // ── Outros ────────────────────────────────────────────────────
  const fazerLogin = () => {
    if (senhaInput === SENHA_ADMIN) {
      setAdminLogado(true); setMostrarLogin(false); setSenhaInput("");
    } else { alert("Senha incorreta!"); }
  };

  const fecharApostar = () => {
    setMostrarApostar(false); setApostaNome(""); setApostaBrasil("");
    setApostaHaiti(""); setApostaCopied(false); setApostaEnviada(false);
    setApostaErro(""); setApostaEnviando(false);
  };

  const copiarPix = () => {
    navigator.clipboard.writeText(PAYLOAD_PIX);
    setApostaCopied(true);
    setTimeout(() => setApostaCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ══════════════════════ CABEÇALHO ══════════════════════ */}
      <header className="bg-gradient-to-b from-green-700 to-green-600 shadow-xl">
        <div className="max-w-4xl mx-auto px-3 py-2 flex flex-col items-center gap-1.5">

          {/* Título */}
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <h1 className="text-base font-black text-white tracking-wide uppercase drop-shadow">
              Bolão Oficial
            </h1>
            <span className="text-base">🏆</span>
          </div>

          {/* Valor da cota */}
          <div className="bg-yellow-400 text-green-900 font-black text-xs px-4 py-0.5 rounded-full shadow border border-yellow-500">
            💰 Valor da Cota: R$ 5,00
          </div>

          {/* Times + VS */}
          <div className="flex items-center gap-3 sm:gap-6">

            {/* Brasil */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-black text-sm tracking-wide drop-shadow">Brasil</span>
              <Image
                src="https://flagcdn.com/w160/br.png"
                alt="Bandeira do Brasil"
                width={96}
                height={64}
                className="rounded-lg shadow-md border-2 border-white/40 object-cover"
                unoptimized
              />
            </div>

            {/* VS + data */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-black text-lg sm:text-xl bg-green-900/50 px-4 py-0.5 rounded-lg border border-yellow-400 drop-shadow">
                VS
              </span>
              <div className="text-center text-white font-semibold bg-green-900/40 rounded-md px-2 py-1 leading-5">
                <div className="text-[11px]">📅 19/06/2025</div>
                <div className="text-[11px]">🕙 21h30</div>
              </div>
            </div>

            {/* Haiti */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-black text-sm tracking-wide drop-shadow">Haiti</span>
              <Image
                src="https://flagcdn.com/w160/ht.png"
                alt="Bandeira do Haiti"
                width={96}
                height={64}
                className="rounded-lg shadow-md border-2 border-white/40 object-cover"
                unoptimized
              />
            </div>

          </div>
        </div>
      </header>

      {/* ══════════════════════ CONTEÚDO ══════════════════════ */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Carregando */}
        {carregando && (
          <div className="flex justify-center items-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm font-semibold">Carregando apostas...</span>
          </div>
        )}

        {!carregando && (
          <>

        {/* Botão Apostar em destaque */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setMostrarApostar(true)}
            className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-green-900 font-black text-base sm:text-lg px-8 sm:px-10 py-2.5 sm:py-3 rounded-2xl shadow-lg border-2 border-yellow-500 transition-all flex items-center gap-2"
          >
            🎯 Apostar Agora!
          </button>
        </div>

        {/* Barra de ações */}
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h2 className="text-gray-700 text-base sm:text-xl font-bold">📋 Planilha</h2>
          <div className="flex gap-2">
            {adminLogado ? (
              <>
                <button
                  onClick={() => setMostrarFormulario(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow transition-all"
                >
                  ➕ Adicionar
                </button>
                <button
                  onClick={() => setAdminLogado(false)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm shadow transition-all"
                >
                  🔓 Sair Admin
                </button>
              </>
            ) : (
              <button
                onClick={() => setMostrarLogin(true)}
                className="bg-white hover:bg-gray-50 text-green-700 font-bold px-4 py-2 rounded-lg text-sm shadow transition-all border border-green-300"
              >
                🔐 Admin
              </button>
            )}
          </div>
        </div>

        {/* Badge admin + painel pendentes */}
        {adminLogado && (
          <div className="mb-4 flex flex-col gap-3">

            {/* Badge */}
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 font-semibold text-sm px-4 py-2 rounded-lg inline-flex items-center gap-2 self-start">
              ✅ Modo Admin ativo — clique no status para alterar o pagamento
            </div>

            {/* Botão abrir/fechar pendentes */}
            <button
              onClick={() => setMostrarPendentes((v) => !v)}
              className="self-start flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-bold text-sm px-4 py-2 rounded-lg transition-all"
            >
              <span className="font-black">✕</span>
              {mostrarPendentes ? "Ocultar" : "Ver"} pagamentos pendentes
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {participantes.filter((p) => !p.pago).length}
              </span>
            </button>

            {/* Painel de pendentes */}
            {mostrarPendentes && (
              <div className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow">
                <div className="bg-red-500 px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-black text-sm">⏳ Pagamentos Pendentes</span>
                  <span className="bg-white text-red-600 text-xs font-black px-2 py-0.5 rounded-full">
                    {participantes.filter((p) => !p.pago).length}
                  </span>
                </div>

                {participantes.filter((p) => !p.pago).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">🎉 Todos os participantes já pagaram!</p>
                ) : (
                  <ul className="divide-y divide-red-50">
                    {participantes
                      .filter((p) => !p.pago)
                      .map((p) => (
                        <li key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="bg-gray-200 text-gray-600 font-black text-xs w-6 h-6 rounded-full inline-flex items-center justify-center">
                              {p.id}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{p.nome}</p>
                              <p className="text-xs text-gray-400">
                                Palpite: {p.placarBrasil} × {p.placarHaiti}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => togglePagamento(p.id)}
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-black px-3 py-1.5 rounded-lg transition-all"
                          >
                            ✅ Marcar como Pago
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TABELA ── */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-green-700 text-white">
                  {/* # */}
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black text-xs sm:text-sm w-8 sm:w-12">#</th>

                  {/* Nome */}
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-black text-xs sm:text-sm">Nome</th>

                  {/* Placar — mobile: coluna única "BR × HT", desktop: duas colunas */}
                  <th className="table-cell sm:hidden px-2 py-2 text-center font-black text-xs">
                    <div className="flex items-center justify-center gap-1">
                      <Image src="https://flagcdn.com/w40/br.png" alt="BR" width={18} height={12} className="rounded" unoptimized />
                      <span className="text-[10px]">×</span>
                      <Image src="https://flagcdn.com/w40/ht.png" alt="HT" width={18} height={12} className="rounded" unoptimized />
                    </div>
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-center font-black text-sm">
                    <div className="flex flex-col items-center gap-0.5">
                      <Image src="https://flagcdn.com/w40/br.png" alt="Brasil" width={28} height={19} className="rounded shadow" unoptimized />
                      <span>Brasil</span>
                    </div>
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-center font-black text-sm">
                    <div className="flex flex-col items-center gap-0.5">
                      <Image src="https://flagcdn.com/w40/ht.png" alt="Haiti" width={28} height={19} className="rounded shadow" unoptimized />
                      <span>Haiti</span>
                    </div>
                  </th>

                  {/* Status */}
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black text-xs sm:text-sm">Pago</th>

                  {/* Admin */}
                  {adminLogado && (
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black text-xs sm:text-sm w-8 sm:w-12"></th>
                  )}
                </tr>
              </thead>

              <tbody>
                {participantes.map((p, index) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-yellow-50`}
                  >
                    {/* # */}
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <span className="bg-green-700 text-white font-black text-[10px] sm:text-xs w-5 h-5 sm:w-7 sm:h-7 rounded-full inline-flex items-center justify-center">
                        {p.id}
                      </span>
                    </td>

                    {/* Nome */}
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm leading-tight block max-w-[110px] sm:max-w-none">
                        {p.nome}
                      </span>
                    </td>

                    {/* Placar mobile — coluna única "3 × 1" */}
                    <td className="table-cell sm:hidden px-2 py-2 text-center">
                      <span className="inline-flex items-center gap-1 font-black text-xs">
                        <span className="text-green-700">{p.placarBrasil}</span>
                        <span className="text-gray-400">×</span>
                        <span className="text-blue-700">{p.placarHaiti}</span>
                      </span>
                    </td>

                    {/* Placar Brasil — desktop */}
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <span className="bg-green-100 text-green-800 font-black text-lg w-10 h-10 rounded-lg inline-flex items-center justify-center border-2 border-green-300">
                        {p.placarBrasil}
                      </span>
                    </td>

                    {/* Placar Haiti — desktop */}
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <span className="bg-blue-50 text-blue-700 font-black text-lg w-10 h-10 rounded-lg inline-flex items-center justify-center border-2 border-blue-200">
                        {p.placarHaiti}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <button
                        onClick={() => togglePagamento(p.id)}
                        disabled={!adminLogado}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 font-bold transition-all ${
                          adminLogado ? "cursor-pointer hover:opacity-70" : "cursor-default"
                        } ${p.pago ? "text-green-600" : "text-red-500"}`}
                      >
                        {p.pago ? (
                          <>
                            <span className="text-sm sm:text-base">✅</span>
                            <span className="hidden sm:inline text-sm">Pago</span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-sm sm:text-base">✕</span>
                            <span className="hidden sm:inline text-sm">Pendente</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Excluir (admin) */}
                    {adminLogado && (
                      <td className="px-2 sm:px-3 py-2 sm:py-3 text-center">
                        {confirmarExcluir === p.id ? (
                          /* Confirmação inline */
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-red-600 font-bold leading-tight">Excluir?</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { removerParticipante(p.id); setConfirmarExcluir(null); }}
                                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded transition-all"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmarExcluir(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded transition-all"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Botão excluir */
                          <button
                            onClick={() => setConfirmarExcluir(p.id)}
                            className="inline-flex items-center gap-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-1.5 sm:px-2 py-1 transition-all text-xs font-bold"
                            title="Excluir apostador"
                          >
                            🗑️ <span className="hidden sm:inline">Excluir</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-green-700 text-white">
                  <td colSpan={adminLogado ? 6 : 5} className="px-3 sm:px-4 py-2 sm:py-2.5">
                    <div className="flex justify-between items-center flex-wrap gap-1 text-xs sm:text-sm">
                      <span className="font-semibold">
                        Total: <strong>{participantes.length}</strong>
                      </span>
                      <div className="flex gap-3">
                        <span>✅ <strong>{participantes.filter((p) => p.pago).length}</strong></span>
                        <span>✕ <strong>{participantes.filter((p) => !p.pago).length}</strong></span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Banner PIX */}
        <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <div>
              <p className="text-green-800 font-black text-sm">Pague sua cota — R$ 5,00 via PIX</p>
              <p className="text-gray-500 text-xs">Chave: <strong className="text-green-700 select-all">{CHAVE_PIX}</strong></p>
            </div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(CHAVE_PIX); }}
            className="shrink-0 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow"
          >
            📋 Copiar chave PIX
          </button>
        </div>

        {/* Legenda */}
        <div className="mt-3 flex gap-3 justify-center flex-wrap text-gray-500 text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <span className="text-green-600 font-bold">✅</span>
            <span>Pago</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-500 font-bold">✕</span>
            <span>Pendente</span>
          </div>
          {!adminLogado && (
            <div className="flex items-center gap-1 text-gray-400">
              <span>🔐</span>
              <span>Admin altera o status</span>
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-gray-400 text-xs">
          🇧🇷 Vai Brasil! 🏆 19/06/2025 às 21h30
        </footer>

          </>
        )}
      </main>

      {/* ══════════════════════ MODAIS ══════════════════════ */}

      {/* Modal login */}
      {mostrarLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-80">
            <h3 className="text-green-800 font-black text-xl mb-4 text-center">🔐 Área do Admin</h3>
            <input
              type="password"
              placeholder="Digite a senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fazerLogin()}
              className="w-full border-2 border-green-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-green-600 text-gray-800"
            />
            <div className="flex gap-2">
              <button
                onClick={fazerLogin}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
              >
                Entrar
              </button>
              <button
                onClick={() => { setMostrarLogin(false); setSenhaInput(""); }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal APOSTAR ══ */}
      {mostrarApostar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">

            {/* Cabeçalho do modal */}
            <div className="bg-green-700 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-black text-xl">🎯 Fazer sua Aposta</h3>
              <button
                onClick={fecharApostar}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">

              {/* ── ETAPA 1: Formulário ── */}
              {!apostaEnviada ? (
                <>
                  {/* Nome */}
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wide">
                      👤 Seu nome
                    </label>
                    <input
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={apostaNome}
                      onChange={(e) => setApostaNome(e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-2.5 text-gray-800 outline-none transition-colors"
                    />
                  </div>

                  {/* Placar */}
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-2 uppercase tracking-wide">
                      ⚽ Seu palpite de placar
                    </label>
                    <div className="flex items-center gap-3">
                      {/* Brasil */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <Image src="https://flagcdn.com/w40/br.png" alt="Brasil" width={36} height={24} className="rounded shadow" unoptimized />
                        <span className="text-xs font-bold text-gray-600">Brasil</span>
                        <input
                          type="number" min="0" max="20" placeholder="0"
                          value={apostaBrasil}
                          onChange={(e) => setApostaBrasil(e.target.value)}
                          className="w-full border-2 border-green-300 focus:border-green-600 rounded-xl px-3 py-2 text-center text-xl font-black text-green-800 outline-none"
                        />
                      </div>
                      <span className="text-gray-400 font-black text-2xl pb-4">×</span>
                      {/* Haiti */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <Image src="https://flagcdn.com/w40/ht.png" alt="Haiti" width={36} height={24} className="rounded shadow" unoptimized />
                        <span className="text-xs font-bold text-gray-600">Haiti</span>
                        <input
                          type="number" min="0" max="20" placeholder="0"
                          value={apostaHaiti}
                          onChange={(e) => setApostaHaiti(e.target.value)}
                          className="w-full border-2 border-blue-200 focus:border-blue-500 rounded-xl px-3 py-2 text-center text-xl font-black text-blue-700 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Erro */}
                  {apostaErro && (
                    <div className="bg-red-50 border border-red-300 text-red-700 text-sm font-semibold px-4 py-2 rounded-xl text-center">
                      ⚠️ {apostaErro}
                    </div>
                  )}

                  {/* Botão Confirmar */}
                  <button
                    onClick={enviarAposta}
                    disabled={!apostaNome.trim() || !apostaBrasil || !apostaHaiti || apostaEnviando}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black text-base py-3 rounded-xl transition-all shadow flex items-center justify-center gap-2"
                  >
                    {apostaEnviando ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      <>✅ Confirmar Aposta</>
                    )}
                  </button>
                </>

              ) : (
                /* ── ETAPA 2: Pagamento ── */
                <div className="flex flex-col gap-4">

                  {/* Confirmação */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex flex-col items-center gap-1 text-center">
                    <span className="text-3xl">🎉</span>
                    <p className="text-green-700 font-black text-base">Aposta confirmada!</p>
                    <p className="text-gray-500 text-sm">
                      <strong>{apostaNome}</strong> —{" "}
                      <strong className="text-green-700">Brasil {apostaBrasil}</strong>
                      {" × "}
                      <strong className="text-blue-700">Haiti {apostaHaiti}</strong>
                    </p>
                  </div>

                  {/* PIX */}
                  <div className="bg-white border-2 border-green-300 rounded-2xl p-4 flex flex-col items-center gap-3">
                    <p className="text-green-800 font-black text-sm">💸 Agora realize o pagamento via PIX</p>
                    <p className="text-gray-500 text-xs text-center">
                      Valor: <strong className="text-green-700">R$ 5,00</strong> — seu status será confirmado pelo admin após o pagamento.
                    </p>
                    {/* QR Code */}
                    <div className="bg-white p-2 rounded-xl border-2 border-green-300 shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={QR_PIX_URL} alt="QR Code PIX" width={170} height={170} />
                    </div>
                    <p className="text-xs text-gray-400">📷 Escaneie para pagar</p>
                    {/* Copia e cola */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full">
                      <span className="flex-1 text-gray-500 font-mono text-xs truncate">{PAYLOAD_PIX.slice(0, 38)}…</span>
                      <button
                        onClick={copiarPix}
                        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          apostaCopied ? "bg-green-500 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {apostaCopied ? "✅ Copiado!" : "📋 Copiar"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Chave: <strong className="text-gray-600">{CHAVE_PIX}</strong></p>
                  </div>

                  {/* Regras */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-amber-800 font-black text-sm mb-2">📜 Regras do Bolão</p>
                    <ul className="text-gray-600 text-xs space-y-1.5 leading-relaxed">
                      <li className="flex gap-2"><span>💰</span><span>Cota: <strong>R$ 5,00</strong> pago via PIX antes do jogo.</span></li>
                      <li className="flex gap-2"><span>🏆</span><span><strong>25%</strong> da arrecadação vai para o admin pela organização.</span></li>
                      <li className="flex gap-2"><span>🎉</span><span><strong>75%</strong> rateados entre quem acertar o placar exato <strong>e tiver pago</strong>.</span></li>
                      <li className="flex gap-2"><span>⚠️</span><span>Apostas <strong>pendentes</strong> não concorrem ao prêmio.</span></li>
                      <li className="flex gap-2"><span>📅</span><span>Prazo: <strong>19/06/2025 às 21h00</strong>.</span></li>
                    </ul>
                    <div className="mt-3 bg-white rounded-xl border border-amber-200 px-3 py-2 text-xs text-gray-500">
                      <p className="font-bold text-amber-700 mb-1">📊 {participantes.filter(p => p.pago).length} pagantes até agora:</p>
                      <div className="flex justify-between"><span>Arrecadado:</span><strong>R$ {participantes.filter(p => p.pago).length * 5},00</strong></div>
                      <div className="flex justify-between text-green-700"><span>Admin (25%):</span><strong>R$ {(participantes.filter(p => p.pago).length * 5 * 0.25).toFixed(2)}</strong></div>
                      <div className="flex justify-between text-blue-700"><span>Ganhadores (75%):</span><strong>R$ {(participantes.filter(p => p.pago).length * 5 * 0.75).toFixed(2)}</strong></div>
                    </div>
                  </div>

                  <button
                    onClick={fecharApostar}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar */}
      {mostrarFormulario && adminLogado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-80">
            <h3 className="text-green-800 font-black text-xl mb-4 text-center">➕ Novo Participante</h3>
            <input
              type="text"
              placeholder="Nome do participante"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="w-full border-2 border-green-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-green-600 text-gray-800"
            />
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-semibold block mb-1">🇧🇷 Placar Brasil</label>
                <input
                  type="number"
                  placeholder="Ex: 3"
                  value={novoPlacarBrasil}
                  onChange={(e) => setNovoPlacarBrasil(e.target.value)}
                  className="w-full border-2 border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-600 text-gray-800"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-semibold block mb-1">🇭🇹 Placar Haiti</label>
                <input
                  type="number"
                  placeholder="Ex: 0"
                  value={novoPlacarHaiti}
                  onChange={(e) => setNovoPlacarHaiti(e.target.value)}
                  className="w-full border-2 border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-600 text-gray-800"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={adicionarParticipante}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
              >
                Adicionar
              </button>
              <button
                onClick={() => setMostrarFormulario(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
