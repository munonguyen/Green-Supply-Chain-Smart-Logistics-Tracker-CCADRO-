/**
 * Elastic-style Multi-Field Fuzzy Search & Weighted Ranking Engine (Vietnamese diacritic-insensitive).
 * Supports multi-token queries, exact/prefix/substring boosts, and Damerau-Levenshtein typo tolerance.
 */

export function normalizeElasticText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function levenshteinDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: cols }, (_, j) => j);

  for (let i = 1; i < rows; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, Math.min(dp[j - 1], dp[j]));
      }
      prev = temp;
    }
  }
  return dp[cols - 1];
}

/**
 * Search and rank a list of records using weighted Elastic-style scoring.
 *
 * @param {Array} items
 * @param {string} query
 * @param {Array<{ key?: string, label?: string, weight?: number, getValue: (item: any) => any }>} fields
 * @returns {{ items: Array, tookMs: number, queryNorm: string, matchedFieldsByIndex: Array<string[]> }}
 */
export function elasticSearchMatch(items = [], query = '', fields = []) {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const list = Array.isArray(items) ? items : [];
  const queryNorm = normalizeElasticText(query);

  if (!queryNorm) {
    return {
      items: list,
      tookMs: 0,
      queryNorm: '',
      matchedFieldsByKey: new Map()
    };
  }

  const tokens = queryNorm.split(/\s+/).filter(Boolean);
  const scored = [];
  const matchedFieldsByKey = new Map();

  for (let idx = 0; idx < list.length; idx += 1) {
    const item = list[idx];
    let totalScore = 0;
    let allTokensMatched = true;
    const matchedLabels = new Set();

    for (const token of tokens) {
      let bestTokenScore = 0;

      for (let fieldIdx = 0; fieldIdx < fields.length; fieldIdx += 1) {
        const field = fields[fieldIdx];
        const rawVal =
          typeof field === 'string'
            ? item?.[field]
            : typeof field?.getValue === 'function'
              ? field.getValue(item)
              : item?.[field?.key];
        const normVal = normalizeElasticText(rawVal);
        if (!normVal) continue;

        // Prioritize earlier fields cleanly when callers pass plain string arrays
        const weight = typeof field === 'string' ? Math.max(0.6, 2.0 - fieldIdx * 0.15) : (field?.weight ?? 1.0);
        const fieldLabel = typeof field === 'string' ? field : field?.label || field?.key || 'field';
        let tokenScore = 0;

        if (normVal === queryNorm) {
          tokenScore = 10.0 * weight;
        } else if (normVal === token) {
          tokenScore = 8.0 * weight;
        } else if (normVal.startsWith(token)) {
          tokenScore = 6.0 * weight;
        } else if (normVal.includes(token)) {
          tokenScore = 4.0 * weight;
        } else if (token.length >= 3) {
          const words = normVal.split(/[\s,._/@-]+/).filter(Boolean);
          for (const w of words) {
            if (w.startsWith(token)) {
              tokenScore = Math.max(tokenScore, 5.5 * weight);
            } else {
              const dist = levenshteinDistance(token, w);
              const maxDist = token.length >= 6 ? 2 : 1;
              if (dist <= maxDist) {
                tokenScore = Math.max(tokenScore, (2.5 / (1 + dist)) * weight);
              }
            }
          }
        }

        if (tokenScore > 0) {
          matchedLabels.add(fieldLabel);
          if (tokenScore > bestTokenScore) {
            bestTokenScore = tokenScore;
          }
        }
      }

      if (bestTokenScore <= 0) {
        allTokensMatched = false;
        break;
      }
      totalScore += bestTokenScore;
    }

    if (allTokensMatched && totalScore > 0) {
      scored.push({ item, score: totalScore, idx });
      const key =
        item?.shipmentCode ||
        item?.itemCode ||
        item?.contractNumber ||
        item?.transactionCode ||
        item?.containerCode ||
        item?.driverCode ||
        item?.username ||
        item?.id ||
        idx;
      matchedFieldsByKey.set(key, Array.from(matchedLabels));
    }
  }

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    items: scored.map((entry) => entry.item),
    tookMs: Math.max(0.1, Number((end - start).toFixed(1))),
    queryNorm,
    matchedFieldsByKey
  };
}
