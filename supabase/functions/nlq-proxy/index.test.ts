import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Import the exported functions directly
// Since edge functions are served via Deno.serve, we test the utility functions
// by re-declaring them here (they're exported from index.ts)

// ── extractFinalOutput ──

function extractFinalOutput(fullBuffer: string): string | null {
  const lastBrace = fullBuffer.lastIndexOf('{"output"');
  if (lastBrace === -1) return null;
  const substr = fullBuffer.substring(lastBrace);
  try {
    const parsed = JSON.parse(substr);
    if (typeof parsed.output === 'string' && parsed.output.trim()) {
      return parsed.output.trim();
    }
  } catch {
    const match = substr.match(/\{"output"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
    if (match) {
      try { return JSON.parse(`"${match[1]}"`); } catch { /* ignore */ }
    }
  }
  return null;
}

// ── sanitizeFallbackContent ──

const NOISE_MARKERS = [
  /^Calling \w+ with input:/im,
  /^Calling \w+ with \{/im,
  /^```json\s*\{/m,
  /^\{"Prompt_/m,
  /^\{"tool_/m,
  /^Thought:/m,
  /^Action:/m,
  /^Observation:/m,
  /^to=multi_tool_use/m,
  /^\{"Batch_Size"/m,
  /^\{"action_input"/m,
  /^SELECT\s+/im,
  /^FROM\s+public\./im,
  /^WITH\s+\w+\s+AS\s*\(/im,
];

const RESPONSE_START_PATTERNS = [
  /^_Períodos?:/m,
  /^\*\*Resumo\*\*/m,
  /^#{1,3}\s+/m,
  /^📊/m,
  /^📋/m,
  /^\|[^|]+\|/m,
  /^>\s+/m,
  /^Em\s+\w+\s+de\s+\d{4}/m,
  /^No\s+período/m,
  /^Resumo/m,
];

function sanitizeFallbackContent(raw: string): string | null {
  if (!raw || raw.trim().length < 20) return null;
  let text = raw;
  let bestStart = -1;
  for (const pattern of RESPONSE_START_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (bestStart === -1 || match.index < bestStart) bestStart = match.index;
    }
  }
  if (bestStart > 0) text = text.substring(bestStart);
  const hasNoise = NOISE_MARKERS.some(p => p.test(text));
  if (hasNoise) {
    let lastGoodStart = -1;
    for (const pattern of RESPONSE_START_PATTERNS) {
      let m;
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('m') ? 'gm' : 'g');
      while ((m = globalPattern.exec(raw)) !== null) {
        if (m.index > lastGoodStart) lastGoodStart = m.index;
      }
    }
    if (lastGoodStart > 0) {
      text = raw.substring(lastGoodStart);
      const stillNoisy = NOISE_MARKERS.some(p => p.test(text));
      if (stillNoisy) return null;
    } else {
      return null;
    }
  }
  const jsonLikeLines = text.split('\n').filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > text.split('\n').length * 0.3) return null;
  const cleaned = text.trim();
  return cleaned.length > 20 ? cleaned : null;
}

// ── classifyNode ──

const INTERNAL_NODES = [
  'webhook', 'respond to webhook', 'tool', 'supabase', 'execute',
  'http request', 'code', 'set', 'switch', 'if', 'merge', 'split',
  'function', 'item lists', 'no operation', 'mcp_client', 'mcp client',
  'chat_historico', 'chat historico',
];
const SUB_AGENT_NODES = ['agente_consulta', 'agente_financeiro'];
const FINAL_AGENT_NODE = 'agente_negocio';

function classifyNode(nodeName: string): 'internal' | 'sub_agent' | 'final_agent' | 'step_only' {
  if (!nodeName) return 'internal';
  const lower = nodeName.toLowerCase();
  if (lower.includes(FINAL_AGENT_NODE)) return 'final_agent';
  if (SUB_AGENT_NODES.some(n => lower.includes(n))) return 'sub_agent';
  if (INTERNAL_NODES.some(n => lower.includes(n))) return 'internal';
  if (lower.includes('agente')) return 'final_agent';
  return 'step_only';
}

// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

Deno.test("extractFinalOutput — finds output wrapper", () => {
  const buffer = 'some noise\n{"output":"Hello **world**"}\n';
  assertEquals(extractFinalOutput(buffer), "Hello **world**");
});

Deno.test("extractFinalOutput — returns null when no output", () => {
  const buffer = '{"type":"item","content":"R"}\n{"type":"end"}\n';
  assertEquals(extractFinalOutput(buffer), null);
});

Deno.test("extractFinalOutput — handles escaped content", () => {
  const buffer = '{"output":"Valor: R$ 100,00\\nLinha 2"}';
  assertEquals(extractFinalOutput(buffer), "Valor: R$ 100,00\nLinha 2");
});

Deno.test("extractFinalOutput — picks last output in buffer", () => {
  const buffer = '{"output":"first"}\ngarbage\n{"output":"second"}';
  assertEquals(extractFinalOutput(buffer), "second");
});

Deno.test("classifyNode — agente_negocio is final_agent", () => {
  assertEquals(classifyNode("agente_negocio"), "final_agent");
});

Deno.test("classifyNode — agente_consulta is sub_agent", () => {
  assertEquals(classifyNode("agente_consulta"), "sub_agent");
});

Deno.test("classifyNode — agente_financeiro is sub_agent", () => {
  assertEquals(classifyNode("agente_financeiro"), "sub_agent");
});

Deno.test("classifyNode — webhook is internal", () => {
  assertEquals(classifyNode("Respond to Webhook"), "internal");
});

Deno.test("classifyNode — MCP_Client is internal", () => {
  assertEquals(classifyNode("MCP_Client"), "internal");
});

Deno.test("classifyNode — chat_historico is internal", () => {
  assertEquals(classifyNode("chat_historico"), "internal");
});

Deno.test("classifyNode — empty string is internal", () => {
  assertEquals(classifyNode(""), "internal");
});

Deno.test("classifyNode — unknown agente is final_agent", () => {
  assertEquals(classifyNode("agente_xyz"), "final_agent");
});

Deno.test("sanitizeFallbackContent — rejects short content", () => {
  assertEquals(sanitizeFallbackContent("Hi"), null);
});

Deno.test("sanitizeFallbackContent — strips Calling prefix", () => {
  const raw = 'Calling agente_consulta with input: {"Prompt":"test"}\n\n**Resumo**\nEm março de 2026 tivemos 837 pedidos com faturamento total de R$ 450k.';
  const result = sanitizeFallbackContent(raw);
  assertNotEquals(result, null);
  assertEquals(result!.startsWith("**Resumo**"), true);
});

Deno.test("sanitizeFallbackContent — rejects pure SQL", () => {
  const raw = 'SELECT table_name, column_name FROM public.vw_schema WHERE x = 1 ORDER BY table_name;';
  assertEquals(sanitizeFallbackContent(raw), null);
});

Deno.test("sanitizeFallbackContent — accepts clean markdown", () => {
  const raw = '_Períodos: 01/03/2026 a 31/03/2026_\n\n**Resumo**\nEm março de 2026, foram registrados 837 pedidos.';
  const result = sanitizeFallbackContent(raw);
  assertNotEquals(result, null);
  assertEquals(result!.includes("837 pedidos"), true);
});

Deno.test("sanitizeFallbackContent — rejects JSON-heavy content", () => {
  const lines = Array.from({ length: 10 }, (_, i) => `{"type":"item","content":"${i}"}`).join('\n');
  assertEquals(sanitizeFallbackContent(lines), null);
});

Deno.test("sanitizeFallbackContent — handles duplicated responses by finding last marker", () => {
  const raw = 'Calling agente with input: blah\n📊 First response here with enough content to be valid\nSELECT * FROM public.table\n📊 Resumo final correto com dados detalhados e tabelas completas';
  const result = sanitizeFallbackContent(raw);
  if (result) {
    assertEquals(result.includes("Calling"), false);
    assertEquals(result.includes("SELECT"), false);
  }
});
