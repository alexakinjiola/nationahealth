/**
 * Interface text in English, Hausa, Yoruba, Igbo and Nigerian Pidgin.
 * Translations were drafted for the pilot and must be reviewed by native
 * speakers (and, for clinical wording, by health workers) before launch.
 */
export const LANGS = [
  { code: "en", name: "English", native: "English" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "pcm", name: "Nigerian Pidgin", native: "Naijá" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const en = {
  "nav.home": "Home", "nav.how": "How it works", "nav.facilities": "Find a facility", "nav.institutions": "Institutions", "nav.privacy": "Privacy",
  "nav.signIn": "Sign in", "nav.createAccount": "Create account", "nav.language": "Language",
  "hero.eyebrow": "Your records · Your say", "hero.title": "Your health records,", "hero.accent": "wherever life takes you.",
  "hero.body": "Diagnoses, results and prescriptions from every hospital you visit, kept together in one secure place. Nobody sees them unless you say so.",
  "hero.cta": "Create your free record", "hero.ctaInstitutions": "For hospitals & labs",
  "quick.create": "Create your record", "quick.createBody": "Free for patients", "quick.share": "Share with a doctor",
  "quick.shareBody": "You choose what and for how long", "quick.views": "See every view", "quick.viewsBody": "Named and time-stamped", "quick.start": "Get started",
  "patient.overview": "Overview", "patient.records": "My health records", "patient.timeline": "Health timeline", "patient.emergency": "Emergency profile",
  "patient.immunisations": "Immunisations", "patient.access": "Access & sharing", "patient.referrals": "Referrals", "patient.pregnancy": "Pregnancy",
  "patient.reminders": "Reminders", "patient.activity": "Activity history", "patient.notifications": "Notifications", "patient.settings": "Profile & settings",
  "patient.help": "Help & support", "bottom.home": "Home", "bottom.records": "Records", "bottom.access": "Access", "bottom.activity": "Activity", "bottom.settings": "Settings",
  "dash.morning": "Good morning", "dash.afternoon": "Good afternoon", "dash.evening": "Good evening", "dash.upload": "Upload a record", "dash.manage": "Manage access",
  "ussd.notRegistered": "This phone number isn't linked to a health record. Create one at",
  "ussd.menu": "Continuum health record\n1. Health ID & emergency info\n2. Access requests\n3. Recent activity\n4. My reminders\n5. Language\n0. Exit",
  "ussd.enterPin": "Enter your 4–6 digit PIN:", "ussd.noPin": "Set a phone PIN first in Profile & settings > Phone access on the website.",
  "ussd.wrongPin": "Wrong PIN.", "ussd.locked": "Too many wrong PINs. Try again in 30 minutes.", "ussd.bye": "Goodbye. Stay healthy.",
  "ussd.healthId": "Health ID", "ussd.blood": "Blood", "ussd.genotype": "Genotype", "ussd.allergies": "Allergies", "ussd.none": "none",
  "ussd.noRequests": "No access requests waiting.", "ussd.pickRequest": "Choose a request:", "ussd.decide": "1. Approve\n2. Decline",
  "ussd.approved": "Approved. They can see the records they asked for. Every view is logged.", "ussd.declined": "Declined. Nothing was shared.",
  "ussd.noActivity": "No recent activity.", "ussd.noReminders": "No upcoming reminders.", "ussd.pickLang": "Choose a language:",
  "ussd.langSaved": "Language saved.", "ussd.invalid": "Invalid choice.", "ussd.error": "Sorry, something went wrong. Please try again.",
  "sms.help": "Continuum: reply ID <PIN> for your Health ID and blood details, STOP to pause reminders, START to turn them on.",
  "sms.stopped": "Continuum: SMS reminders paused. Reply START to turn them back on.", "sms.started": "Continuum: SMS reminders are on.",
  "lang.note": "Translations are being reviewed by native speakers.",
};
type Dict = Record<keyof typeof en, string>;

const ha: Dict = {
  "nav.home": "Gida", "nav.how": "Yadda yake aiki", "nav.facilities": "Nemo asibiti", "nav.institutions": "Cibiyoyi", "nav.privacy": "Sirri",
  "nav.signIn": "Shiga", "nav.createAccount": "Buɗe asusu", "nav.language": "Harshe",
  "hero.eyebrow": "Bayananka · Zaɓinka", "hero.title": "Bayanan lafiyarka,", "hero.accent": "duk inda rayuwa ta kai ka.",
  "hero.body": "Gwaje-gwaje, sakamako da takardun magani daga kowane asibiti da ka je, a wuri ɗaya mai tsaro. Babu wanda zai gani sai da izininka.",
  "hero.cta": "Buɗe bayananka kyauta", "hero.ctaInstitutions": "Don asibitoci da ɗakunan gwaje-gwaje",
  "quick.create": "Buɗe bayananka", "quick.createBody": "Kyauta ga marasa lafiya", "quick.share": "Raba da likita",
  "quick.shareBody": "Kai ne ke zaɓar abin da kuma tsawon lokaci", "quick.views": "Ga duk wanda ya duba", "quick.viewsBody": "Da suna da lokaci", "quick.start": "Fara yanzu",
  "patient.overview": "Taƙaitawa", "patient.records": "Bayanan lafiyata", "patient.timeline": "Tarihin lafiya", "patient.emergency": "Bayanan gaggawa",
  "patient.immunisations": "Allurar rigakafi", "patient.access": "Izini da rabawa", "patient.referrals": "Turawa zuwa wani asibiti", "patient.pregnancy": "Ciki",
  "patient.reminders": "Tunatarwa", "patient.activity": "Tarihin ayyuka", "patient.notifications": "Sanarwa", "patient.settings": "Bayanin kai da saituna",
  "patient.help": "Taimako", "bottom.home": "Gida", "bottom.records": "Bayanai", "bottom.access": "Izini", "bottom.activity": "Ayyuka", "bottom.settings": "Saituna",
  "dash.morning": "Ina kwana", "dash.afternoon": "Barka da rana", "dash.evening": "Barka da yamma", "dash.upload": "Ɗora takarda", "dash.manage": "Sarrafa izini",
  "ussd.notRegistered": "Wannan lambar waya ba ta da bayanan lafiya. Buɗe a",
  "ussd.menu": "Bayanan lafiya na Continuum\n1. Lambar lafiya da bayanan gaggawa\n2. Buƙatun izini\n3. Ayyukan baya-bayan nan\n4. Tunatarwata\n5. Harshe\n0. Fita",
  "ussd.enterPin": "Shigar da PIN ɗinka (lamba 4–6):", "ussd.noPin": "Saita PIN na waya a shafin yanar gizo: Saituna > Shiga ta waya.",
  "ussd.wrongPin": "PIN ba daidai ba.", "ussd.locked": "An yi kuskure da yawa. Sake gwadawa bayan minti 30.", "ussd.bye": "Sai an jima. Ka zauna lafiya.",
  "ussd.healthId": "Lambar lafiya", "ussd.blood": "Jini", "ussd.genotype": "Genotype", "ussd.allergies": "Rashin jituwa", "ussd.none": "babu",
  "ussd.noRequests": "Babu buƙatar izini da ke jira.", "ussd.pickRequest": "Zaɓi buƙata:", "ussd.decide": "1. Amince\n2. Ƙi",
  "ussd.approved": "An amince. Za su iya ganin bayanan da suka nema. Ana rubuta kowane kallo.", "ussd.declined": "An ƙi. Ba a raba komai ba.",
  "ussd.noActivity": "Babu ayyuka na baya-bayan nan.", "ussd.noReminders": "Babu tunatarwa mai zuwa.", "ussd.pickLang": "Zaɓi harshe:",
  "ussd.langSaved": "An adana harshe.", "ussd.invalid": "Zaɓi bai dace ba.", "ussd.error": "Yi haƙuri, an sami matsala. Sake gwadawa.",
  "sms.help": "Continuum: aika ID <PIN> don lambar lafiya da bayanan jini, STOP don dakatar da tunatarwa, START don kunna su.",
  "sms.stopped": "Continuum: an dakatar da tunatarwar SMS. Aika START don kunna su.", "sms.started": "Continuum: tunatarwar SMS na aiki.",
  "lang.note": "Masu jin harshen suna duba fassarar.",
};

const yo: Dict = {
  "nav.home": "Ilé", "nav.how": "Bí ó ṣe ń ṣiṣẹ́", "nav.facilities": "Wá ilé-ìwòsàn", "nav.institutions": "Àwọn ilé-iṣẹ́", "nav.privacy": "Àṣírí",
  "nav.signIn": "Wọlé", "nav.createAccount": "Ṣí àkọọ́lẹ̀", "nav.language": "Èdè",
  "hero.eyebrow": "Àkọsílẹ̀ rẹ · Ìpinnu rẹ", "hero.title": "Àkọsílẹ̀ ìlera rẹ,", "hero.accent": "níbikíbi tí ayé bá gbé ọ lọ.",
  "hero.body": "Àyẹ̀wò, èsì àti ìwé oògùn láti gbogbo ilé-ìwòsàn tí o lọ, ní ibì kan tó ní ààbò. Kò sí ẹni tí yóò rí wọn láìjẹ́ pé o gbà.",
  "hero.cta": "Ṣí àkọsílẹ̀ rẹ lọ́fẹ̀ẹ́", "hero.ctaInstitutions": "Fún ilé-ìwòsàn àti yàrá àyẹ̀wò",
  "quick.create": "Ṣí àkọsílẹ̀ rẹ", "quick.createBody": "Ọ̀fẹ́ fún aláìsàn", "quick.share": "Pín pẹ̀lú dókítà",
  "quick.shareBody": "Ìwọ ni o yan kíni àti fún ìgbà mélòó", "quick.views": "Wo gbogbo ẹni tó wò ó", "quick.viewsBody": "Pẹ̀lú orúkọ àti àkókò", "quick.start": "Bẹ̀rẹ̀",
  "patient.overview": "Àkópọ̀", "patient.records": "Àkọsílẹ̀ ìlera mi", "patient.timeline": "Ìtàn ìlera", "patient.emergency": "Àlàyé pàjáwìrì",
  "patient.immunisations": "Abẹ́rẹ́ àjẹsára", "patient.access": "Ìyọ̀ǹda àti pínpín", "patient.referrals": "Ìfiránṣẹ́ sí ilé-ìwòsàn mìíràn", "patient.pregnancy": "Oyún",
  "patient.reminders": "Ìrántí", "patient.activity": "Ìtàn ìṣẹ̀lẹ̀", "patient.notifications": "Ìfitónilétí", "patient.settings": "Profaili àti ètò",
  "patient.help": "Ìrànlọ́wọ́", "bottom.home": "Ilé", "bottom.records": "Àkọsílẹ̀", "bottom.access": "Ìyọ̀ǹda", "bottom.activity": "Ìṣẹ̀lẹ̀", "bottom.settings": "Ètò",
  "dash.morning": "Ẹ káàárọ̀", "dash.afternoon": "Ẹ káàsán", "dash.evening": "Ẹ kúrọ̀lẹ́", "dash.upload": "Gbé ìwé sókè", "dash.manage": "Ṣàkóso ìyọ̀ǹda",
  "ussd.notRegistered": "Nọ́ńbà fóònù yìí kò ní àkọsílẹ̀ ìlera. Ṣí ọ̀kan ní",
  "ussd.menu": "Àkọsílẹ̀ ìlera Continuum\n1. Nọ́ńbà ìlera àti àlàyé pàjáwìrì\n2. Ìbéèrè ìyọ̀ǹda\n3. Ìṣẹ̀lẹ̀ àìpẹ́\n4. Àwọn ìrántí mi\n5. Èdè\n0. Jáde",
  "ussd.enterPin": "Tẹ PIN rẹ (nọ́ńbà 4–6):", "ussd.noPin": "Ṣètò PIN fóònù ní ojú-òpó wẹẹbù: Ètò > Ìwọlé fóònù.",
  "ussd.wrongPin": "PIN kò tọ́.", "ussd.locked": "Àṣìṣe ti pọ̀ jù. Gbìyànjú lẹ́yìn ìṣẹ́jú 30.", "ussd.bye": "Ó dàbọ̀. Kí ara rẹ le.",
  "ussd.healthId": "Nọ́ńbà ìlera", "ussd.blood": "Ẹ̀jẹ̀", "ussd.genotype": "Genotype", "ussd.allergies": "Àléjì", "ussd.none": "kò sí",
  "ussd.noRequests": "Kò sí ìbéèrè ìyọ̀ǹda tó ń dúró.", "ussd.pickRequest": "Yan ìbéèrè kan:", "ussd.decide": "1. Gbà\n2. Kọ̀",
  "ussd.approved": "O ti gbà. Wọ́n lè rí àkọsílẹ̀ tí wọ́n béèrè. A ń kọ gbogbo ìwòran sílẹ̀.", "ussd.declined": "O ti kọ̀. A kò pín nǹkan kan.",
  "ussd.noActivity": "Kò sí ìṣẹ̀lẹ̀ àìpẹ́.", "ussd.noReminders": "Kò sí ìrántí tó ń bọ̀.", "ussd.pickLang": "Yan èdè:",
  "ussd.langSaved": "A ti fi èdè pamọ́.", "ussd.invalid": "Àṣàyàn kò tọ́.", "ussd.error": "Ẹ má bínú, ìṣòro kan wà. Ẹ tún gbìyànjú.",
  "sms.help": "Continuum: fi ID <PIN> ránṣẹ́ fún nọ́ńbà ìlera àti ẹ̀jẹ̀ rẹ, STOP láti dá ìrántí dúró, START láti tàn wọ́n.",
  "sms.stopped": "Continuum: a ti dá ìrántí SMS dúró. Fi START ránṣẹ́ láti tàn wọ́n.", "sms.started": "Continuum: ìrántí SMS ti tàn.",
  "lang.note": "Àwọn tó gbọ́ èdè náà ń ṣàyẹ̀wò ìtumọ̀.",
};

const ig: Dict = {
  "nav.home": "Ụlọ", "nav.how": "Otú o si arụ ọrụ", "nav.facilities": "Chọta ụlọ ọgwụ", "nav.institutions": "Ụlọ ọrụ", "nav.privacy": "Nzuzo",
  "nav.signIn": "Banye", "nav.createAccount": "Mepee akaụntụ", "nav.language": "Asụsụ",
  "hero.eyebrow": "Ndekọ gị · Mkpebi gị", "hero.title": "Ndekọ ahụike gị,", "hero.accent": "ebe ọ bụla ndụ kpọgara gị.",
  "hero.body": "Nchọpụta, nsonaazụ na akwụkwọ ọgwụ sitere n'ụlọ ọgwụ ọ bụla ị gara, n'otu ebe echekwara nke ọma. Ọ dịghị onye ga-ahụ ha ma ọ bụrụ na ị kweghị.",
  "hero.cta": "Mepee ndekọ gị n'efu", "hero.ctaInstitutions": "Maka ụlọ ọgwụ na ụlọ nyocha",
  "quick.create": "Mepee ndekọ gị", "quick.createBody": "N'efu maka ndị ọrịa", "quick.share": "Kerịta ya na dọkịta",
  "quick.shareBody": "Ị na-ahọrọ ihe na ruo ogologo oge ole", "quick.views": "Hụ onye ọ bụla lere ya", "quick.viewsBody": "Ya na aha na oge", "quick.start": "Malite",
  "patient.overview": "Nchịkọta", "patient.records": "Ndekọ ahụike m", "patient.timeline": "Akụkọ ahụike", "patient.emergency": "Ozi mberede",
  "patient.immunisations": "Ọgwụ mgbochi", "patient.access": "Ikike na ịkekọrịta", "patient.referrals": "Nzipu gaa ụlọ ọgwụ ọzọ", "patient.pregnancy": "Ime",
  "patient.reminders": "Ncheta", "patient.activity": "Akụkọ ihe omume", "patient.notifications": "Ọkwa", "patient.settings": "Profaịlụ na ntọala",
  "patient.help": "Enyemaka", "bottom.home": "Ụlọ", "bottom.records": "Ndekọ", "bottom.access": "Ikike", "bottom.activity": "Ihe omume", "bottom.settings": "Ntọala",
  "dash.morning": "Ụtụtụ ọma", "dash.afternoon": "Ehihie ọma", "dash.evening": "Mgbede ọma", "dash.upload": "Bulite akwụkwọ", "dash.manage": "Jikwaa ikike",
  "ussd.notRegistered": "Nọmba ekwentị a enweghị ndekọ ahụike. Mepee otu na",
  "ussd.menu": "Ndekọ ahụike Continuum\n1. Nọmba ahụike na ozi mberede\n2. Arịrịọ ikike\n3. Ihe omume na nso a\n4. Ncheta m\n5. Asụsụ\n0. Pụọ",
  "ussd.enterPin": "Tinye PIN gị (ọnụọgụ 4–6):", "ussd.noPin": "Debe PIN ekwentị na weebụsaịtị: Ntọala > Nbanye ekwentị.",
  "ussd.wrongPin": "PIN ezighi ezi.", "ussd.locked": "Mperi abụghị nke ole na ole. Nwaa ọzọ mgbe nkeji 30 gachara.", "ussd.bye": "Ka ọ dị. Nọrọ n'ahụike.",
  "ussd.healthId": "Nọmba ahụike", "ussd.blood": "Ọbara", "ussd.genotype": "Genotype", "ussd.allergies": "Ihe na-anaghị adaba", "ussd.none": "ọ dịghị",
  "ussd.noRequests": "Ọ dịghị arịrịọ ikike na-eche.", "ussd.pickRequest": "Họrọ arịrịọ:", "ussd.decide": "1. Kwado\n2. Jụ",
  "ussd.approved": "Ị kwadoro. Ha nwere ike ịhụ ndekọ ha rịọrọ. A na-edekọ nlele ọ bụla.", "ussd.declined": "Ị jụrụ. Ọ dịghị ihe e kekọrịtara.",
  "ussd.noActivity": "Ọ dịghị ihe omume na nso a.", "ussd.noReminders": "Ọ dịghị ncheta na-abịa.", "ussd.pickLang": "Họrọ asụsụ:",
  "ussd.langSaved": "Echekwala asụsụ.", "ussd.invalid": "Nhọrọ ezighi ezi.", "ussd.error": "Ndo, nsogbu dị. Biko nwaa ọzọ.",
  "sms.help": "Continuum: zipu ID <PIN> maka nọmba ahụike na ọbara gị, STOP iji kwụsị ncheta, START iji gbanye ha.",
  "sms.stopped": "Continuum: akwụsịla ncheta SMS. Zipu START iji gbanye ha ọzọ.", "sms.started": "Continuum: ncheta SMS na-arụ ọrụ.",
  "lang.note": "Ndị na-asụ asụsụ a na-enyocha ntụgharị.",
};

const pcm: Dict = {
  "nav.home": "Home", "nav.how": "How e dey work", "nav.facilities": "Find hospital", "nav.institutions": "Hospitals", "nav.privacy": "Privacy",
  "nav.signIn": "Sign in", "nav.createAccount": "Open account", "nav.language": "Language",
  "hero.eyebrow": "Your records · Na you get the say", "hero.title": "Your health records,", "hero.accent": "anywhere life carry you go.",
  "hero.body": "Wetin doctor talk, test result and medicine from every hospital wey you don go, dey one safe place. Nobody go see am unless you gree.",
  "hero.cta": "Open your record free", "hero.ctaInstitutions": "For hospital & lab",
  "quick.create": "Open your record", "quick.createBody": "Free for patients", "quick.share": "Share with doctor",
  "quick.shareBody": "Na you go choose wetin and how long", "quick.views": "See everybody wey look am", "quick.viewsBody": "With name and time", "quick.start": "Start now",
  "patient.overview": "Overview", "patient.records": "My health records", "patient.timeline": "Health history", "patient.emergency": "Emergency info",
  "patient.immunisations": "Vaccine", "patient.access": "Who fit see my records", "patient.referrals": "Referral", "patient.pregnancy": "Belle (pregnancy)",
  "patient.reminders": "Reminder", "patient.activity": "Wetin don happen", "patient.notifications": "Notification", "patient.settings": "My profile & settings",
  "patient.help": "Help", "bottom.home": "Home", "bottom.records": "Records", "bottom.access": "Access", "bottom.activity": "Activity", "bottom.settings": "Settings",
  "dash.morning": "Good morning", "dash.afternoon": "Good afternoon", "dash.evening": "Good evening", "dash.upload": "Upload document", "dash.manage": "Control who fit see",
  "ussd.notRegistered": "This phone number never get health record. Open one for",
  "ussd.menu": "Continuum health record\n1. Health ID & emergency info\n2. People wey wan see your record\n3. Wetin happen recently\n4. My reminders\n5. Language\n0. Comot",
  "ussd.enterPin": "Put your PIN (4–6 number):", "ussd.noPin": "First set phone PIN for the website: Settings > Phone access.",
  "ussd.wrongPin": "PIN no correct.", "ussd.locked": "You don try wrong PIN too many times. Try again after 30 minutes.", "ussd.bye": "Bye bye. Stay healthy.",
  "ussd.healthId": "Health ID", "ussd.blood": "Blood", "ussd.genotype": "Genotype", "ussd.allergies": "Allergy", "ussd.none": "none",
  "ussd.noRequests": "Nobody dey wait to see your record.", "ussd.pickRequest": "Choose one:", "ussd.decide": "1. Gree\n2. No gree",
  "ussd.approved": "You don gree. Dem fit see the records wey dem ask for. We dey write down everytime dem look am.", "ussd.declined": "You no gree. We no share anything.",
  "ussd.noActivity": "Nothing happen recently.", "ussd.noReminders": "No reminder dey come.", "ussd.pickLang": "Choose language:",
  "ussd.langSaved": "Language don save.", "ussd.invalid": "That choice no correct.", "ussd.error": "Sorry, something no work well. Try again.",
  "sms.help": "Continuum: send ID <PIN> to get your Health ID and blood info, STOP to pause reminder, START to on am.",
  "sms.stopped": "Continuum: SMS reminder don pause. Send START to on am again.", "sms.started": "Continuum: SMS reminder don on.",
  "lang.note": "People wey sabi the language dey check the translation.",
};

export const DICTS: Record<Lang, Dict> = { en, ha, yo, ig, pcm };
export type MessageKey = keyof typeof en;

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && LANGS.some((l) => l.code === v);
}

export function translate(lang: Lang, key: MessageKey) {
  return DICTS[lang]?.[key] ?? en[key];
}
