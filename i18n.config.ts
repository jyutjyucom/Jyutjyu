import * as OpenCCModule from 'opencc-js'

type MessageValue = string | MessageValue[] | MessageRecord
type MessageRecord = { [key: string]: MessageValue }
type MessageConverter = (text: string) => string
type MessageOverrides = Record<string, string>
type OpenCCOptions = {
  from: 'cn' | 'tw' | 'twp' | 'hk' | 't'
  to: 'cn' | 'tw' | 'twp' | 'hk' | 't'
}

const identityConverter: MessageConverter = (text) => text

const openCCModuleRecord = OpenCCModule as unknown as Record<string, unknown>
const resolvedOpenCC = ((openCCModuleRecord['default'] as Record<string, unknown> | undefined) ??
  OpenCCModule) as {
    Converter?: (options: OpenCCOptions) => MessageConverter
  }

const openCCConverterFactory = typeof resolvedOpenCC.Converter === 'function'
  ? resolvedOpenCC.Converter
  : null

const createSafeConverter = (options: OpenCCOptions): MessageConverter => {
  if (!openCCConverterFactory) {
    console.warn('[i18n] OpenCC Converter unavailable, using identity converter.')
    return identityConverter
  }

  try {
    return openCCConverterFactory(options)
  } catch (error) {
    console.error('[i18n] OpenCC converter initialization failed, using identity converter:', error)
    return identityConverter
  }
}

const convertMessageValue = (value: MessageValue, converter: MessageConverter): MessageValue => {
  if (typeof value === 'string') {
    return converter(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertMessageValue(item, converter))
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      convertMessageValue(nestedValue, converter)
    ])
  )
}

const convertMessages = <T extends MessageRecord>(
  messages: T,
  converter: MessageConverter
): T => convertMessageValue(messages, converter) as T

const applyStringOverrides = <T extends MessageRecord>(
  messages: T,
  overrides: MessageOverrides
): T => {
  const next = convertMessages(messages, (text) => text)

  for (const [path, value] of Object.entries(overrides)) {
    const segments = path.split('.')
    let cursor: Record<string, unknown> | undefined = next as Record<string, unknown>

    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]!
      const nested = cursor?.[segment]

      if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
        cursor = undefined
        break
      }

      cursor = nested as Record<string, unknown>
    }

    const lastSegment = segments[segments.length - 1]

    if (cursor && lastSegment) {
      cursor[lastSegment] = value
    }
  }

  return next
}

