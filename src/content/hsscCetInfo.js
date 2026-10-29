// HSSC CET (Group C) at a glance. Facts are from the HSSC CET 2025 notification
// (Chapter 3 "Pattern of Examination", Chapter 4 "Age", Appendix-C "Syllabus of
// Group C"). Keep the web copy (examzone_client/src/content/hsscCetInfo.js) in sync.
export const HSSC_OFFICIAL_URL = 'https://www.hssc.gov.in';
export const SOURCE_NOTE = {
  en: 'Based on the HSSC CET 2025 notification. Always check the latest notice on hssc.gov.in before applying.',
  hi: 'HSSC CET 2025 अधिसूचना पर आधारित। आवेदन से पहले hssc.gov.in पर नवीनतम सूचना ज़रूर देखें।',
};

export const PATTERN = [
  { label: { en: 'Questions', hi: 'प्रश्न' }, value: { en: '100 MCQs', hi: '100 बहुविकल्पीय' } },
  { label: { en: 'Total marks', hi: 'कुल अंक' }, value: { en: '100 (1 per question)', hi: '100 (प्रति प्रश्न 1)' } },
  { label: { en: 'Duration', hi: 'समय' }, value: { en: '1 hour 45 minutes', hi: '1 घंटा 45 मिनट' } },
  { label: { en: 'Mode', hi: 'माध्यम' }, value: { en: 'Offline, OMR sheet', hi: 'ऑफ़लाइन, OMR शीट' } },
  { label: { en: 'Language', hi: 'भाषा' }, value: { en: 'Bilingual (English & Hindi)', hi: 'द्विभाषी (अंग्रेज़ी व हिंदी)' } },
  { label: { en: 'Level', hi: 'स्तर' }, value: { en: '10+2 (Hindi & English: Matric)', hi: '10+2 (हिंदी व अंग्रेज़ी: मैट्रिक)' } },
];

export const MARKING = {
  en: [
    'Wrong answer: no negative marking.',
    'Every question has a fifth bubble for "not attempted". To skip a question you must fill that fifth bubble.',
    'Leaving a question completely blank (no bubble filled) costs 1 mark.',
  ],
  hi: [
    'गलत उत्तर पर कोई नेगेटिव मार्किंग नहीं।',
    'हर प्रश्न में "प्रयास नहीं" के लिए पाँचवाँ गोला होता है। प्रश्न छोड़ना हो तो यह पाँचवाँ गोला भरना ज़रूरी है।',
    'कोई भी गोला न भरने पर (प्रश्न खाली छोड़ने पर) 1 अंक कटता है।',
  ],
};

export const QUALIFYING = [
  { label: { en: 'General category', hi: 'सामान्य वर्ग' }, value: '50%' },
  { label: { en: 'Reserved categories (vertical & horizontal)', hi: 'आरक्षित वर्ग (ऊर्ध्वाधर व क्षैतिज)' }, value: '40%' },
];

export const AGE = {
  en: '18 to 42 years on the closing date of registration, with relaxations as per Haryana Government rules.',
  hi: 'पंजीकरण की अंतिम तिथि पर 18 से 42 वर्ष, हरियाणा सरकार के नियमों के अनुसार छूट सहित।',
};

