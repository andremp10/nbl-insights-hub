/**
 * Cache alinhado ao ETL diário (04:30 America/Fortaleza).
 * Os dados de dashboard só mudam uma vez por dia, então não há motivo
 * para refetchar antes do próximo ciclo.
 */

const ETL_HOUR = 4;
const ETL_MINUTE = 30;
const TZ = 'America/Fortaleza';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Retorna a hora atual em America/Fortaleza como objeto { y, m, d, h, min }.
 */
function nowInFortaleza() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? '0');
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    h: get('hour') === 24 ? 0 : get('hour'),
    min: get('minute'),
    s: get('second'),
  };
}

/**
 * Bucket do ciclo ETL atual no formato YYYY-MM-DD.
 * Antes de 04:30 → bucket = ontem. Depois de 04:30 → bucket = hoje.
 */
export function getCurrentEtlBucket(): string {
  const { y, m, d, h, min } = nowInFortaleza();
  // Cria data UTC equivalente ao "dia" em Fortaleza
  const local = new Date(Date.UTC(y, m - 1, d));
  if (h < ETL_HOUR || (h === ETL_HOUR && min < ETL_MINUTE)) {
    local.setUTCDate(local.getUTCDate() - 1);
  }
  return local.toISOString().slice(0, 10);
}

/**
 * Milissegundos até o próximo 04:30 America/Fortaleza.
 */
export function getEtlStaleTime(): number {
  const { h, min, s } = nowInFortaleza();
  const nowMs = (h * 3600 + min * 60 + s) * 1000;
  const targetMs = (ETL_HOUR * 3600 + ETL_MINUTE * 60) * 1000;
  let diff = targetMs - nowMs;
  if (diff <= 0) diff += DAY_MS;
  // Pequena margem para garantir que o bucket já tenha virado
  return diff + 60_000;
}

/* -------- Persistência leve em localStorage -------- */

const PREFIX = 'nbl-etl-cache:';

interface CacheEntry<T> {
  bucket: string;
  data: T;
  savedAt: number;
}

export function loadFromLocal<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.bucket !== getCurrentEtlBucket()) {
      localStorage.removeItem(PREFIX + key);
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function saveToLocal<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      bucket: getCurrentEtlBucket(),
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignora quota/serialization
  }
}

/**
 * Limpa entradas antigas (de buckets anteriores). Roda barato no boot.
 */
export function pruneEtlCache(): void {
  try {
    const current = getCurrentEtlBucket();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '{}');
        if (parsed.bucket !== current) localStorage.removeItem(k);
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // ignora
  }
}
