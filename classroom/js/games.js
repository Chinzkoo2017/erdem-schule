import { t } from './i18n.js';

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Хариулт бүрийг тэмдэглэж (анализд) тоглоом дуусахад onDone-д дамжуулна
let LOG = { game: '', items: [] };
const begin = (game) => { LOG = { game, items: [] }; };
const note = (key, ok) => { if (key) LOG.items.push({ kind: key.kind, item: key.item, ok: !!ok }); };

// Монгол кирилл үсэг → дуудлага (латин) → жишээ үг
export const LETTERS = [
  ['А','a','аав'],['Б','b','бар'],['В','v','ваар'],['Г','g','гэр'],['Д','d','дээл'],['Е','ye','ес'],['Ё','yo','ёотон'],
  ['Ж','j','жимс'],['З','dz','зун'],['И','i','ингэ'],['Й','i (богино)','далай'],['К','k','кино'],['Л','l','луу'],['М','m','морь'],
  ['Н','n','нар'],['О','o','ой'],['Ө','ö','өвөл'],['П','p','пүрэв'],['Р','r','раашаан'],['С','s','сар'],['Т','t','тэмээ'],
  ['У','u','ус'],['Ү','ü','үхэр'],['Ф','f','фото'],['Х','kh','хонь'],['Ц','ts','цас'],['Ч','ch','чоно'],['Ш','sh','шувуу'],
  ['Ы','ii','ажлын'],['Э','e','ээж'],['Ю','yu','юм'],['Я','ya','ямаа'],
];

function finish(root, score, total, xp, onDone, replay) {
  root.innerHTML = `
    <div class="game-end">
      <div class="game-end-icon">${score === total ? '🏆' : score >= total / 2 ? '⭐' : '💪'}</div>
      <h3>${t('done')}</h3>
      <p class="game-end-score">${score} / ${total}</p>
      <p class="muted">+${xp} ${t('gotXp')}</p>
      <div class="row-gap">
        <button class="btn btn-gold" data-a="again">${t('playAgain')}</button>
        <button class="btn btn-ghost" data-a="back">${t('back')}</button>
      </div>
    </div>`;
  root.querySelector('[data-a=again]').onclick = replay;
  root.querySelector('[data-a=back]').onclick = () => onDone(null);
  onDone({ xp, score, total, game: LOG.game, items: LOG.items });
}

// ------------------------------------------------------------ Flashcards
export function flashcards(root, vocab, lang, onDone) {
  begin('flash');
  const deck = shuffle(vocab).slice(0, 10);
  let i = 0, known = 0;
  const again = [];
  const run = () => flashcards(root, vocab, lang, onDone);

  function render() {
    if (i >= deck.length) {
      if (again.length) { deck.push(...again.splice(0)); }
      else return finish(root, known, Math.min(10, vocab.length), known, onDone, run);
    }
    const c = deck[i];
    root.innerHTML = `
      <div class="game-progress"><span style="width:${(i / deck.length) * 100}%"></span></div>
      <button class="flashcard" aria-label="${t('flip')}">
        <div class="flashcard-inner">
          <div class="face front"><span class="emoji">${esc(c.emoji || '📝')}</span><span class="word mn">${esc(c.mn)}</span><span class="hint">${t('flip')} ↻</span></div>
          <div class="face back"><span class="emoji">${esc(c.emoji || '📝')}</span><span class="word">${esc(c.de)}</span><span class="hint mn">${esc(c.mn)}</span></div>
        </div>
      </button>
      <div class="row-gap center">
        <button class="btn btn-ghost" data-a="again">↺ ${t('again')}</button>
        <button class="btn btn-gold" data-a="know">✓ ${t('know')}</button>
      </div>`;
    const card = root.querySelector('.flashcard');
    card.onclick = () => card.classList.toggle('flipped');
    root.querySelector('[data-a=know]').onclick = () => { known++; note({ kind: 'vocab', item: c.mn }, true); i++; render(); };
    root.querySelector('[data-a=again]').onclick = () => { again.push(c); note({ kind: 'vocab', item: c.mn }, false); i++; render(); };
  }
  render();
}

