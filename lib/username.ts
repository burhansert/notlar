export const AUTH_EMAIL_DOMAIN = 'notlar.local';
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function validateUsername(username: string) {
  const value = normalizeUsername(username);
  if (!value) return 'Kullanıcı adı gerekli.';
  if (!USERNAME_REGEX.test(value)) {
    return 'Kullanıcı adı 3-20 karakter olmalı; sadece harf, rakam ve alt çizgi kullanın.';
  }
  return null;
}

export function validatePassword(password: string) {
  if (!password) return 'Şifre gerekli.';
  if (password.length < 6) return 'Şifre en az 6 karakter olmalı.';
  return null;
}

export function translateAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return 'Kullanıcı adı veya şifre hatalı.';
  if (value.includes('user already registered') || value.includes('already been registered')) {
    return 'Bu kullanıcı adı zaten alınmış.';
  }
  if (value.includes('password')) return 'Şifre en az 6 karakter olmalı.';
  if (value.includes('email')) return 'Kayıt bilgileri geçersiz. Kullanıcı adını kontrol edin.';
  if (value.includes('network') || value.includes('fetch')) {
    return 'Bağlantı hatası. İnternetinizi ve Supabase ayarlarını kontrol edin.';
  }
  return message;
}
