// ============================================================
//  Erdem Schule – тохиргоо
//  FIREBASE_CONFIG = null байвал сайт DEMO горимд (зөвхөн энэ
//  хөтөч дотор, localStorage-д) ажиллана. Жинхэнэ ажиллагаанд
//  README.md дахь зааврын дагуу Firebase төсөл үүсгээд доорх
//  утгуудыг буулгана уу.
// ============================================================
export const FIREBASE_CONFIG = null;
/* Жишээ:
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  appId: "..."
};
*/

export const SCHOOL = {
  name: 'Erdem Schule',
  nameMn: 'Эрдэм Монгол Сургууль',
  founded: 2012,                       // 2027 онд 15 жил
  newYearStart: '2026-10-04T09:00:00', // шинэ хичээлийн жил эхлэх цаг
  schoolYear: '2026 / 2027',
  email: 'info@erdem-schule.de',
  address: 'Easthaus, Schenkstraße 111, 91052 Erlangen',
  facebook: 'https://www.facebook.com/erdemschule',
};

// Хэрэглэгчийн нэрийг firebase-д зориулж и-мэйл болгох домэйн
export const LOGIN_DOMAIN = 'login.erdem-schule.de';

export const GROUPS = ['бага', 'дунд', 'ахлах'];
export const ROLE_LABEL = { admin: 'Админ', teacher: 'Багш', student: 'Сурагч' };
