// Statutory Multilingual Translation Dictionary (DPDP Act 2023 - Section 5(3) & 8th Schedule)

export const INDIC_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Pan-India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', region: 'North / Central India' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal & Tripura' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh & Telangana' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Pan-India' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Classical' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', region: 'Bihar' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'Sikkim & West Bengal' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', region: 'Goa' },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', region: 'Pan-India' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', region: 'Jammu & Kashmir' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', nativeName: 'बर\'', region: 'Assam' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', region: 'Jharkhand & Odisha' }
];

// Attribute translations across Indic languages
export const ATTRIBUTE_TRANSLATIONS = {
  "Full Legal Name & Employee ID": {
    hi: "पूर्ण कानूनी नाम और कर्मचारी आईडी",
    ta: "முழு சட்டப்பூர்வ பெயர் மற்றும் பணியாளர் ஐடி",
    bn: "সম্পূর্ণ আইনি নাম ও কর্মচারী আইডি",
    mr: "पूर्ण कायदेशीर नाव आणि कर्मचारी आयडी",
    te: "పూర్తి చట్టబద్ధమైన పేరు & ఉద్యోగి ఐడి",
    gu: "પૂરું કાનૂની નામ અને કર્મચારી આઈડી",
    kn: "ಪೂರ್ಣ ಕಾನೂನು ಹೆಸರು ಮತ್ತು ಉದ್ಯೋಗಿ ಐಡಿ",
    ml: "പൂർണ്ണ നിയമപരമായ പേരും ജീവനക്കാരുടെ ഐഡിയും",
    pa: "ਪੂਰਾ ਕਾਨੂੰਨੀ ਨਾਮ ਅਤੇ ਕਰਮਚਾਰੀ ਆਈਡੀ",
    ur: "مکمل قانونی نام اور ملازم آئی ڈی",
    as: "সম্পূৰ্ণ আইনী নাম আৰু কৰ্মচাৰী আইডি",
    sa: "पूर्णं वैधानिकं नाम एवं कर्मचारिनिर्देशांकः",
    or: "ସମ୍ପୂର୍ଣ୍ଣ ଆଇନଗତ ନାମ ଏବଂ କର୍ମଚାରୀ ଆଇଡି",
    ne: "पूरा कानूनी नाम र कर्मचारी आईडी"
  },
  "Universal Account Number (UAN) & PF ID": {
    hi: "यूनिवर्सल अकाउंट नंबर (UAN) और पीएफ आईडी",
    ta: "யுனிவர்சல் கணக்கு எண் (UAN) மற்றும் பிஎஃப் ஐடி",
    bn: "ইউনিভার্সাল অ্যাকাউন্ট নম্বর (UAN) ও পিএফ আইডি",
    mr: "युनिव्हर्सल अकाउंट नंबर (UAN) आणि पीएफ आयडी",
    te: "యూనివర్సల్ ఖాతా సంఖ్య (UAN) & పిఎఫ్ ఐడి",
    gu: "યુનિવર્સલ એકાઉન્ટ નંબર (UAN) અને પીએફ આઈડી",
    kn: "ಯುನಿವರ್ಸಲ್ ಖಾತೆ ಸಂಖ್ಯೆ (UAN) ಮತ್ತು PF ಐಡಿ",
    ml: "യൂണിവേഴ്സൽ അക്കൗണ്ട് നമ്പർ (UAN), PF ഐഡി",
    pa: "ਯੂਨੀਵਰਸਲ ਖਾਤਾ ਨੰਬਰ (UAN) ਅਤੇ ਪੀਐਫ ਆਈਡੀ",
    ur: "یونیورسل اکاؤنٹ نمبر (UAN) اور پی ایف آئی ڈی",
    as: "ইউনিভাৰ্ছেল একাউণ্ট নম্বৰ (UAN) আৰু পিএফ আইডি"
  },
  "Permanent Account Number (PAN Card)": {
    hi: "स्थायी खाता संख्या (पैन कार्ड)",
    ta: "நிரந்தர கணக்கு எண் (பான் கார்டு)",
    bn: "স্থায়ী অ্যাকাউন্ট নম্বর (প্যান কার্ড)",
    mr: "कायमस्वरूपी खाते क्रमांक (पॅन कार्ड)",
    te: "శాశ్వత ఖాతా సంఖ్య (పాన్ కార్డ్)",
    gu: "કાયમી એકાઉન્ટ નંબર (પાન કાર્ડ)",
    kn: "ಖಾಯಂ ಖಾತೆ ಸಂಖ್ಯೆ (ಪ್ಯಾನ್ ಕಾರ್ಡ್)",
    ml: "സ്ഥിരമായ അക്കൗണ്ട് നമ്പർ (പാൻ കാർഡ്)",
    pa: "ਸਥਾਈ ਖਾਤਾ ਨੰਬਰ (ਪੈਨ ਕਾਰਡ)",
    ur: "مستقل اکاؤنٹ نمبر (پین کارڈ)"
  },
  "Bank Account Number & IFSC Code": {
    hi: "बैंक खाता संख्या और आईएफएससी कोड",
    ta: "வங்கி கணக்கு எண் மற்றும் ஐஎப்எஸ்சி குறியீடு",
    bn: "ব্যাংক অ্যাকাউন্ট নম্বর ও আইএফএসসি কোড",
    mr: "बँक खाते क्रमांक आणि आयएफएससी कोड",
    te: "బ్యాంక్ ఖాతా సంఖ్య & IFSC కోడ్",
    gu: "બેંક એકાઉન્ટ નંબર અને IFSC કોડ",
    kn: "ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ಮತ್ತು IFSC ಕೋಡ್",
    ml: "ബാങ്ക് അക്കൗണ്ട് നമ്പറും IFSC കോഡും",
    pa: "ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ ਅਤੇ IFSC ਕੋਡ",
    ur: "بینک اکاؤنٹ نمبر اور IFSC کوڈ"
  },
  "Aadhaar / Government KYC Document": {
    hi: "आधार / सरकारी केवाईसी दस्तावेज़",
    ta: "ஆதார் / அரசு கேஒய்சி ஆவணம்",
    bn: "আধার / সরকারি কেওয়াইসি নথি",
    mr: "आधार / शासकीय केवायसी दस्तऐवज",
    te: "ఆధార్ / ప్రభుత్వ KYC పత్రం",
    gu: "આધાર / સરકારી કેવાયસી દસ્તાવેજ",
    kn: "ಆಧಾರ್ / ಸರ್ಕಾರಿ ಕೆವೈಸಿ ದಾಖಲೆ",
    ml: "ആധാർ / സർക്കാർ കെവൈസി പ്രമാണം",
    pa: "ਆਧਾਰ / ਸਰਕਾਰੀ ਕੇਵਾਈਸੀ ਦਸਤਾਵੇਜ਼",
    ur: "آدھار / سرکاری کے وائی سی دستاویز"
  },
  "Resume / CV Document": {
    hi: "रिज्यूमे / सीवी दस्तावेज़",
    ta: "ரெஸ்யூம் / சிவி ஆவணம்",
    bn: "জীবনবৃত্তান্ত / সিভি নথি",
    mr: "बायोडाटा / सीव्ही दस्तऐवज",
    te: "రెజ్యూమ్ / సివి పత్రం",
    gu: "રેઝ્યૂમે / સીવી દસ્તાવેજ"
  },
  "Academic Marksheets & CGPA": {
    hi: "शैक्षणिक अंकपत्र और सीजीपीए",
    ta: "கல்வி மதிப்பெண் சான்றிதழ் மற்றும் சிஜிபிஏ",
    bn: "একাডেমিক নম্বরপত্র ও সিজিপিএ",
    mr: "शैक्षणिक गुणपत्रके आणि सीजीपीए",
    te: "అకాడమిక్ మార్క్‌షీట్లు & CGPA",
    gu: "શૈક્ષણિક માર્કશીટ્સ અને CGPA"
  },
  "Medical Diagnostic Reports & Lab History": {
    hi: "चिकित्सा निदान रिपोर्ट और लैब इतिहास",
    ta: "மருத்துவ பரிசோதனை அறிக்கைகள்",
    bn: "চিকিৎসা ডায়াগনস্টিক রিপোর্ট ও ল্যাব ইতিহাস",
    mr: "वैद्यकीय निदान अहवाल आणि लॅब इतिहास",
    te: "వైద్య రోగనిర్ధారణ నివేదికలు"
  },
  "CIBIL / Experian Credit Score Report": {
    hi: "सिबिल / एक्सपेरियन क्रेडिट स्कोर रिपोर्ट",
    ta: "சிபில் / எக்ஸ்பீரியன் கடன் மதிப்பீட்டு அறிக்கை",
    bn: "সিবিল / এক্সপেরিয়ান ক্রেডিট স্কোর রিপোর্ট",
    te: "CIBIL / ఎక్స్‌పీరియన్ క్రెడిట్ స్కోర్ నివేదిక"
  },
  "Shipping & Delivery Address": {
    hi: "शिपिंग और डिलीवरी का पता",
    ta: "டெலிவரி முகவரி",
    bn: "শিপিং ও ডেলিভারি ঠিকানা",
    mr: "शिपिंग आणि डिलिव्हरी पत्ता",
    te: "షిప్పింగ్ & డెలిવરી చిరునామా"
  },
  "Background Verification & Criminal Check": {
    hi: "पृष्ठभूमि सत्यापन और आपराधिक जांच",
    ta: "பின்னணி சரிபார்ப்பு",
    bn: "ব্যাকগ্রাউন্ড ভেরিফিকেশন ও তথ্য যাচাই",
    mr: "पार्श्वभूमी पडताळणी आणि पार्श्वभूमी तपासणी",
    te: "నేపథ్య పరిశీలన"
  }
};