// ------------------------------------------------------------ Quiz engine
function quiz(root, rounds, onDone, replay, { bonusPerfect = 0 } = {}) {
  let i = 0, score = 0;
  function render() {
    if (i >= rounds.length) {
      const xp = score + (score === rounds.length ? bonusPerfect : 0);
      return finish(root, score, rounds.length, xp, onDone, replay);
    }
    const r = rounds[i];
    root.innerHTML = `
      <div class="game-progress"><span style="width:${(i / rounds.length) * 100}%"></span></div>
      <p class="quiz-q">${r.prompt}</p>
      <div class="quiz-big ${r.bigClass || ''}">${r.big}</div>
      <div class="quiz-options ${r.optClass || ''}">
        ${r.options.map((o, k) => `<button class="quiz-opt" data-k="${k}">${o.label}</button>`).join('')}
      </div>
      <p class="quiz-feedback" aria-live="polite"></p>`;
    const fb = root.querySelector('.quiz-feedback');
    root.querySelectorAll('.quiz-opt').forEach((b) => {
      b.onclick = () => {
        const k = +b.dataset.k;
        root.querySelectorAll('.quiz-opt').forEach((x) => { x.disabled = true; if (r.options[+x.dataset.k].correct) x.classList.add('right'); });
        note(r.key, r.options[k].correct);
        if (r.options[k].correct) { score++; fb.innerHTML = `✅ ${t('correct')} ${r.after || ''}`; fb.className = 'quiz-feedback ok'; }
        else { b.classList.add('wrongpick'); fb.innerHTML = `❌ ${t('wrong')} ${r.after || ''}`; fb.className = 'quiz-feedback bad'; }
        setTimeout(() => { i++; render(); }, 1300);
      };
    });
  }
  render();
}

// ------------------------------------------------------------ Cyrillic letters
export function letters(root, onDone, only = null) {
  begin('letters');
  const pool = only?.length ? LETTERS.filter((l) => only.includes(l[0])) : LETTERS;
  const picks = shuffle(pool).slice(0, 10);
  const rounds = picks.map(([L, s, ex]) => {
    const wrong = shuffle(LETTERS.filter((x) => x[1] !== s)).slice(0, 3).map((x) => ({ label: esc(x[1]), correct: false }));
    return {
      key: { kind: 'letter', item: L },
      prompt: t('whichSound'),
      big: `${L}<small>${L.toLowerCase()}</small>`, bigClass: 'letter',
      options: shuffle([{ label: esc(s), correct: true }, ...wrong]),
      after: `<span class="mn">— ${esc(ex)}</span>`,
    };
  });
  quiz(root, rounds, onDone, () => letters(root, onDone, only), { bonusPerfect: 5 });
}

// ------------------------------------------------------------ Picture match
export function pictures(root, vocab, onDone) {
  begin('pics');
  const withEmoji = vocab.filter((v) => v.emoji);
  const picks = shuffle(withEmoji).slice(0, 10);
  const rounds = picks.map((v) => ({
    key: { kind: 'vocab', item: v.mn },
    prompt: t('findPic'),
    big: `<span class="mn">${esc(v.mn)}</span>`, bigClass: 'word',
    optClass: 'emoji-opts',
    options: shuffle([{ label: esc(v.emoji), correct: true },
      ...shuffle(withEmoji.filter((x) => x.emoji !== v.emoji)).slice(0, 3).map((x) => ({ label: esc(x.emoji), correct: false }))]),
    after: `<span>— ${esc(v.de)}</span>`,
  }));
  quiz(root, rounds, onDone, () => pictures(root, vocab, onDone));
}

