const EMAIL_DOMAIN = 'campusfood.com';

export function normalizePhoneNumber(phone) {
  return phone.replace(/[^\d+]/g, '').trim();
}

export function fakeEmailFromPhone(phone) {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized}@${EMAIL_DOMAIN}`;
}

export function phoneFromFakeEmail(email = '') {
  return email.replace(`@${EMAIL_DOMAIN}`, '');
}
