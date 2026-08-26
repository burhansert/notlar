# Notlar

Kullanıcı adı ve şifre ile giriş yapılan, not kaydeden, yönetici paneli olan React Native (Expo) uygulaması. Veritabanı ve kimlik doğrulama için Supabase kullanılır.

## Özellikler

- Kullanıcı adı + şifre ile kayıt ve giriş
- Kişisel not oluşturma, düzenleme, silme ve arama
- İlk kayıt olan kullanıcı otomatik yönetici olur
- Yönetici paneli: tüm kullanıcılar, roller, hesap durdurma, tüm notlar

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasını doldurun:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

Uygulamayı başlatın:

```bash
npx expo start
```

Ardından Expo Go (telefon) veya `w` (web) ile açın.

## Supabase ayarı

1. [Supabase](https://supabase.com) üzerinde yeni proje oluşturun.
2. **Authentication → Providers → Email** içinde **Confirm email** seçeneğini kapatın. Uygulama gerçek e-posta istemez; kullanıcı adı dahili olarak `kullanici@notlar.local` adresine çevrilir.
3. **SQL Editor**’e `supabase/schema.sql` içeriğini yapıştırıp çalıştırın.
4. Project Settings → API içinden URL ve anon/publishable key değerlerini `.env` dosyasına yazın.

## Kullanım

- Kayıt ol: 3-20 karakterlik kullanıcı adı (küçük harf, rakam, `_`) ve en az 6 karakter şifre.
- Notlarım sekmesinden not ekleyin, arayın, düzenleyin.
- Yönetici hesabıyla alttaki **Yönetici** sekmesi görünür.

Bir kullanıcıyı sonradan yönetici yapmak için:

```sql
update public.profiles
set role = 'admin'
where username = 'kullanici_adi';
```
