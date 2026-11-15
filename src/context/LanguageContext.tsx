import React, { createContext, useContext, useEffect, useState } from 'react';

export type LocaleCode = 'en' | 'ur' | 'sd';

const translations: Record<LocaleCode, Record<string, string>> = {
  en: {
    brandName: 'VilloThar',
    navAbout: 'About',
    navPackages: 'Packages',
    navCoverage: 'Coverage',
    navHowItWorks: 'How It Works',
    navSupport: 'Support',
    navPortal: 'Customer Portal',
    heroHeadline: 'Connecting Thar. Empowering Communities.',
    heroSubhead:
      'Bringing reliable and affordable internet connectivity to the villages of Tharparkar through a community-focused network.',
    ctaExplore: 'Explore Internet Packages',
    ctaHowItWorks: 'How It Works',
    captiveWelcomeTitle: 'Welcome to VilloThar Wi-Fi',
    captiveWelcomeDesc:
      'Village-owned 2 Mbps internet access. Each registered device requires identity verification and its own active package.',
    captiveLogin: 'Customer Login',
    captiveRegister: 'New Customer Registration',
    captivePerDeviceRule: 'One package applies to one registered device only (2 Mbps).',
    captiveSelectPackage: 'Select Internet Package',
    captivePayNow: 'Proceed to Payment',
    captiveLanguageLabel: 'Language',
  },
  ur: {
    brandName: 'VilloThar',
    navAbout: 'ہمارے بارے میں',
    navPackages: 'پیکیجز',
    navCoverage: 'کوریج',
    navHowItWorks: 'طریقہ کار',
    navSupport: 'مدد',
    navPortal: 'کسٹمر پورٹل',
    heroHeadline: 'تھر کو جوڑنا۔ کمیونٹیز کو بااختیار بنانا۔',
    heroSubhead:
      'کمیونٹی نیٹ ورک کے ذریعے تھرپارکر کے دیہات تک قابلِ اعتماد اور سستا انٹرنیٹ پہنچانا۔',
    ctaExplore: 'انٹرنیٹ پیکیجز دیکھیں',
    ctaHowItWorks: 'یہ کیسے کام کرتا ہے',
    captiveWelcomeTitle: 'ویلو تھر وائی فائی میں خوش آمدید',
    captiveWelcomeDesc:
      'دیہات کا اپنا 2 Mbps انٹرنیٹ۔ ہر رجسٹرڈ ڈیوائس کے لیے شناخت کی تصدیق اور علیحدہ پیکیج ضروری ہے۔',
    captiveLogin: 'کسٹمر لاگ ان',
    captiveRegister: 'نیا کسٹمر رجسٹریشن',
    captivePerDeviceRule: 'ایک پیکیج صرف ایک رجسٹرڈ ڈیوائس کے لیے ہے (2 Mbps)۔',
    captiveSelectPackage: 'انٹرنیٹ پیکیج منتخب کریں',
    captivePayNow: 'ادائیگی کی طرف بڑھیں',
    captiveLanguageLabel: 'زبان',
  },
  sd: {
    brandName: 'VilloThar',
    navAbout: 'اسان بابت',
    navPackages: 'پئڪيج',
    navCoverage: 'ڪوريج',
    navHowItWorks: 'طريقيڪار',
    navSupport: 'مدد',
    navPortal: 'ڪسٽمر پورٽل',
    heroHeadline: 'ٿر کي ڳنڍڻ. برادري کي بااختيار بنائڻ.',
    heroSubhead:
      'ڪميونٽي نيٽ ورڪ ذريعي ٿرپارڪر جي ڳوٺن تائين سستو ۽ معياري انٽرنيٽ پهچائڻ.',
    ctaExplore: 'انٽرنيٽ پئڪيج ڏسو',
    ctaHowItWorks: 'هي ڪيئن ڪم ڪري ٿو',
    captiveWelcomeTitle: 'ويلو ٿر وائي فائي تي ڀليڪار',
    captiveWelcomeDesc:
      'ڳوٺاڻي مالڪي وارو 2 Mbps انٽرنيٽ. هر رجسٽرڊ ڊوائيس لاءِ سڃاڻپ جي تصديق ۽ الڳ پئڪيج ضروري آهي.',
    captiveLogin: 'ڪسٽمر لاگ ان',
    captiveRegister: 'نئون ڪسٽمر رجسٽريشن',
    captivePerDeviceRule: 'هڪ پئڪيج صرف هڪ رجسٽرڊ ڊوائيس لاءِ آهي (2 Mbps).',
    captiveSelectPackage: 'انٽرنيٽ پئڪيج چونڊيو',
    captivePayNow: 'ادائيگي ڏانهن وڃو',
    captiveLanguageLabel: 'ٻولي',
  },
};

interface LanguageContextValue {
  locale: LocaleCode;
  isRtl: boolean;
  setLocale: (code: LocaleCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const saved = localStorage.getItem('villothar_locale');
    return saved === 'ur' || saved === 'sd' ? saved : 'en';
  });

  const isRtl = locale === 'ur' || locale === 'sd';

  useEffect(() => {
    localStorage.setItem('villothar_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (code: LocaleCode) => setLocaleState(code);

  const t = (key: string) => translations[locale][key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ locale, isRtl, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
