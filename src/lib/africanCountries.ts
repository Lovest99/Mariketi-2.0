import type { AfricanRegion } from '../types/mariketi';

export interface AfricanCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  region: AfricanRegion;
  vetAuthority: string;
  provinces: Record<string, string[]>;
}

export const AFRICAN_REGIONS: AfricanRegion[] = [
  'Southern Africa',
  'East Africa',
  'West Africa',
  'Central Africa',
  'North Africa',
];

export const AFRICAN_REGION_SUMMARY: {
  region: AfricanRegion;
  shortLabel: string;
  highlightFlags: string[];
  description: string;
}[] = [
  {
    region: 'Southern Africa',
    shortLabel: 'Southern Africa',
    highlightFlags: ['🇿🇼', '🇿🇦', '🇧🇼', '🇳🇦', '🇿🇲'],
    description: 'Launch anchor hubs across Zimbabwe, South Africa, Botswana, Namibia, Zambia & SADC corridors.',
  },
  {
    region: 'East Africa',
    shortLabel: 'East Africa',
    highlightFlags: ['🇰🇪', '🇹🇿', '🇺🇬', '🇪🇹', '🇷🇼'],
    description: 'High-volume pastoral & ranching markets across Kenya, Tanzania, Uganda, Ethiopia & Rwanda.',
  },
  {
    region: 'West Africa',
    shortLabel: 'West Africa',
    highlightFlags: ['🇳🇬', '🇬🇭', '🇸🇳', '🇲🇱', '🇳🇪'],
    description: 'Sahel-to-coast cattle, goat, and sheep trade across Nigeria, Ghana, Senegal, Mali & ECOWAS.',
  },
  {
    region: 'Central Africa',
    shortLabel: 'Central Africa',
    highlightFlags: ['🇨🇲', '🇹🇩', '🇨🇩', '🇨🇬', '🇬🇦'],
    description: 'Adamawa plateau and savanna livestock trade across Cameroon, Chad, DR Congo & Gabon.',
  },
  {
    region: 'North Africa',
    shortLabel: 'North Africa',
    highlightFlags: ['🇪🇬', '🇲🇦', '🇸🇩', '🇩🇿', '🇹🇳'],
    description: 'Commercial feedlot, dairy, and sheep corridors across Sudan, Egypt, Morocco, Algeria & Tunisia.',
  },
];

/**
 * Complete directory of all 54 sovereign African nations, ordered from
 * Southern Africa -> East Africa -> West Africa -> Central Africa -> North Africa.
 */
