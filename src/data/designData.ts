export const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

export type ActionType =
  | 'cash_dividend' | 'bonus_shares' | 'stock_split' | 'reverse_split'
  | 'capital_increase' | 'tender_offer' | 'ipo';

export type ActionStatus = 'upcoming' | 'ex_date' | 'paid' | 'announced' | 'cancelled' | 'ongoing';

export interface Company {
  symbolCode: string;
  name: string;
  nameAr: string;
  color: string;
  sector: string;
}

export interface ActionTypeMeta {
  label: string;
  labelAr: string;
  short: string;
  color: string;
  icon: string;
}

export interface StatusMeta {
  label: string;
  labelAr: string;
  tone: 'yellow' | 'blue' | 'green' | 'grey' | 'red';
}

export interface CorporateAction {
  id: string;
  symbol: string;
  type: ActionType;
  title: string;
  announceDate: string;
  exDate: string;
  recordDate?: string;
  paymentDate?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  cancelled?: boolean;
  completed?: boolean;
  pdfUrls?: string[];
}

export interface CorporateActionWithStatus extends CorporateAction {
  status: ActionStatus;
}

export const COMPANIES: Record<string, Company> = {
  /* ── Agriculture ───────────────────────────────────────────────────── */
  INFI:  { symbolCode: 'EGS01041C010', name: 'Ismailia National Food Industries',                                    nameAr: 'الاسماعيلية الوطنية للصناعات الغذائية (فوديكو)',                              color: '#4A6A2A', sector: 'Agriculture' },
  WKOL:  { symbolCode: 'EGS01071C017', name: 'Wadi Kom Ombo Land Reclamation',                                       nameAr: 'وادي كوم امبو لاستصلاح الاراضي',                                             color: '#4A6A2A', sector: 'Agriculture' },
  AALR:  { symbolCode: 'EGS01081C016', name: 'General Co for Land Reclamation',                                      nameAr: 'العامة لاستصلاح الاراضي',                                                    color: '#4A6A2A', sector: 'Agriculture' },
  ISMA:  { symbolCode: 'EGS02021C011', name: 'Ismailia Misr Poultry',                                                nameAr: 'الاسماعيلية مصر للدواجن',                                                    color: '#4A6A2A', sector: 'Agriculture' },
  POUL:  { symbolCode: 'EGS02051C018', name: 'Cairo Poultry',                                                        nameAr: 'القاهرة للدواجن',                                                            color: '#4A6A2A', sector: 'Agriculture' },
  MPCO:  { symbolCode: 'EGS02091C014', name: 'Mansoura Poultry',                                                     nameAr: 'المنصوره للدواجن',                                                           color: '#4A6A2A', sector: 'Agriculture' },
  EPCO:  { symbolCode: 'EGS02211C018', name: 'Egypt for Poultry',                                                    nameAr: 'المصرية للدواجن',                                                            color: '#4A6A2A', sector: 'Agriculture' },
  KRDI:  { symbolCode: 'EGS02291C010', name: 'Al-Khair River for Development, Agricultural Investment & Environmental Services', nameAr: 'نهر الخير للتنمية والاستثمار الزراعي والخدمات البيئية',             color: '#4A6A2A', sector: 'Agriculture' },
  IFAP:  { symbolCode: 'EGS07061C012', name: 'International Agricultural Products',                                  nameAr: 'الدوليه للمحاصيل الزراعيه',                                                  color: '#4A6A2A', sector: 'Agriculture' },
  AIFI:  { symbolCode: 'EGS071L1C018', name: 'Atlas for Investment',                                                 nameAr: 'اطلس للاستثمار والصناعات الغذائبه',                                          color: '#4A6A2A', sector: 'Agriculture' },
  LUTS:  { symbolCode: 'EGS07661C019', name: 'Lotus for Agricultural Investments and Development',                   nameAr: 'لوتس للتنمية والاستثمار الزراعى',                                            color: '#4A6A2A', sector: 'Agriculture' },
  KORA:  { symbolCode: 'EGS07911C018', name: 'Korra Energi',                                                         nameAr: 'قرة لمشروعات الطاقة والاستثمار',                                             color: '#6A2A1F', sector: 'Energy' },
  GGRN:  { symbolCode: 'EGS07DR1C012', name: 'Gogreen for Agricultural Investment',                                  nameAr: 'جو جرين للاستثمار الزراعى والتنمية',                                         color: '#4A6A2A', sector: 'Agriculture' },
  NEDA:  { symbolCode: 'EGS52041C018', name: 'Northern Upper Egypt Development & Agricultural Production',            nameAr: 'شمال الصعيد للتنميه والانتاج الزراعي (نيوداب)',                               color: '#4A6A2A', sector: 'Agriculture' },
  EALR:  { symbolCode: 'EGS65771C015', name: 'El Arabia for Land Reclamation',                                       nameAr: 'العربية لاستصلاح الاراضي',                                                   color: '#4A6A2A', sector: 'Agriculture' },
  /* ── Mining ─────────────────────────────────────────────────────────── */
  ASCM:  { symbolCode: 'EGS10001C013', name: 'Asek Company for Mining (Ascom)',                                      nameAr: 'اسيك للتعدين - اسكوم',                                                       color: '#5A5A2A', sector: 'Mining' },
  ISMQ:  { symbolCode: 'EGS102S1C014', name: 'Iron and Steel for Mines and Quarries',                                nameAr: 'الحديد و الصلب للمناجم و المحاجر',                                           color: '#5A5A2A', sector: 'Mining' },
  /* ── Construction ───────────────────────────────────────────────────── */
  DCRC:  { symbolCode: 'EGS21451C017', name: 'Delta Construction & Rebuilding',                                      nameAr: 'دلتا للانشاء والتعمير',                                                      color: '#3B5A3B', sector: 'Construction' },
  UEGC:  { symbolCode: 'EGS21531C016', name: 'Upper Egypt Contracting',                                              nameAr: 'الصعيد العامة للمقاولات',                                                    color: '#3B5A3B', sector: 'Construction' },
  GGCC:  { symbolCode: 'EGS21541C015', name: 'Giza General Contracting',                                             nameAr: 'الجيزةالعامة للمقاولات',                                                     color: '#3B5A3B', sector: 'Construction' },
  FNAR:  { symbolCode: 'EGS221U1C016', name: 'Fanar General Contracting for Construction and Trade',                 nameAr: 'الفنار للمقاولات العموميه والانشاءات والتجاره',                               color: '#3B5A3B', sector: 'Construction' },
  MBEG:  { symbolCode: 'EGS221V1C015', name: 'M.B Engineering',                                                     nameAr: 'إم بي للهندسه',                                                              color: '#3B5A3B', sector: 'Construction' },
  NCCW:  { symbolCode: 'EGS23111C015', name: 'Nasr for Civil Works',                                                 nameAr: 'شركة النصر للأعمال المدنية',                                                  color: '#3B5A3B', sector: 'Construction' },
  CRST:  { symbolCode: 'EGS23141C012', name: 'Creast Mark for Contracting and Real Estate Development',              nameAr: 'كريستمارك للمقاولات والتطوير العقاري',                                       color: '#3B5A3B', sector: 'Construction' },
  ORAS:  { symbolCode: 'EGS95001C011', name: 'Orascom Construction Ltd.',                                            nameAr: 'اوراسكوم كونستراكشون ليميتد',                                                color: '#3B5A3B', sector: 'Construction' },
  /* ── Real Estate ────────────────────────────────────────────────────── */
  ZMID:  { symbolCode: 'EGS21171C011', name: 'Zahraa Maadi Investment & Development',                                nameAr: 'زهراء المعادي للاستثمار والتعمير',                                           color: '#8B6A2A', sector: 'Real Estate' },
  GPIM:  { symbolCode: 'EGS213S1C010', name: 'GPI For Urban Growth',                                                 nameAr: 'جي بي آي للنمو العمراني',                                                    color: '#8B6A2A', sector: 'Real Estate' },
  IDRE:  { symbolCode: 'EGS214Q1C011', name: 'New Ismailia Urban Development',                                       nameAr: 'الاسماعيلية الجديدة للتطوير والتنمية العمرانية',                              color: '#8B6A2A', sector: 'Real Estate' },
  TANM:  { symbolCode: 'EGS21EB1C011', name: 'Tanmiya for Real Estate Investment',                                   nameAr: 'تنمية للاستثمار العقاري',                                                    color: '#8B6A2A', sector: 'Real Estate' },
  PRDC:  { symbolCode: 'EGS21FW1C015', name: 'Pioneers Properties for Development',                                  nameAr: 'بايونيرز بروبريتيز للتنمية العقارية',                                         color: '#8B6A2A', sector: 'Real Estate' },
  HBCO:  { symbolCode: 'EGS23OD1C015', name: 'Heibco for Commercial Investments & Real Estate Development',          nameAr: 'هيبكو للاستثمارات التجارية والتنمية العقارية',                               color: '#8B6A2A', sector: 'Real Estate' },
  TRST:  { symbolCode: 'EGS233E1C012', name: 'Trust for Business and Development Management',                        nameAr: 'ثقة لادارة الاعمال و التنمية',                                                color: '#8B6A2A', sector: 'Real Estate' },
  RREI:  { symbolCode: 'EGS65011C016', name: 'Arab Real Estate Investment (ALCO)',                                   nameAr: 'الاستثمارالعقاري العربي- اليكو',                                              color: '#8B6A2A', sector: 'Real Estate' },
  UNIT:  { symbolCode: 'EGS65061C011', name: 'United Housing & Development',                                         nameAr: 'المتحدة للاسكان والتعمير',                                                   color: '#8B6A2A', sector: 'Real Estate' },
  ELKA:  { symbolCode: 'EGS65071C010', name: 'El Kahera Housing',                                                    nameAr: 'القاهرة للاسكان والتعمير',                                                   color: '#8B6A2A', sector: 'Real Estate' },
  DAPH:  { symbolCode: 'EGS65081C019', name: 'Development & Engineering Consultants',                                nameAr: 'التعمير والاستشارات الهندسية',                                               color: '#8B6A2A', sector: 'Real Estate' },
  ELSH:  { symbolCode: 'EGS65091C018', name: 'Al Shams Housing',                                                     nameAr: 'الشمس للاسكان والتعمير',                                                     color: '#8B6A2A', sector: 'Real Estate' },
  NHPS:  { symbolCode: 'EGS65131C012', name: 'National Housing for Professional Syndicates',                         nameAr: 'الوطنية للاسكان للنقابات المهنية',                                            color: '#8B6A2A', sector: 'Real Estate' },
  CCRS:  { symbolCode: 'EGS651B1C018', name: 'Gulf Canadian Real Estate Investment Co.',                             nameAr: 'الخليجية الكندية للاستثمار العقاري العربي',                                  color: '#8B6A2A', sector: 'Real Estate' },
  AREH:  { symbolCode: 'EGS65211C012', name: 'Egyptian Real Estate Group',                                           nameAr: 'المجموعة المصرية العقارية',                                                  color: '#8B6A2A', sector: 'Real Estate' },
  EHDR:  { symbolCode: 'EGS65341C017', name: 'Egyptians for Housing Development & Reconstruction',                   nameAr: 'المصريين للاسكان والتنمية والتعمير',                                         color: '#8B6A2A', sector: 'Real Estate' },
  MENA:  { symbolCode: 'EGS65441C015', name: 'Mena Touristic Investment',                                            nameAr: 'مينا للاستثمار السياحي والعقاري',                                            color: '#8B6A2A', sector: 'Real Estate' },
  GIHD:  { symbolCode: 'EGS65461C013', name: 'Islamic Gharbia Housing Development',                                  nameAr: 'الغربية الاسلامية للتنمية العمرانية',                                        color: '#8B6A2A', sector: 'Real Estate' },
  COPR:  { symbolCode: 'EGS65511C015', name: 'Copper for Commercial Investment & Real Estate Development',           nameAr: 'كوبر للاستثمار التجارى و التطوير العقارى',                                   color: '#8B6A2A', sector: 'Real Estate' },
  OBRI:  { symbolCode: 'EGS65551C011', name: 'El Obour Real Estate Investment',                                      nameAr: 'العبور للاستثمار العقارى',                                                   color: '#8B6A2A', sector: 'Real Estate' },
  MASR:  { symbolCode: 'EGS65571C019', name: 'Medinet Masr Housing',                                                 nameAr: 'مدينة مصر للاسكان والتعمير',                                                 color: '#8B6A2A', sector: 'Real Estate' },
  HELI:  { symbolCode: 'EGS65591C017', name: 'Heliopolis Housing',                                                   nameAr: 'مصر الجديدة للاسكان والتعمير',                                               color: '#1F3B66', sector: 'Real Estate' },
  PHDC:  { symbolCode: 'EGS655L1C012', name: 'Palm Hills',                                                           nameAr: 'بالم هيلز للتعمير',                                                          color: '#406F4F', sector: 'Real Estate' },
  UTOP:  { symbolCode: 'EGS655Y1C017', name: 'Utopia',                                                               nameAr: 'يوتوبيا للاستثمار العقاري والسياحي',                                         color: '#6A2D2F', sector: 'Real Estate' },
  BONY:  { symbolCode: 'EGS656M1C010', name: 'Bonyan for Development and Trade',                                     nameAr: 'بنيان للتنمية والتجارة',                                                     color: '#8B6A2A', sector: 'Real Estate' },
  OCDI:  { symbolCode: 'EGS65851C015', name: 'SODIC',                                                                nameAr: 'السادس من اكتوبر للتنميه والاستثمار سوديك',                                  color: '#2D6A2F', sector: 'Real Estate' },
  FIRE:  { symbolCode: 'EGS65AL1C010', name: 'First Investment & Real Estate Development',                           nameAr: 'الاولى للاستثمار والتنمية العقارية',                                         color: '#8B6A2A', sector: 'Real Estate' },
  ADRI:  { symbolCode: 'EGS65AN1C018', name: 'Arab Development & Real Estate Investment',                            nameAr: 'اراب للتنميه والاستثمار العقارى',                                            color: '#8B6A2A', sector: 'Real Estate' },
  MKIT:  { symbolCode: 'EGS659O1C015', name: 'Misr Kuwait Investment & Trading Co.',                                 nameAr: 'المصرية الكويتية للأستثمار والتجارة',                                        color: '#8B6A2A', sector: 'Real Estate' },
  EMFD:  { symbolCode: 'EGS673Y1C015', name: 'Emaar Misr for Development',                                          nameAr: 'اعمار مصر للتنميه',                                                          color: '#8B6A2A', sector: 'Real Estate' },
  AMER:  { symbolCode: 'EGS675S1C011', name: 'Amer Group Holding',                                                   nameAr: 'مجموعة عامر القابضه ( عامر جروب )',                                          color: '#8B6A2A', sector: 'Real Estate' },
  NARE:  { symbolCode: 'EGS69191C012', name: 'Al Naeem Real Estate Holding Group',                                   nameAr: 'مجموعة النعيم العقارية القابضه',                                              color: '#8B6A2A', sector: 'Real Estate' },
  TMGH:  { symbolCode: 'EGS691S1C011', name: 'TMG Holding',                                                          nameAr: 'مجموعة طلعت مصطفى القابضة',                                                  color: '#8B6A2A', sector: 'Real Estate' },
  ARAB:  { symbolCode: 'EGS694A1C018', name: 'Arab Developers Holding',                                              nameAr: 'المطورون العرب القابضة',                                                     color: '#8B6A2A', sector: 'Real Estate' },
  GOCO:  { symbolCode: 'EGS70GV1C015', name: 'Golden Coast Sokhna for Real Estate Investment',                       nameAr: 'جولدن كوست السخنة للاستثمار السياحى',                                       color: '#8B6A2A', sector: 'Real Estate' },
  MAAL:  { symbolCode: 'EGS739Z1C016', name: 'Marseilia',                                                            nameAr: 'مرسيليا المصرية الخليجية للاستثمار العقاري',                                 color: '#8B6A2A', sector: 'Real Estate' },
  MNHD:  { symbolCode: '',             name: 'Madinet Nasr Housing',                                                 nameAr: 'مدينة نصر للإسكان',                                                          color: '#A8302F', sector: 'Real Estate' },
  /* ── Consumer / Food ────────────────────────────────────────────────── */
  DOMT:  { symbolCode: 'EGS30031C016', name: 'Arab Food Industries (Domty)',                                         nameAr: 'الصناعات الغذائيه العربيه - دومتى',                                          color: '#7A4A1F', sector: 'Consumer' },
  ELNA:  { symbolCode: 'EGS300L1C011', name: 'El Nasr for Manufacturing Agricultural Crops',                        nameAr: 'النصر لتصنيع الحاصلات الزراعيه',                                             color: '#7A4A1F', sector: 'Consumer' },
  SUGR:  { symbolCode: 'EGS30201C015', name: 'Delta Sugar',                                                          nameAr: 'الدلتا للسكر',                                                               color: '#7A4A1F', sector: 'Consumer' },
  AJWA:  { symbolCode: 'EGS30211C014', name: 'Ajwa',                                                                 nameAr: 'اجواء للصناعات الغذائيه',                                                    color: '#7A4A1F', sector: 'Consumer' },
  ADPC:  { symbolCode: 'EGS30221C013', name: 'Arab Dairy',                                                           nameAr: 'العربية لمنتجات الالبان- اراب ديري',                                         color: '#7A4A1F', sector: 'Consumer' },
  SNFC:  { symbolCode: 'EGS30291C016', name: 'Sharkia National Food',                                                nameAr: 'الشرقيه الوطنيه للأمن الغذائي',                                              color: '#7A4A1F', sector: 'Consumer' },
  SNFI:  { symbolCode: 'EGS30301C013', name: 'Sohag National Company for Food Industries',                          nameAr: 'شركة سوهاج الوطنيه للصناعات الغذائيه',                                       color: '#7A4A1F', sector: 'Consumer' },
  EDFM:  { symbolCode: 'EGS30351C018', name: 'East Delta Flour Mills',                                               nameAr: 'مطاحن شرق الدلتا',                                                           color: '#7A4A1F', sector: 'Consumer' },
  MILS:  { symbolCode: 'EGS30361C017', name: 'North Cairo Mills',                                                    nameAr: 'مطاحن ومخابز شمال القاهرة',                                                  color: '#7A4A1F', sector: 'Consumer' },
  CEFM:  { symbolCode: 'EGS30401C011', name: 'Middle Egypt Flour Mills',                                             nameAr: 'مطاحن مصر الوسطي',                                                           color: '#7A4A1F', sector: 'Consumer' },
  SCFM:  { symbolCode: 'EGS30411C010', name: 'South Cairo & Giza Mills & Bakeries',                                  nameAr: 'مطاحن ومخابز جنوب القاهرة والجيزة',                                         color: '#7A4A1F', sector: 'Consumer' },
  WCDF:  { symbolCode: 'EGS30421C019', name: 'Middle & West Delta Flour Mills',                                      nameAr: 'مطاحن وسط وغرب الدلتا',                                                      color: '#7A4A1F', sector: 'Consumer' },
  GSSC:  { symbolCode: 'EGS30441C017', name: 'General Silos & Storage',                                              nameAr: 'العامة للصوامع والتخزين',                                                    color: '#7A4A1F', sector: 'Consumer' },
  UEFM:  { symbolCode: 'EGS30451C016', name: 'Upper Egypt Flour Mills',                                              nameAr: 'مطاحن مصر العليا',                                                           color: '#7A4A1F', sector: 'Consumer' },
  AFMC:  { symbolCode: 'EGS30471C014', name: 'Alexandria Flour Mills',                                               nameAr: 'مطاحن ومخابز الاسكندرية',                                                    color: '#7A4A1F', sector: 'Consumer' },
  COSG:  { symbolCode: 'EGS30581C010', name: 'Cairo Oils & Soap',                                                    nameAr: 'القاهرة للزيوت والصابون',                                                    color: '#7A4A1F', sector: 'Consumer' },
  EFID:  { symbolCode: 'EGS305I1C011', name: 'Edita Food Industries',                                                nameAr: 'ايديتا للصناعات الغذائيه',                                                   color: '#7A4A1F', sector: 'Consumer' },
  JUFO:  { symbolCode: 'EGS30901C010', name: 'Juhayna',                                                              nameAr: 'جهينة للصناعات الغذائية',                                                    color: '#7A4A1F', sector: 'Consumer' },
  DIFC:  { symbolCode: 'EGS30AJ1C016', name: 'Difco 2',                                                              nameAr: 'الدولية للثلج الجاف - ديفكو 2',                                               color: '#7A4A1F', sector: 'Consumer' },
  OLFI:  { symbolCode: 'EGS30AL1C012', name: 'Obour Land for Food Industries',                                       nameAr: 'عبورلاند للصناعات الغذائيه',                                                 color: '#7A4A1F', sector: 'Consumer' },
  EAST:  { symbolCode: 'EGS37091C013', name: 'Eastern Company',                                                      nameAr: 'الشرقية للدخان - ايسترن كومباني',                                            color: '#7A1F1F', sector: 'Consumer' },
  MOSC:  { symbolCode: 'EGS38421C011', name: 'Misr Oils & Soap',                                                     nameAr: 'مصر للزيوت و الصابون',                                                       color: '#7A4A1F', sector: 'Consumer' },
  UNFO:  { symbolCode: 'EGS513B1C016', name: 'Univert Food Industries',                                              nameAr: 'يونيفرت للصناعات الغذائية',                                                  color: '#7A4A1F', sector: 'Consumer' },
  MFSC:  { symbolCode: 'EGS53051C016', name: 'Misr Duty Free Shops',                                                 nameAr: 'مصر للاسواق الحرة',                                                          color: '#7A4A1F', sector: 'Consumer' },
  GOUR:  { symbolCode: 'EGS540S1C014', name: 'Gourmet Egypt',                                                        nameAr: 'جورمية ايجيبت دوت كوم للاغذية',                                              color: '#7A4A1F', sector: 'Consumer' },
  /* ── Textiles ───────────────────────────────────────────────────────── */
  SPIN:  { symbolCode: 'EGS32041C013', name: 'Alexandria Spinning & Weaving (SPINALEX)',                             nameAr: 'الاسكندرية للغزل والنسيج (سبينالكس)',                                        color: '#6A2A5A', sector: 'Textiles' },
  NCGC:  { symbolCode: 'EGS32131C012', name: 'Nile Cotton Ginning',                                                  nameAr: 'النيل لحليج الاقطان',                                                        color: '#6A2A5A', sector: 'Textiles' },
  GTWL:  { symbolCode: 'EGS32161C019', name: 'Goldentex',                                                            nameAr: 'جولدن تكس للاصواف',                                                          color: '#6A2A5A', sector: 'Textiles' },
  ACGC:  { symbolCode: 'EGS32221C011', name: 'Arab Cotton Ginning',                                                  nameAr: 'العربية لحليج الأقطان',                                                      color: '#6A2A5A', sector: 'Textiles' },
  APSW:  { symbolCode: 'EGS32331C018', name: 'Unirab',                                                               nameAr: 'العربية وبولفارا للغزل والنسيج',                                              color: '#6A2A5A', sector: 'Textiles' },
  ORWE:  { symbolCode: 'EGS33041C012', name: 'Oriental Weavers',                                                     nameAr: 'النساجون الشرقيون',                                                          color: '#4F6A2A', sector: 'Textiles' },
  KABO:  { symbolCode: 'EGS33061C010', name: 'Kabo',                                                                 nameAr: 'النصر للملابس والمنسوجات - كابو',                                            color: '#6A2A5A', sector: 'Textiles' },
  DSCW:  { symbolCode: 'EGS33321C018', name: 'DICE',                                                                 nameAr: 'دايس للملابس الجاهزه',                                                       color: '#6A2A5A', sector: 'Textiles' },
  /* ── Paper & Printing ───────────────────────────────────────────────── */
  RAKT:  { symbolCode: 'EGS36021C011', name: 'Rakta Paper Manufacturing',                                            nameAr: 'العامة لصناعة الورق - راكتا',                                                color: '#5A5A3A', sector: 'Paper' },
  SBAG:  { symbolCode: 'EGS36041C019', name: 'Suez Bags',                                                            nameAr: 'السويس للاكياس',                                                             color: '#5A5A3A', sector: 'Paper' },
  SIMO:  { symbolCode: 'EGS36091C014', name: 'Paper Middle East (Simo)',                                              nameAr: 'الورق للشرق الاوسط - سيمو',                                                  color: '#5A5A3A', sector: 'Paper' },
  EPPK:  { symbolCode: 'EGS360A1C011', name: 'El Ahram for Packing',                                                 nameAr: 'الاهرام للطباعه والتغليف',                                                   color: '#5A5A3A', sector: 'Paper' },
  NAPR:  { symbolCode: 'EGS370O1C013', name: 'National Printing',                                                    nameAr: 'الوطنية للطباعة',                                                            color: '#5A5A3A', sector: 'Paper' },
  DTPP:  { symbolCode: 'EGS370W1C013', name: 'Delta for Printing & Packaging',                                       nameAr: 'دلتا للطباعة',                                                               color: '#5A5A3A', sector: 'Paper' },
  SMPP:  { symbolCode: 'EGS3A0A1C016', name: 'Modern Shorouk Printing & Packaging',                                  nameAr: 'الشروق الحديثه للطباعه والتغليف',                                            color: '#5A5A3A', sector: 'Paper' },
  /* ── Pharma ─────────────────────────────────────────────────────────── */
  PHAR:  { symbolCode: 'EGS38081C013', name: 'Egyptian International Pharmaceuticals (EIPICO)',                      nameAr: 'المصرية الدولية للصناعات الدوائية- ايبكو',                                   color: '#2A5A7A', sector: 'Pharma' },
  MIPH:  { symbolCode: 'EGS380G1C011', name: 'Minapharm Pharmaceuticals',                                            nameAr: 'مينا فارم للأدوية والصناعات الكيماوية',                                      color: '#2A5A7A', sector: 'Pharma' },
  OCPH:  { symbolCode: 'EGS380R1C018', name: 'October Pharma',                                                       nameAr: 'اكتوبر فارما',                                                               color: '#2A5A7A', sector: 'Pharma' },
  UNIP:  { symbolCode: 'EGS38161C013', name: 'Universal (Unipack)',                                                   nameAr: 'يونيفرسال لصناعة مواد التعبئه والتغليف والورق - يونيباك',                    color: '#2A5A7A', sector: 'Pharma' },
  BIOC:  { symbolCode: 'EGS38171C012', name: 'Glaxo Smith Kline',                                                    nameAr: 'جلاكسو ولكام',                                                               color: '#2A5A7A', sector: 'Pharma' },
  RMDA:  { symbolCode: 'EGS381B1C015', name: '10th of Ramadan Pharmaceuticals (Rameda)',                             nameAr: 'العاشر من رمضان للصناعات الدوائية - راميدا',                                  color: '#2A5A7A', sector: 'Pharma' },
  ADCI:  { symbolCode: 'EGS38321C013', name: 'ADCO',                                                                 nameAr: 'العربية للادوية والصناعات الكيماوية',                                        color: '#2A5A7A', sector: 'Pharma' },
  NIPH:  { symbolCode: 'EGS38331C012', name: 'Nile Pharmaceuticals',                                                 nameAr: 'النيل للادوية والصناعات الكيماوية',                                          color: '#2A5A7A', sector: 'Pharma' },
  AXPH:  { symbolCode: 'EGS38341C011', name: 'Alexandria Pharmaceuticals',                                           nameAr: 'الاسكندرية للادوية والصناعات الكيماوية',                                     color: '#2A5A7A', sector: 'Pharma' },
  MPCI:  { symbolCode: 'EGS38351C010', name: 'Memphis Pharmaceutical',                                               nameAr: 'ممفيس للادوية والصناعات الكيماوية',                                          color: '#2A5A7A', sector: 'Pharma' },
  CPCI:  { symbolCode: 'EGS38391C016', name: 'Kahira Pharmaceuticals',                                               nameAr: 'القاهرة للادوية والصناعات الكيماوية',                                        color: '#2A5A7A', sector: 'Pharma' },
  APPC:  { symbolCode: 'EGS38461C017', name: 'Advanced Pharmaceutical Packaging',                                    nameAr: 'العبوات الدوائية المتطورة',                                                  color: '#2A5A7A', sector: 'Pharma' },
  ISPH:  { symbolCode: 'EGS512O1C012', name: 'Ibn Sina Pharma',                                                      nameAr: 'ابن سينا فارما',                                                             color: '#2A5A7A', sector: 'Pharma' },
  MCRO:  { symbolCode: 'EGS7D971C011', name: 'Macro Group Pharmaceuticals',                                          nameAr: 'ماكرو جروب للمستحضرات الطبية-ماكرو كابيتال',                                 color: '#2A5A7A', sector: 'Pharma' },
  /* ── Chemicals ──────────────────────────────────────────────────────── */
  EGCH:  { symbolCode: 'EGS38201C017', name: 'Egyptian Chemical Industries (Kima)',                                  nameAr: 'الصناعات الكيماوية المصرية - كيما',                                          color: '#5A3B5A', sector: 'Chemicals' },
  MICH:  { symbolCode: 'EGS38211C016', name: 'Misr Chemical Industries',                                             nameAr: 'مصر لصناعة الكيماويات',                                                      color: '#5A3B5A', sector: 'Chemicals' },
  ZEOT:  { symbolCode: 'EGS38251C012', name: 'Extracted Oils',                                                       nameAr: 'الزيوت المستخلصة ومنتجاتها',                                                 color: '#5A3B5A', sector: 'Chemicals' },
  SIPC:  { symbolCode: 'EGS382M1C011', name: 'Sabaa',                                                                nameAr: 'سبأ الدولية للصناعات الكيماوية',                                             color: '#5A3B5A', sector: 'Chemicals' },
  PACH:  { symbolCode: 'EGS38311C014', name: 'Paint & Chemicals Industries (Pachin)',                                nameAr: 'البويات والصناعات الكيماوية - باكين',                                        color: '#5A3B5A', sector: 'Chemicals' },
  KZPC:  { symbolCode: 'EGS38411C012', name: 'Kafr El Zayat Pesticides',                                             nameAr: 'كفر الزيات للمبيدات والكيماويات',                                            color: '#5A3B5A', sector: 'Chemicals' },
  FERC:  { symbolCode: 'EGS385S1C012', name: 'Ferchem Misr for Fertilizers & Chemicals',                            nameAr: 'فيركيم مصر للاسمدة والكيماويات',                                             color: '#5A3B5A', sector: 'Chemicals' },
  MFPC:  { symbolCode: 'EGS39061C014', name: 'Misr Fertilizers Production Company (Mopco)',                         nameAr: 'مصر لانتاج الاسمدة(موبكو)',                                                   color: '#5A3B5A', sector: 'Chemicals' },
  /* ── Energy ─────────────────────────────────────────────────────────── */
  AMOC:  { symbolCode: 'EGS380P1C010', name: 'Alexandria Mineral Oils (Amok)',                                       nameAr: 'الاسكندرية للزيوت المعدنية - اموك',                                          color: '#3F3F47', sector: 'Energy' },
  SKPC:  { symbolCode: 'EGS380S1C017', name: 'Sidi Kerir Petrochemicals',                                            nameAr: 'سيدى كريرللبتروكيماويات - سيدبك',                                            color: '#6A2A1F', sector: 'Energy' },
  EGAS:  { symbolCode: 'EGS39011C019', name: 'Egypt Gas',                                                            nameAr: 'غاز مصر',                                                                    color: '#6A2A1F', sector: 'Energy' },
  TAQA:  { symbolCode: 'EGS490S1C014', name: 'Taqa Arabia',                                                          nameAr: 'طاقة عربية',                                                                 color: '#6A2A1F', sector: 'Energy' },
  NDRL:  { symbolCode: 'EGS735N2C012', name: 'National Drilling',                                                    nameAr: 'الحفر الوطنية',                                                               color: '#6A2A1F', sector: 'Energy' },
  /* ── Materials / Building ────────────────────────────────────────────── */
  ABUK:  { symbolCode: 'EGS38191C010', name: 'Abu Qir Fertilizers',                                                  nameAr: 'ابوقير للاسمدة والصناعات الكيماوية',                                         color: '#3E6B1F', sector: 'Materials' },
  EFIC:  { symbolCode: 'EGS38381C017', name: 'Egyptian Financial & Industrial',                                      nameAr: 'المالية و الصناعية المصرية',                                                 color: '#3A4A5A', sector: 'Materials' },
  RUBX:  { symbolCode: 'EGS3A221C018', name: 'Rubex Plastics',                                                       nameAr: 'روبكس العالميه لتصنيع البلاستيك والاكريلك',                                  color: '#5A4A3A', sector: 'Materials' },
  MEGM:  { symbolCode: 'EGS3C001C012', name: 'Middle East Glass Manufacturing',                                      nameAr: 'الشرق الأوسط لصناعة الزجاج',                                                 color: '#5A4A3A', sector: 'Materials' },
  ECAP:  { symbolCode: 'EGS3C071C015', name: 'El Ezz Porcelain (Gemma)',                                             nameAr: 'العز للبورسلين - الجوهره',                                                    color: '#5A4A3A', sector: 'Materials' },
  ARCC:  { symbolCode: 'EGS3C0O1C016', name: 'Arabian Cement',                                                       nameAr: 'العربية للاسمنت',                                                            color: '#5A4A3A', sector: 'Materials' },
  PRCL:  { symbolCode: 'EGS3C111C019', name: 'Ceramic & Porcelain Sheeni',                                           nameAr: 'العامة لمنتجات الخزف والصيني شينى',                                          color: '#5A4A3A', sector: 'Materials' },
  CERA:  { symbolCode: 'EGS3C151C015', name: 'Arab Ceramics (Remas)',                                                nameAr: 'العربية للخزف - سيراميكا ريماس',                                             color: '#5A4A3A', sector: 'Materials' },
  LCSW:  { symbolCode: 'EGS3C161C014', name: 'Egypt Lebanon Ceramics (Lecico)',                                      nameAr: 'ليسيكو مصر',                                                                 color: '#5A4A3A', sector: 'Materials' },
  SUCE:  { symbolCode: 'EGS3C181C012', name: 'Suez Cement',                                                          nameAr: 'السويس للاسمنت',                                                             color: '#5A4A3A', sector: 'Materials' },
  ESRS:  { symbolCode: 'EGS3C251C013', name: 'Ezz Steel',                                                            nameAr: 'حديد عز',                                                                    color: '#5A4A3A', sector: 'Materials' },
  TORA:  { symbolCode: 'EGS3C311C015', name: 'Tourah Cement',                                                        nameAr: 'اسمنت بورتلاند طرة المصرية',                                                 color: '#5A4A3A', sector: 'Materials' },
  SVCE:  { symbolCode: 'EGS3C351C011', name: 'South Valley Cement',                                                  nameAr: 'جنوب الوادى للاسمنت',                                                        color: '#5A4A3A', sector: 'Materials' },
  MBSC:  { symbolCode: 'EGS3C371C019', name: 'Misr Beni Suef Cement',                                                nameAr: 'مصر بنى سويف للاسمنت',                                                       color: '#5A4A3A', sector: 'Materials' },
  MCQE:  { symbolCode: 'EGS3C391C017', name: 'Misr Cement Qena',                                                     nameAr: 'مصر للاسمنت - قنا',                                                          color: '#5A4A3A', sector: 'Materials' },
  SCEM:  { symbolCode: 'EGS3C401C014', name: 'Sinai Cement',                                                         nameAr: 'اسمنت سيناء',                                                                color: '#5A4A3A', sector: 'Materials' },
  MEPA:  { symbolCode: 'EGS3C4L1C015', name: 'Medical Packaging',                                                    nameAr: 'العبوات الطبية',                                                             color: '#5A4A3A', sector: 'Materials' },
  MISR:  { symbolCode: 'EGS3C4P1C011', name: 'Misr Intercontinental for Granite & Marble (Egy-Ston)',               nameAr: 'مصر انتركوننتال لصناعة الجرانيت والرخام (ايجى ستون)',                        color: '#5A4A3A', sector: 'Materials' },
  ALEX:  { symbolCode: 'EGS3H051C012', name: 'Alexandria Cement',                                                    nameAr: 'اسكندريه للاسمنت - بورتلاند',                                                color: '#5A4A3A', sector: 'Materials' },
  WATP:  { symbolCode: 'EGS3J041C011', name: 'Modern Insulation Materials (Bitumode)',                               nameAr: 'الشركة الحديثة للمواد العازلة- مودرن -  بيتومود',                            color: '#5A4A3A', sector: 'Materials' },
  ARPI:  { symbolCode: 'EGS3J2D1C012', name: 'Arabian Rocks Plastic Industries',                                     nameAr: 'الصخور العربية للصناعات البلاستكية',                                         color: '#5A4A3A', sector: 'Materials' },
  SMFR:  { symbolCode: 'EGS51191C012', name: 'EGYFERT',                                                              nameAr: 'شركة سماد مصر ايجيفرت',                                                      color: '#3E6B1F', sector: 'Materials' },
  ICFC:  { symbolCode: 'EGS520D1C015', name: 'El Dawlia Fertilizers',                                                nameAr: 'الدولية للأسمدة والكيماويات',                                                color: '#3E6B1F', sector: 'Materials' },
  /* ── Industrials ────────────────────────────────────────────────────── */
  IEEC:  { symbolCode: 'EGS22171C010', name: 'Industrial and Engineering Projects',                                  nameAr: 'المشروعات الصناعية والهندسية',                                               color: '#3A4A5A', sector: 'Industrials' },
  ALUM:  { symbolCode: 'EGS3D031C018', name: 'Arab Aluminum',                                                        nameAr: 'الالومنيوم العربية',                                                         color: '#3A4A5A', sector: 'Industrials' },
  IRAX:  { symbolCode: 'EGS3D041C017', name: 'Ezz Dekhela',                                                          nameAr: 'العز الدخيله للصلب - الاسكندريه',                                            color: '#3A4A5A', sector: 'Industrials' },
  IRON:  { symbolCode: 'EGS3D061C015', name: 'Egyptian Iron & Steel',                                                nameAr: 'الحديد والصلب المصرية-تحت التصفية',                                          color: '#3A4A5A', sector: 'Industrials' },
  ATQA:  { symbolCode: 'EGS3D0C1C018', name: 'Misr National Steel (Ataqa)',                                          nameAr: 'مصر الوطنيه للصلب - عتاقه',                                                  color: '#3A4A5A', sector: 'Industrials' },
  ACRO:  { symbolCode: 'EGS3E071C013', name: 'Acrow Misr',                                                           nameAr: 'اكرومصر للشدات والثقلات المعدنية',                                           color: '#3A4A5A', sector: 'Industrials' },
  EGAL:  { symbolCode: 'EGS3E181C010', name: 'Egypt Aluminum',                                                       nameAr: 'مصر للالومنيوم',                                                             color: '#3A4A5A', sector: 'Industrials' },
  ARVA:  { symbolCode: 'EGS3E1E1C013', name: 'Arab Valves Company',                                                  nameAr: 'العربيه للمحابس',                                                            color: '#3A4A5A', sector: 'Industrials' },
  INEG:  { symbolCode: 'EGS3E3B1C014', name: 'Group Integrated Engineering Works',                                   nameAr: 'المجموعه المتكاملة للأعمال الهندسية',                                        color: '#3A4A5A', sector: 'Industrials' },
  ENGC:  { symbolCode: 'EGS3F021C017', name: 'Engineering Industries (ICON)',                                        nameAr: 'الصناعات الهندسية المعمارية للانشاء والتعمير - ايكون',                        color: '#3A4A5A', sector: 'Industrials' },
  SWDY:  { symbolCode: 'EGS3G0Z1C014', name: 'El Sewedy Electric',                                                   nameAr: 'السويدي اليكتريك',                                                           color: '#B8350F', sector: 'Industrials' },
  EEII:  { symbolCode: 'EGS3G111C015', name: 'Arab Engineering Industries',                                          nameAr: 'العربية للصناعات الهندسية',                                                  color: '#3A4A5A', sector: 'Industrials' },
  ELEC:  { symbolCode: 'EGS3G231C011', name: 'Electro Cable Egypt',                                                  nameAr: 'الكابلات الكهربائية المصرية',                                                color: '#3A4A5A', sector: 'Industrials' },
  GDWA:  { symbolCode: 'EGS3JM11C012', name: 'Jadwa Industrial Development',                                         nameAr: 'جدوى للتنمية الصناعية',                                                      color: '#3A4A5A', sector: 'Industrials' },
  GMCI:  { symbolCode: 'EGS46051C016', name: 'GMC Group for Industrial Commercial & Financial Investments',          nameAr: 'مجموعه جى إم سى للاستثمارات الصناعية والتجارية والماليه',                   color: '#3A4A5A', sector: 'Industrials' },
  MTIE:  { symbolCode: 'EGS75011C014', name: 'MM Group for Manufacturing & Trading',                                 nameAr: 'ام ام جروب للصناعات والتجاره العالميه',                                       color: '#3A4A5A', sector: 'Industrials' },
  /* ── Transport ──────────────────────────────────────────────────────── */
  ETRS:  { symbolCode: 'EGS42051C010', name: 'Egyptian Transport (EGYTRANS)',                                        nameAr: 'المصريه لخدمات النقل (ايجيترانس)',                                           color: '#2A2A6A', sector: 'Transport' },
  ALCN:  { symbolCode: 'EGS42111C012', name: 'Alexandria Containers and Goods',                                      nameAr: 'الاسكندرية لتداول الحاويات والبضائع',                                        color: '#2A2A6A', sector: 'Transport' },
  MOIL:  { symbolCode: 'EGS44012C010', name: 'Maridive',                                                             nameAr: 'الخدمات الملاحية والبترولية (ماريدايف)',                                      color: '#2A2A6A', sector: 'Transport' },
  CSAG:  { symbolCode: 'EGS44031C010', name: 'Canal Shipping Agencies',                                              nameAr: 'القناة للتوكيلات الملاحية',                                                  color: '#2A2A6A', sector: 'Transport' },
  UASG:  { symbolCode: 'EGS47021C018', name: 'United Arab Shipping',                                                 nameAr: 'العربية المتحدة للشحن والتفريغ',                                             color: '#2A2A6A', sector: 'Transport' },
  /* ── Telecom ─────────────────────────────────────────────────────────── */
  EGSA:  { symbolCode: 'EGS48022C015', name: 'Egyptian Satellites (NileSat)',                                        nameAr: 'المصريه للاقمار الصناعيه ( نايل سات )',                                      color: '#0E5C8A', sector: 'Telecom' },
  ETEL:  { symbolCode: 'EGS48031C016', name: 'Telecom Egypt',                                                        nameAr: 'الشركة المصرية للاتصالات',                                                   color: '#0E5C8A', sector: 'Telecom' },
  ESAC:  { symbolCode: 'EGS48271C018', name: 'Egypt South Africa Telecommunications',                                nameAr: 'مصر جنوب أفريقيا للاتصالات',                                                color: '#0E5C8A', sector: 'Telecom' },
  /* ── Banks ───────────────────────────────────────────────────────────── */
  CIEB:  { symbolCode: 'EGS60041C018', name: 'Credit Agricole Egypt',                                                nameAr: 'بنك كريدي أجريكول اندوسويس (مصر)',                                          color: '#1F6644', sector: 'Banks' },
  QNBE:  { symbolCode: 'EGS60081C014', name: 'Qatar National Bank (QNB)',                                            nameAr: 'بنك قطر الوطنى الاهلى',                                                      color: '#5B2A86', sector: 'Banks' },
  UBEE:  { symbolCode: 'EGS600M1C017', name: 'The United Bank',                                                      nameAr: 'المصرف المتحد',                                                              color: '#5B2A86', sector: 'Banks' },
  SAUD:  { symbolCode: 'EGS60101C010', name: 'Al Baraka Bank',                                                       nameAr: 'بنك البركه',                                                                 color: '#5B2A86', sector: 'Banks' },
  ADIB:  { symbolCode: 'EGS60111C019', name: 'Abu Dhabi Islamic Bank',                                               nameAr: 'مصرف ابوظبى الاسلامي - مصر',                                                color: '#5B2A86', sector: 'Banks' },
  COMI:  { symbolCode: 'EGS60121C018', name: 'Commercial International Bank',                                        nameAr: 'البنك التجاري الدولي  (مصر)',                                                 color: '#5B2A86', sector: 'Banks' },
  SAIB:  { symbolCode: 'EGS60142C014', name: 'Societe Arabe Internationale de Banque',                               nameAr: 'بنك الشركة المصرفية العربية الدولية- شركة مساهمة مصرية',                     color: '#5B2A86', sector: 'Banks' },
  NBKE:  { symbolCode: 'EGS60171C013', name: 'El Watany Bank of Egypt',                                              nameAr: 'بنك الكويت الوطني -مصر',                                                     color: '#5B2A86', sector: 'Banks' },
  EGBE:  { symbolCode: 'EGS60182C010', name: 'Egyptian Gulf Bank',                                                   nameAr: 'البنك المصري الخليجي',                                                       color: '#5B2A86', sector: 'Banks' },
  CANA:  { symbolCode: 'EGS60231C015', name: 'Suez Canal Bank',                                                      nameAr: 'بنك قناة السويس',                                                            color: '#5B2A86', sector: 'Banks' },
  EXPA:  { symbolCode: 'EGS60241C014', name: 'Export Development Bank of Egypt',                                     nameAr: 'البنك المصري لتنمية الصادرات',                                               color: '#5B2A86', sector: 'Banks' },
  HDBK:  { symbolCode: 'EGS60301C016', name: 'Housing & Development Bank',                                           nameAr: 'بنك التعمير والاسكان',                                                       color: '#5B2A86', sector: 'Banks' },
  FAIT:  { symbolCode: 'EGS60321C014', name: 'Faisal Islamic Bank of Egypt',                                         nameAr: 'بنك فيصل الاسلامي المصري',                                                   color: '#5B2A86', sector: 'Banks' },
  /* ── Insurance ───────────────────────────────────────────────────────── */
  DEIN:  { symbolCode: 'EGS63031C016', name: 'Delta Insurance',                                                      nameAr: 'الدلتا للتأمين',                                                             color: '#2D6A2F', sector: 'Insurance' },
  MOIN:  { symbolCode: 'EGS63041C015', name: 'Mohandes Insurance',                                                   nameAr: 'المهندس للتأمين',                                                            color: '#2D6A2F', sector: 'Insurance' },
  MLIC:  { symbolCode: 'EGS632D1C010', name: 'Misr Life Insurance',                                                  nameAr: 'مصر لتأمينات الحياة',                                                        color: '#2D6A2F', sector: 'Insurance' },
  /* ── Financials / Holding ────────────────────────────────────────────── */
  AIHC:  { symbolCode: 'EGS21351C019', name: 'Arabia Investments',                                                   nameAr: 'ارابيا انفستمنتس',                                                           color: '#252F4A', sector: 'Financials' },
  BIDI:  { symbolCode: 'EGS3A2Z1C015', name: 'El Badr Investment and Development',                                   nameAr: 'بي اي دي- البدر للاستثمار والتنمية',                                         color: '#252F4A', sector: 'Financials' },
  VALU:  { symbolCode: 'EGS505Z1C018', name: 'U Consumer Finance',                                                   nameAr: 'يو للتمويل الاستهلاكى',                                                      color: '#252F4A', sector: 'Financials' },
  RKAZ:  { symbolCode: 'EGS521T1C016', name: 'REKAZ Financial Holding',                                              nameAr: 'ركاز القابضة للاستثمارات المالية',                                           color: '#252F4A', sector: 'Financials' },
  IBCT:  { symbolCode: 'EGS550K1C019', name: 'International Business Corporation Trading',                           nameAr: 'انترناسيونال برنس كوربوريشن للتجاره',                                        color: '#252F4A', sector: 'Financials' },
  BIGP:  { symbolCode: 'EGS551D1C017', name: 'Barbary Investment Group',                                             nameAr: 'بى اى جى للتجارة والاستثمار',                                                color: '#252F4A', sector: 'Financials' },
  AIDC:  { symbolCode: 'EGS65R01C015', name: 'Arabia for Investment and Development',                                nameAr: 'ارابيا للاستثمار والتنمية',                                                  color: '#252F4A', sector: 'Financials' },
  ICLE:  { symbolCode: 'EGS67001C015', name: 'International Company for Leasing (IncoLEASE)',                        nameAr: 'الدولية للتأجير التمويلي (إنكوليس)',                                         color: '#252F4A', sector: 'Financials' },
  SEIG:  { symbolCode: 'EGS67031C012', name: 'Saudi Egyptian Investment & Finance',                                  nameAr: 'السعودية المصرية للاستثمار والتمويل',                                        color: '#252F4A', sector: 'Financials' },
  ODIN:  { symbolCode: 'EGS67181C015', name: 'Oden Financial Investments',                                           nameAr: 'اودن للاستثمارات الماليه',                                                   color: '#252F4A', sector: 'Financials' },
  ICID:  { symbolCode: 'EGS67191C014', name: 'International Co for Investment & Development',                        nameAr: 'العالميه للاستثمار والتنميه',                                                color: '#252F4A', sector: 'Financials' },
  AMIA:  { symbolCode: 'EGS67221C019', name: 'Arab Moltaqa Investments',                                             nameAr: 'الملتقي العربي للاستثمارات',                                                 color: '#252F4A', sector: 'Financials' },
  CFGH:  { symbolCode: 'EGS672I2C014', name: 'Arafa Holding',                                                        nameAr: 'العرفة للاستثمارات والاستشارات',                                             color: '#252F4A', sector: 'Financials' },
  TYCN:  { symbolCode: 'EGS67331C016', name: 'Tycoon Investments Holding',                                           nameAr: 'تايكون انفستمنتس هولدنج',                                                    color: '#252F4A', sector: 'Financials' },
  GBCO:  { symbolCode: 'EGS673T1C012', name: 'GB Corp',                                                              nameAr: 'جى بى كوربوريشن',                                                            color: '#252F4A', sector: 'Financials' },
  ATLC:  { symbolCode: 'EGS676N1C015', name: 'Al Tawfiq Leasing Company',                                            nameAr: 'التوفيق للتأجير التمويلي',                                                   color: '#252F4A', sector: 'Financials' },
  EBSC:  { symbolCode: 'EGS68181C014', name: 'Osool ESB Securities Brokerage',                                       nameAr: 'اصول للوساطة فى الاوراق المالية E.S.B',                                     color: '#252F4A', sector: 'Financials' },
  EASB:  { symbolCode: 'EGS681D1C010', name: 'Cmar',                                                                 nameAr: 'الشركة المصرية العربية ثمار لتداول الاوراق الماليه',                         color: '#252F4A', sector: 'Financials' },
  EOSB:  { symbolCode: 'EGS681I1C015', name: 'El Orouba Securities Brokerage',                                       nameAr: 'العروبة للسمسرة فى الاوراق المالية',                                         color: '#252F4A', sector: 'Financials' },
  KWIN:  { symbolCode: 'EGS69011C012', name: 'El Kahera El Watania Investment',                                      nameAr: 'القاهرة الوطنية للاستثمار والاوراق المالية',                                 color: '#252F4A', sector: 'Financials' },
  AFDI:  { symbolCode: 'EGS69021C011', name: 'Al Ahli Development & Investment',                                     nameAr: 'الاهلي للتنمية والاستثمار',                                                  color: '#252F4A', sector: 'Financials' },
  HCFI:  { symbolCode: 'EGS69071C016', name: 'The Holding Company for Financial Investments (Lakah Group)',          nameAr: 'القابضه للاستثمارات الماليه - ل.ك.ح جروب',                                  color: '#252F4A', sector: 'Financials' },
  VLMRA: { symbolCode: 'EGS69081C023', name: 'Valmore Holding',                                                      nameAr: 'ڨالمور القابضة للاستثمار - جنيه مصري',                                       color: '#252F4A', sector: 'Financials' },
  RAYA:  { symbolCode: 'EGS690C1C010', name: 'Raya Holding',                                                         nameAr: 'راية القابضة للاستثمارات الماليه',                                           color: '#B07A03', sector: 'Tech' },
  HRHO:  { symbolCode: 'EGS69101C011', name: 'EFG Holding',                                                          nameAr: 'مجموعه اى اف جى القابضه',                                                    color: '#1F4488', sector: 'Financials' },
  NAHO:  { symbolCode: 'EGS69182C011', name: 'Naeem Holding',                                                        nameAr: 'النعيم القابضة للاستثمارات',                                                 color: '#252F4A', sector: 'Financials' },
  PRMH:  { symbolCode: 'EGS691A1C011', name: 'Prime Holding',                                                        nameAr: 'برايم القابضه للاستثمارات الماليه',                                          color: '#252F4A', sector: 'Financials' },
  CICH:  { symbolCode: 'EGS691D1C018', name: 'CI Capital',                                                           nameAr: 'سى اى كابيتال',                                                              color: '#252F4A', sector: 'Financials' },
  BTFH:  { symbolCode: 'EGS691G1C015', name: 'Beltone Financial Holding',                                            nameAr: 'بلتون الماليه القابضه',                                                      color: '#252F4A', sector: 'Financials' },
  ASPI:  { symbolCode: 'EGS691L1C018', name: 'Aspire Capital Holding',                                               nameAr: 'اسباير كابيتال القابضة للاستمارات المالية',                                  color: '#1A6B5A', sector: 'Financials' },
  BINV:  { symbolCode: 'EGS691T1C010', name: 'B Investment',                                                         nameAr: 'بي انفستمنتس',                                                               color: '#252F4A', sector: 'Financials' },
  GRCA:  { symbolCode: 'EGS69261C013', name: 'Grand Investment Capital',                                             nameAr: 'جراند انفستمنت القابضة للاستثمارات المالية',                                 color: '#252F4A', sector: 'Financials' },
  OIH:   { symbolCode: 'EGS693V1C014', name: 'Orascom Holding',                                                      nameAr: 'اوراسكوم للاستثمار القابضه',                                                 color: '#252F4A', sector: 'Financials' },
  EGX30ETF: { symbolCode: 'EGS69491M015', name: 'EGX30 Index ETF',                                                   nameAr: 'شركة صناديق المؤشرات',                                                       color: '#252F4A', sector: 'Financials' },
  EGREF: { symbolCode: 'EGS694B1C017', name: 'Egyptian Real Estate Fund Certificates',                               nameAr: 'وثائق صندوق المصريين للاستثمار العقارى',                                     color: '#252F4A', sector: 'Financials' },
  OFH:   { symbolCode: 'EGS696S1C016', name: 'OB Financial Holding',                                                 nameAr: 'او بى المالية القابضة',                                                      color: '#252F4A', sector: 'Financials' },
  KASABF: { symbolCode: 'EGS696Z1C017', name: 'Odin Egyptian Equity Investment Fund (KASAB)',                        nameAr: 'وثائق صندوق استثمار أودن للاستثمار في الاسهم المصرية -كسب',                 color: '#252F4A', sector: 'Financials' },
  ACAP:  { symbolCode: 'EGS697S1C015', name: 'A Capital Holding',                                                    nameAr: 'ايه كابيتال القابضة',                                                        color: '#252F4A', sector: 'Financials' },
  CPME:  { symbolCode: 'EGS698X1C017', name: 'Catalyst Partners Middle East',                                        nameAr: 'كاتليست بارتنرز ميديل ايست',                                                 color: '#252F4A', sector: 'Financials' },
  ACAMD: { symbolCode: 'EGS72AQ1C016', name: 'Arab Company for Asset Management and Development',                    nameAr: 'العربية لادارة وتطوير الاصول',                                               color: '#252F4A', sector: 'Financials' },
  CCAP:  { symbolCode: 'EGS73541C012', name: 'Citadel Capital',                                                      nameAr: 'القلعة للاستشارات الماليه',                                                  color: '#252F4A', sector: 'Financials' },
  CNFN:  { symbolCode: 'EGS738I1C018', name: 'Contact Financial Holding',                                            nameAr: 'كونتكت المالية القابضة',                                                     color: '#252F4A', sector: 'Financials' },
  TWSA:  { symbolCode: 'EGS7D231C010', name: 'Tawasoa for Factoring',                                                nameAr: 'توسع للتخصيم',                                                               color: '#252F4A', sector: 'Financials' },
  ACTF:  { symbolCode: 'EGS7D5P1C019', name: 'Act Financial',                                                        nameAr: 'اكت فاينانشال للاستشارات',                                                   color: '#252F4A', sector: 'Financials' },
  ODID:  { symbolCode: 'EGS7DBU1C018', name: 'ODEN for Investment & Development',                                    nameAr: 'اودن للاستثمار و التنمية',                                                   color: '#252F4A', sector: 'Financials' },
  /* ── Tourism ─────────────────────────────────────────────────────────── */
  EITP:  { symbolCode: 'EGS70011C019', name: 'Egyptian International Tourism Projects',                              nameAr: 'المصرية للمشروعات السياحية العالمية',                                        color: '#2A5A4A', sector: 'Tourism' },
  MHOT:  { symbolCode: 'EGS70081C012', name: 'Hilton Misr Hotels',                                                   nameAr: 'مصر للفنادق - هيلتون',                                                       color: '#2A5A4A', sector: 'Tourism' },
  RMTV:  { symbolCode: 'EGS70131C015', name: 'Rowad Misr Tourism Investment',                                        nameAr: 'رواد مصر للاستثمار السياحى',                                                 color: '#2A5A4A', sector: 'Tourism' },
  RTVC:  { symbolCode: 'EGS70271C019', name: 'Remco',                                                                nameAr: 'رمكو لانشاء القرى السياحيه',                                                  color: '#2A5A4A', sector: 'Tourism' },
  ROTO:  { symbolCode: 'EGS70281C018', name: 'Rowad Tourism (Al Rowad)',                                             nameAr: 'رواد السياحة - رواد',                                                         color: '#2A5A4A', sector: 'Tourism' },
  ORHD:  { symbolCode: 'EGS70321C012', name: 'Orascom Development Egypt',                                            nameAr: 'اوراسكوم للتنميه مصر',                                                       color: '#2A5A4A', sector: 'Tourism' },
  PHTV:  { symbolCode: 'EGS70331C011', name: 'Pyramisa Hotels',                                                      nameAr: 'بيراميزا للفنادق والقرى السياحية - بيراميزا',                                color: '#2A5A4A', sector: 'Tourism' },
  GPPL:  { symbolCode: 'EGS70342C018', name: 'Golden Pyramids Plaza',                                                nameAr: 'جولدن بيراميدز بلازا',                                                       color: '#2A5A4A', sector: 'Tourism' },
  EGTS:  { symbolCode: 'EGS70431C019', name: 'Egyptian for Tourism',                                                 nameAr: 'المصرية للمنتجعات',                                                          color: '#2A5A4A', sector: 'Tourism' },
  SDTI:  { symbolCode: 'EGS70571C012', name: 'Sharm Dreams',                                                         nameAr: 'شارم دريمز للاستثمار السياحي',                                               color: '#2A5A4A', sector: 'Tourism' },
  SPHT:  { symbolCode: 'EGS70H02C014', name: 'El Shams Pyramids for Hotels & Touristic Projects',                   nameAr: 'الشمس بيراميدز للفنادق والمنشأت السياحية',                                  color: '#2A5A4A', sector: 'Tourism' },
  MMAT:  { symbolCode: 'EGS70P91C010', name: 'Marsa Marsa Alam',                                                     nameAr: 'مرسي  مرسي علم للتنمية السياحية',                                            color: '#2A5A4A', sector: 'Tourism' },
  ELWA:  { symbolCode: 'EGS70R91C016', name: 'Elwadi for International Investment & Development',                    nameAr: 'الوادي العالمية  للاستثمار السياحي',                                         color: '#2A5A4A', sector: 'Tourism' },
  TRTO:  { symbolCode: 'EGS79072C012', name: 'Trans Oceans Tours',                                                   nameAr: 'عبر المحيطات للسياحه',                                                       color: '#2A5A4A', sector: 'Tourism' },
  /* ── Healthcare ─────────────────────────────────────────────────────── */
  FCMD:  { symbolCode: 'EGS3I0S1C019', name: 'Future Care for Medical Industries',                                   nameAr: 'فيوتشر كير للصناعات الطبية',                                                 color: '#2A4A6A', sector: 'Healthcare' },
  UPMS:  { symbolCode: 'EGS3I1D1C015', name: 'Federation of Pharmaceutical Services',                               nameAr: 'الاتحاد الصيدلي للخدمات الطبيه',                                             color: '#2A4A6A', sector: 'Healthcare' },
  NINH:  { symbolCode: 'EGS72011C017', name: 'Nozha International Hospital',                                         nameAr: 'مستشفى النزهه الدولي',                                                       color: '#2A4A6A', sector: 'Healthcare' },
  AMES:  { symbolCode: 'EGS72081C010', name: 'Alexandria New Medical Center',                                        nameAr: 'الاسكندرية للخدمات الطبية -المركز الطبى الجديد',                             color: '#2A4A6A', sector: 'Healthcare' },
  CLHO:  { symbolCode: 'EGS729J1C018', name: 'Cleopatra Hospital',                                                   nameAr: 'مستشفي كليوباترا ش.م.م',                                                     color: '#2A4A6A', sector: 'Healthcare' },
  PHGC:  { symbolCode: 'EGS72XL1C014', name: 'Premium Healthcare Group',                                            nameAr: 'بريميم هيلثكير جروب',                                                        color: '#2A4A6A', sector: 'Healthcare' },
  SPMD:  { symbolCode: 'EGS73BR1C013', name: 'Speed Medical',                                                        nameAr: 'سبيد ميديكال',                                                               color: '#2A4A6A', sector: 'Healthcare' },
  FTNS:  { symbolCode: 'EGS774M1C017', name: 'Fitness Prime Health Clubs',                                           nameAr: 'فتنس برايم للاندية الصحية',                                                  color: '#2A4A6A', sector: 'Healthcare' },
  /* ── Education ──────────────────────────────────────────────────────── */
  TALM:  { symbolCode: 'EGS597R1C017', name: 'Taaleem Management Services',                                          nameAr: 'تعليم لخدمات الإدارة',                                                       color: '#4A3A7A', sector: 'Education' },
  CAED:  { symbolCode: 'EGS72201C014', name: 'Cairo Educational Services',                                           nameAr: 'القاهرة للخدمات التعليمية',                                                  color: '#4A3A7A', sector: 'Education' },
  MOED:  { symbolCode: 'EGS729F1C012', name: 'The Egyptian Modern Education Systems',                                nameAr: 'المصرية لنظم التعليم الحديثه',                                               color: '#4A3A7A', sector: 'Education' },
  CIRA:  { symbolCode: 'EGS65541C012', name: 'CIRA Education',                                                       nameAr: 'القاهره للاستثمار والتنميه العقاريه(سيرا للتعليم)',                           color: '#4A3A7A', sector: 'Education' },
  /* ── Tech ───────────────────────────────────────────────────────────── */
  GTHE:  { symbolCode: 'EGS74081C018', name: 'Global Telecom',                                                       nameAr: 'جلوبال',                                                                     color: '#B07A03', sector: 'Tech' },
  SCTS:  { symbolCode: 'EGS740C1C010', name: 'Suez Canal Company for Technology Settling',                           nameAr: 'قناه السويس لتوطين التكنولوجيا',                                             color: '#B07A03', sector: 'Tech' },
  RACC:  { symbolCode: 'EGS74191C015', name: 'Raya Contact Center',                                                  nameAr: 'راية لخدمات مراكز الأتصالات',                                                color: '#B07A03', sector: 'Tech' },
  EFIH:  { symbolCode: 'EGS743O1C013', name: 'E-Finance for Digital and Financial Investments',                      nameAr: 'ايه فينانس للاستثمارات الماليه الرقميه',                                     color: '#B07A03', sector: 'Tech' },
  FWRY:  { symbolCode: 'EGS745L1C014', name: 'Fawry',                                                                nameAr: 'فوري للمدفوعات',                                                             color: '#F3A203', sector: 'Tech' },
  AMPI:  { symbolCode: 'EGS745W1C011', name: 'Novida for Investment and Technology',                                 nameAr: 'نوفيدا للإستثمار والتكنولوجيا',                                              color: '#B07A03', sector: 'Tech' },
  VERT:  { symbolCode: 'EGS74801C019', name: 'Vertika Software',                                                     nameAr: 'فرتيكا للبرمجيات',                                                           color: '#B07A03', sector: 'Tech' },
  DGTZ:  { symbolCode: 'EGS74F71C015', name: 'Digitize for Investment and Technology',                               nameAr: 'ديجيتايز للاستثمار والتقنية',                                                color: '#B07A03', sector: 'Tech' },
  /* ── Media ──────────────────────────────────────────────────────────── */
  MPRC:  { symbolCode: 'EGS78021C010', name: 'Egyptian Media Production City',                                       nameAr: 'المصرية لمدينة الانتاج الاعلامى',                                            color: '#5A3A7A', sector: 'Media' },
};

