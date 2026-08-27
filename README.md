# Notlar

E-posta ve şifre ile giriş yapılan not uygulaması. **Supabase Auth kullanılmaz.** Kullanıcılar `public.users` tablosuna yazılır.

## Özellikler

- E-posta + şifre ile kayıt ve giriş (`users` tablosu)
- Kişisel not oluşturma, düzenleme, silme ve arama
- İlk kayıt olan kullanıcı otomatik yönetici olur
- Yönetici paneli: kullanıcılar, roller, hesap durdurma, tüm notlar

## Kurulum

```bash
npm install
npx expo start
```

Proje zaten şu Supabase adresine bağlıdır:

- URL: `https://osoepabysgfmnmzpjukc.supabase.co`

## Veritabanı (zorunlu)

Supabase **SQL Editor**’e `supabase/schema.sql` içeriğini yapıştırıp **Run** deyin.

Bu script:

- `users` (e-posta + hash’lenmiş şifre)
- `sessions`
- `notes`

tablolarını oluşturur. Authentication ürünü açılmaz.

Kayıt olunca e-posta ve şifre bu tabloya yazılır. Şifre düz metin tutulmaz; `pgcrypto` ile bcrypt hash’lenir.

Manuel kullanıcı eklemek isterseniz SQL Editor’de:

```sql
select public.register_user('admin@ornek.com', 'sifre123');
```
