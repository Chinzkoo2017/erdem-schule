// Нүүр хуудасны нийтийн өгөгдөл: онлайн ангийн (Supabase) "Нийтэд" гэсэн мэдэгдлүүд.
// Зөвхөн нийтийн (publishable) түлхүүр ашиглана; нууц мэдээлэл энд байхгүй.
export const CLASSROOM = 'classroom/';
const SB_URL = 'https://ksalwzgyfdunoszdghch.supabase.co';
const SB_KEY = 'sb_publishable_tcTU7qTe7Xb6qxg9PKIX9A_7TLXc0f2';

/** Онлайн ангид нэвтэрсэн эсэх (хөтөчид хадгалагдсан session-оос) */
export function sessionUser() {
  try {
    const s = JSON.parse(localStorage.getItem('sb-ksalwzgyfdunoszdghch-auth-token') || 'null');
    if (!s?.user || (s.expires_at && s.expires_at * 1000 < Date.now() - 7 * 864e5)) return null;
    return { name: s.user.user_metadata?.full_name || '' };
  } catch { return null; }
}

const isVideo = (u) => /youtu\.?be|vimeo\.com/i.test(u || '');

/** { news: [...], events: [...] } — landing.js / schedule.html-ийн хүлээж буй хэлбэрээр */
export async function loadPublic() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/announcements?audience=eq.public&select=id,kind,title,body,place,link,starts_at,created_at&order=created_at.desc&limit=60`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    if (!r.ok) throw new Error(r.status);
    const rows = await r.json();
    const news = rows.map((a) => ({
      id: a.id, title: a.title, body: a.body || '', createdAt: Date.parse(a.created_at),
      pinned: a.kind === 'meeting', video: isVideo(a.link) ? a.link : '', link: a.link || '', author: 'Эрдэм сургууль',
    }));
    const events = rows.filter((a) => a.starts_at).map((a) => {
      const d = new Date(a.starts_at);
      const pad = (n) => String(n).padStart(2, '0');
      const online = /онлайн|online/i.test(a.place || '') || (!a.place && /^https?:/i.test(a.link || ''));
      return { id: a.id, title: a.title, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, place: a.place || '', type: online ? 'Онлайн' : 'Танхим', group: '' };
    });
    return { news, events };
  } catch (e) {
    console.warn('public data', e);
    return { news: [], events: [] };
  }
}