// 中文界面：使用繁体中文文案作为唯一维护源，并自动生成简体文案。
const messagesZhHant = {
  browse: {
    title: '瀏覽詞條',
    description: '瀏覽全部詞條',
    metaDescription: '瀏覽粵語辭叢全部詞條',
    backHome: '返回首頁',
    pageInputPrefix: '第',
    pageInputSuffix: '頁',
    entries: '{count} 條',
    prevPage: '上一頁',
    nextPage: '下一頁',
    pageInfo: '第 {page} / {total} 頁',
    allEntries: '全部詞條',
    dictionaries: '詞典來源',
    allSources: '全部詞典',
    pageSize: '每頁數量'
  },
  common: {
    siteName: '粵語辭叢',
    siteSubtitle: 'Open Yue Dictionary Collection Platform',
    siteDescription: '開放的粵語詞典聚合平台',
    contribute: '參與貢獻',
    contributeDescription: '本平台開源於 GitHub，歡迎外部貢獻',
    github: 'GitHub',
    contributeData: '貢獻數據',
    aboutProject: '關於項目',
    footerCopyright: '粵語辭叢 © 2025-2026 · 開源於',
    searchPlaceholder: '搜尋詞語或粵拼...',
    searchButton: '搜尋',
    reverseSearch: '從釋義中反查',
    reverseSearchTitle: '從釋義中反查詞語',
    noDefinition: '暫無釋義',
    clickToView: '點擊查看',
    reverseSearchShort: '釋義反查',
    examplesPrefix: '如：',
    exampleSearchPrefix: '試下搜尋:',
    loading: '載入中...',
    changeBatch: '換一批',
    next: '下一個',
    recommendedEntries: '隨機詞條',
    includedDictionaries: '收錄詞典',
    totalEntriesPrefix: '共收錄',
    totalEntriesSuffix: '條詞條',
    moreDictionariesComing: '更多詞典陸續加入...',
    viewLicense: '查看完整授權說明',
    licenseLabel: '許可:',
    licenseCommunityDisclaimer: '詞條內容由社羣編者負責，本網站不對內容負責。',
    licenseScannedDisclaimerPrefix: '詞條內容由書籍作者負責。因採用 OCR 批量處理，難免有錯誤，如發現錯誤可在',
    licenseScannedDisclaimerSuffix: '提出。',
    licenseDetails: '查看詳情',
    footerFriendLinks: '友情連結：',
    footerJyutping: '粵拼',
    footerJyutDict: '泛粵典',
    footerJyutNet: '粵音資料集叢',
    footerLicenseIntro: '收錄內容遵循不同授權協議',
    footerOcrDisclaimerPrefix: '本站詞條內容由 OCR 自動轉換，如有錯漏，請多多',
    searchHeader: '搜索結果',
    searchResultsPrefix: '搜索結果:',
    reverseSearchResultsPrefix: '反查結果:',
    searching: '搜尋中...',
    filterLabel: '篩選:',
    sortLabel: '排序:',
    allDictionaries: '全部詞典',
    allDialects: '全部方言',
    allTypes: '全部词元',
    entryTypeCharacter: '字',
    entryTypeWord: '詞',
    entryTypePhrase: '短語',
    clear: '清除',
    showFirstPrefix: '顯示前',
    showFirstSuffix: '條',
    noResultsTitle: '沒有找到相關結果',
    noResultsDescription: '試下其他關鍵詞或粵拼',
    noResultsTipsTitle: '搜尋提示：',
    noResultsTip1: '嘗試使用繁體字或簡體字',
    noResultsTip2: '嘗試使用粵拼搜尋（如: nei5 hou2）',
    noResultsTip3: '檢查拼寫是否正確',
    noResultsTip4: '嘗試使用更簡短的關鍵詞',
    startSearchTitle: '輸入關鍵詞開始搜尋',
    startSearchDescription: '支援繁簡體、粵拼搜尋',
    cardView: '卡片',
    listView: '列表',
    wordColumn: '詞彙',
    jyutpingColumn: '粵拼',
    definitionColumn: '釋義',
    sourceColumn: '來源',
    loadMore: '載入多 10 條',
    loadingMore: '載入中...',
    remainingSuffix: '條',
    entriesCountSuffix: '條',
    inProgress: '整理中',
    moreDictionaries: '更多詞典陸續加入...',
    prevDictionariesAria: '上一組詞典',
    nextDictionariesAria: '下一組詞典',
    switchEntryAria: '切換到第 {index} 個詞條',
    switchDictionaryAria: '切換到第 {index} 個詞典',
    languageSwitcherLabel: '介面語言',
    langZhHans: '簡體中文',
    langZhHant: '繁體中文',
    langYueHans: '簡體粵文',
    langYueHant: '粵文',
    exactMatchLabel: '完全匹配',
    otherResultsLabel: '其他相關結果',
    sortByRelevance: '相關度',
    sortByJyutping: '粵拼',
    sortByHeadword: '詞頭',
    sortByDictionary: '詞典',
    optionsExpand: '展開選項',
    optionsCollapse: '收起選項',
    themeLight: '亮色模式',
    themeDark: '暗色模式',
    themeSystem: '跟隨系統',
    themeToggle: '切換主題',
    showMoreDictionaries: '顯示更多詞典 ({count} 個)',
    showLess: '收起'
  },
  dictCard: {
    placeholderWord: '有音無字',
    originalPhonetic: '原書拼音: ',
    variantWords: '異形詞: ',
    standardWriting: '參考詞頭: ',
    collectedBy: '收錄於 {count} 本詞典',
    dialect: {
      GZ: '廣州',
      HK: '香港',
      QZ: '欽州',
      KP: '開平',
      TS: '台山',
      YUE: '粵語'
    },
    entryTypeCharacter: '字',
    entryTypeWord: '詞',
    entryTypePhrase: '短語',
    collapse: '收起',
    expand: '展開',
    details: '詳情',
    note: '備註：',
    proofreaderNote: '校對者備註：',
    etymology: '詞源：',
    references: '參考文獻：',
    seeAlso: '參見：',
    usage: '用法:'
  },
  about: {
    pageTitle: '關於',
    metaDescription: '了解粵語辭叢項目的使命、內容授權政策和技術架構。我們致力於打造開放、包容、可持續的粵語詞典聚合平台。',
    title: '關於粵語辭叢',
    subtitle: 'Open Yue Dictionary Collection Platform - 開放的粵語詞典聚合平台',
    missionTitle: '項目使命',
    missionP1: '粵語辭叢致力於打造一個開放、包容、可持續的粵語詞典聚合平台，通過數字化手段保育和傳承粵語文化。',
    missionP2: '我們相信，語言是文化的載體，詞典是文化的記憶。通過聚合多個來源的粵語詞典，我們希望為粵語學習者、研究者和愛好者提供一個便捷、準確、全面的查詢工具。',
    backHome: '返回首頁',
    licenseSectionTitle: '內容授權說明',
    licenseIntro: '本平台所收錄的詞典內容根據來源分為兩類，每類都有明確的授權和使用限制：',
    published: {
      title: '出版詞典',
      examples: '如《實用廣州話分類詞典》（麥耘、譚步雲編，廣東人民出版社，1997 年）、《廣州話俗語詞典》（歐陽覺亞、周無忌、饒秉才編，廣東人民出版社，2010 年）等。',
      copyrightTitle: '版權狀態',
      copyright: '這些詞典內容受中華人民共和國著作權法保護，數據來源於互聯網上的公開掃描資源。',
      disclaimerTitle: '內容免責',
      disclaimer: '詞條內容由原書籍作者負責。本平台數據來源於 OCR 批量處理，因技術限制，難免存在識別錯誤或格式問題。如發現錯誤，歡迎通過 GitHub Issue 提出：',
      currentUseTitle: '當前用途',
      currentUse1: '技術原型驗證和演示',
      currentUse2: '學術研究和探討',
      currentUse3: '粵語數字化技術開發',
      limitTitle: '使用限制',
      limit1: '不得用於商業用途',
      limit2: '不得進行二次分發或再授權',
      limit3: '不得用於正式出版或產品發佈',
      supportOriginal: '我們鼓勵用戶支持正版：如需正式使用這些詞典內容，請購買正版出版物或聯繫出版方獲得授權。'
    },
    community: {
      title: '社羣協作詞典',
      intro: '由開放社羣協作編寫的詞典，採用開放授權協議。',
      disclaimer: '內容免責：社羣協作詞典的詞條內容均由其各自社羣的編者負責編寫和維護。本網站僅作為內容聚合展示平台，不對詞條內容的準確性、完整性或適用性承擔責任。如對具體詞條內容有疑問，請訪問原詞典網站或聯繫其編者團隊。',
      licenseTitle: '許可協議',
      allowedTitle: '允許的使用',
      conditionsTitle: '使用條件',
      wordsTitle: '粵典 (words.hk) - {count} 詞條',
      wordsDesc: '香港粵語社羣詞典，收錄大量日常用語、俚語及現代詞彙，提供粵語和英語雙語釋義。',
      allowed1: '非商業使用、複製、修改、發佈',
      allowed2: '必須保留署名和版權告示',
      commercialTitle: '商業使用',
      commercialDesc: '需獲得授權（收入低於地區中位數 3 倍的小型個人業務可豁免）',
      wordsCopyright: '版權持有人：香港辭書有限公司',
      wiktTitle: '維基辭典 - {count} 詞條',
      wiktDesc: '來自維基辭典的粵語詞條，由全球志願者協作編寫，內容豐富全面。',
      wiktAllowed1: '商業使用：允許用於商業目的',
      wiktAllowed2: '複製與分發：可以自由複製、分發、傳播',
      wiktAllowed3: '修改與演繹：可以修改、混合、轉換或基於該作品創作',
      wiktCond1: '署名：必須給予適當的署名，提供指向許可協議的鏈接',
      wiktCond2: '相同方式共享：如對本作品進行修改，必須以相同許可協議分發',
      wiktCopyright: '版權持有人：維基媒體基金會 & 維基辭典貢獻者'
    },
    original: {
      title: '社羣原創詞表',
      intro: '由方言愛好者、語言學習者、研究者等個人原創整理並貢獻的詞表內容。',
      licenseTitle: '默認許可協議',
      licenseDesc: '採用以下許可發佈：',
      allowedTitle: '允許的使用',
      allowed1: '複製與分享：可以自由複製、分發該內容',
      allowed2: '改編：可以基於該內容進行修改、演繹',
      allowed3: '非商業用途：僅限個人學習、研究等非盈利目的',
      conditionsTitle: '使用條件',
      conditions1: '署名：必須給出適當的署名，提供指向許可協議的鏈接',
      conditions2: '標明修改：如進行了修改，需說明已作出的修改',
      conditions3: '非商業性：不得將該內容用於商業目的',
      attributionExample: '署名格式示例：',
      attributionCode: '陳明. (2025). 四邑話日常用語詞表. 粵語辭叢 (jyutjyu.com)',
      qzTitle: '欽州粵拼 - {count} 詞條',
      qzDesc: '《欽州白話》的詞頭及注音部分，收錄欽州話詞彙及粵拼。由 Lai Joengzit 等愛好者原創整理，2020年發佈。',
      qzAllowed1: '商業使用：允許用於商業目的',
      qzAllowed2: '複製與分發：可以自由複製、分發、傳播',
      qzAllowed3: '修改與演繹：可以修改、混合、轉換或基於該作品創作',
      qzConditions1: '保留版權聲明：必須保留原始版權聲明和許可協議',
      qzConditions2: '相同方式共享：如對本作品進行修改，必須以相同許可協議（GPL-3.0）分發',
      qzCopyright: '版權持有人：Lai Joengzit 等。數據來源：https://github.com/LaiJoengzit/hamzau_jyutping'
    },
    webDict: {
      title: '網絡公開詞典（協議不明）',
      intro: '以下詞典直接公開於網絡，未標明具體授權協議。使用與再分發時請註明出處並尊重原作者。',
      tsTitle: '台山話英文字典 - {count} 詞條',
      tsDesc: '台山話—英語網絡詞典，收錄字頭、詞組及例句，提供台山話羅馬字與漢語拼音、英文釋義。',
      tsLicense: '協議狀態',
      tsNotice: '數據來源於網絡公開詞典，版權 © 2005-2024 Gene M. Chin。未標明具體協議。',
      tsCopyright: '來源：https://www.chinfamilytree.com/hed/index.htm · 使用與再分發時請註明出處並尊重原作者。'
    },
    rights: {
      title: '權利聲明與聯絡方式',
      intro: '我們尊重知識產權，致力於在法律框架內推動粵語文化的保育與傳承。',
      contactIntro: '如您是權利人並對本平台收錄的內容有任何疑問，或希望修改、下架相關內容，請通過以下方式聯絡我們：',
      response: '我們承諾在收到合理請求後的 7 個工作日內予以回應。'
    },
    tech: {
      title: '技術棧',
      frontendTitle: '前端',
      dataTitle: '數據處理',
      csvParsing: 'CSV 解析與驗證',
      openccConversion: 'OpenCC 繁簡轉換'
    },
    contribute: {
      title: '參與貢獻',
      intro: '這是一個開源項目，我們歡迎各種形式的貢獻！',
      guide: '查看貢獻指南（含授權政策）',
      csvGuide: '數據錄入規範'
    }
  },
  feedback: {
    title: '反饋',
    subtitle: '幫助我們改進粵語辭叢',
    buttonTitle: '提交反饋',
    buttonShort: '反饋',
    type: {
      label: '反饋類型',
      bug: '網站BUG',
      feature: '功能建議',
      entryError: '詞條糾錯',
    },
    titleField: {
      label: '標題',
      placeholder: '簡要描述您的問題或建議'
    },
    description: {
      label: '詳細描述',
      placeholder: '請詳細說明您遇到的問題、使用建議或詞條錯誤...',
      clear: '清空內容'
    },
    entry: {
      word: {
        label: '相關詞語',
        placeholder: '請輸入有問題的詞語'
      },
      source: {
        label: '來源詞典',
        placeholder: '請選擇詞典來源'
      }
    },
    contact: {
      label: '聯絡方式（可選）',
      placeholder: '電郵、社交帳號或其他聯絡方式',
      hint: '可選，方便後續跟進'
    },
    submit: '提交反饋',
    submitting: '提交中...',
    cancel: '關閉',
    success: {
      message: '感謝反饋！您的反饋已提交，我們會認真處理。',
      linkText: '查看反饋',
      buttonLabel: '提交成功'
    },
    error: {
      title: '提交失敗',
      submitFailed: '提交失敗，請稍後重試或直接在GitHub上提交Issue。',
      buttonLabel: '提交失敗'
    }
  }
}