// Descriptions translation helper dictionary
export const DESCRIPTION_TRANSLATIONS = {
  "Official name and employee ID for EPFO records": {
    hi: "कर्मचारी भविष्य निधि संगठन (EPFO) रिकॉर्ड के लिए आधिकारिक नाम और कर्मचारी आईडी",
    ta: "EPFO பதிவுகளுக்கான அதிகாரப்பூர்வ பெயர் மற்றும் பணியாளர் ஐடி",
    bn: "ইপিএফও রেকর্ডের জন্য অফিসিয়াল নাম ও কর্মচারী আইডি",
    mr: "EPFO नोंदींसाठी अधिकृत नाव आणि कर्मचारी आयडी",
    te: "EPFO రికార్డుల కోసం అధికారిక పేరు మరియు ఉద్యోగి ఐడి",
    gu: "EPFO રેકોર્ડ્સ માટે સત્તાવાર નામ અને કર્મચારી આઈડી",
    kn: "EPFO ದಾಖಲೆಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಹೆಸರು ಮತ್ತು ಉದ್ಯೋಗಿ ಐಡಿ",
    ml: "EPFO രേഖകൾക്കായുള്ള ഔദ്യോഗിക പേരും ജീവനക്കാരുടെ ഐഡിയും"
  },
  "EPFO UAN for Provident Fund account linking": {
    hi: "भविष्य निधि खाता जोड़ने के लिए ईपीएफओ यूएएन",
    ta: "வருங்கால வைப்பு நிதி கணக்கு இணைப்புக்கான EPFO UAN",
    bn: "প্রভিডেন্ট ফান্ড অ্যাকাউন্ট লিঙ্কিংয়ের জন্য ইপিএফও ইউএএন",
    mr: "भविष्य निर्वाह निधी खाते जोडणीसाठी EPFO UAN",
    te: "ప్రావిడెంట్ ఫండ్ ఖాతా అనుసంధానం కోసం EPFO UAN",
    gu: "પીએફ એકાઉન્ટ લિંકિંગ માટે EPFO UAN"
  },
  "Tax identity verification for PF contribution tax exemption": {
    hi: "पीएफ योगदान कर छूट के लिए कर पहचान सत्यापन",
    ta: "பிஎஃப் பங்களிப்பு வரி விலக்குக்கான வரி அடையாள சரிபார்ப்பு",
    bn: "পিএফ অবদানের কর ছাড়ের জন্য কর পরিচয় যাচাইকরণ",
    mr: "पीएफ योगदानातील कर सवलतीसाठी कर ओळख पडताळणी",
    te: "పిఎఫ్ సహకార పన్ను మినహాయింపు కోసం పన్ను గుర్తింపు ధృవీకరణ",
    gu: "પીએફ યોગદાન કર મુક્તિ માટે કર ઓળખ ચકાસણી"
  },
  "Direct bank account for PF withdrawal/transfer credit": {
    hi: "पीएफ निकासी/ट्रांसफर जमा के लिए सीधा बैंक खाता",
    ta: "பிஎஃப் பணம் திரும்பப் பெறுதல்/மாற்றத்திற்கான நேரடி வங்கி கணக்கு",
    bn: "পিএফ উত্তোলন/স্থানান্তরের জন্য সরাসরি ব্যাংক অ্যাকাউন্ট",
    mr: "पीएफ काढणे/हस्तांतरणासाठी थेट बँक खाते",
    te: "పిఎఫ్ విత్‌డ్రా/బదిలీ కోసం ప్రత్యక్ష బ్యాంక్ ఖాతా",
    gu: "પીએફ ઉપાડ માટે સીધું બેંક એકાઉન્ટ"
  },
  "EPFO mandatory e-KYC biometric identity verification": {
    hi: "ईपीएफओ अनिवार्य ई-केवाईसी बायोमेट्रिक पहचान सत्यापन",
    ta: "EPFO கட்டாய இ-கேஒய்சி பயோமெட்ரிக் அடையாள சரிபார்ப்பு",
    bn: "ইপিএফও বাধ্যতামূলক ই-কেওয়াইসি বায়োমেট্রিক পরিচয় যাচাইকরণ",
    mr: "EPFO अनिवार्य ई-केवायसी बायोमेट्रिक ओळख पडताळणी",
    te: "EPFO తప్పనిసరి ఇ-KYC బయోమెట్రిക് గుర్తింపు ధృవీకరణ",
    gu: "EPFO ફરજિયાત e-KYC બાયોમેટ્રિક ઓળખ ચકાસણી"
  }
};

