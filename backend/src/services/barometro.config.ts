// ============================================================
// CONFIGURAÇÃO DOS INDICADORES DO BARÔMETRO
//
// Mapeia cada linha de indicador da aba "Report" (pelo texto da
// coluna F, sem espaços extras) para uma chave estável, o grupo
// em que aparece na tela, o formato do valor e qual direção é
// "boa" (usada só para colorir; não altera o dado).
//
// O memorial de cálculo de cada indicador está na aba
// "Premissas" da planilha.
//
// `goodWhen`:
//   "up"   → quanto maior, melhor
//   "down" → quanto menor, melhor
//   "zero" → melhor quanto mais perto de zero (ex.: Gap SPR)
//   null   → sem juízo de valor (só informativo, sem cor)
// As direções abaixo são uma leitura do significado de cada
// indicador — ajuste aqui se a operação enxergar diferente.
// ============================================================

export type IndicatorKind =
  | "int"
  | "decimal"
  | "percent" // valor normalizado para fração (0–1)
  | "time" // normalizado para minutos
  | "score"
  | "text";

export type GoodWhen = "up" | "down" | "zero" | null;

export interface IndicatorDef {
  key: string;
  // texto exato da coluna "Indicador" na planilha (já sem espaços extras)
  sheetLabel: string;
  label: string;
  group: string;
  kind: IndicatorKind;
  goodWhen: GoodWhen;
  // alguns indicadores usam 0 para "sem dado" em vez de célula vazia
  zeroIsMissing?: boolean;
  // só existe na coluna da semana (pesquisa do Barômetro etc.)
  weeklyOnly?: boolean;
  // sub-indicador (aparece recuado, como na planilha)
  indent?: boolean;
}

export const INDICATOR_GROUPS = [
  "Volume e SPR",
  "Entrega",
  "Drivers e alocador",
  "Frota",
  "Operação",
  "Pesquisa do Barômetro",
] as const;