export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  // ======================== SOUTHERN AFRICA (10) ========================
  {
    code: 'ZW',
    name: 'Zimbabwe',
    flag: '🇿🇼',
    dialCode: '+263',
    region: 'Southern Africa',
    vetAuthority: 'DVS Zimbabwe',
    provinces: {
      'Matabeleland South': ['Gwanda', 'Beitbridge', 'Umzingwane', 'Matobo', 'Insiza', 'Plumtree'],
      'Matabeleland North': ['Lupane', 'Bubi', 'Umguza', 'Hwange', 'Nkayi'],
      'Mashonaland East': ['Marondera', 'Macheke', 'Goromonzi', 'Murehwa', 'Chikomba', 'Wedza'],
      'Mashonaland West': ['Chinhoyi', 'Kadoma', 'Chegutu', 'Makonde', 'Hurungwe', 'Zvimba'],
      'Mashonaland Central': ['Bindura', 'Mazowe', 'Shamva', 'Guruve', 'Mount Darwin'],
      Midlands: ['Gweru', 'Kwekwe', 'Zvishavane', 'Shurugwi', 'Gokwe South', 'Mvuma'],
      Masvingo: ['Masvingo', 'Chiredzi', 'Mwenezi', 'Gutu', 'Bikita'],
      Manicaland: ['Mutare', 'Rusape', 'Chipinge', 'Nyanga', 'Makoni'],
      Harare: ['Harare', 'Chitungwiza', 'Epworth'],
      Bulawayo: ['Bulawayo'],
    },
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    dialCode: '+27',
    region: 'Southern Africa',
    vetAuthority: 'DALRRD Veterinary Services',
    provinces: {
      'Eastern Cape': ['Graaff-Reinet', 'Queenstown', 'Cradock', 'Gqeberha', 'East London'],
      'Free State': ['Bloemfontein', 'Kroonstad', 'Bethlehem', 'Welkom', 'Harrismith'],
      Limpopo: ['Polokwane', 'Mokopane', 'Musina', 'Tzaneen', 'Bela-Bela'],
      'North West': ['Vryburg', 'Mahikeng', 'Rustenburg', 'Potchefstroom', 'Lichtenburg'],
      'KwaZulu-Natal': ['Pietermaritzburg', 'Ladysmith', 'Vryheid', 'Dundee', 'Kokstad'],
      'Northern Cape': ['Kimberley', 'Upington', 'Kuruman', 'De Aar', 'Springbok'],
      Mpumalanga: ['Mbombela', 'Ermelo', 'Standerton', 'Middelburg'],
      'Western Cape': ['Malmesbury', 'George', 'Oudtshoorn', 'Swellendam'],
      Gauteng: ['Pretoria', 'Johannesburg', 'Heidelberg', 'Vereeniging'],
    },
  },
  {
    code: 'BW',
    name: 'Botswana',
    flag: '🇧🇼',
    dialCode: '+267',
    region: 'Southern Africa',
    vetAuthority: 'DVS Botswana',
    provinces: {
      'South-East': ['Gaborone', 'Lobatse', 'Ramotswa'],
      Central: ['Serowe', 'Palapye', 'Mahalapye', 'Letlhakane'],
      Ghanzi: ['Ghanzi', 'Charles Hill', 'Ncojane'],
      'North-West': ['Maun', 'Gumare', 'Shakawe'],
      Southern: ['Kanye', 'Jwaneng', 'Goodhope'],
      'North-East': ['Francistown', 'Masunga'],
      Kgalagadi: ['Tsabong', 'Kang', 'Hukuntsi'],
      Kweneng: ['Molepolole', 'Letlhakeng'],
      Kgatleng: ['Mochudi', 'Artesia'],
      Chobe: ['Kasane', 'Pandamatenga'],
    },
  },
  {
    code: 'NA',
    name: 'Namibia',
    flag: '🇳🇦',
    dialCode: '+264',
    region: 'Southern Africa',
    vetAuthority: 'DVS Namibia',
    provinces: {
      Omaheke: ['Gobabis', 'Witvlei', 'Leonardville'],
      Otjozondjupa: ['Otjiwarongo', 'Grootfontein', 'Okahandja', 'Otavi'],
      Khomas: ['Windhoek', 'Dordabis'],
      Hardap: ['Mariental', 'Rehoboth', 'Maltahöhe'],
      Karas: ['Keetmanshoop', 'Karasburg', 'Bethanie'],
      Erongo: ['Omaruru', 'Karibib', 'Usakos'],
      Kunene: ['Outjo', 'Opuwo', 'Khorixas'],
      Oshikoto: ['Tsumeb', 'Omuthiya'],
    },
  },
  {
    code: 'ZM',
    name: 'Zambia',
    flag: '🇿🇲',
    dialCode: '+260',
    region: 'Southern Africa',
    vetAuthority: 'DVS Zambia',
    provinces: {
      Southern: ['Choma', 'Mazabuka', 'Monze', 'Kalomo', 'Livingstone'],
      Central: ['Chisamba', 'Kabwe', 'Mkushi', 'Mumbwa'],
      Lusaka: ['Lusaka', 'Chongwe', 'Kafue'],
      Western: ['Mongu', 'Senanga', 'Kaoma'],
      Eastern: ['Chipata', 'Petauke', 'Katete'],
      Copperbelt: ['Ndola', 'Kitwe', 'Chingola'],
    },
  },
  {
    code: 'MZ',
    name: 'Mozambique',
    flag: '🇲🇿',
    dialCode: '+258',
    region: 'Southern Africa',
    vetAuthority: 'DINAV Mozambique',
    provinces: {
      Maputo: ['Maputo', 'Boane', 'Moamba', 'Magude'],
      Gaza: ['Xai-Xai', 'Chókwè', 'Chibuto'],
      Tete: ['Tete', 'Angónia', 'Moatize'],
      Manica: ['Chimoio', 'Gondola', 'Bárue'],
      Sofala: ['Beira', 'Dondo', 'Nhamatanda'],
      Inhambane: ['Inhambane', 'Maxixe', 'Vilankulo'],
    },
  },
  {
    code: 'MW',
    name: 'Malawi',
    flag: '🇲🇼',
    dialCode: '+265',
    region: 'Southern Africa',
    vetAuthority: 'DAHLD Malawi',
    provinces: {
      Central: ['Lilongwe', 'Dedza', 'Kasungu', 'Salima'],
      Southern: ['Blantyre', 'Zomba', 'Chikwawa', 'Thyolo'],
      Northern: ['Mzuzu', 'Mzimba', 'Karonga', 'Chitipa'],
    },
  },
  {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    dialCode: '+244',
    region: 'Southern Africa',
    vetAuthority: 'ISV Angola',
    provinces: {
      Huíla: ['Lubango', 'Matala', 'Humpata'],
      Cunene: ['Ondjiva', 'Xangongo', 'Cahama'],
      Huambo: ['Huambo', 'Caála', 'Bailundo'],
      Luanda: ['Luanda', 'Viana', 'Cacuaco'],
      Benguela: ['Benguela', 'Lobito', 'Cubal'],
    },
  },
  {
    code: 'SZ',
    name: 'Eswatini',
    flag: '🇸🇿',
    dialCode: '+268',
    region: 'Southern Africa',
    vetAuthority: 'DVS Eswatini',
    provinces: {
      Manzini: ['Manzini', 'Malkerns', 'Matsapha'],
      Hhohho: ['Mbabane', 'Piggs Peak'],
      Lubombo: ['Siteki', 'Big Bend', 'Simunye'],
      Shiselweni: ['Nhlangano', 'Hlatikulu'],
    },
  },
  {
    code: 'LS',
    name: 'Lesotho',
    flag: '🇱🇸',
    dialCode: '+266',
    region: 'Southern Africa',
    vetAuthority: 'DLS Lesotho',
    provinces: {
      Maseru: ['Maseru', 'Roma', 'Semonkong'],
      Leribe: ['Hlotse', 'Maputsoe'],
      Mafeteng: ['Mafeteng', 'Tšakholo'],
      MohalesHoek: ["Mohale's Hoek"],
      ThabaTseka: ['Thaba-Tseka'],
    },
  },

  // ======================== EAST AFRICA (14) ========================
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    dialCode: '+254',
    region: 'East Africa',
    vetAuthority: 'DVS Kenya / KVB',
    provinces: {
      Laikipia: ['Nanyuki', 'Rumuruti', 'Nyahururu', 'Doldol'],
      Nakuru: ['Nakuru', 'Naivasha', 'Gilgil', 'Molo', 'Subukia'],
      Kajiado: ['Kajiado', 'Kitengela', 'Namanga', 'Bissil', 'Loitokitok'],
      Narok: ['Narok', 'Kilgoris', 'Suswa'],
      'Uasin Gishu': ['Eldoret', 'Burnt Forest', 'Moiben'],
      Nairobi: ['Nairobi', 'Dagoretti', 'Karen'],
      Samburu: ['Maralal', 'Wamba', 'Archers Post'],
      Isiolo: ['Isiolo', 'Garbatulla', 'Merti'],
      Garissa: ['Garissa', 'Dadaab', 'Ijara'],
      Kiambu: ['Kiambu', 'Thika', 'Limuru', 'Githunguri'],
      Machakos: ['Machakos', 'Athi River', 'Kangundo'],
      Mombasa: ['Mombasa', 'Mariakani'],
    },
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    dialCode: '+255',
    region: 'East Africa',
    vetAuthority: 'TVLA / DVS Tanzania',
    provinces: {
      Arusha: ['Arusha', 'Monduli', 'Longido', 'Karatu', 'Ngorongoro'],
      Manyara: ['Babati', 'Kiteto', 'Simanjiro', 'Hanang'],
      Dodoma: ['Dodoma', 'Kongwa', 'Kondoa', 'Mpwapwa'],
      Shinyanga: ['Shinyanga', 'Kahama', 'Kishapu'],
      Mwanza: ['Mwanza', 'Magu', 'Kwimba', 'Sengerema'],
      'Dar es Salaam': ['Dar es Salaam', 'Pugu', 'Kigamboni'],
      Kilimanjaro: ['Moshi', 'Hai', 'Siha'],
      Tanga: ['Tanga', 'Handeni', 'Korogwe'],
      Mbeya: ['Mbeya', 'Mbarali', 'Chunya'],
      Tabora: ['Tabora', 'Nzega', 'Igunga'],
    },
  },
  {
    code: 'UG',
    name: 'Uganda',
    flag: '🇺🇬',
    dialCode: '+256',
    region: 'East Africa',
    vetAuthority: 'MAAIF Uganda',
    provinces: {
      'Western Region': ['Mbarara', 'Kiruhura', 'Ntungamo', 'Isingiro', 'Lyantonde'],
      'Central Region': ['Kampala', 'Nakasongola', 'Sembabule', 'Luwero', 'Wakiso'],
      'Northern Region': ['Gulu', 'Lira', 'Moroto', 'Kotido', 'Arua'],
      'Eastern Region': ['Mbale', 'Soroti', 'Jinja', 'Tororo', 'Kumi'],
    },
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    flag: '🇪🇹',
    dialCode: '+251',
    region: 'East Africa',
    vetAuthority: 'MoA Veterinary Services Ethiopia',
    provinces: {
      Oromia: ['Adama', 'Bishoftu', 'Yabello', 'Modjo', 'Jimma', 'Shashamane'],
      'Addis Ababa': ['Addis Ababa', 'Bole', 'Akaki Kality'],
      Amhara: ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Birhan'],
      Somali: ['Jijiga', 'Gode', 'Kebri Dahar'],
      Sidama: ['Hawassa', 'Yirgalem'],
      Afar: ['Semera', 'Awash'],
      Tigray: ['Mekelle', 'Shire'],
    },
  },
  {
    code: 'RW',
    name: 'Rwanda',
    flag: '🇷🇼',
    dialCode: '+250',
    region: 'East Africa',
    vetAuthority: 'RAB Rwanda',
    provinces: {
      'Eastern Province': ['Nyagatare', 'Gatsibo', 'Kayonza', 'Bugesera'],
      Kigali: ['Kigali', 'Gasabo', 'Kicukiro'],
      'Northern Province': ['Musanze', 'Gicumbi', 'Burera'],
      'Southern Province': ['Huye', 'Nyanza', 'Muhanga'],
      'Western Province': ['Rubavu', 'Nyabihu', 'Karongi'],
    },
  },
  {
    code: 'BI',
    name: 'Burundi',
    flag: '🇧🇮',
    dialCode: '+257',
    region: 'East Africa',
    vetAuthority: 'MINEAGRIE Burundi',
    provinces: {
      Bujumbura: ['Bujumbura', 'Isale'],
      Gitega: ['Gitega', 'Giheta'],
      Ngozi: ['Ngozi', 'Busiga'],
      Muyinga: ['Muyinga', 'Giteranyi'],
    },
  },
  {
    code: 'SO',
    name: 'Somalia',
    flag: '🇸🇴',
    dialCode: '+252',
    region: 'East Africa',
    vetAuthority: 'MoLFR Somalia',
    provinces: {
      Banaadir: ['Mogadishu'],
      Puntland: ['Garowe', 'Bosaso', 'Galkayo'],
      Somaliland: ['Hargeisa', 'Berbera', 'Burao'],
      Jubaland: ['Kismayo', 'Baidoa'],
    },
  },
  {
    code: 'SS',
    name: 'South Sudan',
    flag: '🇸🇸',
    dialCode: '+211',
    region: 'East Africa',
    vetAuthority: 'MLF South Sudan',
    provinces: {
      'Central Equatoria': ['Juba', 'Terekeka', 'Yei'],
      Jonglei: ['Bor', 'Pibor'],
      Lakes: ['Rumbek', 'Yirol'],
      Warrap: ['Kuajok', 'Tonj'],
    },
  },
  {
    code: 'ER',
    name: 'Eritrea',
    flag: '🇪🇷',
    dialCode: '+291',
    region: 'East Africa',
    vetAuthority: 'MoA Eritrea',
    provinces: {
      Maekel: ['Asmara'],
      'Gash-Barka': ['Barentu', 'Teseney'],
      Anseba: ['Keren'],
      Debub: ['Mendefera', 'Dekemhare'],
    },
  },
  {
    code: 'DJ',
    name: 'Djibouti',
    flag: '🇩🇯',
    dialCode: '+253',
    region: 'East Africa',
    vetAuthority: 'MAEPE-RH Djibouti',
    provinces: {
      Djibouti: ['Djibouti City', 'Balbala'],
      'Ali Sabieh': ['Ali Sabieh'],
      Dikhil: ['Dikhil'],
      Tadjourah: ['Tadjourah'],
    },
  },
  {
    code: 'MG',
    name: 'Madagascar',
    flag: '🇲🇬',
    dialCode: '+261',
    region: 'East Africa',
    vetAuthority: 'DSV Madagascar',
    provinces: {
      Analamanga: ['Antananarivo', 'Ambohidratrimo'],
      Vakinankaratra: ['Antsirabe', 'Betafo'],
      'Atsimo-Andrefana': ['Toliara', 'Sakaraha'],
      Boeny: ['Mahajanga', 'Marovoay'],
    },
  },
  {
    code: 'MU',
    name: 'Mauritius',
    flag: '🇲🇺',
    dialCode: '+230',
    region: 'East Africa',
    vetAuthority: 'DVS Mauritius',
    provinces: {
      'Port Louis': ['Port Louis'],
      'Plaines Wilhems': ['Curepipe', 'Quatre Bornes'],
      Flacq: ['Centre de Flacq'],
      Rodrigues: ['Port Mathurin'],
    },
  },
  {
    code: 'KM',
    name: 'Comoros',
    flag: '🇰🇲',
    dialCode: '+269',
    region: 'East Africa',
    vetAuthority: 'MAPA Comoros',
    provinces: {
      'Grande Comore': ['Moroni', 'Mitsamiouli'],
      Anjouan: ['Mutsamudu'],
      Mohéli: ['Fomboni'],
    },
  },
  {
    code: 'SC',
    name: 'Seychelles',
    flag: '🇸🇨',
    dialCode: '+248',
    region: 'East Africa',
    vetAuthority: 'SAA Seychelles',
    provinces: {
      Mahé: ['Victoria', 'Anse Royale'],
      Praslin: ['Baie Sainte Anne'],
    },
  },

  // ======================== WEST AFRICA (16) ========================
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    dialCode: '+234',
    region: 'West Africa',
    vetAuthority: 'FDVPCS / NVRI Nigeria',
    provinces: {
      Kaduna: ['Zaria', 'Kaduna', 'Kafanchan', 'Kachia'],
      Kano: ['Kano', 'Wudil', 'Bichi', 'Dambatta'],
      Sokoto: ['Sokoto', 'Tambuwal', 'Illela'],
      Adamawa: ['Yola', 'Mubi', 'Numan'],
      Plateau: ['Jos', 'Vom', 'Bokkos'],
      Oyo: ['Ibadan', 'Ogbomoso', 'Iseyin'],
      Lagos: ['Lagos', 'Agege', 'Ikorodu', 'Epe'],
      Ogun: ['Abeokuta', 'Sagamu', 'Ota'],
      Abuja: ['Abuja', 'Gwagwalada', 'Kuje'],
    },
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    dialCode: '+233',
    region: 'West Africa',
    vetAuthority: 'VSD Ghana',
    provinces: {
      Northern: ['Tamale', 'Yendi', 'Savelugu'],
      'Upper East': ['Bolgatanga', 'Bawku', 'Navrongo'],
      Ashanti: ['Kumasi', 'Ejura', 'Mampong'],
      'Greater Accra': ['Accra', 'Tema', 'Shai Osudoku'],
      Volta: ['Ho', 'Sogakope', 'Akatsi'],
    },
  },
  {
    code: 'SN',
    name: 'Senegal',
    flag: '🇸🇳',
    dialCode: '+221',
    region: 'West Africa',
    vetAuthority: 'DSV Senegal',
    provinces: {
      Louga: ['Louga', 'Linguère', 'Dahra'],
      Dakar: ['Dakar', 'Rufisque', 'Pikine'],
      'Saint-Louis': ['Saint-Louis', 'Dagana', 'Podor'],
      Tambacounda: ['Tambacounda', 'Bakel'],
      Thiès: ['Thiès', 'Mbour', 'Tivaouane'],
    },
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    dialCode: '+225',
    region: 'West Africa',
    vetAuthority: 'MIRAH Côte d’Ivoire',
    provinces: {
      Savanes: ['Korhogo', 'Ferkessédougou', 'Boundiali'],
      Abidjan: ['Abidjan', 'Anyama', 'Bingerville'],
      'Vallée du Bandama': ['Bouaké', 'Katiola'],
      Yamoussoukro: ['Yamoussoukro'],
    },
  },
  {
    code: 'ML',
    name: 'Mali',
    flag: '🇲🇱',
    dialCode: '+223',
    region: 'West Africa',
    vetAuthority: 'DNSV Mali',
    provinces: {
      Mopti: ['Mopti', 'Fatoma', 'Djenné'],
      Sikasso: ['Sikasso', 'Koutiala', 'Bougouni'],
      Bamako: ['Bamako', 'Kati'],
      Ségou: ['Ségou', 'San', 'Niono'],
    },
  },
  {
    code: 'NE',
    name: 'Niger',
    flag: '🇳🇪',
    dialCode: '+227',
    region: 'West Africa',
    vetAuthority: 'DGSV Niger',
    provinces: {
      Tahoua: ['Tahoua', 'Abalak', 'Birni-N’Konni'],
      Maradi: ['Maradi', 'Dakoro', 'Tessaoua'],
      Zinder: ['Zinder', 'Tanout'],
      Niamey: ['Niamey'],
    },
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    dialCode: '+226',
    region: 'West Africa',
    vetAuthority: 'DGSV Burkina Faso',
    provinces: {
      Sahel: ['Dori', 'Djibo', 'Gorom-Gorom'],
      Centre: ['Ouagadougou'],
      'Hauts-Bassins': ['Bobo-Dioulasso', 'Houndé'],
      'Centre-Est': ['Tenkodogo', 'Pouytenga'],
    },
  },
  {
    code: 'BJ',
    name: 'Benin',
    flag: '🇧🇯',
    dialCode: '+229',
    region: 'West Africa',
    vetAuthority: 'DE Benin',
    provinces: {
      Borgou: ['Parakou', 'Nikki', 'Bembèrèkè'],
      Alibori: ['Kandi', 'Gogounou', 'Malanville'],
      Littoral: ['Cotonou'],
    },
  },
  {
    code: 'TG',
    name: 'Togo',
    flag: '🇹🇬',
    dialCode: '+228',
    region: 'West Africa',
    vetAuthority: 'DE Togo',
    provinces: {
      Savanes: ['Dapaong', 'Mango'],
      Maritime: ['Lomé', 'Tsévié'],
      Kara: ['Kara', 'Bassar'],
    },
  },
  {
    code: 'GN',
    name: 'Guinea',
    flag: '🇬🇳',
    dialCode: '+224',
    region: 'West Africa',
    vetAuthority: 'DNSV Guinea',
    provinces: {
      Labé: ['Labé', 'Mali'],
      Kankan: ['Kankan', 'Siguiri'],
      Conakry: ['Conakry', 'Coyah'],
    },
  },
  {
    code: 'SL',
    name: 'Sierra Leone',
    flag: '🇸🇱',
    dialCode: '+232',
    region: 'West Africa',
    vetAuthority: 'MAFS Sierra Leone',
    provinces: {
      'Western Area': ['Freetown', 'Waterloo'],
      Northern: ['Makeni', 'Kabala'],
      Southern: ['Bo', 'Moyamba'],
    },
  },
  {
    code: 'LR',
    name: 'Liberia',
    flag: '🇱🇷',
    dialCode: '+231',
    region: 'West Africa',
    vetAuthority: 'MoA Liberia',
    provinces: {
      Montserrado: ['Monrovia', 'Bensonville'],
      Bong: ['Gbarnga'],
      Nimba: ['Ganta', 'Sanniquellie'],
    },
  },
  {
    code: 'GM',
    name: 'Gambia',
    flag: '🇬🇲',
    dialCode: '+220',
    region: 'West Africa',
    vetAuthority: 'DLS Gambia',
    provinces: {
      'West Coast': ['Brikama', 'Serrekunda'],
      'Central River': ['Janjanbureh', 'Bansang'],
      'Upper River': ['Basse Santa Su'],
    },
  },
  {
    code: 'GW',
    name: 'Guinea-Bissau',
    flag: '🇬🇼',
    dialCode: '+245',
    region: 'West Africa',
    vetAuthority: 'DGP Guinea-Bissau',
    provinces: {
      Bissau: ['Bissau'],
      Gabu: ['Gabu'],
      Bafatá: ['Bafatá'],
    },
  },
  {
    code: 'CV',
    name: 'Cabo Verde',
    flag: '🇨🇻',
    dialCode: '+238',
    region: 'West Africa',
    vetAuthority: 'DGASP Cabo Verde',
    provinces: {
      Santiago: ['Praia', 'Assomada'],
      'São Vicente': ['Mindelo'],
    },
  },
  {
    code: 'MR',
    name: 'Mauritania',
    flag: '🇲🇷',
    dialCode: '+222',
    region: 'West Africa',
    vetAuthority: 'DSV Mauritania',
    provinces: {
      Nouakchott: ['Nouakchott'],
      'Hodh Ech Chargui': ['Néma', 'Timbedra'],
      Trarza: ['Rosso', 'Boutilimit'],
    },
  },

  // ======================== CENTRAL AFRICA (8) ========================
  {
    code: 'CM',
    name: 'Cameroon',
    flag: '🇨🇲',
    dialCode: '+237',
    region: 'Central Africa',
    vetAuthority: 'MINEPIA Cameroon',
    provinces: {
      Adamawa: ['Ngaoundéré', 'Meiganga', 'Tignère', 'Banyo'],
      North: ['Garoua', 'Guider', 'Touboro'],
      'Far North': ['Maroua', 'Kousséri', 'Mokolo'],
      Centre: ['Yaoundé', 'Mbalmayo'],
      Littoral: ['Douala', 'Nkongsamba'],
    },
  },
  {
    code: 'TD',
    name: 'Chad',
    flag: '🇹🇩',
    dialCode: '+235',
    region: 'Central Africa',
    vetAuthority: 'DSV Chad',
    provinces: {
      "N'Djamena": ["N'Djamena"],
      Batha: ['Ati', 'Oum Hadjer'],
      Ouaddaï: ['Abéché'],
      ChariBaguirmi: ['Massenya', 'Bousso'],
    },
  },
  {
    code: 'CD',
    name: 'DR Congo',
    flag: '🇨🇩',
    dialCode: '+243',
    region: 'Central Africa',
    vetAuthority: 'MINAGRI DR Congo',
    provinces: {
      'Haut-Katanga': ['Lubumbashi', 'Likasi', 'Kasumbalesa'],
      Kinshasa: ['Kinshasa', 'Maluku'],
      'North Kivu': ['Goma', 'Masisi', 'Beni'],
      'South Kivu': ['Bukavu', 'Uvira'],
      Ituri: ['Bunia', 'Mahagi'],
    },
  },
  {
    code: 'CG',
    name: 'Republic of the Congo',
    flag: '🇨🇬',
    dialCode: '+242',
    region: 'Central Africa',
    vetAuthority: 'MAEP Congo',
    provinces: {
      Brazzaville: ['Brazzaville'],
      'Pointe-Noire': ['Pointe-Noire'],
      Bouenza: ['Madingou', 'Nkayi'],
    },
  },
  {
    code: 'GA',
    name: 'Gabon',
    flag: '🇬🇦',
    dialCode: '+241',
    region: 'Central Africa',
    vetAuthority: 'DGEL Gabon',
    provinces: {
      Estuaire: ['Libreville', 'Ntoum'],
      'Haut-Ogooué': ['Franceville', 'Moanda'],
      Nyanga: ['Tchibanga'],
    },
  },
  {
    code: 'CF',
    name: 'Central African Republic',
    flag: '🇨🇫',
    dialCode: '+236',
    region: 'Central Africa',
    vetAuthority: 'ANDE CAR',
    provinces: {
      Bangui: ['Bangui'],
      'Nana-Mambéré': ['Bouar'],
      Ouham: ['Bossangoa'],
    },
  },
  {
    code: 'GQ',
    name: 'Equatorial Guinea',
    flag: '🇬🇶',
    dialCode: '+240',
    region: 'Central Africa',
    vetAuthority: 'MABDA Equatorial Guinea',
    provinces: {
      'Bioko Norte': ['Malabo'],
      Litoral: ['Bata'],
    },
  },
  {
    code: 'ST',
    name: 'São Tomé and Príncipe',
    flag: '🇸🇹',
    dialCode: '+239',
    region: 'Central Africa',
    vetAuthority: 'DP São Tomé',
    provinces: {
      'Água Grande': ['São Tomé'],
      Príncipe: ['Santo António'],
    },
  },

  // ======================== NORTH AFRICA (6) ========================
  {
    code: 'SD',
    name: 'Sudan',
    flag: '🇸🇩',
    dialCode: '+249',
    region: 'North Africa',
    vetAuthority: 'MARF Sudan',
    provinces: {
      Khartoum: ['Khartoum', 'Omdurman', 'Bahri'],
      'North Kordofan': ['El-Obeid', 'Bara'],
      Gezira: ['Wad Madani', 'Al-Managil'],
      Kassala: ['Kassala', 'New Halfa'],
      'Red Sea': ['Port Sudan', 'Suakin'],
    },
  },
  {
    code: 'EG',
    name: 'Egypt',
    flag: '🇪🇬',
    dialCode: '+20',
    region: 'North Africa',
    vetAuthority: 'GOVS Egypt',
    provinces: {
      Cairo: ['Cairo', 'Helwan'],
      Beheira: ['Damanhour', 'Wadi El Natrun'],
      Sharqia: ['Zagazig', 'Belbeis'],
      Alexandria: ['Alexandria', 'Borg El Arab'],
      Aswan: ['Aswan', 'Kom Ombo'],
    },
  },
  {
    code: 'MA',
    name: 'Morocco',
    flag: '🇲🇦',
    dialCode: '+212',
    region: 'North Africa',
    vetAuthority: 'ONSSA Morocco',
    provinces: {
      'Casablanca-Settat': ['Casablanca', 'Settat', 'El Jadida'],
      'Fès-Meknès': ['Meknès', 'Fès', 'Ifrane'],
      'Rabat-Salé-Kénitra': ['Rabat', 'Kénitra', 'Khemisset'],
      'Marrakech-Safi': ['Marrakech', 'El Kelaa des Sraghna'],
    },
  },
  {
    code: 'DZ',
    name: 'Algeria',
    flag: '🇩🇿',
    dialCode: '+213',
    region: 'North Africa',
    vetAuthority: 'DSV Algeria',
    provinces: {
      Djelfa: ['Djelfa', 'Hassi Bahbah'],
      Tiaret: ['Tiaret', 'Sougueur'],
      Algiers: ['Algiers'],
      Sétif: ['Sétif', 'El Eulma'],
    },
  },
  {
    code: 'TN',
    name: 'Tunisia',
    flag: '🇹🇳',
    dialCode: '+216',
    region: 'North Africa',
    vetAuthority: 'DGSV Tunisia',
    provinces: {
      Béja: ['Béja', 'Medjez el-Bab'],
      SidiBouzid: ['Sidi Bouzid', 'Regueb'],
      Tunis: ['Tunis'],
      Kairouan: ['Kairouan'],
    },
  },
  {
    code: 'LY',
    name: 'Libya',
    flag: '🇱🇾',
    dialCode: '+218',
    region: 'North Africa',
    vetAuthority: 'NCSA Libya',
    provinces: {
      Tripoli: ['Tripoli'],
      Benghazi: ['Benghazi'],
      Misrata: ['Misrata'],
      'Al Jabal al Akhdar': ['Al Bayda'],
    },
  },
];

