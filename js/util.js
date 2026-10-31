// Нийтлэг туслах функцууд
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');

const MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
export function fmtDate(ts) {
  const d = typeof ts === 'string' ? new Date(ts + 'T00:00:00') : new Date(ts);
  if (isNaN(d)) return '';
  return `${d.getFullYear()} оны ${MONTHS[d.getMonth()]}ын ${d.getDate()}`;
}
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
export const fmtDay = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };

export function toast(msg, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

export function confirmBox(msg) { return Promise.resolve(window.confirm(msg)); }

// Зургийг жижигрүүлж JPEG data-URL болгоно (Firestore баримт 1MB хязгаартай)
export function fileToDataUrl(file, maxDim = 1000, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Зөвхөн зураг оруулна уу'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = quality, out = c.toDataURL('image/jpeg', q);
      while (out.length > 600000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => reject(new Error('Зургийг уншиж чадсангүй'));
    img.src = url;
  });
}

// YouTube / Vimeo / шууд видео линкийг тоглуулах HTML болгоно
export function videoHtml(url) {
  if (!url) return '';
  const u = url.trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Видео" loading="lazy" allowfullscreen allow="accelerometer; encrypted-media; picture-in-picture"></iframe>`;
  m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `<iframe src="https://player.vimeo.com/video/${m[1]}" title="Видео" loading="lazy" allowfullscreen></iframe>`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return `<video src="${esc(u)}" controls preload="metadata"></video>`;
  return '';
}

export const ROLE_HOME = { admin: 'staff.html', teacher: 'staff.html', student: 'learn.html' };

export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
