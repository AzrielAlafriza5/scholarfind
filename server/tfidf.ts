import type {
  DataMiningAnalysis,
  DataMiningMeta,
  Paper,
  PaperTermWeight,
  TfIdfTermBreakdown,
} from '../src/types/paper';

/**
 * Bilingual stopword sets (English + Indonesian) for academic text preprocessing.
 * Preserves domain terminology and technical acronyms (e.g., AI, ML, NLP, IoT, CNN).
 */
const ENGLISH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'between',
  'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'may', 'might',
  'more', 'most', 'must', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'about', 'above', 'after', 'again', 'against',
  'all', 'am', 'any', 'because', 'before', 'below', 'also', 'however',
  'therefore', 'thus', 'within', 'without', 'among', 'across', 'per', 'via',
]);

const INDONESIAN_STOPWORDS = new Set([
  'ada', 'adalah', 'adanya', 'adapun', 'agak', 'agar', 'akan', 'akhir',
  'antara', 'apa', 'apabila', 'apakah', 'atas', 'atau', 'bahwa', 'bagai',
  'bagaimana', 'bagi', 'bahkan', 'banyak', 'baru', 'beberapa', 'begitu',
  'belum', 'berada', 'berapa', 'berbagai', 'berdasarkan', 'berikut',
  'bersama', 'bila', 'bisa', 'bukan', 'cara', 'cukup', 'dalam', 'dan',
  'dapat', 'dari', 'daripada', 'demi', 'demikian', 'dengan', 'di', 'dia',
  'dimana', 'dua', 'guna', 'hal', 'hanya', 'harus', 'hingga', 'ia', 'ialah',
  'ini', 'itu', 'jadi', 'jangan', 'jika', 'juga', 'kami', 'karena', 'ke',
  'kemudian', 'kepada', 'ketika', 'kita', 'kurang', 'lagi', 'lain', 'lainnya',
  'lalu', 'lebih', 'macam', 'maka', 'masih', 'masing', 'mau', 'melainkan',
  'melalui', 'memang', 'menjadi', 'menuju', 'menurut', 'mereka', 'merupakan',
  'meski', 'meskipun', 'mungkin', 'namun', 'nya', 'oleh', 'pada', 'padahal',
  'paling', 'para', 'per', 'perlu', 'pula', 'pun', 'saat', 'saja', 'saling',
  'sama', 'sambil', 'sampai', 'sangat', 'satu', 'saya', 'sebab', 'sebagai',
  'sebagaimana', 'sebagian', 'sebelum', 'sebuah', 'secara', 'sedang',
  'sedangkan', 'sedikit', 'sehingga', 'sejak', 'sekali', 'sekarang',
  'sekitar', 'selain', 'selalu', 'selama', 'seluruh', 'semakin', 'sementara',
  'semua', 'sendiri', 'seorang', 'seperti', 'sering', 'serta', 'sesuai',
  'setelah', 'setiap', 'sudah', 'suatu', 'supaya', 'tapi', 'telah',
  'tentang', 'tentu', 'terhadap', 'terjadi', 'termasuk', 'tersebut',
  'tertentu', 'tetapi', 'tidak', 'tiga', 'untuk', 'waktu', 'walaupun',
  'ya', 'yaitu', 'yakni', 'yang',
]);

/**
 * Preprocess text for TF-IDF indexing:
 * 1. Unicode NFKD normalization and diacritic removal
 * 2. Lowercase conversion
 * 3. Punctuation & symbol removal (replacing punctuation/hyphens with spaces)
 * 4. Whitespace tokenization
 * 5. Filtering out single-character tokens, standalone digits, and EN/ID stopwords
 */
export function preprocessText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const normalized = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const rawTokens = normalized.split(' ');
  const tokens: string[] = [];

  for (const token of rawTokens) {
    if (token.length < 2) continue;
    if (/^\d+$/.test(token)) continue;
    if (ENGLISH_STOPWORDS.has(token) || INDONESIAN_STOPWORDS.has(token)) continue;
    tokens.push(token);
  }

  // Fallback: if all tokens were stopwords (e.g. a very short or stopword-only query),
  // keep non-empty alphanumeric tokens of length >= 2 so similarity does not collapse unexpectedly.
  if (tokens.length === 0) {
    for (const token of rawTokens) {
      if (token.length >= 2) {
        tokens.push(token);
      }
    }
  }

  return tokens;
}

/**
 * Compute normalized term frequency map: tf(t, d) = count(t, d) / totalTokens(d).
 */
