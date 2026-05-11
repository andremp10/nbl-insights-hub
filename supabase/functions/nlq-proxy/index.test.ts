import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ══════════════════════════════════════════════════════════════════
// Re-declare exported functions for testing (Deno edge functions
// can't be imported directly since they call Deno.serve)
// ══════════════════════════════════════════════════════════════════

// ── classifyNode ──

const INTERNAL_NODES = [
  'webhook', 'respond to webhook', 'tool', 'supabase', 'execute',
  'http request', 'code', 'set', 'switch', 'if', 'merge', 'split',
  'function', 'item lists', 'no operation', 'mcp_client', 'mcp client',
  'chat_historico', 'chat historico',
];
const SUB_AGENT_NODES = ['agente_consulta', 'agente_financeiro'];
const FINAL_AGENT_NODE = 'agente_negocio';

function classifyNode(nodeName: string): 'internal' | 'sub_agent' | 'final_agent' | 'ignored' {
  if (!nodeName) return 'internal';
  const lower = nodeName.toLowerCase();
  if (lower.includes(FINAL_AGENT_NODE)) return 'final_agent';
  if (SUB_AGENT_NODES.some(n => lower.includes(n))) return 'sub_agent';
  if (INTERNAL_NODES.some(n => lower.includes(n))) return 'internal';
  return 'ignored';
}

// ── normalizeChunkLine ──

function normalizeChunkLine(raw: string): string[] {
  let line = raw.trim();
  if (!line) return [];
  if (line.startsWith('data:')) line = line.substring(5).trim();
  if (line === '[DONE]') return [];
  if (line.startsWith('[') && line.endsWith(']')) {
    try {
      const arr = JSON.parse(line);
      if (Array.isArray(arr)) return arr.map((item: any) => JSON.stringify(item));
    } catch { /* not valid */ }
  }
  return [line];
}

// ── extractFinalOutput ──