export const UI_TRANSLATIONS = {
  en: {
    portalTitle: "Data Principal Consent Manager",
    portalSubtitle: "DPDP Act 2023 Compliant • Individual Privacy Control",
    statutoryBadge: "DPDP Sec 5(3) Mandate • 22 Indic Languages",
    navIncoming: "Incoming Request",
    navDecisionHub: "Decision Hub",
    navActiveConsents: "Active Consents",
    navAuditTrail: "Audit Trail",
    navDataRights: "Data Rights (Sec 11-14)",
    resetDemo: "Reset Demo",
    simulationMode: "SIMULATION MODE: Select Incoming Consent Scenario",
    interactiveTest: "INTERACTIVE TEST",
    
    // DSR Portal (Sec 11-14)
    dsrTitle: "Statutory Data Subject Rights (DSR) Portal",
    dsrSub: "Exercise your legal rights to Data Erasure (Sec 12), Data Correction (Sec 11), and Nominee Designation (Sec 14) under DPDP Act 2023.",
    tabErasure: "Right to Erasure (Sec 12)",
    tabCorrection: "Right to Correction (Sec 11)",
    tabNomination: "Right to Nominate (Sec 14)",
    tabDsrTracker: "DSR Request Tracker",
    erasureWizardTitle: "Data Erasure Request Wizard",
    correctionFormTitle: "Personal Data Correction Request",
    nominationTitle: "Designated Statutory Nominee",
    updateNomineeBtn: "Update Nominee Details",
    selectFiduciaryLabel: "Select Target Data Fiduciary:",
    erasureScopeLabel: "Erasure Scope:",
    erasureReasonLabel: "Statutory Reason / Basis for Erasure Request:",
    legalImpactDisclaimer: "Legal Impact (Sec 12(3)): Upon receipt of this request, the Data Fiduciary is required by law to erase personal data and instruct its third-party data processors to execute data purging within the statutory SLA (30 days).",
    submitErasureBtn: "Submit Statutory Erasure Request (Sec 12)",
    attributeToCorrectLabel: "Data Attribute to Correct:",
    currentInaccurateLabel: "Current (Inaccurate) Value:",
    newCorrectedLabel: "New Corrected Value:",
    correctionReasonLabel: "Reason for Correction / Supporting Proof Details:",
    submitCorrectionBtn: "Submit Data Correction Ticket (Sec 11)",
    sec14Protection: "Section 14 Legal Protection: In event of death or incapacity of Data Principal, the designated nominee shall exercise the right to manage or revoke consent.",
    dsrSlaTitle: "DSR Statutory SLA Request Tracker",
    statutoryWindow: "Statutory Response Window: 30 Days (DPDP Rules)",
    ticketIdHeader: "Ticket ID",
    requestTypeHeader: "Request Type",
    submittedOnHeader: "Submitted On",
    slaDeadlineHeader: "SLA Deadline",
    
    // Decision Hub
    noticeId: "Notice ID",
    dpdpVerified: "DPDP Verified Fiduciary",
    decisionHubTitle: "Consent Request Decision Hub",
    decisionHubSub: "Review data processing details requested by Data Fiduciary. Customize granular attributes below before granting consent.",
    selectedScope: "SELECTED SCOPE",
    attributesSelected: "Attributes",
    specifiedPurpose: "SPECIFIED PURPOSE OF DATA PROCESSING",
    granularAttributes: "Granular Data Attributes Requested",
    selectAllOptional: "Select All Optional",
    deselectAllOptional: "Deselect Optional",
    mandatoryBadge: "MANDATORY",
    sensitiveBadge: "SENSITIVE",
    optionalRemarkLabel: "Optional Consent Condition / Data Principal Remark:",
    optionalRemarkPlaceholder: "e.g. Valid only for 2026 placement drive. Do not share with third-party agencies.",
    grantConsentBtn: "Grant Selected Consent",
    denyConsentBtn: "Deny Request",
    
    // Sidebar
    noticeComplianceTitle: "Notice & Compliance",
    retentionPeriod: "RETENTION PERIOD",
    dataStorageRegion: "DATA STORAGE REGION",
    dpoOfficer: "DATA PROTECTION OFFICER (DPO)",
    rightToRevoke: "RIGHT TO REVOKE",
    revokeStatutoryText: "Under DPDP Act Section 6(4), you can revoke this consent anytime from your Active Consents tab.",
    inquireDpoBtn: "Inquire / Contact DPO",
    signedArtifactNotice: "Signed Artifact: Your consent decision is cryptographically signed and recorded in the audit trail.",
    
    // Active Consents
    activeConsentsTitle: "Active Given Consents",
    activeConsentsSub: "Manage your active data permissions. You have the statutory right under Section 6(4) of the DPDP Act 2023 to withdraw or revoke consent at any time.",
    revokeBtn: "Revoke Consent",
    fileGrievanceBtn: "File Grievance / Rights Request",
    grantedOn: "Granted On",
    expiresOn: "Expires On",
    receiptHashLabel: "Receipt Hash",
    grantedAttrs: "Granted Attributes",
    deniedAttrs: "Denied Attributes",
    
    // Audit Log
    auditTrailTitle: "Compliance Audit Trail",
    auditTrailSub: "Immutable chronological log tracking all consent grants, revocations, and statutory DPO requests under the DPDP Act 2023.",
    actionHeader: "Action / Event",
    fiduciaryHeader: "Data Fiduciary",
    detailsHeader: "Details / Scope",
    ipAddressHeader: "IP Address",
    timestampHeader: "Timestamp (UTC)",
    statusHeader: "Status",
    
    // Modals
    receiptModalTitle: "Digital Consent Receipt Artifact",
    receiptModalSub: "Cryptographically generated JSON consent receipt under DPDP Act 2023 standards.",
    downloadJsonBtn: "Download JSON Receipt",
    closeBtn: "Close",
    grievanceModalTitle: "DPO Grievance & Rights Redressal",
    grievanceModalSub: "Exercise your statutory rights under Sections 11-14 of the DPDP Act 2023.",
    grievanceTypeLabel: "Request / Grievance Type",
    descriptionLabel: "Details of Grievance / Request",
    submitGrievanceBtn: "Submit Statutory Request to DPO"
  },
  
  hi: {
    portalTitle: "डेटा प्रिंसिपल सहमति प्रबंधक",
    portalSubtitle: "DPDP अधिनियम 2023 अनुपालक • व्यक्तिगत गोपनीयता नियंत्रण",
    statutoryBadge: "DPDP धारा 5(3) जनादेश • 22 भारतीय भाषाएं",
    navIncoming: "आगमन अनुरोध",
    navDecisionHub: "निर्णय केंद्र",
    navActiveConsents: "सक्रिय सहमतियां",
    navAuditTrail: "ऑडिट ट्रेल",
    navDataRights: "डेटा अधिकार (धारा 11-14)",
    resetDemo: "डेमो रीसेट करें",
    
    dsrTitle: "वैधानिक डेटा विषय अधिकार (DSR) पोर्टल",
    dsrSub: "DPDP अधिनियम 2023 के तहत डेटा विलोपन (धारा 12), डेटा संशोधन (धारा 11), और नामांकित व्यक्ति (धारा 14) के अपने कानूनी अधिकारों का प्रयोग करें।",
    tabErasure: "विलोपन का अधिकार (धारा 12)",
    tabCorrection: "संशोधन का अधिकार (धारा 11)",
    tabNomination: "नामांकन का अधिकार (धारा 14)",
    tabDsrTracker: "DSR अनुरोध ट्रैकर",
    erasureWizardTitle: "डेटा विलोपन अनुरोध विज़ार्ड",
    correctionFormTitle: "व्यक्तिगत डेटा संशोधन अनुरोध",
    nominationTitle: "नामित वैधानिक नामांकित व्यक्ति",
    updateNomineeBtn: "नामांकित व्यक्ति विवरण अपडेट करें",
    selectFiduciaryLabel: "लक्ष्य डेटा फिडुशरी चुनें:",
    erasureScopeLabel: "विलोपन दायरा:",
    erasureReasonLabel: "विलोपन अनुरोध का वैधानिक कारण / आधार:",
    legalImpactDisclaimer: "कानूनी प्रभाव (धारा 12(3)): इस अनुरोध की प्राप्ति पर, डेटा फिडुशरी कानून द्वारा व्यक्तिगत डेटा मिटाने और 30 दिनों के भीतर डेटा हटाने के लिए अपने तृतीय-पक्ष डेटा प्रोसेसर्स को निर्देश देने के लिए बाध्य है।",
    submitErasureBtn: "वैधानिक विलोपन अनुरोध सबमिट करें (धारा 12)",
    attributeToCorrectLabel: "संशोधित करने के लिए डेटा विशेषता:",
    currentInaccurateLabel: "वर्तमान (अशुद्ध) मूल्य:",
    newCorrectedLabel: "नया संशोधित मूल्य:",
    correctionReasonLabel: "संशोधन का कारण / सहायक प्रमाण विवरण:",
    submitCorrectionBtn: "डेटा संशोधन टिकट सबमिट करें (धारा 11)",
    sec14Protection: "धारा 14 कानूनी सुरक्षा: डेटा प्रिंसिपल की मृत्यु या अक्षमता की स्थिति में, नामित व्यक्ति सहमति प्रबंधित करने या वापस लेने के अधिकार का प्रयोग करेगा।",
    dsrSlaTitle: "DSR वैधानिक SLA अनुरोध ट्रैकर",
    statutoryWindow: "वैधानिक प्रतिक्रिया समय सीमा: 30 दिन (DPDP नियम)",
    ticketIdHeader: "टिकट आईडी",
    requestTypeHeader: "अनुरोध प्रकार",
    submittedOnHeader: "सबमिट करने की तिथि",
    slaDeadlineHeader: "SLA समय सीमा",
    
    noticeId: "नोटिस आईडी",
    dpdpVerified: "DPDP सत्यापित फिडुशरी",
    decisionHubTitle: "सहमति अनुरोध निर्णय केंद्र",
    decisionHubSub: "डेटा फिडुशरी द्वारा अनुरोधित डेटा प्रोसेसिंग विवरण की समीक्षा करें। सहमति देने से पहले नीचे दिए गए घटकों को कस्टमाइज़ करें।",
    selectedScope: "चयनित दायरा",
    attributesSelected: "विशेषताएं",
    specifiedPurpose: "डेटा प्रोसेसिंग का निर्दिष्ट उद्देश्य",
    granularAttributes: "अनुरोधित विस्तृत डेटा विशेषताएं",
    selectAllOptional: "सभी वैकल्पिक चुनें",
    deselectAllOptional: "वैकल्पिक हटाएं",
    mandatoryBadge: "अनिवार्य",
    sensitiveBadge: "संवेदनशील",
    optionalRemarkLabel: "वैकल्पिक सहमति शर्त / डेटा प्रिंसिपल टिप्पणी:",
    optionalRemarkPlaceholder: "उदा. केवल 2026 प्लेसमेंट ड्राइव के लिए वैध। तृतीय-पक्ष एजेंसियों के साथ साझा न करें।",
    grantConsentBtn: "चयनित सहमति प्रदान करें",
    denyConsentBtn: "अनुरोध अस्वीकार करें",
    
    noticeComplianceTitle: "नोटिस एवं अनुपालन",
    retentionPeriod: "डेटा प्रतिधारण अवधि",
    dataStorageRegion: "डेटा भंडारण क्षेत्र",
    dpoOfficer: "डेटा संरक्षण अधिकारी (DPO)",
    rightToRevoke: "वापस लेने का अधिकार",
    revokeStatutoryText: "DPDP अधिनियम की धारा 6(4) के तहत, आप किसी भी समय अपनी सक्रिय सहमतियां टैब से इस सहमति को वापस ले सकते हैं।",
    inquireDpoBtn: "DPO से पूछताछ / संपर्क करें",
    signedArtifactNotice: "हस्ताक्षरित कलाकृति: आपका सहमति निर्णय क्रिप्टोग्राफिक रूप से हस्ताक्षरित और ऑडिट ट्रेल में दर्ज है।",
    
    activeConsentsTitle: "सक्रिय दी गई सहमतियां",
    activeConsentsSub: "अपनी सक्रिय डेटा अनुमतियों को प्रबंधित करें। आपके पास DPDP अधिनियम 2023 की धारा 6(4) के तहत किसी भी समय सहमति वापस लेने का वैधानिक अधिकार है।",
    revokeBtn: "सहमति वापस लें",
    fileGrievanceBtn: "शिकायत दर्ज करें / अधिकार अनुरोध",
    grantedOn: "प्रदान की तिथि",
    expiresOn: "समाप्ति तिथि",
    receiptHashLabel: "रसीद हैश",
    grantedAttrs: "प्रदत्त विशेषताएं",
    deniedAttrs: "अस्वीकृत विशेषताएं",
    
    auditTrailTitle: "अनुपालन ऑडिट ट्रेल",
    auditTrailSub: "DPDP अधिनियम 2023 के तहत सभी सहमति अनुदान, रद्दीकरण और वैधानिक DPO अनुरोधों को ट्रैक करने वाला अपरिवर्तनीय ऑडिट लॉग।",
    actionHeader: "कार्रवाई / घटना",
    fiduciaryHeader: "डेटा फिडुशरी",
    detailsHeader: "विवरण / दायरा",
    ipAddressHeader: "आईपी पता",
    timestampHeader: "समय (UTC)",
    statusHeader: "स्थिति",
    
    receiptModalTitle: "डिजिटल सहमति रसीद कलाकृति",
    receiptModalSub: "DPDP अधिनियम 2023 मानकों के तहत क्रिप्टोग्राफिक रूप से उत्पन्न JSON सहमति रसीद।",
    downloadJsonBtn: "JSON रसीद डाउनलोड करें",
    closeBtn: "बंद करें",
    grievanceModalTitle: "DPO शिकायत और अधिकार निवारण",
    grievanceModalSub: "DPDP अधिनियम 2023 की धारा 11-14 के तहत अपने वैधानिक अधिकारों का प्रयोग करें।",
    grievanceTypeLabel: "अनुरोध / शिकायत का प्रकार",
    descriptionLabel: "शिकायत / अनुरोध का विवरण",
    submitGrievanceBtn: "DPO को वैधानिक अनुरोध सबमिट करें"
  },
  
  ta: {
    portalTitle: "தரவு முதன்மையாளர் சம்மத மேலாளர்",
    portalSubtitle: "DPDP சட்டம் 2023 இணக்கம் • தனிநபர் தனியுரிமை கட்டுப்பாடு",
    statutoryBadge: "DPDP பிரிவு 5(3) ஆணை • 22 இந்திய மொழிகள்",
    navIncoming: "உள்வரும் கோரிக்கை",
    navDecisionHub: "முடிவு மையம்",
    navActiveConsents: "செயலில் உள்ள சம்மதங்கள்",
    navAuditTrail: "தணிக்கை பாதை",
    navDataRights: "தரவு உரிமைகள் (பிரிவு 11-14)",
    resetDemo: "டெமோ மீட்டமை",
    
    dsrTitle: "தரவு உரிமைகள் (DSR) தளம்",
    dsrSub: "DPDP சட்டம் 2023 இன் கீழ் தரவு நீக்கம் (பிரிவு 12), திருத்தம் (பிரிவு 11) மற்றும் நியமனம் (பிரிவு 14) உரிமைகளைப் பயன்படுத்தவும்.",
    tabErasure: "நீக்கும் உரிமை (பிரிவு 12)",
    tabCorrection: "திருத்தும் உரிமை (பிரிவு 11)",
    tabNomination: "நியமன உரிமை (பிரிவு 14)",
    tabDsrTracker: "DSR கோரிக்கை கண்காணிப்பு",
    
    noticeId: "அறிவிப்பு ஐடி",
    dpdpVerified: "DPDP சரிபார்க்கப்பட்ட அமைப்பாளர்",
    decisionHubTitle: "சம்மதக் கோரிக்கை முடிவு மையம்",
    decisionHubSub: "தரவு செயலாக்க விவரங்களை மதிப்பாய்வு செய்து, சம்மதம் அளிப்பதற்கு முன் விருப்பங்களை மாற்றியமைக்கவும்.",
    selectedScope: "தேர்ந்தெடுக்கப்பட்ட எல்லை",
    attributesSelected: "கூறுகள்",
    specifiedPurpose: "குறிப்பிட்ட தரவு செயலாக்க நோக்கம்",
    granularAttributes: "கோரப்பட்ட நுணுக்கமான தரவு கூறுகள்",
    selectAllOptional: "அனைத்து விருப்பத்தையும் தேர்ந்தெடு",
    deselectAllOptional: "விருப்பத்தை நீக்கு",
    mandatoryBadge: "கட்டாயம்",
    sensitiveBadge: "உணர்திறன் மிக்கது",
    grantConsentBtn: "தேர்ந்தெடுக்கப்பட்ட சம்மதத்தை வழங்கு",
    denyConsentBtn: "கோரிக்கையை நிராகரி",
    
    activeConsentsTitle: "செயலில் உள்ள சம்மதங்கள்",
    activeConsentsSub: "உங்கள் செயலில் உள்ள சம்மதங்களை நிர்வகிக்கவும். DPDP சட்டப் பிரிவு 6(4) இன் கீழ் எந்த நேரத்திலும் சம்மதத்தை திரும்பப் பெற உரிமை உண்டு.",
    revokeBtn: "சம்மதத்தை திரும்பப் பெறு",
    fileGrievanceBtn: "புகார் அளிக்கவும்"
  },

  bn: {
    portalTitle: "ডাটা প্রিন্সিপাল সম্মতি ম্যানেজার",
    portalSubtitle: "DPDP আইন ২০২৩ অনুগত • ব্যক্তিগত গোপনীয়তা নিয়ন্ত্রণ",
    statutoryBadge: "DPDP ধারা ৫(৩) নির্দেশক • ২২টি ভারতীয় ভাষা",
    navIncoming: "আগমন অনুরোধ",
    navDecisionHub: "সিদ্ধান্ত কেন্দ্র",
    navActiveConsents: "সক্রিয় সম্মতিসমূহ",
    navAuditTrail: "অডিট ট্রেইল",
    navDataRights: "ডাটা অধিকার (ধারা ১১-১৪)",
    dsrTitle: "সংবিধিবদ্ধ ডাটা বিষয় অধিকার (DSR) পোর্টাল",
    dsrSub: "DPDP আইন ২০২৩ এর অধীনে ডাটা মোছা (ধারা ১২), ডাটা সংশোধন (ধারা ১১) এবং মনোনীত ব্যক্তি (ধারা ১৪) অধিকার ব্যবহার করুন।",
    tabErasure: "মোছার অধিকার (ধারা ১২)",
    tabCorrection: "সংশোধনের অধিকার (ধারা ১১)",
    tabNomination: "মনোনয়নের অধিকার (ধারা ১৪)",
    tabDsrTracker: "DSR ট্র্যাকার",
    decisionHubTitle: "সম্মতি অনুরোধ সিদ্ধান্ত কেন্দ্র",
    specifiedPurpose: "ডাটা প্রসেসিংয়ের নির্দিষ্ট উদ্দেশ্য",
    granularAttributes: "অনুরোধ করা ডাটা বৈশিষ্ট্যসমূহ",
    grantConsentBtn: "অনুমোদন দিন",
    denyConsentBtn: "প্রত্যাখ্যান করুন"
  },

  te: {
    portalTitle: "డేటా ప్రిన్సిపల్ సమ్మతి మేనేజర్",
    portalSubtitle: "DPDP చట్టం 2023 కట్టుబడి • వ్యక్తిగత గోప్యతా నియంత్రణ",
    statutoryBadge: "DPDP సెక్షన్ 5(3) ఆదేశం • 22 భారతీయ భాషలు",
    navIncoming: "ఇన్‌కమింగ్ అభ్యర్థన",
    navDecisionHub: "నిర్ణయ కేంద్రం",
    navActiveConsents: "సక్రియ సమ్మతులు",
    navAuditTrail: "ఆడిట్ ట్రయల్",
    navDataRights: "డేటా హక్కులు (సెక్షన్ 11-14)",
    dsrTitle: "చట్టబద్ధమైన డేటా హక్కుల (DSR) పోర్టల్",
    tabErasure: "తొలగింపు హక్కు (సెక్షన్ 12)",
    tabCorrection: "సవరణ హక్కు (సెక్షన్ 11)",
    tabNomination: "నామినేషన్ హక్కు (సెక్షన్ 14)",
    tabDsrTracker: "DSR ట్రాకర్",
    decisionHubTitle: "సమ్మతి అభ్యర్థన నిర్ణయ కేంద్రం",
    specifiedPurpose: "డేటా ప్రాసెసింగ్ యొక్క నిర్దిష్ట ఉద్దేశ్యం",
    grantConsentBtn: "సమ్మతి ఇవ్వండి",
    denyConsentBtn: "తిరస్కరించండి"
  },

  gu: {
    portalTitle: "ડેટા પ્રિન્સિપલ સંમતિ મેનેજર",
    portalSubtitle: "DPDP એક્ટ 2023 સુસંગત • વ્યક્તિગત ગોપનીયતા નિયંત્રણ",
    statutoryBadge: "DPDP કલમ 5(3) આદેશ • 22 ભારતીય ભાષાઓ",
    navIncoming: "આવનારી વિનંતી",
    navDecisionHub: "નિર્ણય કેન્દ્ર",
    navActiveConsents: "સક્રિય સંમતિઓ",
    navAuditTrail: "ઓડિટ ટ્રેઇલ",
    navDataRights: "ડેટા અધિકારો (કલમ 11-14)",
    dsrTitle: "વૈધાનિક ડેટા સબ્જેક્ટ રાઇટ્સ (DSR) પોર્ટલ",
    tabErasure: "નાબૂદીનો અધિકાર (કલમ 12)",
    tabCorrection: "સુધારણાનો અધિકાર (કલમ 11)",
    tabNomination: "નામાંકનનો અધિકાર (કલમ 14)",
    tabDsrTracker: "DSR ટ્રેકર",
    decisionHubTitle: "સંમતિ વિનંતી નિર્ણય કેન્દ્ર",
    specifiedPurpose: "ડેટા પ્રોસેસિંગનો નિશ્ચિત હેતુ",
    grantConsentBtn: "સંમતિ આપો",
    denyConsentBtn: "અસ્વીકાર કરો"
  },

  mr: {
    portalTitle: "डेटा प्रिन्सिपल संमती व्यवस्थापक",
    portalSubtitle: "DPDP कायदा २०२३ सुसंगत • वैयक्तिक गोपनीयता नियंत्रण",
    statutoryBadge: "DPDP कलम ५(३) आदेश • २२ भारतीय भाषा",
    navIncoming: "आगमन विनंती",
    navDecisionHub: "निर्णय केंद्र",
    navActiveConsents: "सक्रिय संमती",
    navAuditTrail: "ऑडिट ट्रेल",
    navDataRights: "डेटा अधिकार (कलम ११-१४)",
    dsrTitle: "वैधानिक डेटा विषय अधिकार (DSR) पोर्टल",
    tabErasure: "वगळण्याचा अधिकार (कलम १२)",
    tabCorrection: "दुरुस्तीचा अधिकार (कलम ११)",
    tabNomination: "नाव नोंदवण्याचा अधिकार (कलम १४)",
    tabDsrTracker: "DSR ट्रॅकर",
    decisionHubTitle: "संमती विनंती निर्णय केंद्र",
    specifiedPurpose: "डेटा प्रक्रियेचा निर्दिष्ट उद्देश",
    grantConsentBtn: "संमती द्या",
    denyConsentBtn: "नकार द्या"
  },

  kn: {
    portalTitle: "ಡೇಟಾ ಪ್ರಿನ್ಸಿಪಾಲ್ ಸಮ್ಮತಿ ಮ್ಯಾನೇಜರ್",
    portalSubtitle: "DPDP ಕಾಯಿದೆ 2023 ಅನುಸರಣೆ • ವೈಯಕ್ತಿಕ ಗೌಪ್ಯತೆ ನಿಯಂತ್ರಣ",
    navIncoming: "ಆಗಮನ ವಿನಂತಿ",
    navDecisionHub: "ನಿರ್ಧಾರ ಕೇಂದ್ರ",
    navActiveConsents: "ಸಕ್ರಿಯ ಸಮ್ಮತಿಗಳು",
    navAuditTrail: "ಆಡಿಟ್ ಟ್ರೇಲ್",
    navDataRights: "ಡೇಟಾ ಹಕ್ಕುಗಳು (ವಿಭಾಗ 11-14)",
    dsrTitle: "ಶಾಸನಬದ್ಧ ಡೇಟಾ ವಿಷಯ ಹಕ್ಕುಗಳ (DSR) ಪೋರ್ಟಲ್",
    tabErasure: "ಅಳಿಸುವ ಹಕ್ಕು (ವಿಭಾಗ 12)",
    tabCorrection: "ತಿದ್ದುಪಡಿ ಹಕ್ಕು (ವಿಭಾಗ 11)",
    tabNomination: "ನಾಮನಿರ್ದೇಶನ ಹಕ್ಕು (ವಿಭಾಗ 14)",
    tabDsrTracker: "DSR ಟ್ರ್ಯಾಕರ್",
    decisionHubTitle: "ಸಮ್ಮತಿ ವಿನಂತಿ ನಿರ್ಧಾರ ಕೇಂದ್ರ",
    specifiedPurpose: "ಡೇಟಾ ಪ್ರಕ್ರಿಯೆಯ ನಿರ್ದಿಷ್ಟ ಉದ್ದೇಶ",
    grantConsentBtn: "ಸಮ್ಮತಿ ನೀಡಿ",
    denyConsentBtn: "ನಿರಾಕರಿಸಿ"
  },

  ml: {
    portalTitle: "ഡാറ്റാ പ്രിൻസിപ്പൽ സമ്മത മാനേജർ",
    portalSubtitle: "DPDP ആക്റ്റ് 2023 അനുസൃതമായത് • സ്വകാര്യതാ നിയന്ത്രണം",
    navIncoming: "വരുന്ന അഭ്യർത്ഥന",
    navDecisionHub: "തീരുമാന കേന്ദ്രം",
    navActiveConsents: "സജീവ സമ്മതങ്ങൾ",
    navAuditTrail: "ഓഡിറ്റ് ട്രെയിൽ",
    navDataRights: "ഡാറ്റാ അവകാശങ്ങൾ (സെക്ഷൻ 11-14)",
    dsrTitle: "നിയമപരമായ ഡാറ്റാ അവകാശങ്ങൾ (DSR) പോർട്ടൽ",
    tabErasure: "നീക്കം ചെയ്യാനുള്ള അവകാശം (സെക്ഷൻ 12)",
    tabCorrection: "തിരുത്താനുള്ള അവകാശം (സെക്ഷൻ 11)",
    tabNomination: "നാമനിർദ്ദേശ അവകാശം (സെക്ഷൻ 14)",
    tabDsrTracker: "DSR ട്രാക്കർ",
    decisionHubTitle: "സമ്മത അഭ്യർത്ഥന തീരുമാന കേന്ദ്രം",
    specifiedPurpose: "ഡാറ്റാ പ്രോസസ്സിംഗിൻ്റെ നിർദ്ദിഷ്ട ലക്ഷ്യം",
    grantConsentBtn: "സമ്മതം നൽകുക",
    denyConsentBtn: "നിരസിക്കുക"
  },

  pa: {
    portalTitle: "ਡਾਟਾ ਪ੍ਰਿੰਸੀਪਲ ਸਹਿਮਤੀ ਮੈਨੇਜਰ",
    portalSubtitle: "DPDP ਐਕਟ 2023 ਦੀ ਪਾਲਣਾ • ਨਿੱਜੀ ਗੋਪਨੀਯਤਾ ਨਿਯੰਤਰਣ",
    navIncoming: "ਆਉਣ ਵਾਲੀ ਬੇਨਤੀ",
    navDecisionHub: "ਫੈਸਲਾ ਕੇਂਦਰ",
    navActiveConsents: "ਸਰਗਰਮ ਸਹਿਮਤੀਆਂ",
    navAuditTrail: "ਆਡਿਟ ਟ੍ਰੇਲ",
    navDataRights: "ਡਾਟਾ ਅਧਿਕਾਰ (ਸੈਕਸ਼ਨ 11-14)",
    dsrTitle: "ਕਾਨੂੰਨੀ ਡਾਟਾ ਅਧਿਕਾਰ (DSR) ਪੋਰਟਲ",
    tabErasure: "ਮਿਟਾਉਣ ਦਾ ਅਧਿਕਾਰ (ਸੈਕਸ਼ਨ 12)",
    tabCorrection: "ਸੋਧ ਦਾ ਅਧਿਕਾਰ (ਸੈਕਸ਼ਨ 11)",
    tabNomination: "ਨਾਮਜ਼ਦਗੀ ਦਾ ਅਧਿਕਾਰ (ਸੈਕਸ਼ਨ 14)",
    tabDsrTracker: "DSR ਟਰੈਕਰ",
    decisionHubTitle: "ਸਹਿਮਤੀ ਬੇਨਤੀ ਫੈਸਲਾ ਕੇਂਦਰ",
    specifiedPurpose: "ਡਾਟਾ ਪ੍ਰੋਸੈਸਿੰਗ ਦਾ ਨਿਰਧਾਰਤ ਉਦੇਸ਼",
    grantConsentBtn: "ਸਹਿਮਤੀ ਦਿਓ",
    denyConsentBtn: "ਇਨਕਾਰ ਕਰੋ"
  },

  or: {
    portalTitle: "ଡାଟା ପ୍ରିନ୍ସିପାଲ ସମ୍ମତି ମ୍ୟାନେଜର",
    portalSubtitle: "DPDP ଅଧିନିୟମ ୨୦୨୩ ଅନୁପାଳନ",
    navIncoming: "ଆଗମନ ଅନୁରୋଧ",
    navDecisionHub: "ନିଷ୍ପତ୍ତି କେନ୍ଦ୍ର",
    navActiveConsents: "ସକ୍ରିୟ ସମ୍ମତି",
    navAuditTrail: "ଅଡିଟ୍ ଟ୍ରେଲ୍",
    navDataRights: "ଡାଟା ଅଧିକାର (ଧାରା ୧୧-୧୪)",
    dsrTitle: "ଆଇନଗତ ଡାଟା ବିଷୟ ଅଧିକାର (DSR) ପୋର୍ଟାଲ୍",
    tabErasure: "ଲିଭାଇବାର ଅଧିକାର (ଧାରା ୧୨)",
    tabCorrection: "ସଂଶୋଧନ ଅଧିକାର (ଧାରା ୧୧)",
    tabNomination: "ମନୋନୟନ ଅଧିକାର (ଧାରା ୧୪)",
    tabDsrTracker: "DSR ଟ୍ରାକର",
    decisionHubTitle: "ସମ୍ମତି ଅନୁରୋଧ ନିଷ୍ପତ୍ତି କେନ୍ଦ୍ର",
    grantConsentBtn: "ସମ୍ମତି ଦିଅନ୍ତୁ",
    denyConsentBtn: "ଅସ୍ବୀକାର କରନ୍ତୁ"
  },

  ur: {
    portalTitle: "ڈیٹا پرنسپل رضامندی منیجر",
    portalSubtitle: "DPDP ایکٹ 2023 کے مطابق • انفرادی پرائیویسی کنٹرول",
    navIncoming: "موصولہ درخواست",
    navDecisionHub: "فیصلہ مرکز",
    navActiveConsents: "فعال رضامندیاں",
    navAuditTrail: "آڈٹ ٹریل",
    navDataRights: "ڈیٹا حقوق (دفعہ 11-14)",
    dsrTitle: "قانونی ڈیٹا حقوق (DSR) پورٹل",
    tabErasure: "حذف کرنے کا حق (دفعہ 12)",
    tabCorrection: "تصحیح کا حق (دفعہ 11)",
    tabNomination: "نامزدگی کا حق (دفعہ 14)",
    tabDsrTracker: "DSR ٹریکر",
    decisionHubTitle: "رضامندی کی درخواست کا فیصلہ مرکز",
    grantConsentBtn: "رضامندی دیں",
    denyConsentBtn: "مسترد کریں"
  },

  as: {
    portalTitle: "ডাটা প্ৰিন্সিপাল সন্মতি মেনেজাৰ",
    navIncoming: "আগমন অনুৰোধ",
    navDecisionHub: "সিদ্ধান্ত কেন্দ্ৰ",
    navActiveConsents: "সক্ৰিয় সন্মতিসমূহ",
    navAuditTrail: "অডিট ট্ৰেইল",
    navDataRights: "ডাটা অধিকাৰ (ধাৰা ১১-১৪)",
    dsrTitle: "আইনী ডাটা বিষয় অধিকাৰ (DSR) পৰ্টেল",
    tabErasure: "বিলোপৰ অধিকাৰ (ধাৰা ১২)",
    tabCorrection: "সংশোধনৰ অধিকাৰ (ধাৰা ১১)",
    tabNomination: "মনোনয়নৰ অধিকাৰ (ধাৰা ১৪)",
    grantConsentBtn: "সন্মতি প্ৰদান কৰক",
    denyConsentBtn: "প্রত্যাখ্যান কৰক"
  },

  sa: {
    portalTitle: "दत्त-स्वामी-सम्मति-प्रबन्धकः",
    navIncoming: "आगता प्रार्थना",
    navDecisionHub: "निर्णयकेन्द्रम्",
    navActiveConsents: "सक्रियाः सम्मतयः",
    navAuditTrail: "अङ्केक्षणपथः",
    navDataRights: "दत्ताधिकाराः (धारा ११-१४)",
    dsrTitle: "वैधानिकदत्ताधिकार (DSR) द्वारम्",
    tabErasure: "मार्जनाधिकारः (धारा १२)",
    tabCorrection: "शोधनाधिकारः (धारा ११)",
    tabNomination: "नामान्कनाधिकारः (धारा १४)",
    grantConsentBtn: "सम्मतिं यच्छतु",
    denyConsentBtn: "अस्वीकरोतु"
  },

  mai: {
    portalTitle: "डेटा प्रिंसिपल सहमति प्रबंधक",
    navIncoming: "आगमन अनुरोध",
    navDecisionHub: "निर्णय केंद्र",
    navActiveConsents: "सक्रिय सहमति",
    navAuditTrail: "ऑडिट ट्रेल",
    navDataRights: "डेटा अधिकार (धारा 11-14)",
    dsrTitle: "वैधानिक डेटा विषय अधिकार (DSR) पोर्टल",
    grantConsentBtn: "सहमति दीअ",
    denyConsentBtn: "अस्वीकार करू"
  },

  ne: {
    portalTitle: "डेटा प्रिन्सिपल सहमति प्रबन्धक",
    navIncoming: "आगमन अनुरोध",
    navDecisionHub: "निर्णय केन्द्र",
    navActiveConsents: "सक्रिय सहमतिहरू",
    navAuditTrail: "अडिट ट्रेल",
    navDataRights: "डेटा अधिकार (दफा ११-१४)",
    dsrTitle: "कानूनी डेटा विषय अधिकार (DSR) पोर्टल",
    tabErasure: "हटाउने अधिकार (दफा १२)",
    tabCorrection: "सच्याउने अधिकार (दफा ११)",
    tabNomination: "मनोनयन अधिकार (दफा १४)",
    grantConsentBtn: "सहमति दिनुहोस्",
    denyConsentBtn: "अस्वीकार गर्नुहोस्"
  },

  kok: {
    portalTitle: "डेटा प्रिन्सिपल संमती व्यवस्थापक",
    navIncoming: "आयिल्ली विनंती",
    navDecisionHub: "निर्णय केंद्र",
    navActiveConsents: "सक्रिय संमती",
    navDataRights: "डेटा हक्क (कलम ११-१४)",
    grantConsentBtn: "संमती दियात",
    denyConsentBtn: "नाकारात"
  },

  sd: {
    portalTitle: "ڊيٽا پرنسپال رضامندي مئنيجر",
    navIncoming: "آمد جي درخواست",
    navDecisionHub: "فيصلي جو مرڪز",
    navActiveConsents: "فعال رضامنديون",
    navDataRights: "ڊيٽا حق (دفعو 11-14)",
    grantConsentBtn: "رضامندي ڏيو",
    denyConsentBtn: "رد ڪريو"
  },

  doi: {
    portalTitle: "डेटा प्रिंसिपल सहमति प्रबंधक",
    navIncoming: "आने आली मंग",
    navDecisionHub: "फैसला केंद्र",
    navActiveConsents: "सक्रिय सहमतियां",
    navDataRights: "डेटा अधिकार (धारा 11-14)",
    grantConsentBtn: "सहमति देओ",
    denyConsentBtn: "रद्द करो"
  },

  mni: {
    portalTitle: "দেতা প্রিন্সিপাল অয়াবা ম্যানেজর",
    navIncoming: "লাকপা অপাম্বা",
    navDecisionHub: "ৱারেপ কাংবু",
    navActiveConsents: "অয়াবা পীরবা",
    navDataRights: "দেতা হক (সেকসন ১১-১৪)",
    grantConsentBtn: "অয়াবা પીરો",
    denyConsentBtn: "য়াদবা"
  },

  brx: {
    portalTitle: "देथा प्रिनसिपाल गनायथि मेनेजार",
    navIncoming: "फैनाय बिथोन",
    navDecisionHub: "थांखि फजि",
    navActiveConsents: "मावफुं गनायथिफोर",
    navDataRights: "देथा हखफोर (सेकसन 11-14)",
    grantConsentBtn: "गनायथि होनाय",
    denyConsentBtn: "नागारनाय"
  },

  sat: {
    portalTitle: " digital data manager",
    navIncoming: " ᱦᱤᱡᱩᱜ ᱠᱟᱱ request",
    navDecisionHub: " ᱠᱟᱹᱢᱤ ᱴᱷᱟᱶ",
    navActiveConsents: " ᱪᱟᱹᱞᱩ ᱥᱟᱹᱠᱷᱤ",
    navDataRights: " ᱠᱟᱛᱷᱟ ᱦᱚᱠ (section 11-14)",
    grantConsentBtn: " ᱥᱟᱹᱠᱷᱤ ᱮᱢ",
    denyConsentBtn: " ᱵᱟᱝ ᱮᱢ"
  }
};