export function computeTermFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const total = tokens.length;
  if (total === 0) return counts;

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const tf = new Map<string, number>();
  for (const [term, count] of counts.entries()) {
    tf.set(term, count / total);
  }
  return tf;
}

const MAX_EXPOSED_PAPER_TOKENS = 120;
const MAX_TOP_PAPER_TERMS = 12;

function roundNum(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Compute document frequency and smooth Inverse Document Frequency across the candidate corpus:
 * idf(t) = ln((N + 1) / (df(t) + 1)) + 1
 *
 * Smooth IDF guarantees:
 * - Zero division is impossible even for query terms absent from all candidates.
 * - Terms appearing in every candidate document still retain positive weight (1.0)
 *   rather than collapsing to 0.
 */
export function computeSmoothIdfWithDocFreq(
  documentTermMaps: Array<Map<string, number>>,
  queryTerms: Set<string>
): { idf: Map<string, number>; docFreq: Map<string, number> } {
  const numDocs = documentTermMaps.length;
  const docFreq = new Map<string, number>();

  for (const termMap of documentTermMaps) {
    for (const term of termMap.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  const vocabulary = new Set<string>([...docFreq.keys(), ...queryTerms]);

  for (const term of vocabulary) {
    const df = docFreq.get(term) ?? 0;
    idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
  }

  return { idf, docFreq };
}

export function computeSmoothIdf(
  documentTermMaps: Array<Map<string, number>>,
  queryTerms: Set<string>
): Map<string, number> {
  return computeSmoothIdfWithDocFreq(documentTermMaps, queryTerms).idf;
}

/**
 * Build a sparse TF-IDF vector (Map<term, weight>) and precompute its L2 norm.
 */
export function buildTfIdfVector(
  tfMap: Map<string, number>,
  idfMap: Map<string, number>
): { weights: Map<string, number>; norm: number } {
  const weights = new Map<string, number>();
  let sumSquares = 0;

  for (const [term, tf] of tfMap.entries()) {
    const idf = idfMap.get(term) ?? 1;
    const weight = tf * idf;
    if (weight > 0) {
      weights.set(term, weight);
      sumSquares += weight * weight;
    }
  }

  return {
    weights,
    norm: Math.sqrt(sumSquares),
  };
}

export interface CosineCalculationDetails {
  dotProduct: number;
  queryNorm: number;
  paperNorm: number;
  denominator: number;
  score: number;
}

/**
 * Compute Cosine Similarity and expose the actual dot product and vector norms:
 * cos(q, d) = (q · d) / (||q|| * ||d||), bounded in [0, 1].
 */
export function computeCosineDetails(
  queryVec: { weights: Map<string, number>; norm: number },
  paperVec: { weights: Map<string, number>; norm: number }
): CosineCalculationDetails {
  const denominator = queryVec.norm * paperVec.norm;
  if (queryVec.norm === 0 || paperVec.norm === 0 || denominator === 0) {
    return {
      dotProduct: 0,
      queryNorm: roundNum(queryVec.norm, 6),
      paperNorm: roundNum(paperVec.norm, 6),
      denominator: 0,
      score: 0,
    };
  }

  // Iterate over the smaller sparse map for efficiency
  const [smaller, larger] =
    queryVec.weights.size <= paperVec.weights.size
      ? [queryVec.weights, paperVec.weights]
      : [paperVec.weights, queryVec.weights];

  let dotProduct = 0;
  for (const [term, weightA] of smaller.entries()) {
    const weightB = larger.get(term);
    if (weightB !== undefined) {
      dotProduct += weightA * weightB;
    }
  }

  const rawScore = dotProduct > 0 ? dotProduct / denominator : 0;
  const clamped = Math.min(1, Math.max(0, rawScore));

  return {
    dotProduct: roundNum(dotProduct, 6),
    queryNorm: roundNum(queryVec.norm, 6),
    paperNorm: roundNum(paperVec.norm, 6),
    denominator: roundNum(denominator, 6),
    score: Math.round(clamped * 10_000) / 10_000,
  };
}

export function computeCosineSimilarity(
  vecA: { weights: Map<string, number>; norm: number },
  vecB: { weights: Map<string, number>; norm: number }
): number {
  return computeCosineDetails(vecA, vecB).score;
}

export interface RankedCandidateResult {
  papers: Paper[];
  rankingMeta: DataMiningMeta;
}

/**
 * Content-based Data Mining ranking pipeline using TF-IDF and Cosine Similarity.
 * Evaluates each candidate paper's title and available abstract against the user's query,
 * sorts the full candidate pool from highest to lowest similarity, and attaches the exact
 * calculation breakdown for transparent inspection.
 */
export function rankPapersByTfIdfCosine(
  query: string,
  candidates: Paper[],
  totalOpenAlexMatches: number
): RankedCandidateResult {
  const queryTokens = preprocessText(query);
  const queryTf = computeTermFrequency(queryTokens);
  const queryTermList = Array.from(queryTf.keys());
  const queryTermSet = new Set(queryTermList);

  let papersWithAbstract = 0;
  const preprocessedDocs = candidates.map((paper) => {
    const hasAbstract = Boolean(paper.abstract && paper.abstract.trim().length > 0);
    if (hasAbstract) papersWithAbstract += 1;
    const combinedText = hasAbstract
      ? `${paper.title} ${paper.abstract}`
      : paper.title;
    const tokens = preprocessText(combinedText);
    const tfMap = computeTermFrequency(tokens);
    return { hasAbstract, tokens, tfMap };
  });

  const docTermMaps = preprocessedDocs.map((d) => d.tfMap);
  const { idf: idfMap, docFreq } = computeSmoothIdfWithDocFreq(docTermMaps, queryTermSet);
  const queryVector = buildTfIdfVector(queryTf, idfMap);

  const scoredPapers: Paper[] = candidates.map((paper, idx) => {
    const { hasAbstract, tokens, tfMap } = preprocessedDocs[idx];
    const docVector = buildTfIdfVector(tfMap, idfMap);
    const cosine = computeCosineDetails(queryVector, docVector);

    const queryTermWeights: TfIdfTermBreakdown[] = queryTermList.map((term) => {
      const qTf = queryTf.get(term) ?? 0;
      const pTf = tfMap.get(term) ?? 0;
      const df = docFreq.get(term) ?? 0;
      const idfVal = idfMap.get(term) ?? 1;
      const qWeight = queryVector.weights.get(term) ?? 0;
      const pWeight = docVector.weights.get(term) ?? 0;

      return {
        term,
        queryTf: roundNum(qTf, 6),
        paperTf: roundNum(pTf, 6),
        documentFrequency: df,
        idf: roundNum(idfVal, 6),
        queryTfIdf: roundNum(qWeight, 6),
        paperTfIdf: roundNum(pWeight, 6),
        product: roundNum(qWeight * pWeight, 6),
        matchedInPaper: pWeight > 0,
      };
    });

    const topPaperTerms: PaperTermWeight[] = Array.from(docVector.weights.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_TOP_PAPER_TERMS)
      .map(([term, weight]) => ({
        term,
        tf: roundNum(tfMap.get(term) ?? 0, 6),
        documentFrequency: docFreq.get(term) ?? 0,
        idf: roundNum(idfMap.get(term) ?? 1, 6),
        tfidf: roundNum(weight, 6),
      }));

    const analysis: DataMiningAnalysis = {
      originalQuery: query,
      queryTokens,
      paperTokens: tokens.slice(0, MAX_EXPOSED_PAPER_TOKENS),
      paperTokenCount: tokens.length,
      paperUniqueTermCount: tfMap.size,
      usedAbstract: hasAbstract,
      rankPosition: 0, // Assigned immediately after deterministic sorting
      candidatePoolSize: candidates.length,
      queryTermWeights,
      topPaperTerms,
      cosine,
    };

    return {
      ...paper,
      similarityScore: cosine.score,
      matchedWithAbstract: hasAbstract,
      analysis,
    };
  });

  // Deterministic descending rank by computed Cosine Similarity,
  // breaking ties by citation count then OpenAlex ID.
  scoredPapers.sort((a, b) => {
    const diff = (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
    if (diff !== 0) return diff;
    if (b.citedByCount !== a.citedByCount) return b.citedByCount - a.citedByCount;
    return a.id.localeCompare(b.id);
  });

  // Assign final 1-based rank position across the full candidate pool
  for (let i = 0; i < scoredPapers.length; i += 1) {
    if (scoredPapers[i].analysis) {
      scoredPapers[i].analysis!.rankPosition = i + 1;
    }
  }

  return {
    papers: scoredPapers,
    rankingMeta: {
      method: 'tfidf-cosine',
      candidatePoolSize: candidates.length,
      totalOpenAlexMatches,
      queryTerms: Array.from(queryTermSet),
      papersWithAbstract,
    },
  };
}
