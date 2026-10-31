// Сурах явцын анализ — зөвхөн эцэг эх, багшид харагдана.
import { t } from './i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const LETTER_TOTAL = 32;
const MASTER = 3; // дараалан 3 удаа зөв = цээжилсэн
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** Нэг сурагчийн тоон дүгнэлт */
export function summarize(studentId, { stats, sessions }, vocab, subs = [], asg = []) {
  const mine = stats.filter((w) => w.student_id === studentId);
  const by = (k) => mine.filter((w) => w.kind === k);
  const words = by('vocab'), letters = by('letter');
  const mastered = (arr) => arr.filter((w) => w.streak >= MASTER);
  const weak = (arr) => arr.filter((w) => w.wrong > 0 && w.streak < 2).sort((a, b) => (b.wrong - b.correct) - (a.wrong - a.correct));
  const acc = (arr) => { const c = arr.reduce((s, w) => s + w.correct, 0), x = arr.reduce((s, w) => s + w.wrong, 0); return { pct: pct(c, c + x), n: c + x }; };
  const ses = sessions.filter((g) => g.student_id === studentId).sort((a, b) => a.played_at.localeCompare(b.played_at));
  const weekAgo = Date.now() - 7 * 864e5;
  // Сүүлийн 6 долоо хоног: тоглолтын тоо + зөв хувь
  const weeks = [...Array(6)].map((_, i) => {
    const end = Date.now() - (5 - i) * 7 * 864e5, start = end - 7 * 864e5;
    const s = ses.filter((g) => { const ts = Date.parse(g.played_at); return ts > start && ts <= end; });
    const sc = s.reduce((a, g) => a + g.score, 0), tot = s.reduce((a, g) => a + g.total, 0);
    return { n: s.length, acc: tot ? pct(sc, tot) : null, label: i === 5 ? t('thisWeek') : `-${5 - i}` };
  });
  const today = new Date().toISOString().slice(0, 10);
  const dueAsg = asg.filter((a) => a.due_date && a.due_date <= today);
  const onTime = dueAsg.filter((a) => subs.some((s) => s.assignment_id === a.id && String(s.submitted_at || '').slice(0, 10) <= a.due_date)).length;
  return {
    vocabTotal: Math.max(vocab.length, words.length),
    wordsMastered: mastered(words), wordsLearning: words.filter((w) => w.streak < MASTER), wordsWeak: weak(words),
    lettersMastered: mastered(letters), lettersWeak: weak(letters),
    accVocab: acc(words), accLetter: acc(letters), accSentence: acc(by('sentence')), accSuffix: acc(by('suffix')),
    accAll: acc(mine),
    sessionsWeek: ses.filter((g) => Date.parse(g.played_at) > weekAgo).length,
    lastPlayed: ses.length ? ses[ses.length - 1].played_at : null,
    weeks, onTime, dueCount: dueAsg.length,
  };
}

const bar = (parts) => `<div class="stack-bar" role="img" aria-label="${esc(parts.map((p) => `${p.label}: ${p.v}`).join(', '))}">
  ${parts.map((p) => `<span class="${p.cls}" style="flex:${p.v}"></span>`).join('')}</div>`;

/** Нэг сурагчийн дэлгэрэнгүй анализ (эцэг эх, багшид) */
export function insightsHtml(sum, vocab, { forParent = false } = {}) {
  const de = (mn) => vocab.find((v) => v.mn === mn)?.de || '';
  const seen = sum.wordsMastered.length + sum.wordsLearning.length;
  const notSeen = Math.max(0, sum.vocabTotal - seen);
  const maxN = Math.max(1, ...sum.weeks.map((w) => w.n));
  const accChip = (label, a) => `<div class="acc-row"><span>${label}</span><span class="acc-track"><span style="width:${a.n ? a.pct : 0}%"></span></span><b>${a.n ? a.pct + '%' : '—'}</b></div>`;
  return `<div class="insights">
    <div class="ins-grid">
      <div class="ins-card">
        <span class="kpi-label">${t('insWords')}</span>
        <span class="kpi-value">${sum.wordsMastered.length}<small> / ${sum.vocabTotal}</small></span>
        ${bar([{ cls: 'b-ok', v: sum.wordsMastered.length, label: t('insMastered') }, { cls: 'b-mid', v: sum.wordsLearning.length, label: t('insLearning') }, { cls: 'b-none', v: notSeen, label: t('insNotSeen') }])}
        <span class="legend"><i class="b-ok"></i>${t('insMastered')} <i class="b-mid"></i>${t('insLearning')} <i class="b-none"></i>${t('insNotSeen')}</span>
      </div>
      <div class="ins-card">
        <span class="kpi-label">${t('insLetters')}</span>
        <span class="kpi-value">${sum.lettersMastered.length}<small> / ${LETTER_TOTAL}</small></span>
        ${bar([{ cls: 'b-ok', v: sum.lettersMastered.length, label: t('insMastered') }, { cls: 'b-none', v: LETTER_TOTAL - sum.lettersMastered.length, label: t('insNotSeen') }])}
      </div>
      <div class="ins-card">
        <span class="kpi-label">${t('insAccuracy')}</span>
        ${accChip(t('insAccWords'), sum.accVocab)}
        ${accChip(t('insAccLetters'), sum.accLetter)}
        ${accChip(t('insAccSent'), sum.accSentence)}
        ${accChip(t('insAccSuffix'), sum.accSuffix)}
      </div>
      <div class="ins-card">
        <span class="kpi-label">${t('insPractice')}</span>
        <div class="mini-bars" role="img" aria-label="${t('insPractice')}">
          ${sum.weeks.map((w) => `<div class="mb-col" title="${w.n} · ${w.acc ?? '—'}%"><span class="mb-n">${w.n || ''}</span><span class="mb-bar" style="height:${(w.n / maxN) * 100}%"></span><small>${esc(w.label)}</small></div>`).join('')}
        </div>
        <span class="kpi-note">${t('insOnTime')}: <b>${sum.dueCount ? `${sum.onTime}/${sum.dueCount}` : '—'}</b></span>
      </div>
    </div>
    <div class="ins-lists">
      <div><h4>✓ ${t('insMasteredWords')} (${sum.wordsMastered.length})</h4>
        <p class="chips">${sum.wordsMastered.map((w) => `<span class="wchip ok" title="${esc(de(w.item))}">${esc(w.item)}</span>`).join('') || `<span class="muted small">${t('none')}</span>`}</p></div>
      <div><h4>↻ ${t('insPracticeWords')}</h4>
        <p class="chips">${[...sum.wordsWeak.slice(0, 8), ...sum.lettersWeak.slice(0, 4)].map((w) => `<span class="wchip weak" title="${w.correct}✓ ${w.wrong}✕">${esc(w.item)}${de(w.item) ? ` <small>${esc(de(w.item))}</small>` : ''}</span>`).join('') || `<span class="muted small">${t('none')}</span>`}</p>
        ${forParent && (sum.wordsWeak.length || sum.lettersWeak.length) ? `<p class="small muted">${t('insParentTip')}</p>` : ''}</div>
    </div>
  </div>`;
}