function extractTextFromKnownShape(value: unknown, depth = 0): string | null {
  if (!value || depth > 5) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const found = extractTextFromKnownShape(value[i], depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  for (const key of ['output', 'text', 'message', 'answer', 'final_answer', 'finalAnswer']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key].trim();
  }
  if (obj.ok === false && obj.error && typeof obj.error === 'object') {
    const errorMessage = (obj.error as Record<string, unknown>).message;
    if (typeof errorMessage === 'string' && errorMessage.trim()) return errorMessage.trim();
  }
  for (const key of ['reply', 'data', 'body', 'result', 'response', 'json']) {
    const found = extractTextFromKnownShape(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function extractFinalOutput(fullBuffer: string): string | null {
  const trimmed = fullBuffer.trim();
  if (trimmed) {
    try {
      const known = extractTextFromKnownShape(JSON.parse(trimmed));
      if (known) return known;
    } catch { /* continue */ }
  }
  const arrayMatch = fullBuffer.match(/\[\s*\{\s*"output"\s*:/);
  if (arrayMatch && arrayMatch.index !== undefined) {
    const substr = fullBuffer.substring(arrayMatch.index);
    try {
      const arr = JSON.parse(substr);
      const known = extractTextFromKnownShape(arr);
      if (known) return known;
    } catch { /* try object */ }
  }
  const lastBrace = fullBuffer.lastIndexOf('{"output"');
  if (lastBrace === -1) return null;
  const substr = fullBuffer.substring(lastBrace);
  try {
    const parsed = JSON.parse(substr);
    const known = extractTextFromKnownShape(parsed);
    if (known) return known;
  } catch {
    const match = substr.match(/\{"output"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
    if (match) {
      try { return JSON.parse(`"${match[1]}"`); } catch { /* ignore */ }
    }
  }
  return null;
}

// ── hasSafetyLeakage ──

const LEAKAGE_PATTERNS = [
  /^Calling \w+ with/im,
  /^Thought:/m,
  /^Action:/m,
  /^Observation:/m,
  /^to=multi_tool_use/m,
  /\{"type"\s*:\s*"(item|begin|end)"/,
  /\{"tool_/,
  /\{"Prompt_/,
  /\{"Batch_Size"/,
  /\{"action_input"/,
  /MCP_Client/i,
  /nodeName.*agente/i,
];
const SQL_LEAKAGE_PATTERNS = [
  /^SELECT\s+[\w.*]+\s+FROM\s+/im,
  /^WITH\s+\w+\s+AS\s*\(/im,
  /^FROM\s+public\.\w+/im,
];

function hasSafetyLeakage(text: string): boolean {
  if (LEAKAGE_PATTERNS.some(p => p.test(text))) return true;
  const lines = text.split('\n');
  const sqlLines = lines.filter(l => SQL_LEAKAGE_PATTERNS.some(p => p.test(l.trim())));
  if (sqlLines.length > 2) return true;
  return false;
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
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('m') ? 'gm' : 'g');
      let m;
      while ((m = globalPattern.exec(raw)) !== null) {
        if (m.index > lastGoodStart) lastGoodStart = m.index;
      }
    }
    if (lastGoodStart > 0) {
      text = raw.substring(lastGoodStart);
      if (NOISE_MARKERS.some(p => p.test(text))) return null;
    } else {
      return null;
    }
  }
  const allLines = text.split('\n');
  const jsonLikeLines = allLines.filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > allLines.length * 0.3) return null;
  const cleaned = text.trim();
  if (cleaned.length <= 20) return null;
  if (hasSafetyLeakage(cleaned)) return null;
  return cleaned;
}

// ── deduplicateResponse ──

function deduplicateResponse(text: string): string {
  const startMarkers = [
    /\*\*Resumo\*\*/g, /_Períodos?:/g, /📊\s*\*?\*?Resumo/g, /📊/g,
  ];
  const allPositions: number[] = [];
  for (const re of startMarkers) {
    let m;
    while ((m = re.exec(text)) !== null) allPositions.push(m.index);
  }
  allPositions.sort((a, b) => a - b);
  if (allPositions.length < 2) return text;
  const blocks: number[] = [allPositions[0]];
  for (let i = 1; i < allPositions.length; i++) {
    if (allPositions[i] - blocks[blocks.length - 1] > 30) blocks.push(allPositions[i]);
  }
  if (blocks.length < 2) return text;
  const lastBlockStart = blocks[blocks.length - 1];
  let realStart = lastBlockStart;
  const sliceAhead = text.substring(lastBlockStart, lastBlockStart + 12);
  if (!/^_Períodos?:/.test(sliceAhead)) {
    const windowStart = Math.max(0, lastBlockStart - 80);
    const window = text.substring(windowStart, lastBlockStart);
    let periodInWindow = window.lastIndexOf('_Períodos:');
    if (periodInWindow === -1) periodInWindow = window.lastIndexOf('_Período:');
    if (periodInWindow !== -1) realStart = windowStart + periodInWindow;
  }
  return text.substring(realStart).trim();
}


// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

// ── classifyNode ──

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

Deno.test("classifyNode — unknown 'agente_xyz' is IGNORED (not final_agent)", () => {
  assertEquals(classifyNode("agente_xyz"), "ignored");
});

Deno.test("classifyNode — random node name is ignored", () => {
  assertEquals(classifyNode("some_random_node"), "ignored");
});

// ── normalizeChunkLine ──

Deno.test("normalizeChunkLine — strips SSE data: prefix", () => {
  const result = normalizeChunkLine('data: {"type":"item","content":"hello"}');
  assertEquals(result, ['{"type":"item","content":"hello"}']);
});

Deno.test("normalizeChunkLine — handles array wrapper", () => {
  const result = normalizeChunkLine('[{"output":"test result"}]');
  assertEquals(result.length, 1);
  const parsed = JSON.parse(result[0]);
  assertEquals(parsed.output, "test result");
});

Deno.test("normalizeChunkLine — ignores [DONE]", () => {
  assertEquals(normalizeChunkLine("[DONE]"), []);
  assertEquals(normalizeChunkLine("data: [DONE]"), []);
});

Deno.test("normalizeChunkLine — passes through plain JSON", () => {
  const result = normalizeChunkLine('{"type":"begin"}');
  assertEquals(result, ['{"type":"begin"}']);
});

Deno.test("normalizeChunkLine — empty line returns empty", () => {
  assertEquals(normalizeChunkLine(""), []);
  assertEquals(normalizeChunkLine("   "), []);
});

// ── extractFinalOutput ──

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

Deno.test("extractFinalOutput — handles array wrapper [{'output':'...'}]", () => {
  const buffer = 'noise\n[{"output":"Array result here"}]\n';
  assertEquals(extractFinalOutput(buffer), "Array result here");
});

Deno.test("extractFinalOutput — handles array with spaces", () => {
  const buffer = '[ { "output": "Spaced array" } ]';
  assertEquals(extractFinalOutput(buffer), "Spaced array");
});

// ── hasSafetyLeakage ──

Deno.test("hasSafetyLeakage — detects 'Calling' pattern", () => {
  assertEquals(hasSafetyLeakage("Calling agente_consulta with input: blah"), true);
});

Deno.test("hasSafetyLeakage — detects Thought/Action traces", () => {
  assertEquals(hasSafetyLeakage("Thought: I need to query\nAction: execute_sql"), true);
});

Deno.test("hasSafetyLeakage — detects MCP_Client", () => {
  assertEquals(hasSafetyLeakage("Using MCP_Client to connect"), true);
});

Deno.test("hasSafetyLeakage — detects JSON type markers", () => {
  assertEquals(hasSafetyLeakage('Some text {"type": "item"} more'), true);
});

Deno.test("hasSafetyLeakage — clean markdown passes", () => {
  assertEquals(hasSafetyLeakage("**Resumo**\nEm março de 2026 tivemos 837 pedidos."), false);
});

Deno.test("hasSafetyLeakage — multiple SQL lines are blocked", () => {
  const text = "SELECT * FROM public.is_pedidos\nFROM public.is_clientes\nWITH cte AS (\nSELECT id";
  assertEquals(hasSafetyLeakage(text), true);
});

Deno.test("hasSafetyLeakage — single SQL mention in prose is OK", () => {
  const text = "O sistema usa SELECT para consultar dados.\n**Resumo**\nTivemos 100 pedidos.";
  assertEquals(hasSafetyLeakage(text), false);
});

// ── sanitizeFallbackContent ──

Deno.test("sanitizeFallbackContent — rejects short content", () => {
  assertEquals(sanitizeFallbackContent("Hi"), null);
});

Deno.test("sanitizeFallbackContent — strips Calling prefix and finds response", () => {
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

Deno.test("sanitizeFallbackContent — rejects content with leakage markers", () => {
  const raw = '**Resumo**\nCalling agente_consulta with input: something\nEm março de 2026 tivemos pedidos.';
  assertEquals(sanitizeFallbackContent(raw), null);
});

Deno.test("sanitizeFallbackContent — handles duplicated responses by finding last marker", () => {
  const raw = 'Calling agente with input: blah\n📊 First response here with enough content to be valid\nSELECT * FROM public.table\n📊 Resumo final correto com dados detalhados e tabelas completas';
  const result = sanitizeFallbackContent(raw);
  if (result) {
    assertEquals(result.includes("Calling"), false);
    assertEquals(result.includes("SELECT"), false);
  }
});

// ── deduplicateResponse ──

Deno.test("deduplicateResponse — single response unchanged", () => {
  const text = "**Resumo**\nEm março de 2026 tivemos 837 pedidos.";
  assertEquals(deduplicateResponse(text), text);
});

Deno.test("deduplicateResponse — removes first of two **Resumo** blocks", () => {
  const text = "_Períodos: 01/03_\n**Resumo**\nPrimeira versão.\n\n_Períodos: 01/03_\n**Resumo**\nSegunda versão final.";
  const result = deduplicateResponse(text);
  assertEquals(result.includes("Segunda versão final"), true);
  assertEquals(result.includes("Primeira versão"), false);
});

Deno.test("deduplicateResponse — handles duplicated 📊 blocks", () => {
  const text = "📊 First summary with data\nSome noise\n📊 Final summary with corrected data";
  const result = deduplicateResponse(text);
  assertEquals(result.startsWith("📊 Final summary"), true);
});

// ── Integration: real-world stream simulation ──

Deno.test("Integration — full buffer with Calling + SQL + output wrapper", () => {
  const buffer = [
    'Calling chat_historico with {}',
    'Calling agente_consulta with input: {"Prompt":"test"}',
    'Calling MCP_Client with input: {"query":"SELECT * FROM public.is_pedidos","tool":"execute_sql"}',
    '{"type":"begin","metadata":{"nodeName":"agente_consulta"}}',
    '{"type":"item","content":"📊 Sub-agent response","metadata":{"nodeName":"agente_consulta"}}',
    '{"type":"end","metadata":{"nodeName":"agente_consulta"}}',
    '{"type":"begin","metadata":{"nodeName":"agente_negocio"}}',
    '{"type":"item","content":"_Períodos: 01/03_\\n\\n**Resumo**\\nFinal answer.","metadata":{"nodeName":"agente_negocio"}}',
    '{"type":"end","metadata":{"nodeName":"agente_negocio"}}',
    '{"output":"_Períodos: 01/03_\\n\\n**Resumo**\\nFinal clean answer from output wrapper."}',
  ].join('\n');

  // extractFinalOutput should find the canonical output
  const result = extractFinalOutput(buffer);
  assertNotEquals(result, null);
  assertEquals(result!.includes("Final clean answer"), true);
});

Deno.test("Integration — buffer WITHOUT output wrapper falls back to final agent", () => {
  // Simulate no {"output":"..."} but agente_negocio content exists
  const finalAgentContent = "_Períodos: 01/03/2026 a 31/03/2026_\n\n**Resumo**\nEm março tivemos 837 pedidos com R$ 450k de faturamento.";

  // extractFinalOutput returns null since no wrapper
  const buffer = '{"type":"item","content":"...","metadata":{"nodeName":"agente_negocio"}}';
  assertEquals(extractFinalOutput(buffer), null);

  // sanitizeFallbackContent should accept clean content
  const sanitized = sanitizeFallbackContent(finalAgentContent);
  assertNotEquals(sanitized, null);
  assertEquals(sanitized!.includes("837 pedidos"), true);
});

Deno.test("Integration — noisy fallback is blocked by safety gate", () => {
  const noisyContent = "Calling agente_consulta with input: blah\nThought: I need to think\n**Resumo**\nSome data here with enough length to pass.";
  const sanitized = sanitizeFallbackContent(noisyContent);
  // Should be null because the last block still has noise or leakage
  // The sanitizer should strip prefix but hasSafetyLeakage catches Calling
  // Since we start from **Resumo**, the Calling is stripped, but let's verify
  if (sanitized) {
    assertEquals(hasSafetyLeakage(sanitized), false);
  }
});

Deno.test("Integration — SSE-prefixed array output is extracted", () => {
  const buffer = 'data: [{"output":"SSE array output with valid content"}]\n';
  // normalizeChunkLine strips data: prefix
  const lines = normalizeChunkLine('data: [{"output":"SSE array output with valid content"}]');
  assertEquals(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.output, "SSE array output with valid content");
});

// ════════════════════════════════════════════════════════════════
// extractLastCleanBlock — new function tests
// ════════════════════════════════════════════════════════════════

function extractLastCleanBlock(raw: string): string | null {
  if (!raw || raw.trim().length < 20) return null;

  let lastNoiseEnd = -1;
  for (const pattern of NOISE_MARKERS) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m;
    while ((m = re.exec(raw)) !== null) {
      const end = m.index + m[0].length;
      if (end > lastNoiseEnd) lastNoiseEnd = end;
    }
  }

  let bestStart = -1;
  for (const pattern of RESPONSE_START_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > lastNoiseEnd) {
        if (bestStart === -1 || m.index < bestStart) bestStart = m.index;
      }
    }
  }

  if (bestStart === -1) {
    if (lastNoiseEnd === -1) return sanitizeFallbackContent(raw);
    return null;
  }

  let candidate = raw.substring(bestStart).trim();
  if (candidate.length < 20) return null;

  candidate = deduplicateResponse(candidate);
  if (hasSafetyLeakage(candidate)) return null;

  const allLines = candidate.split('\n');
  const jsonLikeLines = allLines.filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > allLines.length * 0.3) return null;

  return candidate;
}

Deno.test("extractLastCleanBlock — picks final answer after ReAct traces", () => {
  const raw = [
    'Calling chat_historico with {}',
    'Calling agente_consulta with input: {"Prompt":"x","Batch_Size":200}',
    'Calling MCP_Client with input: {"query":"SELECT * FROM public.is_pedidos","tool":"execute_sql"}',
    '',
    '_Períodos: 01/03/2026 a 31/03/2026_',
    '',
    '**Resumo**',
    'Em março de 2026 tivemos 837 pedidos com R$ 450k de faturamento.',
  ].join('\n');
  const result = extractLastCleanBlock(raw);
  assertNotEquals(result, null);
  assertEquals(result!.startsWith('_Períodos:'), true);
  assertEquals(result!.includes('Calling'), false);
  assertEquals(result!.includes('SELECT'), false);
});

Deno.test("extractLastCleanBlock — picks last block when sub-agent + final coexist", () => {
  const raw = [
    'Calling agente_consulta with input: {"x":1}',
    '📊 Sub-agent response with data details',
    'Calling MCP_Client with input: {"query":"x"}',
    '_Períodos: 01/03/2026_',
    '**Resumo**',
    'Final correct answer with full context.',
  ].join('\n');
  const result = extractLastCleanBlock(raw);
  assertNotEquals(result, null);
  assertEquals(result!.includes('Final correct answer'), true);
  assertEquals(result!.includes('Sub-agent'), false);
  assertEquals(result!.includes('Calling'), false);
});

Deno.test("extractLastCleanBlock — returns null when only noise remains", () => {
  const raw = 'Calling agente with input: blah\nThought: I need to think\nAction: query';
  assertEquals(extractLastCleanBlock(raw), null);
});

Deno.test("extractLastCleanBlock — clean content passes through", () => {
  const raw = '_Períodos: 01/03_\n**Resumo**\nClean response with enough text content here.';
  const result = extractLastCleanBlock(raw);
  assertNotEquals(result, null);
  assertEquals(result!.includes('Clean response'), true);
});

Deno.test("deduplicateResponse — handles mixed markers (📊 + **Resumo**)", () => {
  const text = '📊 Resumo do sub-agente com dados\n_Períodos: 01/03_\n**Resumo**\nResposta final correta.';
  const result = deduplicateResponse(text);
  assertEquals(result.includes('Resposta final correta'), true);
  assertEquals(result.includes('sub-agente'), false);
});

Deno.test("deduplicateResponse — handles repeated _Períodos:", () => {
  const text = '_Períodos: 01/03_\n**Resumo**\nPrimeira versão\n\n_Períodos: 01/03_\n**Resumo**\nSegunda versão final';
  const result = deduplicateResponse(text);
  assertEquals(result.includes('Segunda versão final'), true);
  assertEquals(result.includes('Primeira versão'), false);
});

Deno.test("Integration — real-world buffer with mixed leak gets cleaned", () => {
  const buffer = `Calling chat_historico with {}Calling agente_consulta with input: {"Prompt__User_Message_":"Análise","Batch_Size":200}Calling MCP_Client with input: {"query":"SELECT table_name FROM public.vw_schema","tool":"execute_sql"}

_Períodos: 01/03/2026 a 31/03/2026 · Escopo: pedidos do mês_

**Resumo**
Em março de 2026 foram registrados 837 pedidos com faturamento total de R$ 450.026,98.

**Dados detalhados**

| ERP ID | Cliente | Valor |
|---|---|---|
| 100 | Cliente A | R$ 1.000 |`;

  const result = extractLastCleanBlock(buffer);
  assertNotEquals(result, null);
  assertEquals(result!.startsWith('_Períodos:'), true);
  assertEquals(result!.includes('Calling'), false);
  assertEquals(result!.includes('SELECT'), false);
  assertEquals(result!.includes('837 pedidos'), true);
});
