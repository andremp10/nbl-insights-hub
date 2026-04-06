

## Problem Analysis

The n8n stream sends the AI response as **individual JSON chunks per character/token**, like:
```
{"type":"item","content":"R","metadata":{"nodeName":"agente_consulta",...}}
{"type":"item","content":"$","metadata":{"nodeName":"agente_consulta",...}}
```

The current edge function (`nlq-proxy`) only looks for `{"output":"..."}` at the end of the 1MB+ buffer. When that pattern isn't found (which happened here — the log confirms "No {"output":"..."} found"), the fallback dumps raw JSON garbage to the frontend.

The fix: **accumulate `content` from `type:"item"` chunks in real-time**, stream them to the frontend as they arrive, and use the accumulated text as the final response.

---

## Plan

### 1. Rewrite stream parser in `nlq-proxy` to accumulate token content

In `supabase/functions/nlq-proxy/index.ts`, change the stream processing loop to:

- For each `{"type":"item","content":"..."}` JSON event, extract the `content` field and accumulate it into a `streamedContent` string
- Filter out noise: skip content from tool-call nodes, skip internal JSON blobs / ReAct traces
- **Stream tokens to the frontend in real-time** instead of waiting until the end — emit `{type:"token", token: chunk}` SSE events as content accumulates (batch every ~50 chars to avoid excessive events)
- At stream end: use `streamedContent` as the final response if `{"output":"..."}` extraction fails
- Remove the broken `extractFallbackResponse` function entirely
- Remove the simulated streaming in `finalize()` — tokens are already streamed live

Key logic:
```text
For each JSON line from n8n:
  if type === "item" && content is non-empty:
    if nodeName matches noise pattern → skip
    if content looks like internal JSON/tool call → skip  
    else → append to streamedContent, emit token SSE
  if type === "begin" → emit step SSE
  
At end:
  finalContent = extractFinalOutput(fullBuffer) || streamedContent || error
```

### 2. Update frontend token handling (minor)

In `src/hooks/useChatMessages.ts`, the token handling already works correctly for real-time streaming. No changes needed — the tokens will now arrive progressively instead of in a simulated burst at the end.

### 3. Keep `extractFinalOutput` as primary

The `{"output":"..."}` extractor stays as the **preferred** extraction method. The accumulated `streamedContent` is used as fallback. This handles both cases: when n8n sends a clean output wrapper, and when it only streams tokens.

---

## Technical Details

**Files to modify:**
- `supabase/functions/nlq-proxy/index.ts` — rewrite stream processing loop

**Key changes in the stream loop:**
- Add `streamedContent = ""` accumulator
- Add `tokenBatch = ""` buffer for batching SSE token events
- For `type:"item"` events: accumulate content, batch-emit tokens every ~80 chars
- For `type:"begin"/"end"` events: emit step labels (existing logic)
- Remove `extractFallbackResponse` — replaced by `streamedContent`
- In `finalize()`: skip simulated streaming if tokens were already streamed live
- Add node-level noise filtering: ignore content from nodes named like `tool`, `webhook`, etc.

**Edge cases handled:**
- `{"output":"..."}` found → use it (canonical)
- `{"output":"..."}` NOT found but streamedContent exists → use streamedContent
- Neither found → error message
- Stream dies mid-way → recovery polling (already implemented in frontend)

