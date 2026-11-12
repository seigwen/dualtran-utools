/**
 * tests/fixtures/newLocaleKeys.js — the three SPEC 2.1 empty-state strings
 * (providerPlaceholder, providerRequiredForModel, providerRequiredError) for
 * every shipped locale.
 *
 * `en` is the source catalogue and `zh_CN`/`zh_TW` are the handwritten locales in
 * this repo; the rest follow the mechanism in locales/README.md (machine
 * translation via `npm run i18n:sync`'s local OpenAI-compatible model —
 * placeholders and product names untouched, hand-written locales never
 * overwritten). The texts below are that batch's output, pinned here so a
 * regression shows up as a named failure instead of drifting English text.
 *
 *   node scripts/apply-locale-keys.mjs   # write these into locales/<code>/messages.json
 */
export const NEW_LOCALE_KEYS = {
  en: {
    providerPlaceholder: "Select a provider",
    providerRequiredForModel: "Select a provider first",
    providerRequiredError: "Choose an AI provider in settings before translating.",
  },
  zh_CN: {
    providerPlaceholder: "请选择 AI 提供商",
    providerRequiredForModel: "请先选择提供商",
    providerRequiredError: "翻译前请先在设置中选择 AI 提供商。",
  },
  zh_TW: {
    providerPlaceholder: "請選擇 AI 提供商",
    providerRequiredForModel: "請先選擇提供商",
    providerRequiredError: "翻譯前請先在設定中選擇 AI 提供商。",
  },
  af: {
    providerPlaceholder: "Kies 'n verskaffer",
    providerRequiredForModel: "Kies eers 'n verskaffer",
    providerRequiredError: "Kies 'n KI-verskaffer in instellings voordat jy vertaal.",
  },
  ar: {
    providerPlaceholder: "اختر مزوّدًا",
    providerRequiredForModel: "اختر مزوّدًا أولًا",
    providerRequiredError: "اختر مزوّد AI في الإعدادات قبل الترجمة.",
  },
  ca: {
    providerPlaceholder: "Selecciona un proveïdor",
    providerRequiredForModel: "Selecciona primer un proveïdor",
    providerRequiredError: "Tria un proveïdor d'IA a la configuració abans de traduir.",
  },
  cs: {
    providerPlaceholder: "Vyberte poskytovatele",
    providerRequiredForModel: "Nejprve vyberte poskytovatele",
    providerRequiredError: "Před překladem vyberte v nastavení poskytovatele AI.",
  },
  da: {
    providerPlaceholder: "Vælg en udbyder",
    providerRequiredForModel: "Vælg en udbyder først",
    providerRequiredError: "Vælg en AI-udbyder i indstillingerne, før du oversætter.",
  },
  de: {
    providerPlaceholder: "Anbieter auswählen",
    providerRequiredForModel: "Zuerst einen Anbieter auswählen",
    providerRequiredError: "Wähle vor dem Übersetzen einen KI-Anbieter in den Einstellungen.",
  },
  el: {
    providerPlaceholder: "Επιλέξτε πάροχο",
    providerRequiredForModel: "Επιλέξτε πρώτα πάροχο",
    providerRequiredError: "Επιλέξτε πάροχο AI στις ρυθμίσεις πριν από τη μετάφραση.",
  },
  es: {
    providerPlaceholder: "Selecciona un proveedor",
    providerRequiredForModel: "Selecciona primero un proveedor",
    providerRequiredError: "Elige un proveedor de IA en los ajustes antes de traducir.",
  },
  fa: {
    providerPlaceholder: "یک ارائه‌دهنده انتخاب کنید",
    providerRequiredForModel: "ابتدا یک ارائه‌دهنده انتخاب کنید",
    providerRequiredError: "پیش از ترجمه، در تنظیمات یک ارائه‌دهنده هوش مصنوعی انتخاب کنید.",
  },
  fi: {
    providerPlaceholder: "Valitse palveluntarjoaja",
    providerRequiredForModel: "Valitse ensin palveluntarjoaja",
    providerRequiredError: "Valitse AI-palveluntarjoaja asetuksista ennen kääntämistä.",
  },
  fr: {
    providerPlaceholder: "Sélectionner un fournisseur",
    providerRequiredForModel: "Sélectionnez d'abord un fournisseur",
    providerRequiredError: "Choisissez un fournisseur AI dans les paramètres avant de traduire.",
  },
  he: {
    providerPlaceholder: "בחר ספק",
    providerRequiredForModel: "בחר ספק תחילה",
    providerRequiredError: "בחר ספק AI בהגדרות לפני התרגום.",
  },
  hi: {
    providerPlaceholder: "प्रदाता चुनें",
    providerRequiredForModel: "पहले प्रदाता चुनें",
    providerRequiredError: "अनुवाद करने से पहले सेटिंग्स में AI प्रदाता चुनें।",
  },
  hr: {
    providerPlaceholder: "Odaberite pružatelja",
    providerRequiredForModel: "Najprije odaberite pružatelja",
    providerRequiredError: "Prije prevođenja odaberite AI pružatelja u postavkama.",
  },
  hu: {
    providerPlaceholder: "Válasszon szolgáltatót",
    providerRequiredForModel: "Először válasszon szolgáltatót",
    providerRequiredError: "Fordítás előtt válasszon AI-szolgáltatót a beállításokban.",
  },
  is: {
    providerPlaceholder: "Veldu þjónustuveitanda",
    providerRequiredForModel: "Veldu þjónustuveitanda fyrst",
    providerRequiredError: "Veldu AI-þjónustuveitanda í stillingum áður en þú þýðir.",
  },
  it: {
    providerPlaceholder: "Seleziona un provider",
    providerRequiredForModel: "Seleziona prima un provider",
    providerRequiredError: "Scegli un provider AI nelle impostazioni prima di tradurre.",
  },
  ja: {
    providerPlaceholder: "プロバイダーを選択",
    providerRequiredForModel: "先にプロバイダーを選択してください",
    providerRequiredError: "翻訳する前に設定で AI プロバイダーを選択してください。",
  },
  ko: {
    providerPlaceholder: "제공자 선택",
    providerRequiredForModel: "먼저 제공자를 선택하세요",
    providerRequiredError: "번역하기 전에 설정에서 AI 제공자를 선택하세요.",
  },
  lv: {
    providerPlaceholder: "Atlasiet pakalpojumu sniedzēju",
    providerRequiredForModel: "Vispirms atlasiet pakalpojumu sniedzēju",
    providerRequiredError: "Pirms tulkošanas iestatījumos atlasiet AI pakalpojumu sniedzēju.",
  },
  nl: {
    providerPlaceholder: "Selecteer een aanbieder",
    providerRequiredForModel: "Selecteer eerst een aanbieder",
    providerRequiredError: "Kies voordat je vertaalt een AI-aanbieder in de instellingen.",
  },
  no: {
    providerPlaceholder: "Velg en leverandør",
    providerRequiredForModel: "Velg en leverandør først",
    providerRequiredError: "Velg en AI-leverandør i innstillingene før du oversetter.",
  },
  pl: {
    providerPlaceholder: "Wybierz dostawcę",
    providerRequiredForModel: "Najpierw wybierz dostawcę",
    providerRequiredError: "Przed tłumaczeniem wybierz dostawcę AI w ustawieniach.",
  },
  pt_BR: {
    providerPlaceholder: "Selecione um provedor",
    providerRequiredForModel: "Selecione um provedor primeiro",
    providerRequiredError: "Escolha um provedor de IA nas configurações antes de traduzir.",
  },
  pt_PT: {
    providerPlaceholder: "Selecione um fornecedor",
    providerRequiredForModel: "Selecione primeiro um fornecedor",
    providerRequiredError: "Escolha um fornecedor de IA nas definições antes de traduzir.",
  },
  ro: {
    providerPlaceholder: "Selectați un furnizor",
    providerRequiredForModel: "Selectați mai întâi un furnizor",
    providerRequiredError: "Alegeți un furnizor AI din setări înainte de a traduce.",
  },
  ru: {
    providerPlaceholder: "Выберите провайдера",
    providerRequiredForModel: "Сначала выберите провайдера",
    providerRequiredError: "Перед переводом выберите провайдера AI в настройках.",
  },
  sl: {
    providerPlaceholder: "Izberite ponudnika",
    providerRequiredForModel: "Najprej izberite ponudnika",
    providerRequiredError: "Pred prevajanjem v nastavitvah izberite ponudnika AI.",
  },
  sr: {
    providerPlaceholder: "Изаберите добављача",
    providerRequiredForModel: "Прво изаберите добављача",
    providerRequiredError: "Пре превођења изаберите AI добављача у подешавањима.",
  },
  sv: {
    providerPlaceholder: "Välj en leverantör",
    providerRequiredForModel: "Välj en leverantör först",
    providerRequiredError: "Välj en AI-leverantör i inställningarna innan du översätter.",
  },
  th: {
    providerPlaceholder: "เลือกผู้ให้บริการ",
    providerRequiredForModel: "เลือกผู้ให้บริการก่อน",
    providerRequiredError: "เลือกผู้ให้บริการ AI ในการตั้งค่าก่อนแปล",
  },
  tr: {
    providerPlaceholder: "Bir sağlayıcı seçin",
    providerRequiredForModel: "Önce bir sağlayıcı seçin",
    providerRequiredError: "Çeviri yapmadan önce ayarlardan bir AI sağlayıcısı seçin.",
  },
  ug: {
    providerPlaceholder: "تەمىنلىگۈچى تاللاڭ",
    providerRequiredForModel: "ئاۋۋال تەمىنلىگۈچى تاللاڭ",
    providerRequiredError: "تەرجىمە قىلىشتىن بۇرۇن تەڭشەكتە AI تەمىنلىگۈچىسىنى تاللاڭ.",
  },
  uk: {
    providerPlaceholder: "Виберіть постачальника",
    providerRequiredForModel: "Спочатку виберіть постачальника",
    providerRequiredError: "Перед перекладом виберіть постачальника AI у налаштуваннях.",
  },
  vi: {
    providerPlaceholder: "Chọn nhà cung cấp",
    providerRequiredForModel: "Hãy chọn nhà cung cấp trước",
    providerRequiredError: "Chọn nhà cung cấp AI trong cài đặt trước khi dịch.",
  },
};