export const ACTION_TYPES: Record<ActionType, ActionTypeMeta> = {
  cash_dividend:    { label: 'Cash Dividend',    labelAr: 'توزيعات نقديه',   short: 'DIV',    color: '#3DB200', icon: 'currency-circle-dollar' },
  bonus_shares:     { label: 'Stock Dividend',   labelAr: 'أسهم مجانيه',     short: 'BONUS',  color: '#F3A203', icon: 'gift' },
  stock_split:      { label: 'Stock Split',      labelAr: 'تقسيم أسهم',      short: 'SPLIT',  color: '#9A4AE6', icon: 'arrows-out-line-horizontal' },
  reverse_split:    { label: 'Reverse Split',    labelAr: 'تقسيم عكسي',      short: 'RSPLIT', color: '#C084FC', icon: 'arrows-in-line-horizontal' },
  capital_increase: { label: 'Capital Increase', labelAr: 'زيادة رأس مال',   short: 'CAP',    color: '#4DA6FF', icon: 'trend-up' },
  tender_offer:     { label: 'Tender Offer',     labelAr: 'عرض شراء خاص',   short: 'M&A',    color: '#FF6B9D', icon: 'handshake' },
  ipo:              { label: 'IPO',               labelAr: 'طرح عام أولي',   short: 'IPO',    color: '#A78BFA', icon: 'rocket-launch' },
};