export const SYLLABUS = [
  {
    key: 'haryana',
    title: { en: 'General Knowledge of Haryana', hi: 'हरियाणा सामान्य ज्ञान' },
    topics: {
      en: 'History, literature, geography, economy, civics and polity, environment, art, culture, customs, society, current affairs and events of Haryana.',
      hi: 'हरियाणा का इतिहास, साहित्य, भूगोल, अर्थव्यवस्था, नागरिक शास्त्र व राजव्यवस्था, पर्यावरण, कला, संस्कृति, रीति-रिवाज, समाज, करंट अफेयर्स व घटनाएँ।',
    },
    link: 'HaryanaGk',
  },
  {
    key: 'ga',
    title: { en: 'General Awareness', hi: 'सामान्य जागरूकता' },
    topics: {
      en: 'India and neighbouring countries: history, polity and constitution, art and culture, geography, economics, national and international organisations, environment, climate, current events and general science.',
      hi: 'भारत व पड़ोसी देश: इतिहास, राजव्यवस्था व संविधान, कला व संस्कृति, भूगोल, अर्थशास्त्र, राष्ट्रीय व अंतरराष्ट्रीय संगठन, पर्यावरण, जलवायु, करंट अफेयर्स व सामान्य विज्ञान।',
    },
  },
  {
    key: 'reasoning',
    title: { en: 'Reasoning', hi: 'तर्कशक्ति' },
    topics: {
      en: 'Analogy, classification, series, coding-decoding, Venn diagrams, symbolic operations, space orientation, paper folding and punched holes, embedded figures, inferences, problem solving.',
      hi: 'सादृश्यता, वर्गीकरण, श्रृंखला, कोडिंग-डिकोडिंग, वेन आरेख, प्रतीकात्मक संक्रियाएँ, दिशा/स्थान, कागज़ मोड़ना व छेद, निहित आकृतियाँ, निष्कर्ष, समस्या समाधान।',
    },
  },
  {
    key: 'maths',
    title: { en: 'Quantitative Ability', hi: 'संख्यात्मक योग्यता' },
    topics: {
      en: 'Number system, simplification, LCM/HCF, ratio, percentage, average, profit and loss, discount, simple and compound interest, mensuration, partnership, mixture, time and work, time and distance, tables and graphs, basic algebra, geometry, trigonometry.',
      hi: 'संख्या पद्धति, सरलीकरण, LCM/HCF, अनुपात, प्रतिशत, औसत, लाभ-हानि, छूट, साधारण व चक्रवृद्धि ब्याज, क्षेत्रमिति, साझेदारी, मिश्रण, समय व कार्य, समय व दूरी, तालिका व ग्राफ़, बीजगणित, ज्यामिति, त्रिकोणमिति।',
    },
  },
  {
    key: 'computer',
    title: { en: 'Computer Knowledge', hi: 'कंप्यूटर ज्ञान' },
    topics: {
      en: 'Computer organisation, CPU, input/output devices, memory, ports, Windows and keyboard shortcuts, MS Word, Excel and PowerPoint, internet, browsing and e-mail.',
      hi: 'कंप्यूटर संगठन, CPU, इनपुट/आउटपुट डिवाइस, मेमोरी, पोर्ट, विंडोज़ व कीबोर्ड शॉर्टकट, एमएस वर्ड, एक्सेल व पावरपॉइंट, इंटरनेट, ब्राउज़िंग व ई-मेल।',
    },
  },
  {
    key: 'english',
    title: { en: 'English Language', hi: 'अंग्रेज़ी भाषा' },
    topics: {
      en: 'Spot the error, fill in the blanks, synonyms, antonyms, spellings, idioms, one-word substitution, sentence improvement, voice, narration, sentence shuffling, tenses, cloze test, comprehension.',
      hi: 'त्रुटि पहचान, रिक्त स्थान, समानार्थी, विलोम, वर्तनी, मुहावरे, एक शब्द, वाक्य सुधार, वाच्य, कथन, वाक्य क्रम, काल, क्लोज़ टेस्ट, अपठित गद्यांश।',
    },
  },
  {
    key: 'hindi',
    title: { en: 'Hindi Language', hi: 'हिंदी भाषा' },
    topics: {
      en: 'Shabd and vakya, muhavare and lokoktiyan, sandhi, upsarg and pratyay, samas, paryayvachi, vilom, anekarthi shabd, vakya shuddhi, viram chinh, ek shabd, vartani, varn, sangya, sarvanam, visheshan, kriya, vachan, ling, karak, kaal, tatsam-tadbhav.',
      hi: 'शब्द व वाक्य, मुहावरे व लोकोक्तियाँ, संधि, उपसर्ग व प्रत्यय, समास, पर्यायवाची, विलोम, अनेकार्थी शब्द, वाक्य शुद्धि, विराम चिह्न, अनेक शब्दों के लिए एक शब्द, वर्तनी, वर्ण, संज्ञा, सर्वनाम, विशेषण, क्रिया, वचन, लिंग, कारक, काल, तत्सम-तद्भव।',
    },
  },
];

export const TIPS = {
  en: [
    'Never leave a bubble empty: fill the fifth bubble for any question you skip, or you lose a mark.',
    'Haryana GK is the differentiator — revise it daily with topic tests and short notes.',
    'Attempt full 100-question mocks in 1 hour 45 minutes to build speed.',
    'Practise previous year papers to understand the real level.',
  ],
  hi: [
    'कोई गोला खाली न छोड़ें: जो प्रश्न छोड़ें उसका पाँचवाँ गोला भरें, वरना 1 अंक कटेगा।',
    'हरियाणा GK से अंतर बनता है — टॉपिक टेस्ट और नोट्स से रोज़ दोहराएँ।',
    'गति के लिए 1 घंटा 45 मिनट में पूरे 100 प्रश्नों के मॉक दें।',
    'असली स्तर समझने के लिए पिछले वर्षों के पेपर हल करें।',
  ],
};
