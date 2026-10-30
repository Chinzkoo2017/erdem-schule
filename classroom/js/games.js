import { t } from './i18n.js';

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  onDone({ xp, score, total });
}

// ------------------------------------------------------------ Flashcards
export function flashcards(root, vocab, lang, onDone) {
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
    root.querySelector('[data-a=know]').onclick = () => { known++; i++; render(); };
    root.querySelector('[data-a=again]').onclick = () => { again.push(c); i++; render(); };
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
        if (r.options[k].correct) { score++; fb.innerHTML = `✅ ${t('correct')} ${r.after || ''}`; fb.className = 'quiz-feedback ok'; }
        else { b.classList.add('wrongpick'); fb.innerHTML = `❌ ${t('wrong')} ${r.after || ''}`; fb.className = 'quiz-feedback bad'; }
        setTimeout(() => { i++; render(); }, 1300);
      };
    });
  }
  render();
}

// ------------------------------------------------------------ Cyrillic letters
export function letters(root, onDone) {
  const picks = shuffle(LETTERS).slice(0, 10);
  const rounds = picks.map(([L, s, ex]) => {
    const wrong = shuffle(LETTERS.filter((x) => x[1] !== s)).slice(0, 3).map((x) => ({ label: esc(x[1]), correct: false }));
    return {
      prompt: t('whichSound'),
      big: `${L}<small>${L.toLowerCase()}</small>`, bigClass: 'letter',
      options: shuffle([{ label: esc(s), correct: true }, ...wrong]),
      after: `<span class="mn">— ${esc(ex)}</span>`,
    };
  });
  quiz(root, rounds, onDone, () => letters(root, onDone), { bonusPerfect: 5 });
}

// ------------------------------------------------------------ Picture match
export function pictures(root, vocab, onDone) {
  const withEmoji = vocab.filter((v) => v.emoji);
  const picks = shuffle(withEmoji).slice(0, 10);
  const rounds = picks.map((v) => ({
    prompt: t('findPic'),
    big: `<span class="mn">${esc(v.mn)}</span>`, bigClass: 'word',
    optClass: 'emoji-opts',
    options: shuffle([{ label: esc(v.emoji), correct: true },
      ...shuffle(withEmoji.filter((x) => x.emoji !== v.emoji)).slice(0, 3).map((x) => ({ label: esc(x.emoji), correct: false }))]),
    after: `<span>— ${esc(v.de)}</span>`,
  }));
  quiz(root, rounds, onDone, () => pictures(root, vocab, onDone));
}