// Helper function to fetch localized string with fallback to English
export const getTranslation = (langCode, key) => {
  const dictionary = UI_TRANSLATIONS[langCode] || UI_TRANSLATIONS.en;
  return dictionary[key] || UI_TRANSLATIONS.en[key] || key;
};

// Translate attribute names dynamically into target language
export const translateAttributeName = (name, langCode) => {
  if (!name || langCode === 'en') return name;
  const match = ATTRIBUTE_TRANSLATIONS[name];
  if (match && match[langCode]) {
    return match[langCode];
  }
  return name;
};

// Translate attribute descriptions dynamically into target language
export const translateAttributeDesc = (desc, langCode) => {
  if (!desc || langCode === 'en') return desc;
  const match = DESCRIPTION_TRANSLATIONS[desc];
  if (match && match[langCode]) {
    return match[langCode];
  }
  return desc;
};

// Translate email body dynamically into target language
export const translateEmailBody = (bodyText, langCode, dpName = "Data Principal") => {
  if (!bodyText || langCode === 'en') return bodyText;
  
  const translations = {
    hi: `प्रिय ${dpName},\n\nडेटा फिडुशरी डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 के तहत आपकी व्यक्तिगत जानकारी को संसाधित करने के लिए आपकी स्पष्ट सहमति का अनुरोध करता है।\n\nकृपया अपनी गोपनीयता प्राथमिकताओं की समीक्षा करें और सहमति प्रबंधक पोर्टल के माध्यम से अपनी सहमति दें या अस्वीकार करें।\n\nधन्यवाद एवं सादर,\nप्राइवेसी अनुपालन टीम`,
    ta: `அன்பான ${dpName},\n\nடிஜிட்டல் தனிநபர் தரவு பாதுகாப்பு (DPDP) சட்டம் 2023 இன் கீழ் உங்கள் தனிப்பட்ட தரவைச் செயலாக்க தரவு அமைப்பாளர் உங்கள் சம்மதத்தைக் கோருகிறார்.\n\nதயவுசெய்து உங்கள் தனியுரிமை விருப்பங்களை மதிப்பாய்வு செய்து சம்மத மேலாளர் மூலம் சம்மதம் வழங்கவும்.\n\nநன்றி,\nதனியுரிமை இணக்கக் குழு`,
    bn: `প্রিয় ${dpName},\n\nডিজিটাল ব্যক্তিগত ডাটা সুরক্ষা (DPDP) আইন ২০২৩ এর অধীনে ডাটা ফিডুশিয়ারি আপনার ব্যক্তিগত তথ্য প্রসেস করার জন্য আপনার স্পষ্ট সম্মতি অনুরোধ করছে।\n\nঅনুগ্রহ করে আপনার গোপনীয়তা পছন্দগুলি পর্যালোচনা করুন এবং সম্মতি ম্যানেজার পোর্টালের মাধ্যমে সিদ্ধান্ত নিন।\n\nধন্যবাদান্তে,\nগোপনীয়তা কমপ্লায়েন্স টিম`,
    mr: `प्रिय ${dpName},\n\nडिजिटल वैयक्तिक डेटा संरक्षण (DPDP) कायदा २०२३ अंतर्गत डेटा फिड्युशियरी तुमची वैयक्तिक माहिती प्रक्रिया करण्यासाठी तुमच्या स्पष्ट संमतीची विनंती करत आहे.\n\nकृपया तुमच्या गोपनीयता पर्यायांचे पुनरावलोकन करा आणि संमती व्यवस्थापक पोर्टलद्वारे निर्णय घ्या.\n\nधन्यवाद,\nगोपनीयता अनुपालन टीम`,
    te: `ప్రియమైన ${dpName},\n\nడిజిటల్ వ్యక్తిగత డేటా రక్షణ (DPDP) చట్టం 2023 ప్రకారం మీ వ్యక్తిగత డేటాను ప్రాసెస్ చేయడానికి డేటా సంస్థ మీ స్పష్టమైన సమ్మతిని కోరుతోంది.\n\nదయచేసి మీ గోప్యతా ఎంపికలను పరిశీలించి సమ్మతి మేనేజర్ పోర్టల్ ద్వారా నిర్ణయం తీసుకోండి.\n\nధన్యవాదాలు,\nగోప్యతా సమ్మతి బృందం`,
    gu: `પ્રિય ${dpName},\n\nડેટા ફિડ્યુશિયરી ડિજિટલ વ્યક્તિગત ડેટા પ્રોટેક્શન (DPDP) એક્ટ 2023 હેઠળ તમારી વ્યક્તિગત માહિતીની પ્રક્રિયા કરવા માટે તમારી સ્પષ્ટ સંમતિની વિનંતી કરે છે.\n\nકૃપા કરીને તમારી ગોપનીયતા પસંદગીઓની સમીક્ષા કરો અને સંમતિ મેનેજર દ્વારા નિર્ણય લો.\n\nઆભાર,\nપ્રાઇવસી ટીમ`,
    kn: `ಆತ್ಮೀಯ ${dpName},\n\nಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ರಕ್ಷಣೆ (DPDP) ಕಾಯಿದೆ 2023 ರ ಅಡಿಯಲ್ಲಿ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಡೇಟಾ ಫಿಡುಷಿಯರಿ ನಿಮ್ಮ ಸ್ಪಷ್ಟ ಸಮ್ಮತಿಯನ್ನು ವಿನಂತಿಸುತ್ತದೆ.\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಗೌಪ್ಯತೆಯ ಆಯ್ಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಮ್ಮತಿ ಮ್ಯಾನೇಜರ್ ಮೂಲಕ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಿ.\n\nಧನ್ಯವಾದಗಳು,\nಗೌಪ್ಯತೆ ತಂಡ`,
    ml: `പ്രിയപ്പെട്ട ${dpName},\n\nഡിജിറ്റൽ പേഴ്‌സണൽ ഡാറ്റ സംരക്ഷണ (DPDP) ആക്റ്റ് 2023 പ്രകാരം നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങൾ പ്രോസസ്സ് ചെയ്യുന്നതിന് ഡാറ്റാ ഫിഡ്യൂഷ്യറി നിങ്ങളുടെ വ്യക്തമായ സമ്മതം അഭ്യർത്ഥിക്കുന്നു.\n\nനിങ്ങളുടെ സ്വകാര്യതാ മുൻഗണനകൾ അവലോകനം ചെയ്യുക.\n\nനന്ദി,\nപ്രൈവസി ടീം`,
    pa: `ਪਿਆਰੇ ${dpName},\n\nਡਾਟਾ ਫਿਡੂਸ਼ਰੀ ਡਿਜੀਟਲ ਪਰਸਨਲ ਡਾਟਾ ਪ੍ਰੋਟੈਕਸ਼ਨ (DPDP) ਐਕਟ 2023 ਦੇ ਤਹਿਤ ਤੁਹਾਡੀ ਨਿੱਜੀ ਜਾਣਕਾਰੀ ਦੀ ਪ੍ਰਕਿਰਿਆ ਕਰਨ ਲਈ ਤੁਹਾਡੀ ਸਪੱਸ਼ਟ ਸਹਿਮਤੀ ਦੀ ਬੇਨਤੀ ਕਰਦਾ ਹੈ।\n\nਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਗੋਪਨੀਯਤਾ ਪਸੰਦਾਂ ਦੀ ਸਮੀਖਿਆ ਕਰੋ।\n\nਧੰਨਵਾਦ,\nਪ੍ਰਾਈਵੇਸੀ ਟੀਮ`,
    or: `ପ୍ରିୟ ${dpName},\n\nଡିଜିଟାଲ୍ ବ୍ୟକ୍ତିଗତ ଡାଟା ସୁରକ୍ଷା (DPDP) ଅଧିନିୟମ ୨୦୨୩ ଅଧୀନରେ ଡାଟା ଫିଡ୍ୟୁସିଆରୀ ଆପଣଙ୍କ ବ୍ୟକ୍ତିଗତ ସୂଚନା ପ୍ରକ୍ରିୟାକରଣ ପାଇଁ ଆପଣଙ୍କର ସ୍ପଷ୍ଟ ସମ୍ମତି ଅନୁରୋଧ କରୁଛି।\n\nଦୟାକରି ଆପଣଙ୍କର ଗୋପନୀୟତା ପସନ୍ଦ ସମୀକ୍ଷା କରନ୍ତୁ।\n\nଧନ୍ୟବାଦ,\nଗୋପନୀୟତା ଦଳ`,
    ur: `محترم ${dpName}،\n\nڈیٹا فیڈوشری ڈیجیٹل پرسنل ڈیٹا پروٹیکشن (DPDP) ایکٹ 2023 کے تحت آپ کی ذاتی معلومات پروسیس کرنے کے لیے آپ کی واضح رضامندی کی درخواست کرتا ہے۔\n\nبراہ کرم اپنی پرائیویسی ترجیحات کا جائزہ لیں۔\n\nشکریہ،\nپرائیویسی ٹیم`,
    as: `প্ৰিয় ${dpName},\n\nডিজিটেল ব্যক্তিগত ডাটা সুৰক্ষা (DPDP) আইন ২০২৩ ৰ অধীনত ডাটা ফিডিউচিয়াৰীয়ে আপোনাৰ ব্যক্তিগত তথ্য প্ৰক্ৰিয়া কৰিবলৈ স্পষ্ট সন্মতি বিচাৰিছে।\n\nঅনুগ্ৰহ কৰি আপোনাৰ গোপনীয়তা পছন্দসমূহ পৰ্যালোচনা কৰক।\n\nধন্যবাদেৰে,\nগোপনীয়তা দল`,
    sa: `प्रिय ${dpName},\n\nडिजिटल-व्यक्तिगत-दत्त-संरक्षण (DPDP) अधिनियम 2023 अन्तर्गतं डेटा-फिडुशियरी भवतः व्यक्तिगतसूचनायाः प्रक्रियाकरणाय भवतः स्पष्टसम्मतिं याचते।\n\nकृपया स्वकीयगोपनीयताविकल्पान् समीक्षताम्।\n\nसधन्यवादम्,\nगोपनीयतासङ्घः`,
    mai: `प्रिय ${dpName},\n\nडिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 के तहत डेटा फिडुशरी अहाँक व्यक्तिगत जानकारी संसाधित करबाक लेल अहाँक सहमति माँगैत अछि।\n\nकृपया अपन गोपनीयता विकल्पक समीक्षा करू।\n\nधन्यवाद,\nगोपनीयता टीम`,
    ne: `प्रिय ${dpName},\n\nडिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) ऐन २०२३ अन्तर्गत डेटा फिडुसियरीले तपाईंको व्यक्तिगत जानकारी प्रशोधन गर्न तपाईंको स्पष्ट सहमति माग गर्दछ।\n\nकृपया आफ्नो गोपनीयता प्राथमिकताहरू समीक्षा गर्नुहोस्।\n\nधन्यवाद,\nगोपनीयता टोली`,
    kok: `मोगाच्या ${dpName},\n\nडिजिटल वैयक्तिक डेटा संरक्षण (DPDP) कायदो २०२३ अंतर्गत डेटा फिड्युशियरी तुमची वैयक्तिक म्हात्रे प्रक्रीया करपा खातीर तुमची संमती मागता.\n\nदेव बरे करूं,\nगोपनीयता पंगड`,
    sd: `پيارا ${dpName}،\n\nڊيٽا فيڊوشري ڊجيٽل پرسنل ڊيٽا پروٽيڪشن (DPDP) ائڪٽ 2023 تحت توهان جي ذاتي معلومات جي پروسيسنگ لاءِ رضامندي گهري ٿو.\n\nمهرباني ڪري تصديق ڪريو.\n\nمهرباني،\nپرائيويسي ٽيم`,
    doi: `प्रिय ${dpName},\n\nडिजिटल व्यक्तिगत डेटा सुरक्षा (DPDP) एक्ट 2023 दे तहत डेटा फिडुशरी तुंदी व्यक्तिगत जानकारी दी प्रक्रिया लेई तुंदी सहमति मंगदा ए।\n\nकृपा करियै अपनी गोपनीयता विकल्पें दी समीक्षा करो।\n\nधन्यवाद,\nगोपनीयता टीम`,
    mni: `নুংশিরবা ${dpName},\n\nডিজিতেল পার্সোনেল দেতা প্রোতেকসন (DPDP) এক্ত ২০২৩ গী মখাদা নহাগী পার্সোনেল দেতা প্রোসেস তৌনবগীদমক দেতা ফিদ্যুসিয়ারিনা অয়াবা খঙহনবগী থৌরাং তৌরি।\n\nথাগৎচরি,\nপ্রাইভেসি কাংবু`,
    brx: `फोजोबजानाय ${dpName},\n\nडिजिटेल सुबुंफोरनि देथा रैखाथि (DPDP) आइन 2023 नि सिङाव देथा फिडुसियारिया नोंथांनि गावनो गावनि देथाखौ बाहायनायनि गनायथि बिदों।\n\nसाबरायबाय,\nप्राइभेसी हान्जा`,
    sat: `ᱫᱩᱞᱟᱹᱲ ${dpName},\n\n digital personal data protection (DPDP) ᱟᱹᱱ ᱒᱐᱒᱓ ᱞᱮᱠᱟᱛᱮ ᱟᱢᱟᱜ ᱱᱤᱡᱮᱨᱟᱜ ᱠᱟᱛᱷᱟ Processing ᱞᱟᱹᱜᱤᱫ ᱥᱟᱹᱠᱷᱤ ᱠᱷᱚᱡᱚᱜ ᱠᱟᱱᱟ᱾\n\n ᱥᱟᱨᱦᱟᱣ,\n privacy control ᱫᱚᱞ`
  };

  return translations[langCode] || bodyText;
};