export const INDICATORS: IndicatorDef[] = [
  // ---------- Volume e SPR ----------
  { key: "pacotes_roteirizados", sheetLabel: "Pacotes roteirizados", label: "Pacotes roteirizados", group: "Volume e SPR", kind: "int", goodWhen: null },
  { key: "spr_roteirizado", sheetLabel: "SPR Roteirizado", label: "SPR roteirizado", group: "Volume e SPR", kind: "decimal", goodWhen: null },
  { key: "pacotes_expedidos", sheetLabel: "Pacotes expedidos", label: "Pacotes expedidos", group: "Volume e SPR", kind: "int", goodWhen: null },
  { key: "rotas_expedidas", sheetLabel: "Rotas expedidas", label: "Rotas expedidas", group: "Volume e SPR", kind: "int", goodWhen: null },
  { key: "spr_expedido", sheetLabel: "SPR Expedido", label: "SPR expedido", group: "Volume e SPR", kind: "decimal", goodWhen: null },
  { key: "gap_spr", sheetLabel: "Gap SPR [Roteirizado - Expedido]", label: "Gap SPR (Rot. − Exp.)", group: "Volume e SPR", kind: "decimal", goodWhen: "zero" },
  { key: "pct_volumosos", sheetLabel: "% Volumosos", label: "% Volumosos", group: "Volume e SPR", kind: "percent", goodWhen: null },

  // ---------- Entrega ----------
  { key: "sucesso_entrega", sheetLabel: "Sucesso de Entrega(DS) %", label: "Sucesso de entrega (DS)", group: "Entrega", kind: "percent", goodWhen: "up" },
  { key: "sucesso_entrega_d0", sheetLabel: "Sucesso de Entrega D0 (DSD0) %", label: "Sucesso de entrega D0", group: "Entrega", kind: "percent", goodWhen: "up" },

  // ---------- Drivers e alocador ----------
  { key: "drivers_ativos", sheetLabel: "Drivers Ativos(Unicos)", label: "Drivers ativos", group: "Drivers e alocador", kind: "int", goodWhen: null },
  { key: "drivers_confirmados", sheetLabel: "Drivers Confirmados em D-1", label: "Drivers confirmados D-1", group: "Drivers e alocador", kind: "int", goodWhen: null },
  { key: "ats_sem_confirmacao", sheetLabel: "ATs Carregadas sem Confirmação", label: "ATs carregadas s/ confirmação", group: "Drivers e alocador", kind: "int", goodWhen: "down" },
  { key: "drivers_notificados", sheetLabel: "Drivers Notificados", label: "Drivers notificados", group: "Drivers e alocador", kind: "int", goodWhen: null },
  { key: "pct_declined", sheetLabel: "% Notificado e declinou rota(Declined)", label: "% Declinou rota", group: "Drivers e alocador", kind: "percent", goodWhen: "down", indent: true },
  { key: "pct_no_show", sheetLabel: "% Aceitou rota e não compareceu(No show)", label: "% No show", group: "Drivers e alocador", kind: "percent", goodWhen: "down", indent: true },
  { key: "pct_confirmou_nao_carregou", sheetLabel: "% Confirmou, não foi notificado, não carregou", label: "% Confirmou e não carregou", group: "Drivers e alocador", kind: "percent", goodWhen: "down", indent: true },
  { key: "pct_match_perfeito", sheetLabel: "% Match Perfeito", label: "% Match perfeito", group: "Drivers e alocador", kind: "percent", goodWhen: "up", indent: true },
  { key: "pct_usabilidade_alocador", sheetLabel: "% Usabilidade do Alocador", label: "% Usabilidade do alocador", group: "Drivers e alocador", kind: "percent", goodWhen: null, indent: true },
  { key: "first_trip", sheetLabel: "1st trip (Primeira Rota)", label: "1ª rota (novos)", group: "Drivers e alocador", kind: "int", goodWhen: null },
  { key: "churn", sheetLabel: "Churn de Entregadores", label: "Churn de entregadores", group: "Drivers e alocador", kind: "int", goodWhen: "down", weeklyOnly: true },
  { key: "drivers_revertidos", sheetLabel: "Drivers Revertidos", label: "Drivers revertidos", group: "Drivers e alocador", kind: "int", goodWhen: "up" },

  // ---------- Frota ----------
  { key: "ocupacao", sheetLabel: "% Ocupação da Frota", label: "% Ocupação da frota", group: "Frota", kind: "percent", goodWhen: "up" },
  { key: "utr", sheetLabel: "Utilização da Frota (UTR)", label: "Utilização da frota (UTR)", group: "Frota", kind: "decimal", goodWhen: "up" },
  { key: "reutilizacao", sheetLabel: "%Reutilização", label: "% Reutilização", group: "Frota", kind: "percent", goodWhen: "up" },

  // ---------- Operação ----------
  { key: "atraso_expedicao", sheetLabel: "%Atraso de expedição(por janela)", label: "% Atraso de expedição", group: "Operação", kind: "percent", goodWhen: "down" },
  { key: "produtividade_bancada", sheetLabel: "Produtividade por Bancada", label: "Produtividade por bancada", group: "Operação", kind: "decimal", goodWhen: "up", zeroIsMissing: true },
  { key: "km_rota", sheetLabel: "KM por rota(Média)", label: "KM por rota (média)", group: "Operação", kind: "decimal", goodWhen: null },
  { key: "tempo_rota", sheetLabel: "Tempo por rota(Mediana)", label: "Tempo por rota (mediana)", group: "Operação", kind: "time", goodWhen: null },
  { key: "ats_no_piso", sheetLabel: "ATs no piso", label: "ATs no piso", group: "Operação", kind: "int", goodWhen: "down" },
  { key: "pct_ats_no_piso", sheetLabel: "% ATs no piso", label: "% ATs no piso", group: "Operação", kind: "percent", goodWhen: "down" },

  // ---------- Pesquisa do Barômetro ----------
  { key: "participantes", sheetLabel: "Qtd de Drivers Participantes", label: "Drivers participantes", group: "Pesquisa do Barômetro", kind: "int", goodWhen: null, zeroIsMissing: true, weeklyOnly: true },
  { key: "pct_participantes", sheetLabel: "% de Drivers Participantes", label: "% Drivers participantes", group: "Pesquisa do Barômetro", kind: "percent", goodWhen: "up", zeroIsMissing: true, weeklyOnly: true },
  { key: "nota", sheetLabel: "Nota do Barômetro", label: "Nota do Barômetro (1–3)", group: "Pesquisa do Barômetro", kind: "score", goodWhen: "up", zeroIsMissing: true, weeklyOnly: true },
  { key: "pct_bom", sheetLabel: "% Bom", label: "% Bom", group: "Pesquisa do Barômetro", kind: "percent", goodWhen: "up", zeroIsMissing: true, weeklyOnly: true, indent: true },
  { key: "pct_indiferente", sheetLabel: "% Indiferente", label: "% Indiferente", group: "Pesquisa do Barômetro", kind: "percent", goodWhen: null, zeroIsMissing: true, weeklyOnly: true, indent: true },
  { key: "pct_ruim", sheetLabel: "% Ruim", label: "% Ruim", group: "Pesquisa do Barômetro", kind: "percent", goodWhen: "down", zeroIsMissing: true, weeklyOnly: true, indent: true },
  { key: "comentarios", sheetLabel: "Comentarios barometro (apenas para semana)", label: "Temas mais comentados", group: "Pesquisa do Barômetro", kind: "text", goodWhen: null, weeklyOnly: true },
];