export const STATUS_META: Record<ActionStatus, StatusMeta> = {
  upcoming:  { label: 'Upcoming',  labelAr: 'قادم',                tone: 'yellow' },
  announced: { label: 'Announced', labelAr: 'أُعلن',               tone: 'grey'   },
  ongoing:   { label: 'Ongoing',   labelAr: 'جارٍ',                tone: 'orange' },
  ex_date:   { label: 'Ex-Date',   labelAr: 'تاريخ التداول بدون', tone: 'blue'   },
  paid:      { label: 'Completed', labelAr: 'مكتمل',               tone: 'green'  },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي',                tone: 'red'    },
};

export function statusFor(action: CorporateAction): ActionStatus {
  const today = TODAY.getTime();
  const ex = new Date(action.exDate).getTime();
  const pay = action.paymentDate ? new Date(action.paymentDate).getTime() : null;
  if (action.cancelled) return 'cancelled';
  if (pay && today >= pay) return 'paid';
  if (today >= ex) {
    // Installment dividends: ongoing while future payments remain
    const installments = (action.details as Record<string, unknown>)?.installments as Array<{ date: string }> | undefined;
    if (installments?.some(i => new Date(i.date).getTime() > today)) return 'ongoing';
    // Capital increases: completed only when subscribed-shares trading start (col Z) is set and past
    if (action.type === 'capital_increase') {
      const d = action.details as Record<string, unknown>;
      const tranche2TradingStart = d.tranche2TradingStart as string | undefined;
      if (tranche2TradingStart && today >= new Date(tranche2TradingStart).getTime()) return 'paid';
      return 'ongoing';
    }
    // IPOs: completed once first trading day has passed, otherwise ongoing
    if (action.type === 'ipo') {
      const d = action.details as Record<string, unknown>;
      const firstTradingDay = d.firstTradingDay as string | undefined;
      if (firstTradingDay && today >= new Date(firstTradingDay).getTime()) return 'paid';
      return 'ongoing';
    }
    // Tender Offers: ongoing while within offer window, paid once tenderEnd passes
    if (action.type === 'tender_offer') {
      const d = action.details as Record<string, unknown>;
      const tenderEnd = d.tenderEnd as string | undefined;
      if (tenderEnd && today >= new Date(tenderEnd).getTime()) return 'paid';
      return 'ongoing';
    }
    return 'ex_date';
  }
  if (action.announceDate && today < new Date(action.announceDate).getTime()) return 'announced';
  return 'upcoming';
}