// Translate purpose text dynamically into target language
export const translatePurpose = (purposeText, langCode) => {
  if (!purposeText || langCode === 'en') return purposeText;

  if (langCode === 'hi') {
    if (purposeText.includes("PF") || purposeText.includes("Provident Fund")) {
      return "ईपीएफओ दिशानिर्देशों के तहत पीएफ (कर्मचारी भविष्य निधि) खाता पंजीकरण, यूएएन लिंकिंग और वैधानिक अनुपालन के लिए व्यक्तिगत डेटा का संग्रह और प्रसंस्करण।";
    }
    if (purposeText.includes("KYC") || purposeText.includes("Savings Account")) {
      return "आरबीआई दिशानिर्देशों के तहत नए बचत खाते खोलने और डिजिटल केवाईसी सत्यापन के लिए व्यक्तिगत डेटा का प्रसंस्करण।";
    }
    if (purposeText.includes("Medical") || purposeText.includes("Diagnostic")) {
      return "कैशलेस स्वास्थ्य बीमा दावा निपटान और चिकित्सा रिकॉर्ड साझा करने के लिए डेटा का प्रसंस्करण।";
    }
    if (purposeText.includes("Placement") || purposeText.includes("Recruitment")) {
      return "कॉर्पोरेट भर्ती और साक्षात्कार प्रक्रिया के लिए शैक्षणिक रिकॉर्ड और रिज्यूमे का मूल्यांकन।";
    }
    return "वैधानिक और संगठनात्मक आवश्यकताओं के लिए व्यक्तिगत डेटा का संग्रह और प्रसंस्करण।";
  }

  if (langCode === 'ta') {
    if (purposeText.includes("PF") || purposeText.includes("Provident Fund")) {
      return "EPFO வழிகாட்டுதல்களின் கீழ் வருங்கால வைப்பு நிதி (PF) கணக்கு பதிவு மற்றும் UAN இணைப்புக்கான தரவு செயலாக்கம்.";
    }
    return "சட்டப்பூர்வ மற்றும் நிறுவன தேவைகளுக்கான தனிப்பட்ட தரவு செயலாக்கம்.";
  }

  if (langCode === 'bn') {
    if (purposeText.includes("PF") || purposeText.includes("Provident Fund")) {
      return "ইপিএফও নির্দেশিকা অনুসারে পিএফ (প্রভিডেন্ট ফান্ড) অ্যাকাউন্ট রেজিস্ট্রেশন, ইউএএন লিঙ্কিং এবং সংবিধিবদ্ধ সম্মতির জন্য ডাটা প্রসেসিং।";
    }
    return "সংবিধিবদ্ধ এবং সাংগঠনিক প্রয়োজনীয়তার জন্য ব্যক্তিগত ডাটা সংগ্রহ ও প্রসেসিং।";
  }

  return purposeText;
};
