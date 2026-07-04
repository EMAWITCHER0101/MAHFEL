const persianProfanity = [
  // === جنسی و رکیک ===
  'کیر', 'کیری', 'کیرخور', 'کیرکلفت', 'کیرکش',
  'کس', 'کسی', 'کسکش', 'کسکشی', 'کسخل', 'کسه',
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
  'مالوندن', 'مالیدن', 'داغ کردن',
  'لاشی', 'مفتی', 'مرف',
  'بکن', 'دراز بکش', 'سفید کن',
  'هیت', 'هیت‌', 'gey', 'lez',
  'حیوان‌باز', 'بچه‌باز', 'pedophile',
  'فتیش', 'fetish',

  // === خانوادگی ===
  'بی‌شرف', 'بی شرف', 'بی‌ناموس', 'بی ناموس', 'بی‌غیرت', 'بی غیرت',
  'بی‌پدر', 'بی پدر', 'بی‌مادر', 'بی مادر', 'بی‌برادر', 'بی برادر',
  'بی‌آبرو', 'بی آبرو', 'بی‌عزت', 'بی عزت', 'بی‌آداب', 'بی آداب',
  'پدرسوخته', 'پدر سوخته', 'پدرک', 'مادرک',
  'پدرسگ', 'پدر سگ', 'مادرسگ', 'مادر سگ',
  'تبارکثیف', 'نسل پست', 'خانواده خراب',

  // === عامیانه ===
  'عوضی', 'الاغ', 'احمق', 'نادان',
  'اوباش', 'نابکار', 'تبهکار', 'جنایتکار',
  'کثیف', 'کثافت', 'پست', 'پلید',
  'رذل', 'پست‌فطرت', 'پست فطرت', 'مرتد', 'منافق',
  'خائن', 'خیانتکار', 'نامرد', 'ناانسان',
  'دزد', 'سارق', 'غارتگر', 'چپاولگر',
  'کلاهبردار', 'فاسد', 'مفسد', 'اراذل',
  'خودبین', 'خودپسند', 'مغرور', 'طمع‌کار',
  'بخیل', 'خسیس', 'تنبل', 'لوس',
  'بی‌کاره', 'بیکاره',

  // === هوشی ===
  'ایدیوت', 'moron', 'stupid', 'idiot',
  'retard', 'retarded', 'کندذهن', 'کم‌هوش',
  'بی‌مغز', 'بی مغز', 'بی‌عقل', 'بی عقل',
  'بی‌فکر', 'بی فکر', 'نفهم', 'خنگ', 'خنگول',
  'ساده‌لوح', 'ساده لوح', 'احمق',
  'ابله', 'خپله', 'دلقک', 'گیج',
  'دیوانه', 'دیو',

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
  'terrorist', 'nazi', 'hitler',
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

  // === دینی ===
  'terrorist', 'ISIS', 'taliban',
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
    
    if (normalizedText.includes(normalizedBad)) {
      return { hasProfanity: true, matchedWord: bad };
    }
    
    for (const word of words) {
      if (word.includes(normalizedBad) || normalizedBad.includes(word)) {
        return { hasProfanity: true, matchedWord: bad };
      }
    }
  }

  return { hasProfanity: false, matchedWord: null };
}