// 粤文界面：使用繁体粤文文案作为唯一维护源，并自动生成简体粤文文案。
const messagesYueHant = {
  browse: {
    title: '全部詞條',
    description: '睇下全部詞條',
    metaDescription: '瀏覽粵語辭叢全部詞條',
    backHome: '返去首頁',
    pageInputPrefix: '第',
    pageInputSuffix: '頁',
    entries: '{count} 條',
    prevPage: '上一頁',
    nextPage: '下一頁',
    pageInfo: '第 {page} / {total} 頁',
    allEntries: '全部詞條',
    dictionaries: '詞典來源',
    allSources: '全部詞典',
    pageSize: '每頁數量'
  },
  common: {
    siteName: '粵語辭叢',
    siteSubtitle: 'Open Yue Dictionary Collection Platform',
    siteDescription: '開放嘅粵語詞典聚合平台',
    contribute: '一齊嚟貢獻',
    contributeDescription: '本平台係開源項目，歡迎外部貢獻',
    github: 'GitHub',
    contributeData: '貢獻數據',
    aboutProject: '關於項目',
    footerCopyright: '粵語辭叢 © 2025-2026 · 開源於',
    searchPlaceholder: '揾下詞語或者粵拼...',
    searchButton: '搜尋',
    reverseSearch: '通过釋義反查',
    reverseSearchTitle: '喺釋義入面反查詞語',
    noDefinition: '暫時未有釋義',
    clickToView: '點擊睇詳情',
    reverseSearchShort: '釋義反查',
    examplesPrefix: '例如：',
    exampleSearchPrefix: '可以試下搜：',
    loading: '載入緊...',
    changeBatch: '換一批',
    next: '下一個',
    recommendedEntries: '隨機詞條',
    includedDictionaries: '收錄詞典',
    totalEntriesPrefix: '一共收錄咗',
    totalEntriesSuffix: '條詞條',
    moreDictionariesComing: '仲有更多詞典陸續會加入...',
    viewLicense: '睇完整授權說明',
    licenseLabel: '許可：',
    licenseCommunityDisclaimer: '詞條內容由社羣編者負責，本網站唔對內容負責。',
    licenseScannedDisclaimerPrefix: '詞條內容由書籍作者負責。因為用 OCR 批量處理，難免有錯誤，如果發現問題可以喺',
    licenseScannedDisclaimerSuffix: '提出。',
    licenseDetails: '睇詳情',
    footerFriendLinks: '友情連結：',
    footerJyutping: '粵拼',
    footerJyutDict: '泛粵典',
    footerJyutNet: '粵音資料集叢',
    footerLicenseIntro: '收錄內容遵循唔同授權協議',
    footerOcrDisclaimerPrefix: '本站詞條內容係 OCR 自動轉換嘅，如有錯漏，請多多',
    searchHeader: '搜尋結果',
    searchResultsPrefix: '搜尋結果：',
    reverseSearchResultsPrefix: '反查結果：',
    searching: '搜尋緊...',
    filterLabel: '篩選：',
    sortLabel: '排序：',
    allDictionaries: '全部詞典',
    allDialects: '全部方言',
    allTypes: '全部詞元',
    entryTypeCharacter: '字',
    entryTypeWord: '詞',
    entryTypePhrase: '短語',
    clear: '清除',
    showFirstPrefix: '顯示前',
    showFirstSuffix: '條',
    noResultsTitle: '搵唔到相關結果',
    noResultsDescription: '可以試下其他關鍵字或者粵拼',
    noResultsTipsTitle: '搜尋小貼士：',
    noResultsTip1: '可以試下用繁體字或者簡體字',
    noResultsTip2: '可以試下用粵拼搜尋（nei5 hou2）',
    noResultsTip3: '檢查下拼寫啱唔啱',
    noResultsTip4: '可以試下用再簡短啲嘅關鍵詞',
    startSearchTitle: '輸入關鍵詞開始搜尋',
    startSearchDescription: '支援繁簡體同粵拼搜尋',
    cardView: '卡片',
    listView: '列表',
    wordColumn: '詞彙',
    jyutpingColumn: '粵拼',
    definitionColumn: '釋義',
    sourceColumn: '來源',
    loadMore: '載入多 10 條',
    loadingMore: '載入緊...',
    remainingSuffix: '條',
    entriesCountSuffix: '條',
    inProgress: '整理緊',
    moreDictionaries: '仲有更多詞典陸續會加入...',
    prevDictionariesAria: '上一組詞典',
    nextDictionariesAria: '下一組詞典',
    switchEntryAria: '切換到第 {index} 個詞條',
    switchDictionaryAria: '切換到第 {index} 個詞典',
    languageSwitcherLabel: '介面語言',
    langZhHans: '簡體中文',
    langZhHant: '繁體中文',
    langYueHans: '簡體粵文',
    langYueHant: '粵文',
    exactMatchLabel: '完全匹配',
    otherResultsLabel: '其他相關結果',
    sortByRelevance: '相關度',
    sortByJyutping: '粵拼',
    sortByHeadword: '詞頭',
    sortByDictionary: '詞典',
    optionsExpand: '展開選項',
    optionsCollapse: '收起選項',
    themeLight: '亮色模式',
    themeDark: '暗色模式',
    themeSystem: '跟隨系統',
    themeToggle: '切換主題',
    showMoreDictionaries: '顯示更多詞典 ({count} 個)',
    showLess: '收起'
  },
  dictCard: {
    placeholderWord: '有音無字',
    originalPhonetic: '原書拼音: ',
    variantWords: '異形詞: ',
    standardWriting: '參考詞頭: ',
    collectedBy: '收錄於 {count} 本詞典',
    dialect: {
      GZ: '廣州',
      HK: '香港',
      QZ: '欽州',
      KP: '開平',
      TS: '台山',
      YUE: '粵語'
    },
    entryTypeCharacter: '字',
    entryTypeWord: '詞',
    entryTypePhrase: '短語',
    collapse: '收起',
    expand: '展開',
    details: '詳情',
    note: '備註：',
    proofreaderNote: '校對者備註：',
    etymology: '詞源：',
    references: '參考文獻：',
    seeAlso: '參見：',
    usage: '用法:'
  },
  about: {
    pageTitle: '關於',
    metaDescription: '了解粵語辭叢項目嘅使命、內容授權政策同技術架構。我哋致力於打造開放、包容、可持續嘅粵語詞典聚合平台。',
    title: '關於粵語辭叢',
    subtitle: 'Open Yue Dictionary Collection Platform - 開放嘅粵語詞典聚合平台',
    missionTitle: '使命',
    missionP1: '粵語辭叢致力於建立一個先進實用嘅粵語詞典平台，用現代技術傳承同推廣粵語文化。',
    missionP2: '通過聚合多個來源嘅粵語詞典，我哋為粵語學習者、研究者、愛好者提供一個方便又全面嘅查詢工具。',
    backHome: '返回首頁',
    licenseSectionTitle: '內容授權說明',
    licenseIntro: '本平台收錄嘅詞典內容按來源大致分成兩類，每類都有相應嘅授權同使用限制：',
    published: {
      title: '出版詞典',
      examples: '例如《實用廣州話分類詞典》（麥耘、譚步雲編，廣東人民出版社，1997 年）、《廣州話俗語詞典》（歐陽覺亞、周無忌、饒秉才編，廣東人民出版社，2010 年）等。',
      copyrightTitle: '版權狀態',
      copyright: '呢啲詞典內容受中華人民共和國著作權法保護，數據來源係互聯網上公開嘅掃描資源。',
      disclaimerTitle: '內容免責',
      disclaimer: '詞條內容由原書籍作者負責。本平台數據來源於 OCR 批量處理，因技術限制，難免會有識別錯誤或者格式問題。如果你發現錯誤，歡迎通過 GitHub Issue 提出：',
      currentUseTitle: '當前用途',
      currentUse1: '技術原型驗證同演示',
      currentUse2: '學術研究同探討',
      currentUse3: '粵語數字化技術開發',
      limitTitle: '使用限制',
      limit1: '唔可以用於商業用途',
      limit2: '唔可以進行二次分發或者再授權',
      limit3: '唔可以用於正式出版或者產品發佈',
      supportOriginal: '我哋鼓勵用戶支持正版：如果需要正式使用呢啲詞典內容，請購買正版出版物或者聯絡出版方攞授權。'
    },
    community: {
      title: '社羣協作詞典',
      intro: '由開放社羣協作編寫嘅詞典，採用開放授權協議。',
      disclaimer: '內容免責：社羣協作詞典入面嘅詞條內容，全部都係由各自社羣嘅編者負責編寫同維護。本網站只係做內容聚合展示平台，唔對詞條內容嘅準確性、完整性或者適用性承擔責任。如果對具體詞條內容有疑問，請訪問原詞典網站或者聯絡相關編者團隊。',
      licenseTitle: '許可協議',
      allowedTitle: '允許嘅使用方式',
      conditionsTitle: '使用條件',
      wordsTitle: '粵典 (words.hk) - {count} 詞條',
      wordsDesc: '香港粵語社羣詞典，收錄大量日常用語、俚語同現代詞彙，提供粵語同英語雙語釋義。',
      allowed1: '非商業使用、複製、修改、發佈',
      allowed2: '必須保留署名同版權告示',
      commercialTitle: '商業使用',
      commercialDesc: '需要另外攞授權（收入低過地區中位數 3 倍嘅小型個人業務可以豁免）',
      wordsCopyright: '版權持有人：香港辭書有限公司',
      wiktTitle: '維基辭典 - {count} 詞條',
      wiktDesc: '來自維基辭典嘅粵語詞條，由全球志願者協作編寫，內容豐富全面。',
      wiktAllowed1: '商業使用：允許用於商業目的',
      wiktAllowed2: '複製與分發：可以自由複製、分發、傳播',
      wiktAllowed3: '修改與演繹：可以修改、混合、轉換或者基於呢啲內容再創作',
      wiktCond1: '署名：必須畀出適當署名，並且提供指向許可協議嘅鏈接',
      wiktCond2: '相同方式共享：如果對作品作出修改，必須以相同許可協議再分發',
      wiktCopyright: '版權持有人：維基媒體基金會 & 維基辭典貢獻者'
    },
    original: {
      title: '社羣原創詞表',
      intro: '由方言愛好者、語言學習者、研究者等個人原創整理並貢獻嘅詞表內容。',
      licenseTitle: '默認許可協議',
      licenseDesc: '採用以下許可發佈：',
      allowedTitle: '允許嘅使用方式',
      allowed1: '複製與分享：可以自由複製、分發相關內容',
      allowed2: '改編：可以基於相關內容進行修改、演繹',
      allowed3: '非商業用途：只限個人學習、研究等非盈利目的',
      conditionsTitle: '使用條件',
      conditions1: '署名：必須提供適當署名，並提供指向許可協議嘅鏈接',
      conditions2: '標明修改：如果做咗修改，需要說明改動內容',
      conditions3: '非商業性：唔可以將相關內容用於商業目的',
      attributionExample: '署名格式示例：',
      attributionCode: '陳明. (2025). 四邑話日常用語詞表. 粵語辭叢 (jyutjyu.com)',
      qzTitle: '欽州粵拼 - {count} 詞條',
      qzDesc: '《欽州白話》嘅詞頭同注音部分，收錄欽州話詞彙同粵拼。由 Lai Joengzit 等愛好者原創整理，2020年發佈。',
      qzAllowed1: '商業使用：允許用於商業目的',
      qzAllowed2: '複製與分發：可以自由複製、分發、傳播',
      qzAllowed3: '修改與演繹：可以修改、混合、轉換或者基於呢個作品創作',
      qzConditions1: '保留版權聲明：必須保留原始版權聲明同許可協議',
      qzConditions2: '相同方式共享：如果對本作品進行修改，必須以相同許可協議（GPL-3.0）分發',
      qzCopyright: '版權持有人：Lai Joengzit 等。數據來源：https://github.com/LaiJoengzit/hamzau_jyutping'
    },
    webDict: {
      title: '網絡公開詞典（協議不明）',
      intro: '以下詞典直接公開於網絡，未標明具體授權協議。使用與再分發時請註明出處並尊重原作者。',
      tsTitle: '台山話英文字典 - {count} 詞條',
      tsDesc: '台山話—英語網絡詞典，收錄字頭、詞組及例句，提供台山話羅馬字與漢語拼音、英文釋義。',
      tsLicense: '協議狀態',
      tsNotice: '數據來源於網絡公開詞典，版權 © 2005-2024 Gene M. Chin。未標明具體協議。',
      tsCopyright: '來源：https://www.chinfamilytree.com/hed/index.htm · 使用與再分發時請註明出處並尊重原作者。'
    },
    rights: {
      title: '權利聲明與聯絡方式',
      intro: '我哋尊重知識產權，致力於喺法律框架之下推動粵語文化嘅保育同傳承。',
      contactIntro: '如果你係權利人，並且對本平台收錄內容有任何疑問，或者希望修改、下架相關內容，可以通過以下方式聯絡我哋：',
      response: '我哋承諾喺收到合理請求之後嘅 7 個工作日內作出回應。'
    },
    tech: {
      title: '技術棧',
      frontendTitle: '前端',
      dataTitle: '數據處理',
      csvParsing: 'CSV 解析同驗證',
      openccConversion: 'OpenCC 繁簡轉換'
    },
    contribute: {
      title: '參與貢獻',
      intro: '呢個係一個開源項目，我哋歡迎各種形式嘅貢獻！',
      guide: '查看貢獻指南（含授權政策）',
      csvGuide: '數據錄入規範'
    }
  },
  feedback: {
    title: '反饋',
    subtitle: '幫助我哋改進粵語辭叢',
    buttonTitle: '提交反饋',
    buttonShort: '反饋',
    type: {
      label: '反饋類型',
      bug: '網站BUG',
      feature: '功能建議',
      entryError: '詞條糾錯',
    },
    titleField: {
      label: '標題',
      placeholder: '簡要描述你嘅問題或建議'
    },
    description: {
      label: '詳細描述',
      placeholder: '請詳細講下你遇到嘅問題、建議或者詞條錯誤...',
      clear: '清空內容'
    },
    entry: {
      word: {
        label: '相關詞語',
        placeholder: '請輸入有問題嘅詞語'
      },
      source: {
        label: '來源詞典',
        placeholder: '請選擇詞典來源'
      }
    },
    contact: {
      label: '聯絡方式（可選）',
      placeholder: '電郵、社交帳號或其他聯絡方式',
      hint: '可選，方便後續跟進'
    },
    submit: '提交反饋',
    submitting: '提交中...',
    cancel: '關閉',
    success: {
      message: '多謝反饋！你嘅反饋已提交，我哋會認真處理。',
      linkText: '查看反饋',
      buttonLabel: '提交成功'
    },
    error: {
      title: '提交失敗',
      submitFailed: '提交失敗，請稍後再試，或者直接喺 GitHub 提 Issue。',
      buttonLabel: '提交失敗'
    }
  }
}

// 如 OpenCC 个别词汇转换不符合预期，可在这里按路径覆盖。
const zhHansOverrides: MessageOverrides = {}
const yueHansOverrides: MessageOverrides = {}

const toSimplifiedZh = createSafeConverter({ from: 't', to: 'cn' })
const toSimplifiedYue = createSafeConverter({ from: 'hk', to: 'cn' })

const messagesZhHans = applyStringOverrides(
  convertMessages(messagesZhHant, toSimplifiedZh),
  zhHansOverrides
)

const messagesYueHans = applyStringOverrides(
  convertMessages(messagesYueHant, toSimplifiedYue),
  yueHansOverrides
)

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'zh-Hans',
  fallbackLocale: 'zh-Hans',
  messages: {
    'zh-Hans': messagesZhHans,
    'zh-Hant': messagesZhHant,
    'yue-Hans': messagesYueHans,
    'yue-Hant': messagesYueHant
  }
}))
