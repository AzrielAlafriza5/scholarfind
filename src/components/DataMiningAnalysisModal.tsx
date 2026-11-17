import { useEffect } from 'react';
import { X } from 'lucide-react';
import { formatNumber, formatSimilarityPercent } from '../lib/formatters';
import type { Paper } from '../types/paper';

interface DataMiningAnalysisModalProps {
  paper: Paper;
  onClose: () => void;
}

function fmtNum(value: number, digits = 4): string {
  return value.toFixed(digits);
}

export function DataMiningAnalysisModal({
  paper,
  onClose,
}: DataMiningAnalysisModalProps) {
  const analysis = paper.analysis;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!analysis) return null;

  const { cosine } = analysis;
  const matchedTermsCount = analysis.queryTermWeights.filter((t) => t.matchedInPaper).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-analysis-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#2563EB]">
              Analisis Data Mining · TF-IDF &amp; Cosine Similarity
            </p>
            <h2
              id="dm-analysis-title"
              className="mt-0.5 text-base font-bold text-[#0F172A] sm:text-lg"
            >
              Rincian Perhitungan Kemiripan Teks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel analisis"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-[#64748B] transition-colors hover:bg-slate-50 hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {/* Summary Metrics Row (Rank + Final Score) */}
          <section aria-label="Ringkasan skor dan peringkat">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#64748B]">Posisi Peringkat</p>
                <p className="mt-1 text-xl font-bold text-[#0F172A] tabular-nums">
                  #{formatNumber(analysis.rankPosition)}{' '}
                  <span className="text-xs font-normal text-[#64748B]">
                    dari {formatNumber(analysis.candidatePoolSize)} kandidat
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#64748B]">Skor Akhir Kemiripan Teks</p>
                <p className="mt-1 text-xl font-bold text-[#2563EB] tabular-nums">
                  {formatSimilarityPercent(cosine.score)}{' '}
                  <span className="font-mono text-xs font-normal text-[#64748B]">
                    ({fmtNum(cosine.score, 4)})
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#64748B]">Kecocokan Term Kueri</p>
                <p className="mt-1 text-xl font-bold text-[#0F172A] tabular-nums">
                  {matchedTermsCount} / {analysis.queryTermWeights.length}{' '}
                  <span className="text-xs font-normal text-[#64748B]">term unik</span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
              Seluruh angka di bawah ini diambil langsung dari perhitungan aktual TF-IDF dan
              Cosine Similarity pada pool {formatNumber(analysis.candidatePoolSize)} makalah
              kandidat dari OpenAlex. Skor ini mengukur <span className="font-medium text-[#0F172A]">kemiripan teks leksikal</span>, bukan penilaian mutu ilmiah.
            </p>
          </section>

          {/* 1 & 2. Original Query & Query Preprocessing */}
          <section className="border-t border-slate-100 pt-5" aria-labelledby="dm-query-section">
            <h3 id="dm-query-section" className="text-sm font-semibold text-[#0F172A]">
              1. Kueri Penelitian &amp; Hasil Preprocessing Kueri
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Teks kueri diubah menjadi huruf kecil, dibersihkan dari tanda baca/angka berdiri
              sendiri, dipecah menjadi token kata, lalu disaring dari <em>stopwords</em> bahasa
              Indonesia dan Inggris.
            </p>

            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-[#64748B]">Kueri Asli</dt>
                <dd className="mt-1 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm font-medium text-[#0F172A]">
                  {analysis.originalQuery}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#64748B] tabular-nums">
                  Token Kueri Setelah Preprocessing ({analysis.queryTokens.length} token)
                </dt>
                <dd className="mt-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs leading-relaxed text-[#0F172A]">
                  {analysis.queryTokens.length > 0
                    ? analysis.queryTokens.join(' · ')
                    : 'Tidak ada token valid tersisa.'}
                </dd>
              </div>
            </dl>
          </section>

          {/* 3 & 4. Paper Text & Paper Preprocessing */}
          <section className="border-t border-slate-100 pt-5" aria-labelledby="dm-paper-section">
            <h3 id="dm-paper-section" className="text-sm font-semibold text-[#0F172A]">
              2. Teks Makalah &amp; Hasil Preprocessing Makalah
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Algoritma menggabungkan judul dan abstrak yang tersedia untuk membentuk representasi
              dokumen.{' '}
              {analysis.usedAbstract
                ? 'Makalah ini memiliki abstrak OpenAlex sehingga judul dan abstrak keduanya dianalisis.'
                : 'Abstrak tidak tersedia di OpenAlex, sehingga hanya judul makalah yang diproses.'}
            </p>

            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs font-medium text-[#64748B]">Judul Makalah</dt>
                <dd className="mt-1 text-sm font-semibold text-[#0F172A]">{paper.title}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-[#64748B]">Abstrak yang Dianalisis</dt>
                <dd className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs leading-relaxed text-slate-700">
                  {paper.abstract ? (
                    paper.abstract
                  ) : (
                    <span className="text-slate-400">
                      Abstrak tidak tersedia pada metadata sumber OpenAlex.
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-[#64748B] tabular-nums">
                  Hasil Preprocessing Makalah ({formatNumber(analysis.paperTokenCount)} total token ·{' '}
                  {formatNumber(analysis.paperUniqueTermCount)} term unik)
                </dt>
                <dd className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs leading-relaxed text-slate-700">
                  {analysis.paperTokens.length > 0 ? (
                    <>
                      {analysis.paperTokens.join(' · ')}
                      {analysis.paperTokenCount > analysis.paperTokens.length && (
                        <span className="text-[#64748B]">
                          {' '}
                          · … (+{formatNumber(analysis.paperTokenCount - analysis.paperTokens.length)}{' '}
                          token lainnya)
                        </span>
                      )}
                    </>
                  ) : (
                    'Tidak ada token valid.'
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* 5. TF-IDF Term Weights Table */}
          <section className="border-t border-slate-100 pt-5" aria-labelledby="dm-tfidf-section">
            <h3 id="dm-tfidf-section" className="text-sm font-semibold text-[#0F172A]">
              3. Bobot TF-IDF per Term Kueri
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              <strong>TF</strong> (<em>Term Frequency</em>) = jumlah kemunculan kata dibagi total
              token dokumen. <strong>Smooth IDF</strong> = ln((N + 1) / (df + 1)) + 1 dengan{' '}
              <span className="font-mono text-[#0F172A]">N = {analysis.candidatePoolSize}</span>{' '}
              kandidat. Kata yang lebih spesifik (df kecil) memperoleh bobot IDF lebih tinggi.
            </p>

            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[#64748B]">
                    <th className="px-3 py-2.5 font-semibold">Term</th>
                    <th className="px-3 py-2.5 text-right font-semibold">TF Kueri</th>
                    <th className="px-3 py-2.5 text-right font-semibold">TF Makalah</th>
                    <th className="px-3 py-2.5 text-right font-semibold">df / N</th>
                    <th className="px-3 py-2.5 text-right font-semibold">IDF</th>
                    <th className="px-3 py-2.5 text-right font-semibold">TF-IDF Kueri</th>
                    <th className="px-3 py-2.5 text-right font-semibold">TF-IDF Makalah</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Hasil Kali</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {analysis.queryTermWeights.map((row) => (
                    <tr
                      key={row.term}
                      className={row.matchedInPaper ? 'bg-white' : 'bg-slate-50/50 text-slate-400'}
                    >
                      <td className="px-3 py-2 font-medium text-[#0F172A]">{row.term}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.queryTf)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.paperTf)}</td>
                      <td className="px-3 py-2 text-right">
                        {row.documentFrequency}/{analysis.candidatePoolSize}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.idf)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.queryTfIdf)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.paperTfIdf)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-[#2563EB]">
                        {fmtNum(row.product, 6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Paper TF-IDF Terms */}
            {analysis.topPaperTerms.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-[#0F172A]">
                  Term TF-IDF Tertinggi pada Vektor Makalah (Kontributor Norma ||v_d||)
                </h4>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[#64748B]">
                        <th className="px-3 py-2 font-semibold">Term Makalah</th>
                        <th className="px-3 py-2 text-right font-semibold">TF</th>
                        <th className="px-3 py-2 text-right font-semibold">df</th>
                        <th className="px-3 py-2 text-right font-semibold">IDF</th>
                        <th className="px-3 py-2 text-right font-semibold">Bobot TF-IDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {analysis.topPaperTerms.map((item) => (
                        <tr key={item.term} className="bg-white">
                          <td className="px-3 py-1.5 font-medium text-[#0F172A]">{item.term}</td>
                          <td className="px-3 py-1.5 text-right text-slate-700">
                            {fmtNum(item.tf)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-700">
                            {item.documentFrequency}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-700">
                            {fmtNum(item.idf)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-[#0F172A]">
                            {fmtNum(item.tfidf)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* 6 & 7. Cosine Similarity Step-by-Step */}
          <section className="border-t border-slate-100 pt-5" aria-labelledby="dm-cosine-section">
            <h3 id="dm-cosine-section" className="text-sm font-semibold text-[#0F172A]">
              4. Perhitungan Cosine Similarity (Vektor Aktual)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              <strong>Cosine Similarity</strong> mengukur sudut antara vektor TF-IDF kueri (
              <span className="font-mono text-[#0F172A]">v_q</span>) dan vektor TF-IDF makalah (
              <span className="font-mono text-[#0F172A]">v_d</span>). Nilai mendekati{' '}
              <span className="font-mono">1,0</span> berarti komposisi kata kueri dan makalah
              sangat mirip, sedangkan <span className="font-mono">0,0</span> berarti tidak ada
              irisan term.
            </p>

            <div className="mt-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 font-mono text-xs leading-relaxed text-[#0F172A] tabular-nums">
              <div className="space-y-1.5">
                <p>
                  <span className="text-[#64748B]">Dot Product (v_q · v_d)</span> ={' '}
                  <span className="font-semibold">{fmtNum(cosine.dotProduct, 6)}</span>
                </p>
                <p>
                  <span className="text-[#64748B]">Norma Kueri (||v_q||)</span> ={' '}
                  <span className="font-semibold">{fmtNum(cosine.queryNorm, 6)}</span>
                </p>
                <p>
                  <span className="text-[#64748B]">Norma Makalah (||v_d||)</span> ={' '}
                  <span className="font-semibold">{fmtNum(cosine.paperNorm, 6)}</span>
                </p>
                <p>
                  <span className="text-[#64748B]">Penyebut (||v_q|| × ||v_d||)</span> ={' '}
                  <span className="font-semibold">{fmtNum(cosine.denominator, 6)}</span>
                </p>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-[#64748B]">Rumus &amp; Substitusi Aktual:</p>
                <p className="mt-1 break-all text-sm font-semibold text-[#2563EB]">
                  Cosine Similarity = {fmtNum(cosine.dotProduct, 6)} /{' '}
                  {fmtNum(cosine.denominator, 6)} = {fmtNum(cosine.score, 4)} (
                  {formatSimilarityPercent(cosine.score)})
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          <p className="text-xs text-[#64748B]">
            ID OpenAlex: <span className="font-mono text-[#0F172A]">{paper.id}</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-[#2563EB] px-4 text-xs font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Tutup Analisis
          </button>
        </div>
      </div>
    </div>
  );
}