// ------------------------------------------------------------ Build engine (tap tiles in order)
function build(root, rounds, prompt, onDone, replay, { joiner = '', tileClass = '' } = {}) {
  let i = 0, score = 0;
  function render() {
    if (i >= rounds.length) return finish(root, score, rounds.length, score * 2, onDone, replay);
    const r = rounds[i];
    const tiles = shuffle(r.parts.map((p, k) => ({ p, k })));
    // avoid showing the answer already in order
    if (tiles.length > 1 && tiles.every((x, k) => x.k === k)) tiles.reverse();
    const picked = [];
    root.innerHTML = `
      <div class="game-progress"><span style="width:${(i / rounds.length) * 100}%"></span></div>
      <p class="quiz-q">${prompt}</p>
      ${r.hint ? `<p class="build-hint">${r.hint}</p>` : ''}
      <div class="build-answer ${tileClass}" aria-live="polite"></div>
      <div class="build-tiles ${tileClass}">
        ${tiles.map((x, n) => `<button class="tile" data-n="${n}">${esc(x.p)}</button>`).join('')}
      </div>
      <div class="row-gap center">
        <button class="btn btn-ghost" data-a="clear">↺ ${t('clear')}</button>
        <button class="btn btn-gold" data-a="check" disabled>${t('check')}</button>
      </div>
      <p class="quiz-feedback" aria-live="polite"></p>`;
    const ans = root.querySelector('.build-answer'), checkBtn = root.querySelector('[data-a=check]');
    const draw = () => {
      ans.innerHTML = picked.map((n) => `<span class="tile placed">${esc(tiles[n].p)}</span>`).join('') || '<span class="build-empty">…</span>';
      root.querySelectorAll('.build-tiles .tile').forEach((b) => (b.disabled = picked.includes(+b.dataset.n)));
      checkBtn.disabled = picked.length !== tiles.length;
    };
    root.querySelectorAll('.build-tiles .tile').forEach((b) => (b.onclick = () => { picked.push(+b.dataset.n); draw(); }));
    ans.onclick = () => { picked.pop(); draw(); };
    root.querySelector('[data-a=clear]').onclick = () => { picked.length = 0; draw(); };
    checkBtn.onclick = () => {
      const guess = picked.map((n) => tiles[n].p).join(joiner);
      const right = r.parts.join(joiner);
      const low = (x) => x.toLocaleLowerCase('mn');
      const alts = r.alts || [];
      const ok = low(guess) === low(right) || alts.some((a) => low(a) === low(guess));
      if (ok) score++;
      note(r.key, ok);
      const fb = root.querySelector('.quiz-feedback');
      fb.className = 'quiz-feedback ' + (ok ? 'ok' : 'bad');
      const also = alts.length ? `<br><small>${t('alsoRight')}: ${[right, ...alts].filter((x) => low(x) !== low(guess)).map((x) => `<span class="mn">${esc(x)}.</span>`).join(' · ')}</small>` : '';
      fb.innerHTML = (ok ? `✅ ${t('correct')} <span class="mn">${esc(ok && joiner ? guess + '.' : r.show || right)}</span>`
        : `❌ ${t('answerWas')}: <span class="mn">${esc(r.show || right)}</span>`) + also;
      ans.classList.add(ok ? 'is-right' : 'is-wrong');
      root.querySelectorAll('button').forEach((b) => (b.disabled = true));
      setTimeout(() => { i++; render(); }, ok ? 1200 : 2200);
    };
    draw();
  }
  render();
}

// ------------------------------------------------------------ Word builder
export function wordBuilder(root, vocab, onDone) {
  begin('word');
  const pool = vocab.filter((v) => [...v.mn].length >= 3 && [...v.mn].length <= 7 && !v.mn.includes(' '));
  const rounds = shuffle(pool).slice(0, 8).map((v) => ({
    key: { kind: 'vocab', item: v.mn }, parts: [...v.mn], hint: `${esc(v.emoji || '')} ${esc(v.de)}`,
  }));
  build(root, rounds, t('buildWord'), onDone, () => wordBuilder(root, vocab, onDone), { tileClass: 'letters' });
}