export const COUNTRIES_BY_REGION: Record<AfricanRegion, AfricanCountry[]> = {
  'Southern Africa': AFRICAN_COUNTRIES.filter((c) => c.region === 'Southern Africa'),
  'East Africa': AFRICAN_COUNTRIES.filter((c) => c.region === 'East Africa'),
  'West Africa': AFRICAN_COUNTRIES.filter((c) => c.region === 'West Africa'),
  'Central Africa': AFRICAN_COUNTRIES.filter((c) => c.region === 'Central Africa'),
  'North Africa': AFRICAN_COUNTRIES.filter((c) => c.region === 'North Africa'),
};

export function getCountry(nameOrCode?: string): AfricanCountry {
  if (!nameOrCode) return AFRICAN_COUNTRIES[0];
  const needle = nameOrCode.trim().toLowerCase();
  return (
    AFRICAN_COUNTRIES.find(
      (c) => c.name.toLowerCase() === needle || c.code.toLowerCase() === needle
    ) || AFRICAN_COUNTRIES[0]
  );
}

export function getCountryFlag(countryName?: string): string {
  return getCountry(countryName).flag;
}

export function getCountryRegion(countryName?: string): AfricanRegion {
  return getCountry(countryName).region;
}

export function getProvincesForCountry(countryName?: string): string[] {
  return Object.keys(getCountry(countryName).provinces);
}

export function getDistrictsForProvince(countryName: string | undefined, provinceName: string): string[] {
  const country = getCountry(countryName);
  return country.provinces[provinceName] || [];
}

export function formatLocationWithFlag(
  countryName: string | undefined,
  district: string,
  province: string
): string {
  const country = getCountry(countryName);
  return `${country.flag} ${district}, ${province}, ${country.name}`;
}