const RAW_ACTIONS: CorporateAction[] = [];

export function allActions(): CorporateActionWithStatus[] {
  return RAW_ACTIONS.map(a => ({ ...a, status: statusFor(a) }));
}

export function actionsForSymbol(symbol: string): CorporateActionWithStatus[] {
  return RAW_ACTIONS
    .filter(a => a.symbol === symbol)
    .map(a => ({ ...a, status: statusFor(a) }))
    .sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
}

export function fmtDate(iso: string | undefined, opts: { short?: boolean; long?: boolean; lang?: 'en' | 'ar' } = {}): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthsLong = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthsAr  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  if (opts.lang === 'ar') return `${d.getDate()} ${monthsAr[d.getMonth()]} ${d.getFullYear()}`;
  if (opts.short) return `${d.getDate()} ${months[d.getMonth()]}`;
  if (opts.long)  return `${monthsLong[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtMoney(n: number | null | undefined, currency = 'EGP'): string {
  if (n == null) return '—';
  const num = Number(n);
  const decimalsNeeded = num % 1 === 0 ? 0 : String(num).replace(/^[^.]*\.?/, '').replace(/0+$/, '').length;
  const maxDec = Math.max(2, Math.min(decimalsNeeded, 4));
  const formatted = num % 1 === 0
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: maxDec, maximumFractionDigits: maxDec });
  return `${formatted} ${currency}`;
}

export function fmtBigNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export function daysFromToday(iso: string | undefined): number {
  if (!iso) return 0;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local midnight — avoids UTC-parse offset
  return Math.round((date.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeDay(iso: string): string {
  const diff = daysFromToday(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0 && diff >= -7) return `${-diff} days ago`;
  return fmtDate(iso, { short: true });
}

export const WATCHLIST = ['COMI', 'HRHO', 'TMGH', 'FWRY', 'HELI', 'ORWE'];

export const DEFINITIONS: Record<string, { label: string; text: string; labelAr: string; textAr: string }> = {
  exDate:            { label: 'Ex-Date',            text: 'The first trading day on which the stock trades without the right to receive this corporate action. To be eligible, you must own the stock the day before the ex-date.',
                       labelAr: 'تاريخ الإكس-ديت',   textAr: 'أول يوم تداول يُتداول فيه السهم دون حق الحصول على هذا الإجراء. لكي تكون مؤهلاً، يجب أن تمتلك السهم قبل يوم واحد من هذا التاريخ.' },
  recordDate:        { label: 'Record Date',         text: 'The cutoff date used to determine which shareholders are entitled to the corporate action.',
                       labelAr: 'تاريخ الاستحقاق',    textAr: 'تاريخ الإغلاق الذي يُحدَّد بناءً عليه المساهمون المستحقون للإجراء.' },
  eligibility:       { label: 'Eligibility date',    text: 'The cutoff date used to determine who receives the dividend.',
                       labelAr: 'تاريخ الاستحقاق',    textAr: 'تاريخ الإغلاق الذي يُحدَّد بناءً عليه المستفيدون من توزيع الأرباح.' },
  payout:            { label: 'Payout date',         text: 'The day the company pays dividends to eligible shareholders.',
                       labelAr: 'تاريخ التوزيع',       textAr: 'اليوم الذي تدفع فيه الشركة الأرباح للمساهمين المستحقين.' },
  paymentDate:       { label: 'Payment Date',        text: 'The day Thndr credits the dividend (or bonus shares) to your account.',
                       labelAr: 'تاريخ الدفع',        textAr: 'اليوم الذي تُقيِّد فيه ثندر الأرباح أو الأسهم المجانية في حسابك.' },
  announceDate:      { label: 'Announce Date',       text: 'The day the company officially announced this corporate action to the market.',
                       labelAr: 'تاريخ الإعلان',      textAr: 'اليوم الذي أعلنت فيه الشركة رسمياً عن هذا الإجراء في السوق.' },
  subscriptionPrice: { label: 'Subscription Price',  text: 'The price per share you pay to exercise your right and receive a new share.',
                       labelAr: 'سعر الاكتتاب',       textAr: 'السعر الذي تدفعه لكل سهم لممارسة حقك والحصول على سهم جديد.' },
  ratio:             { label: 'Ratio',               text: 'The proportion of new shares (or rights) you receive per share you already own.',
                       labelAr: 'النسبة',             textAr: 'نسبة الأسهم الجديدة أو الحقوق التي تحصل عليها مقابل كل سهم تمتلكه.' },
  yieldPct:          { label: 'Dividend Yield',      text: 'Annualised dividend amount divided by the share price, expressed as a percent.',
                       labelAr: 'العائد الموزَّع',    textAr: 'مبلغ الأرباح السنوي مقسوماً على سعر السهم، معبَّراً عنه كنسبة مئوية.' },
  taxWithholding:    { label: 'Withholding Tax',     text: 'Tax deducted by the EGX before dividends are paid out. Currently 10% for individual investors in Egypt.',
                       labelAr: 'ضريبة الخصم',        textAr: 'الضريبة المخصومة من قِبَل البورصة المصرية قبل صرف الأرباح. حالياً 10% للمستثمرين الأفراد في مصر.' },
  premiumPct:        { label: 'Premium',             text: 'How much above the current market price the offer is.',
                       labelAr: 'العلاوة',            textAr: 'مقدار ما يزيد به سعر العرض عن السعر السوقي الحالي.' },
};
