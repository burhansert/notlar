-- El yazım gliflerini küçük harfe taşı (Türkçe I/İ dönüşümü dahil)

update public.handwriting_glyphs
set letter = case letter
  when 'A' then 'a'
  when 'B' then 'b'
  when 'C' then 'c'
  when 'Ç' then 'ç'
  when 'D' then 'd'
  when 'E' then 'e'
  when 'F' then 'f'
  when 'G' then 'g'
  when 'Ğ' then 'ğ'
  when 'H' then 'h'
  when 'I' then 'ı'
  when 'İ' then 'i'
  when 'J' then 'j'
  when 'K' then 'k'
  when 'L' then 'l'
  when 'M' then 'm'
  when 'N' then 'n'
  when 'O' then 'o'
  when 'Ö' then 'ö'
  when 'P' then 'p'
  when 'R' then 'r'
  when 'S' then 's'
  when 'Ş' then 'ş'
  when 'T' then 't'
  when 'U' then 'u'
  when 'Ü' then 'ü'
  when 'V' then 'v'
  when 'Y' then 'y'
  when 'Z' then 'z'
  else letter
end
where letter in (
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M',
  'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
);

notify pgrst, 'reload schema';
