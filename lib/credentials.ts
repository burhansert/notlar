const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  const value = normalizeEmail(email);
  if (!value) return 'E-posta gerekli.';
  if (!EMAIL_REGEX.test(value)) return 'Geçerli bir e-posta girin.';
  return null;
}

export function validatePassword(password: string) {
  if (!password) return 'Şifre gerekli.';
  if (password.length < 6) return 'Şifre en az 6 karakter olmalı.';
  return null;
}

export function translateError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('could not find the') || value.includes('schema cache')) {
    return 'Veritabanı tabloları henüz yok. supabase/schema.sql dosyasını SQL Editor’de çalıştırın.';
  }
  if (value.includes('network') || value.includes('fetch')) {
    return 'Bağlantı hatası. İnternetinizi kontrol edin.';
  }
  return message.replace(/^ERROR:\s*/i, '').replace(/\s+Where:[\s\S]*$/i, '');
}