// ------------------------------------------------------------ Sentence builder (SOV)
export const SENTENCES = [
  ['Би ном уншиж байна', 'Ich lese ein Buch.'],
  ['Миний ээж хоол хийж байна', 'Meine Mutter kocht.'],
  ['Бид Бямба гарагт монгол хэл сурдаг', 'Samstags lernen wir Mongolisch.', ['Бямба гарагт бид монгол хэл сурдаг']],
  ['Морь талд давхиж байна', 'Das Pferd galoppiert in der Steppe.', ['Талд морь давхиж байна']],
  ['Аав маань машин жолоодно', 'Mein Vater fährt Auto.'],
  ['Өнөөдөр цас орж байна', 'Heute schneit es.', ['Цас өнөөдөр орж байна']],
  ['Манай гэр Нюрнбергт байдаг', 'Unser Zuhause ist in Nürnberg.'],
  ['Эгч маань дуу дуулж байна', 'Meine Schwester singt ein Lied.'],
  ['Би өглөө сүү уудаг', 'Morgens trinke ich Milch.', ['Өглөө би сүү уудаг']],
  ['Өвөө маань Улаанбаатарт амьдардаг', 'Mein Opa lebt in Ulaanbaatar.'],
  ['Бид зун Монгол руу явна', 'Im Sommer fahren wir in die Mongolei.', ['Бид Монгол руу зун явна', 'Зун бид Монгол руу явна']],
  ['Миний дуртай амьтан бол морь', 'Mein Lieblingstier ist das Pferd.', ['Морь бол миний дуртай амьтан']],
];
export function sentenceBuilder(root, onDone) {
  begin('sent');
  const rounds = shuffle(SENTENCES).slice(0, 6).map(([mn, de, alts]) => ({ key: { kind: 'sentence', item: mn }, parts: mn.split(' '), alts: alts || [], hint: esc(de), show: mn + '.' }));
  build(root, rounds, t('buildSent'), onDone, () => sentenceBuilder(root, onDone), { joiner: ' ', tileClass: 'words' });
}

// ------------------------------------------------------------ Fill in the case suffix
export const SUFFIXES = [
  { s: 'Би гэр_ байна.', ok: 'т', opts: ['д', 'ээс', 'тэй'], de: 'Ich bin zu Hause.' },
  { s: 'Бид Герман_ амьдардаг.', ok: 'д', opts: ['т', 'аас', 'ийн'], de: 'Wir leben in Deutschland.' },
  { s: 'Энэ бол ээж_ ном.', ok: 'ийн', opts: ['ын', 'д', 'тэй'], de: 'Das ist Mamas Buch.' },
  { s: 'Би Монгол_ ирсэн.', ok: 'оос', opts: ['ээс', 'д', 'той'], de: 'Ich komme aus der Mongolei.' },
  { s: 'Би аав_ хамт явна.', ok: 'тай', opts: ['тэй', 'той', 'д'], de: 'Ich gehe mit Papa.' },
  { s: 'Бат багш_ асуулт асуув.', ok: 'аас', opts: ['ээс', 'ын', 'д'], de: 'Bat fragte den Lehrer.' },
  { s: 'Хот_ олон хүн байна.', ok: 'од', opts: ['д', 'т', 'оос'], de: 'In der Stadt sind viele Menschen.' },
  { s: 'Эгч_ нэр Номин.', ok: 'ийн', opts: ['ын', 'тэй', 'ээс'], de: 'Der Name der Schwester ist Nomin.' },
  { s: 'Би найз_ тоглоно.', ok: 'тай', opts: ['тэй', 'той', 'д'], de: 'Ich spiele mit einem Freund.' },
  { s: 'Тэр гэр_ гарлаа.', ok: 'ээс', opts: ['аас', 'оос', 'т'], de: 'Er ging aus dem Haus.' },
];
export function fillSuffix(root, onDone) {
  begin('fill');
  const rounds = shuffle(SUFFIXES).slice(0, 8).map((q) => {
    const word = q.s.split(' ').find((w) => w.includes('_'));
    const full = word.replace('_', q.ok).replace('.', '');
    return {
      key: { kind: 'suffix', item: q.s },
      prompt: t('fillQ'),
      big: `<span class="mn">${esc(q.s).replace('_', '<span class="blank">___</span>')}</span>`, bigClass: 'sentence',
      options: shuffle([{ label: '-' + esc(q.ok), correct: true }, ...q.opts.map((o) => ({ label: '-' + esc(o), correct: false }))]),
      after: `<span class="mn">${esc(full)}</span> · <span>${esc(q.de)}</span>`,
    };
  });
  quiz(root, rounds, onDone, () => fillSuffix(root, onDone));
}
