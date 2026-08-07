const persianProfanity = [
  // === فحش جنسی و رکیک ===
  'کیر', 'کیری', 'کیرخور', 'کیرکلفت', 'کیرکش',
  'کسکش', 'کسکشی', 'کسخل',
  'کص', 'کصی', 'کصکش', 'کصکشی', 'کصخل', 'کصه',
  'کوس', 'کوسی', 'کوسکش', 'کوسکشی', 'کوسخور', 'کوسده',
  'کون', 'کونی', 'کونده', 'کونخور', 'کون‌خور', 'کون‌ده',
  'گاییدن', 'گاییده', 'گایش', 'گاوزن',
  'جاکش', 'جاکشی', 'جنده', 'جندگی',
  'فاحشه', 'فاحشه‌گری', 'فاحشه‌خانه',
  'هرزه', 'هرزه‌گی', 'هرزه‌نامه',
  'ناموس‌فروش', 'ناموس فروش', 'آبرو فروش', 'آبروفروش', 'حیثیت فروش',
  'حرومزاده', 'حرامزاده', 'حروم زاده', 'حرام زاده',
  'خواهرقحبه', 'خواهر قحبه', 'خواهرجنده', 'خواهر جنده',
  'مادرقحبه', 'مادر قحبه', 'مادرجنده', 'مادر جنده',
  'دخترقحبه', 'دختر قحبه', 'دخترجنده', 'دختر جنده',
  'زن قحبه', 'زنازاده', 'زن زاده',
  'سکس', 'porn', 'xxx', 'nude', 'naked', 'nsfw',
  'پورنو', 'تشنیع', 'رکیک', 'مستهجن',
  'لاشی', 'مفتی', 'مرف',
  'gey', 'lez',
  'حیوان‌باز', 'بچه‌باز', 'pedophile',
  'فتیش', 'fetish',

  // === خانوادگی ===
  'بی‌شرف', 'بی شرف', 'بی‌ناموس', 'بی ناموس', 'بی‌غیرت', 'بی غیرت',
  'بی‌پدر', 'بی پدر', 'بی‌مادر', 'بی مادر', 'بی‌برادر', 'بی برادر',
  'بی‌آبرو', 'بی آبرو', 'بی‌عزت', 'بی عزت', 'بی‌آداب', 'بی آداب',
  'پدرسوخته', 'پدر سوخته', 'پدرک', 'مادرک',
  'پدرسگ', 'پدر سگ', 'مادرسگ', 'مادر سگ',
  'تبارکثیف', 'نسل پست', 'خانواده خراب',

  // === نسبت دادن به حیوانات ===
  'خری', 'گاوی', 'الاغی', 'سگی', 'خریت',

  // === انگلیسی ===
  'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker',
  'shit', 'shitty', 'ass', 'asshole', 'bitch',
  'damn', 'dammit', 'bastard', 'dick', 'cock',
  'pussy', 'twat', 'cunt', 'wanker', 'prick',
  'douche', 'douchebag', 'jackass', 'dumbass',
  'slut', 'whore', 'hoe', 'pimp', 'creep',
  'pervert', 'pedo', 'scum', 'trash', 'loser',
  'sucker', 'dickhead', 'fuckface',
  'fucktard', 'shithead', 'piss',
  'nigga', 'nigger', 'faggot', 'fag',
  'dyke', 'tranny', 'homo',
  'suck', 'blowjob', 'handjob',

  // === ترکی ===
  'amk', 'amına', 'orospu', 'piç', 'pic',
  'sikim', 'sikerim', 'sikeyim', 'amcık',
  'göt', 'ibne', 'yavşak', 'pezevenk',
  'kevaşe', 'sikik', 'sikiş', 'sapık',
  'mal', 'geri zekalı', 'gerizekalı',
  'salak', 'ahmak', 'dangalak', 'beyinsiz',
  'puşt', 'puştluk', 'şerefsiz', 'şerefsizlik',
  'namussuz', 'haysiyetsiz', 'alçak', 'rezil',
  'hain', 'kalleş', 'merdud', 'şerefsiz',

  // === نژادی ===
  'nigger', 'nigga', 'spic', 'chink',
  'wetback', 'cracker', 'redneck',

  // === تهدید ===
  'میکشمت', 'کشتار',

  // === ترکیبات ===
  'بی‌شرف پست', 'بی‌ناموس عوضی',
  'سگ پدر', 'سگ مادر', 'گاو احمق',
  'ناموس فروش', 'آبروریزی', 'حیثیت بردن',
  'پدر سوخته عوضی',
];

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return { hasProfanity: false, matchedWord: null };
  
  const normalize = (s) => s
    .toLowerCase()
    .replace(/[؟?!.،,؛;\s\-_+=*/\\(){}[\]<>@#$%^&*|~`'"]/g, ' ')
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ی')
    .replace(/ؤ/g, 'و')
    .replace(/ك/g, 'ک')
    .replace(/ي/g, 'ی')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedText = normalize(text);
  const words = normalizedText.split(' ');

  for (const bad of persianProfanity) {
    const normalizedBad = normalize(bad);
    if (!normalizedBad) continue;
    
    if (normalizedBad.length <= 3) {
      if (words.includes(normalizedBad)) {
        return { hasProfanity: true, matchedWord: bad };
      }
    } else if (normalizedText.includes(normalizedBad)) {
      return { hasProfanity: true, matchedWord: bad };
    }
  }

  return { hasProfanity: false, matchedWord: null };
}
