function debounce<
  T extends (...args: any[]) => Promise<any>
>(func: T, wait = 300): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: number | undefined
  let lastArgs: Parameters<T>
  let pending: Promise<ReturnType<T>> | null = null

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgs = args
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    if (!pending) {
      pending = new Promise<ReturnType<T>>(resolve => {
        timeoutId = window.setTimeout(async () => {
          const result = await func(...lastArgs)
          resolve(result)
          pending = null
        }, wait)
      })
    }
    return pending
  }
}

const searchCache = new Map<string, LocationResult[]>()
const nearbyPlacesCache = new Map<string, NearbyPlace[]>()
const popularLocationsCache = new Map<string, string[]>()

export const USE_TEST_LOCATION = false // change to false for production
export const TEST_LOCATION: UserLocation = {
  latitude: 12.9165,
  longitude: 79.1325
}

export interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  name?: string
}

export interface UserLocation {
  latitude: number
  longitude: number
}

export interface NearbyPlace {
  name: string
  category: string
  distance?: number
  lat: number
  lon: number
}

export const POPULAR_LOCATIONS = {
  ahmedabad: [
    "Ahmedabad Junction",
    "Sardar Vallabhbhai Patel Airport",
    "CG Road",
    "SG Highway",
    "Maninagar",
    "Navrangpura",
    "Ellis Bridge",
    "Bodakdev",
    "Satellite",
    "Prahlad Nagar",
    "Bapunagar",
    "Naroda",
    "Paldi",
    "Vastrapur",
    "Drive-In Road",
    "Law Garden",
    "Sabarmati Ashram",
    "Gandhi Nagar",
    "Vatva",
    "Thaltej"
  ],
  aligarh: [
    "Aligarh Junction",
    "Aligarh Muslim University",
    "Medical Road (J.N. Medical College)",
    "Marris Road",
    "Centre Point",
    "Railway Road",
    "Jamia Urdu",
    "Dodpur",
    "Gandhi Park",
    "Upper Kot",
    "Masoodabad",
    "Tala Nagari",
    "Quarsi",
    "Khair Road",
    "Medical College"
  ],
  allahabad: [
    "Allahabad Junction",
    "Prayagraj Junction",
    "Civil Lines",
    "Katra",
    "Chowk",
    "Triveni Sangam",
    "Allahabad University",
    "High Court",
    "Naini",
    "Jhunsi",
    "Phaphamau",
    "Khuldabad",
    "Daraganj",
    "Colonelganj",
    "Govindpur"
  ],
  bangalore: [
    "Kempegowda International Airport",
    "Bangalore City Railway Station (Majestic)",
    "Majestic Bus Stand",
    "M.G. Road",
    "Brigade Road",
    "Koramangala",
    "Indiranagar",
    "Jayanagar",
    "Malleshwaram",
    "Whitefield",
    "Electronic City",
    "HSR Layout",
    "Basavanagudi",
    "Sadashivanagar",
    "Ulsoor",
    "Richmond Town",
    "Banashankari",
    "Yelahanka",
    "Marathahalli",
    "BTM Layout"
  ],
  bhopal: [
    "Bhopal Junction",
    "Rani Kamlapati Railway Station (Habibganj)",
    "Raja Bhoj Airport",
    "New Market",
    "MP Nagar",
    "Arera Colony",
    "BHEL Township",
    "Indrapuri",
    "TT Nagar",
    "Kolar Road",
    "Chowk Bazaar (Old Bhopal)",
    "Shyamla Hills",
    "Vallabh Bhavan",
    "MANIT (NIT Bhopal)",
    "Barkatullah University",
    "Misrod",
    "Govindpura",
    "Jawahar Chowk",
    "Berasia Road",
    "Karond"
  ],
  bhubaneswar: [
    "Bhubaneswar Railway Station",
    "Biju Patnaik International Airport",
    "Master Canteen Chowk",
    "Janpath",
    "Saheed Nagar",
    "Jayadev Vihar",
    "Chandrasekharpur",
    "Infocity",
    "KIIT University",
    "Old Town",
    "Lingaraj Temple Area",
    "Khandagiri",
    "Nayapalli",
    "Unit 1 Market",
    "Baramunda",
    "Patia",
    "Forest Park",
    "Esplanade (Ram Mandir area)",
    "Bapuji Nagar",
    "Bomikhal"
  ],
  chandigarh: [
    "Chandigarh Railway Station",
    "Chandigarh Airport",
    "Sector 17 (City Centre)",
    "Sector 22",
    "Sector 43 Bus Stand",
    "Sector 35",
    "Sector 7 (Madhya Marg)",
    "Sector 8",
    "Panjab University",
    "PGI Chandigarh",
    "Rock Garden",
    "Sukhna Lake",
    "Mohali",
    "Panchkula",
    "Industrial Area Phase I",
    "Manimajra",
    "Sector 26 (Grain Market)",
    "IT Park",
    "Daria",
    "Hallomajra"
  ],
  chennai: [
    "Chennai Central Railway Station",
    "Chennai International Airport",
    "Anna Salai (Mount Road)",
    "T. Nagar",
    "Koyambedu",
    "Velachery",
    "Adyar",
    "Mylapore",
    "Egmore",
    "Tambaram",
    "Porur",
    "Guindy",
    "Nungambakkam",
    "Thyagaraya Nagar (Pondy Bazaar)",
    "Thiruvanmiyur",
    "Perambur",
    "George Town (Parry's Corner)",
    "Old Mahabalipuram Road (OMR)",
    "Sholinganallur",
    "Sriperumbudur"
  ],
  coimbatore: [
    "Coimbatore International Airport",
    "Coimbatore Junction",
    "Gandhipuram",
    "RS Puram",
    "Peelamedu",
    "Saibaba Colony",
    "Race Course",
    "Town Hall",
    "Ukkadam",
    "Singanallur",
    "Vadavalli",
    "KK Pudur",
    "Avinashi Road",
    "Brookefields Mall",
    "Fun Republic Mall",
    "Podanur",
    "Kalapatti",
    "Thudiyalur",
    "Perur",
    "Saravanampatti"
  ],
  delhi: [
    "New Delhi Railway Station",
    "Old Delhi Railway Station",
    "Indira Gandhi International Airport",
    "Connaught Place",
    "Chandni Chowk",
    "Karol Bagh",
    "Paharganj",
    "Hauz Khas",
    "Saket",
    "Lajpat Nagar",
    "Dwarka",
    "Rohini",
    "Noida",
    "Gurgaon",
    "Nehru Place",
    "Janakpuri",
    "Vasant Kunj",
    "South Extension",
    "AIIMS (All India Institute of Medical Sciences)",
    "Delhi University (North Campus)"
  ],
  dhanbad: [
    "Dhanbad Junction",
    "Katras",
    "Jharia",
    "Saraidhela",
    "Govindpur",
    "Hirapur",
    "Bank More",
    "Sindri",
    "City Centre (Bank More)",
    "Barwadda",
    "Putki",
    "BCCL Township",
    "ISM (IIT Dhanbad)",
    "Dhansar",
    "Matkuria",
    "Kusunda",
    "Polyetchnic Chowk",
    "Steel Gate",
    "Bartand",
    "Chirkunda"
  ],
  gurgaon: [
    "MG Road (Gurugram)",
    "IFFCO Chowk",
    "Cyber City",
    "Udyog Vihar",
    "Golf Course Road",
    "Sohna Road",
    "DLF Phase 1",
    "DLF Phase 3 (Cyber Hub)",
    "Manesar",
    "Sector 14",
    "Sushant Lok",
    "Palam Vihar",
    "Huda City Center",
    "Medanta (Sector 38)",
    "Ambience Mall",
    "Rajiv Chowk (Gurgaon)",
    "Sector 29",
    "Dwarka Expressway",
    "South City",
    "Badshahpur"
  ],
  guwahati: [
    "Guwahati Railway Station (Paltan Bazaar)",
    "Lokpriya Gopinath Bordoloi Airport",
    "Paltan Bazaar",
    "Pan Bazaar",
    "Fancy Bazaar",
    "Ganeshguri",
    "Khanapara",
    "Beltola",
    "Dispur (Capital Complex)",
    "Maligaon",
    "Uzan Bazaar",
    "Chandmari",
    "Zoo Road",
    "Six Mile",
    "Ulubari",
    "Jalukbari",
    "Azara",
    "Noonmati",
    "Narengi",
    "Basistha"
  ],
  hyderabad: [
    "Rajiv Gandhi International Airport",
    "Hyderabad Deccan (Nampally) Station",
    "Secunderabad Junction",
    "HITEC City",
    "Gachibowli",
    "Madhapur",
    "Jubilee Hills",
    "Banjara Hills",
    "Somajiguda",
    "Begumpet",
    "Kondapur",
    "Kukatpally",
    "Charminar",
    "Mehdipatnam",
    "Abids",
    "L.B. Nagar",
    "Dilsukhnagar",
    "Necklace Road",
    "Tank Bund",
    "Falaknuma"
  ],
  indore: [
    "Indore Junction",
    "Devi Ahilyabai Holkar Airport",
    "Rajwada",
    "Sarafa Bazaar",
    "MG Road (Indore)",
    "Vijay Nagar",
    "Palasia",
    "Bhanwarkuan",
    "Rau (IIT Indore campus area)",
    "A.B. Road",
    "Bhawarkua",
    "Sudama Nagar",
    "Navlakha",
    "LIG Colony",
    "Dwarkapuri",
    "Eastern Ring Road",
    "Indore White Church",
    "Khajrana",
    "Rajendra Nagar",
    "Mhow"
  ],
  jaipur: [
    "Jaipur Junction",
    "Jaipur International Airport",
    "MI Road (Mirza Ismail Road)",
    "Bapu Bazaar",
    "Johari Bazaar",
    "Hawa Mahal Road",
    "Sindhi Camp Bus Stand",
    "Vaishali Nagar",
    "Mansarovar",
    "Malviya Nagar",
    "C-Scheme",
    "Amer Fort",
    "JLN Marg",
    "Ajmeri Gate",
    "Tonk Road",
    "Bani Park",
    "Raja Park",
    "Shyam Nagar",
    "Jawahar Circle",
    "Gopalpura"
  ],
  kanpur: [
    "Kanpur Central Railway Station",
    "Kanpur Anwarganj Station",
    "Kanpur Airport (Chakeri)",
    "IIT Kanpur",
    "CSJM University",
    "Kanpur Cantonment",
    "Civil Lines",
    "Swaroop Nagar",
    "Tilak Nagar",
    "Naveen Market",
    "The Mall (Mall Road)",
    "Govind Nagar",
    "Kidwai Nagar",
    "Panki",
    "Fazalganj",
    "Kalpi Road",
    "Shastri Nagar",
    "Kakadeo",
    "Lakhanpur",
    "Kalyanpur"
  ],
  kharagpur: [
    "Kharagpur Junction",
    "IIT Kharagpur Campus",
    "Hijli",
    "Prembazar",
    "Inda",
    "Kalaikunda",
    "Railway Workshop Area",
    "Malanchowk",
    "NH-6 Junction",
    "Chaudhury Bazaar",
    "Gole Bazaar",
    "Nimpura",
    "Talbagicha",
    "Midnapore Road",
    "Tech Market (IIT Campus)",
    "Kharagpur Bus Stand"
  ],
  kolkata: [
    "Howrah Junction",
    "Sealdah Station",
    "Netaji Subhas Chandra Bose Airport",
    "Park Street",
    "Esplanade (Dharmatala)",
    "B.B.D. Bagh (Dalhousie Square)",
    "Salt Lake City (Bidhannagar)",
    "New Town (Rajarhat)",
    "Gariahat",
    "Tollygunge",
    "Jadavpur",
    "Behala",
    "College Street",
    "Dum Dum",
    "Shyambazar",
    "Kalighat",
    "Alipore",
    "Ballygunge",
    "Howrah Maidan",
    "EM Bypass"
  ],
  lucknow: [
    "Charbagh Railway Station",
    "Chaudhary Charan Singh Airport (Amausi)",
    "Hazratganj",
    "Gomti Nagar",
    "Alambagh",
    "Aminabad",
    "Indira Nagar",
    "Aliganj",
    "Chowk",
    "Janakipuram",
    "Kaiserbagh",
    "Cantt Road (Lucknow Cantonment)",
    "Thakurganj",
    "Rajajipuram",
    "Faizabad Road",
    "Telibagh",
    "VRindavan Yojna",
    "Trans Gomti (Lucknow)",
    "Chinhat",
    "Dubagga"
  ],
  madurai: [
    "Madurai Airport",
    "Madurai Junction",
    "Meenakshi Amman Temple",
    "Mattuthavani Bus Stand",
    "Periyar Bus Stand",
    "K. Pudur",
    "Goripalayam",
    "Thirupparankundram",
    "Avaniyapuram",
    "Palanganatham",
    "Arasaradi",
    "Anna Nagar (Madurai)",
    "KK Nagar (Madurai)",
    "Simmakkal",
    "Thirunagar",
    "Tallakulam",
    "Vilakkuthoon",
    "Melur",
    "Thirumangalam",
    "Othakadai"
  ],
  manipal: [
    "MIT Manipal (Manipal Institute of Technology)",
    "Kasturba Medical College (KMC)",
    "Manipal University (MAHE)",
    "Tiger Circle",
    "Manipal Bus Stand",
    "Manipal Lake",
    "End Point",
    "Vidyarathna Nagar",
    "Eshwar Nagar",
    "Madhav Nagar",
    "Ananth Nagar",
    "Perampalli",
    "Udupi Railway Station",
    "Malpe Beach",
    "Kunjibettu",
    "Santhekatte",
    "MIT Hostel Blocks",
    "Templar Town",
    "KC Road",
    "Manipal Main Road"
  ],
  mangalore: [
    "Mangalore Central Railway Station",
    "Mangalore Junction (Kankanady)",
    "Mangalore International Airport",
    "Hampankatta",
    "Kadri",
    "Lalbagh",
    "Bejai",
    "Kankanadi",
    "Balmatta",
    "Car Street",
    "Pandeshwar",
    "Surathkal",
    "Panambur",
    "Ullal",
    "Derebail",
    "Kulur",
    "Bunder (Old Port)",
    "Kudroli",
    "Infantry Road",
    "Kavoor"
  ],
  mumbai: [
    "Chhatrapati Shivaji Maharaj Terminus (CST)",
    "Mumbai Central Station",
    "Bandra",
    "Andheri",
    "Dadar",
    "Colaba",
    "Nariman Point",
    "Marine Drive",
    "Juhu",
    "Bandra Kurla Complex (BKC)",
    "Powai",
    "Churchgate",
    "Worli",
    "Lower Parel",
    "Goregaon",
    "Borivali",
    "Navi Mumbai",
    "Thane",
    "Mulund",
    "Chembur",
    "Ghatkopar",
    "Vashi"
  ],
  mysore: [
    "Mysore Junction",
    "Mysore Airport (Mandakalli)",
    "Mysore Palace",
    "Chamundi Hills",
    "Jayalakshmipuram",
    "Vijayanagar",
    "Gokulam",
    "Hebbal (Mysore)",
    "Saraswathipuram",
    "Lashkar Mohalla",
    "Nazarbad",
    "Kuvempunagar",
    "Krishnaraja Boulevard",
    "Nanjangud Road",
    "VV Mohalla",
    "Siddhartha Layout",
    "Banumaiah Circle",
    "Infosys Campus",
    "Yadavagiri",
    "Hinkal"
  ],
  nagpur: [
    "Nagpur Junction",
    "Dr. Babasaheb Ambedkar International Airport",
    "Sitabuldi",
    "Sadar",
    "Civil Lines",
    "Dharampeth",
    "Ramdaspeth",
    "Itwari",
    "MIHAN",
    "Butibori",
    "Wardha Road",
    "Kamptee Road",
    "Koradi",
    "Mahal",
    "Cotton Market",
    "Ajni",
    "Jaripatka",
    "Manish Nagar",
    "Reshim Bagh",
    "Shankar Nagar"
  ],
  "navi mumbai": [
    "Vashi",
    "Nerul",
    "Belapur",
    "Kharghar",
    "Panvel",
    "Airoli",
    "Kopar Khairane",
    "Ghansoli",
    "Sanpada",
    "Seawoods",
    "Ulwe",
    "CBD Belapur",
    "Turbhe",
    "Rabale",
    "Mahape",
    "Kalamboli",
    "Kamothe",
    "New Panvel",
    "Digha",
    "Juinagar"
  ],
  noida: [
    "Sector 62",
    "Sector 18 (Atta Market)",
    "Noida City Centre (Sector 32)",
    "Film City (Sector 16A)",
    "Greater Noida",
    "Yamuna Expressway",
    "Sector 15",
    "Sector 37",
    "Sector 21 (Noida Stadium)",
    "Amity University (Sector 125)",
    "Pari Chowk",
    "Sector 50",
    "Sector 135",
    "Noida-Greater Noida Expressway",
    "Sector 110",
    "Sector 75",
    "Botanical Garden",
    "GIP Mall (Sector 38A)",
    "Okhla Bird Sanctuary",
    "Sector 44"
  ],
  patna: [
    "Patna Junction",
    "Jay Prakash Narayan International Airport",
    "Gandhi Maidan",
    "Fraser Road",
    "Ashok Rajpath",
    "Kankarbagh",
    "Boring Road",
    "Bailey Road",
    "Danapur",
    "Patna Sahib (Harmandir Takht)",
    "Patna University",
    "NIT Patna (Ashok Rajpath)",
    "Rajendra Nagar",
    "Phulwari Sharif",
    "Saguna More",
    "AIIMS Patna",
    "Dak Bunglow Chowk",
    "Patliputra Colony",
    "Anisabad",
    "Agam Kuan"
  ],
  pilani: [
    "BITS Pilani Campus",
    "Pilani Bus Stand",
    "Vidya Vihar",
    "CEERI Pilani",
    "Pilani Chowk",
    "Birla Mandir, Pilani",
    "Museum (Birla Science Centre)",
    "Nawa Bazar",
    "Haridas Colony",
    "North Campus Gate",
    "Pilani Hospital",
    "Chirawa Road",
    "Baikner",
    "Dharmsinghwala",
    "Katariyo Ka Bass",
    "Nalwa Road",
    "Pilani Gaushala",
    "Pilani Mela Ground",
    "Kasbi Market",
    "Gyan Vihar"
  ],
  pondicherry: [
    "Pondicherry Railway Station",
    "French Quarter (White Town)",
    "Auroville",
    "Paradise Beach",
    "Promenade Beach",
    "Bharathi Park",
    "Goubert Market",
    "Botanical Garden",
    "Chunnambar Boat House",
    "Serenity Beach",
    "Aurobindo Ashram",
    "Manakula Vinayagar Temple",
    "Raj Niwas",
    "Pondy Bazaar",
    "Lawspet",
    "University of Pondicherry",
    "Mission Street",
    "Courbon Street",
    "Villiyanur",
    "Thavalakuppam"
  ],
  pune: [
    "Pune Junction",
    "Pune International Airport (Lohegaon)",
    "Hinjewadi",
    "Viman Nagar",
    "Koregaon Park",
    "Aundh",
    "Kalyani Nagar",
    "Shivaji Nagar",
    "Deccan Gymkhana",
    "FC Road (Fergusson College Road)",
    "Swargate",
    "Kothrud",
    "Magarpatta City",
    "Kharadi",
    "Hadapsar",
    "Baner",
    "Sinhagad Road",
    "Bhosari",
    "Camp (MG Road Pune)",
    "Bibwewadi"
  ],
  raipur: [
    "Raipur Junction",
    "Swami Vivekananda Airport",
    "Pandri Market",
    "Naya Raipur (Atal Nagar)",
    "Gudhiyari",
    "Tatibandh",
    "Telibandha (Marine Drive Raipur)",
    "Devendra Nagar",
    "Shankar Nagar",
    "Byron Bazaar",
    "Kachna",
    "Mahoba Bazar",
    "Samta Colony",
    "Pandri Bus Stand",
    "Mowa",
    "Amanaka",
    "GE Road",
    "Railway Colony",
    "Urla Industrial Area",
    "Science College Area"
  ],
  roorkee: [
    "Roorkee Railway Station",
    "IIT Roorkee Campus",
    "Civil Lines (Roorkee)",
    "Ganeshpur",
    "Purani Tehsil",
    "Solani Aqueduct",
    "Bus Stand Roorkee",
    "Ramnagar (Roorkee)",
    "Roorkee Cantonment",
    "Bajuheri",
    "Haridwar Road",
    "Mundiyaki",
    "Malviya Chowk",
    "Jhanda Chowk",
    "Shivaji Colony",
    "Neemrana (Roorkee)",
    "Bhagirath Kunj",
    "Green Park",
    "Sheikhpuri",
    "IIT Roorkee Gate"
  ],
  salem: [
    "Salem Town Railway Station",
    "Salem Junction",
    "New Bus Stand (Salem)",
    "Old Bus Stand (Town)",
    "Mettur",
    "Yercaud",
    "Attur",
    "Sankagiri",
    "Edappadi",
    "Omalur",
    "Karuppur",
    "Ammapet",
    "Gorimedu",
    "Hasthampatty",
    "Steel Plant",
    "Suramangalam",
    "Seelanaickenpatti",
    "Fairlands",
    "Dadagapatti",
    "Kannankurichi"
  ],
  surat: [
    "Surat Railway Station",
    "Surat International Airport",
    "Ring Road (Textile Market)",
    "Surat Diamond Bourse",
    "Varachha",
    "Adajan",
    "Katargam",
    "Udhna",
    "Hazira",
    "Dumas Beach",
    "City Light",
    "Parle Point",
    "Athwa Lines",
    "Nanpura",
    "Ghod Dod Road",
    "SVNIT Surat (Ichhanath)",
    "Pal",
    "Chowk Bazaar",
    "Bhatar",
    "Sachin GIDC"
  ],
  thane: [
    "Thane Railway Station",
    "Thane West",
    "Thane East",
    "Naupada",
    "Panchpakhadi",
    "Ghodbunder Road",
    "Majiwada",
    "Kolshet",
    "Vasant Vihar",
    "Kopri",
    "Louis Wadi",
    "Wagle Estate",
    "Balkum",
    "Kalwa",
    "Upvan",
    "Hiranandani Estate",
    "Kasarvadavali",
    "Kopri Colony",
    "Ovala",
    "Mumbra"
  ],
  tiruchirappalli: [
    "Tiruchirappalli Junction",
    "Trichy International Airport",
    "Srirangam",
    "Rockfort (Malai Kottai)",
    "Thillai Nagar",
    "Central Bus Stand (Trichy)",
    "Chatram Bus Stand",
    "Tiruchirappalli Cantonment",
    "BHEL Township (Kailasapuram)",
    "Thuvakudi (NIT Trichy)",
    "Golden Rock",
    "Woraiyur",
    "KK Nagar (Trichy)",
    "TVS Tollgate",
    "Manapparai",
    "Samayapuram",
    "Gundur",
    "Tiruvanaikoil",
    "Puthur",
    "Ponmalai"
  ],
  trivandrum: [
    "Thiruvananthapuram Central Station",
    "Trivandrum International Airport",
    "East Fort",
    "Statue Junction",
    "Palayam",
    "Technopark (Kazhakkoottam)",
    "Kazhakoottam",
    "Medical College (Thiruvananthapuram)",
    "Vellayambalam",
    "Kovalam",
    "Thampanoor",
    "Ulloor",
    "Vazhuthacaud",
    "Pattom",
    "Nemom",
    "Thirumala",
    "Perorkada",
    "Attingal",
    "Neyyattinkara",
    "Vizhinjam"
  ],
  varanasi: [
    "Varanasi Junction (Cantt)",
    "Lal Bahadur Shastri Airport",
    "Kashi Vishwanath Temple",
    "Dashashwamedh Ghat",
    "Assi Ghat",
    "Godowlia",
    "Banaras Hindu University (BHU)",
    "Lanka",
    "Sigra",
    "Cantt Area (Varanasi Cantonment)",
    "Sarnath",
    "Chowk (Vishwanath Gali)",
    "Pandeypur",
    "Mahmoorganj",
    "Ramnagar",
    "Mughalsarai (Deen Dayal Upadhyaya Jn)",
    "Maldahiya",
    "Bhelupur",
    "Kabir Chaura",
    "Chetganj"
  ],
  vellore: [
    "VIT University",
    "Katpadi Junction",
    "Vellore New Bus Stand",
    "CMC Hospital",
    "Vellore Fort",
    "Bagayam",
    "Gandhi Nagar",
    "Filter Bed Road",
    "Sripuram Golden Temple",
    "Allapuram",
    "Sathuvachari",
    "OTP Campus",
    "Velapadi",
    "Viruthampet",
    "Palavansathu",
    "Walajapet",
    "Arcot",
    "Pennathur",
    "Thiruvalam",
    "Gudiyatham"
  ],
  vijayawada: [
    "Vijayawada Junction",
    "Vijayawada International Airport (Gannavaram)",
    "Pandit Nehru Bus Station (PNBS)",
    "Benz Circle",
    "MG Road (Bandar Road)",
    "Eluru Road",
    "Governorpet",
    "Autonagar",
    "One Town",
    "Kanaka Durga Temple",
    "Prakasam Barrage",
    "Bhavanipuram",
    "Patamata",
    "Labbipet",
    "Singhnagar",
    "Poranki",
    "Gollapudi",
    "Tadepalli",
    "Gunadala",
    "Kankipadu"
  ],
  visakhapatnam: [
    "Visakhapatnam Railway Station",
    "Visakhapatnam International Airport",
    "Dwaraka Nagar",
    "Gajuwaka",
    "MVP Colony",
    "Siripuram",
    "RK Beach (Beach Road)",
    "Steel Plant Township",
    "Arilova",
    "Seethamadhara",
    "Lawson's Bay",
    "Old Post Office (Town Kotha Road)",
    "Waltair Uplands",
    "NAD Junction",
    "Gopalapatnam",
    "Simhachalam",
    "Bhimili",
    "Anakapalle",
    "Yendada",
    "Murali Nagar"
  ],
  warangal: [
    "Warangal Railway Station",
    "Kazipet Junction",
    "Hanamkonda",
    "NIT Warangal (Kazipet)",
    "Warangal Fort",
    "Thousand Pillar Temple",
    "Subedari",
    "Enumamula Market",
    "Kazipet Dargah",
    "Mahboobabad Road",
    "JPN Road",
    "Mattwada",
    "Narsampet Road",
    "Chintal",
    "Mulkanoor",
    "University Arts & Science College",
    "NGO's Colony",
    "Shyampet",
    "Hunter Road",
    "Parkal"
  ],
  default: [
    "Railway Station",
    "Bus Stand",
    "Airport",
    "City Center",
    "Shopping Mall",
    "Hospital",
    "University",
    "IT Park",
    "Government Office",
    "Market"
  ]
};


// -----------------------------------------------------------------------------
// helper: pick test vs real
// -----------------------------------------------------------------------------

export const getEffectiveLocation = (
  userLocation?: UserLocation
): UserLocation | undefined => {
  if (USE_TEST_LOCATION) {
    console.log("Using test location (VIT Vellore):", TEST_LOCATION)
    return TEST_LOCATION
  }
  console.log("Using real user location:", userLocation)
  return userLocation
}

// -----------------------------------------------------------------------------
// getNearbyPopularPlaces (with caching)
// -----------------------------------------------------------------------------

export const getNearbyPopularPlaces = async (
  userLocation: UserLocation,
  radius = 25,
  categories = [
    "amenity=hospital",
    "amenity=university",
    "aeroway=aerodrome",
    "railway=station",
    "amenity=bus_station",
    "shop=mall",
    "tourism=attraction"
  ],
  overallTimeoutMs = 2000
): Promise<NearbyPlace[]> => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (!effectiveLocation?.latitude || !effectiveLocation?.longitude) return []

  const cacheKey = `${effectiveLocation.latitude},${effectiveLocation.longitude}`
  if (nearbyPlacesCache.has(cacheKey)) {
    console.log("→ Returning cached nearby places for:", cacheKey)
    return nearbyPlacesCache.get(cacheKey)!
  }

  console.log("Starting API calls for location:", effectiveLocation)

  try {
    const places: NearbyPlace[] = []
    const priorityCategories = [
      "amenity=university",
      "railway=station",
      "amenity=hospital"
    ]

    const overallController = new AbortController()
    const overallTimeoutId = setTimeout(() => {
      console.log(
        "Overall API timeout reached, aborting all requests…"
      )
      overallController.abort()
    }, overallTimeoutMs)

    for (const category of priorityCategories) {
      if (overallController.signal.aborted) {
        console.log("Skipping remaining categories due to timeout")
        break
      }
      try {
        console.log(`Searching for category: ${category}`)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&${category}&limit=2&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&bounded=1&viewbox=${
            effectiveLocation.longitude - 0.2
          },${effectiveLocation.latitude + 0.2},${
            effectiveLocation.longitude + 0.2
          },${effectiveLocation.latitude - 0.2}`,
          {
            headers: {
              "User-Agent": "Unipool-App/1.0"
            },
            signal: overallController.signal
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.log(`📍 ${category} results:`, data?.length || 0)

          const categoryPlaces = (data as any[]).map(item => ({
            name:
              item.name || item.display_name.split(",")[0],
            category: getCategoryName(category),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            distance: calculateDistance(
              effectiveLocation.latitude,
              effectiveLocation.longitude,
              parseFloat(item.lat),
              parseFloat(item.lon)
            )
          }))
          .filter(
            (place: NearbyPlace) =>
              place.name && place.distance! <= radius
          )

          places.push(...categoryPlaces)
        } else {
          console.warn(
            `API response not OK for ${category}:`,
            response.status
          )
        }

        // tiny pause to avoid hammering the API
        await new Promise(r => setTimeout(r, 100))
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log(`${category} request timed out`)
        } else {
          console.warn(`Error fetching ${category}:`, err)
        }
        if (overallController.signal.aborted) break
      }
    }

    clearTimeout(overallTimeoutId)

    const uniquePlaces = places.filter(
      (p, i, a) =>
        i ===
        a.findIndex(
          pp =>
            pp.name.toLowerCase() === p.name.toLowerCase()
        )
    )

    const sortedPlaces = uniquePlaces
      .sort((a, b) => (a.distance! - b.distance!))
      .slice(0, 10)

    console.log("Final nearby places:", sortedPlaces)

    // cache for next time
    nearbyPlacesCache.set(cacheKey, sortedPlaces)
    return sortedPlaces
  } catch (error) {
    console.error("❌ Error fetching nearby places:", error)
    return []
  }
}

// -----------------------------------------------------------------------------
// distance + category name helpers (unchanged)
// -----------------------------------------------------------------------------

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    "amenity=hospital": "Hospital",
    "amenity=university": "University",
    "aeroway=aerodrome": "Airport",
    "railway=station": "Railway Station",
    "amenity=bus_station": "Bus Station",
    "shop=mall": "Shopping Mall",
    "tourism=attraction": "Tourist Attraction"
  }
  return categoryMap[category] || "Location"
}

// -----------------------------------------------------------------------------
// getNearestCity (unchanged)
// -----------------------------------------------------------------------------

export const getNearestCity = async (
  userLocation: UserLocation
): Promise<string> => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (!effectiveLocation) return "default"

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&zoom=10&addressdetails=1`,
      {
        headers: { "User-Agent": "Unipool-App/1.0" }
      }
    )
    if (!resp.ok) throw new Error(resp.statusText)
    const data = await resp.json()
    const address = data.address || {}
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state_district ||
      address.county ||
      "Unknown"
    return city.toLowerCase()
  } catch (err) {
    console.error("❌ Error getting nearest city:", err)
    return "default"
  }
}

// -----------------------------------------------------------------------------
// searchLocations (with caching) + debounced wrapper
// -----------------------------------------------------------------------------

export const searchLocations = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return []

  const encodedQuery = encodeURIComponent(`${query}, ${region}`)

  // check cache
  if (searchCache.has(encodedQuery)) {
    console.log("→ Returning cached search for:", query)
    return searchCache.get(encodedQuery)!
  }

  console.log("🔍 Searching for:", query)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log("⏱️ Search API timeout, aborting…")
    controller.abort()
  }, 5000)

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=in`,
      {
        headers: { "User-Agent": "Unipool-App/1.0" },
        signal: controller.signal
      }
    )
    clearTimeout(timeoutId)
    if (!resp.ok)
      throw new Error(`HTTP error! status: ${resp.status}`)
    const data = (await resp.json()) as any[]
    console.log("📍 Search results found:", data.length)

    const results: LocationResult[] = data.map(item => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      place_id: item.place_id,
      name: item.name || item.display_name.split(",")[0]
    }))

    // cache it
    searchCache.set(encodedQuery, results)
    return results
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("⏱️ Search request timed out")
    } else {
      console.error("❌ Location search error:", err)
    }
    return []
  }
}

// debounced version (300 ms)
export const debouncedSearchLocations = debounce(
  searchLocations,
  300
)

// -----------------------------------------------------------------------------
// searchLocationsWithFallback (unchanged, uses searchLocations cache)
// -----------------------------------------------------------------------------

export const searchLocationsWithFallback = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()
  const localResults: LocationResult[] = []

  // local partial matches from POPULAR_LOCATIONS
  Object.entries(POPULAR_LOCATIONS).forEach(([cityKey, locations]) => {
    if (cityKey === "default") return

    locations.forEach(location => {
      if (location.toLowerCase().includes(lowerQuery)) {
        const { lat, lon } = getCityCoordinates(cityKey)
        localResults.push({
          display_name: `${location}, ${
            cityKey[0].toUpperCase() + cityKey.slice(1)
          }, India`,
          lat: lat.toString(),
          lon: lon.toString(),
          place_id: `local_${cityKey}_${location.replace(
            /\s+/g,
            "_"
          )}`,
          name: location
        })
      }
    })

    if (
      cityKey.includes(lowerQuery) ||
      lowerQuery.includes(cityKey)
    ) {
      const { lat, lon } = getCityCoordinates(cityKey)
      localResults.push({
        display_name: `${
          cityKey[0].toUpperCase() + cityKey.slice(1)
        }, India`,
        lat: lat.toString(),
        lon: lon.toString(),
        place_id: `local_city_${cityKey}`,
        name: cityKey[0].toUpperCase() + cityKey.slice(1)
      })
    }
  })

  if (localResults.length > 0) {
    console.log("→ Found local results:", localResults.length)
    return localResults.slice(0, limit)
  }

  console.log("→ No local results, trying API search…")
  try {
    const apiResults = await searchLocations(
      query,
      region,
      limit
    )
    if (apiResults.length > 0) return apiResults
  } catch {
    console.log("⚠️ API search failed, using fallback locations")
  }

  // fallback popular
  const fallback = getPopularLocationsFallback(query)
  return fallback.slice(0, 4).map((loc, i) => ({
    display_name: `${loc}, India`,
    lat: "12.9716",
    lon: "77.5946",
    place_id: `fallback_${i}`,
    name: loc
  }))
}

// debounced version
export const debouncedSearchLocationsWithFallback = debounce(
  searchLocationsWithFallback,
  300
)

// -----------------------------------------------------------------------------
// small helpers for fallback (unchanged)
// -----------------------------------------------------------------------------

const getRandomPopularLocations = (
  locations: string[],
  count = 4
): string[] => {
  if (locations.length <= count) return locations
  return [...locations]
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
}

const getCityCoordinates = (
  cityKey: string
): { lat: number; lon: number } => {
  const cityCoords: Record<string, { lat: number; lon: number }> = {
    chennai: { lat: 13.0827, lon: 80.2707 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
    hyderabad: { lat: 17.385, lon: 78.4867 },
    vellore: { lat: 12.9165, lon: 79.1325 },
    coimbatore: { lat: 11.0168, lon: 76.9558 },
    madurai: { lat: 9.9252, lon: 78.1198 },
    salem: { lat: 11.6643, lon: 78.146 },
    pondicherry: { lat: 11.9416, lon: 79.8083 }
  }
  return (
    cityCoords[cityKey] || {
      lat: 12.9716,
      lon: 77.5946
    }
  )
}

// -----------------------------------------------------------------------------
// getPopularLocations (with caching)
// -----------------------------------------------------------------------------

export const getPopularLocations = async (
  searchQuery: string,
  userLocation?: UserLocation
): Promise<string[]> => {
  console.log("getPopularLocations:", {
    searchQuery,
    userLocation
  })

  const effectiveLocation = getEffectiveLocation(userLocation)
  if (
    !effectiveLocation ||
    !effectiveLocation.latitude ||
    !effectiveLocation.longitude
  ) {
    console.log("→ No valid location, fallback to default")
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.default,
      4
    )
  }

  // cache key = lat,long + query
  const cacheKey = `${effectiveLocation.latitude},${effectiveLocation.longitude}_${searchQuery}`
  if (popularLocationsCache.has(cacheKey)) {
    console.log(
      "→ Returning cached popular locations for:",
      cacheKey
    )
    return popularLocationsCache.get(cacheKey)!
  }

  try {
    // try nearby first
    console.log("→ Fetching nearby places…")
    const nearbyPromise = getNearbyPopularPlaces(
      effectiveLocation,
      25,
      undefined,
      2000
    )
    const timeoutPromise = new Promise<NearbyPlace[]>(res =>
      setTimeout(() => {
        console.log("⏱️ Nearby API timeout, using fallback")
        res([])
      }, 2000)
    )

    const nearbyPlaces = await Promise.race([
      nearbyPromise,
      timeoutPromise
    ])
    console.log("→ Nearby places:", nearbyPlaces)

    if (nearbyPlaces.length > 0) {
      const names = nearbyPlaces.map(p => p.name)
      popularLocationsCache.set(cacheKey, names)
      console.log("✅ Returning nearby names:", names)
      return names
    }

    // no nearby: fallback to city list
    if (USE_TEST_LOCATION) {
      console.log("→ Test mode: returning Vellore list")
      const list = getRandomPopularLocations(
        POPULAR_LOCATIONS.vellore,
        4
      )
      popularLocationsCache.set(cacheKey, list)
      return list
    }

    const nearestCity = await getNearestCity(effectiveLocation)
    console.log("→ Nearest city:", nearestCity)

    if (
      nearestCity !== "default" &&
      POPULAR_LOCATIONS[nearestCity as keyof typeof POPULAR_LOCATIONS]
    ) {
      const cityList =
        POPULAR_LOCATIONS[
          nearestCity as keyof typeof POPULAR_LOCATIONS
        ]
      const pick = getRandomPopularLocations(cityList, 4)
      popularLocationsCache.set(cacheKey, pick)
      console.log("✅ Returning city list:", pick)
      return pick
    }
  } catch (err) {
    console.error(
      "❌ Error getting location-based popular places:",
      err
    )
  }

  // final string‑based fallback
  console.log("→ String fallback for query:", searchQuery)
  const q = searchQuery.toLowerCase()
  let fallbackList: string[] = []
  if (q.includes("chennai"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.chennai,
      4
    )
  else if (q.includes("bangalore") || q.includes("bengaluru"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.bangalore,
      4
    )
  else if (q.includes("hyderabad"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.hyderabad,
      4
    )
  else if (q.includes("vellore"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.vellore,
      4
    )
  else if (q.includes("coimbatore"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.coimbatore,
      4
    )
  else if (q.includes("madurai"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.madurai,
      4
    )
  else if (q.includes("salem"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.salem,
      4
    )
  else if (q.includes("pondicherry") || q.includes("puducherry"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.pondicherry,
      4
    )
  else
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.default,
      4
    )

  popularLocationsCache.set(
    `${effectiveLocation.latitude},${effectiveLocation.longitude}_${searchQuery}`,
    fallbackList
  )
  console.log("🔄 Returning default fallback list:", fallbackList)
  return fallbackList
}

// -----------------------------------------------------------------------------
// simple key‑based fallback (unchanged)
// -----------------------------------------------------------------------------

export const getPopularLocationsFallback = (
  searchQuery: string
): string[] => {
  const q = searchQuery.toLowerCase()
  if (q.includes("chennai"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.chennai,
      4
    )
  if (q.includes("bangalore") || q.includes("bengaluru"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.bangalore,
      4
    )
  if (q.includes("hyderabad"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.hyderabad,
      4
    )
  if (q.includes("vellore"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.vellore,
      4
    )
  if (q.includes("coimbatore"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.coimbatore,
      4
    )
  if (q.includes("madurai"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.madurai,
      4
    )
  if (q.includes("salem"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.salem,
      4
    )
  if (q.includes("pondicherry") || q.includes("puducherry"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.pondicherry,
      4
    )
  return getRandomPopularLocations(
    POPULAR_LOCATIONS.default,
    4
  )
}

// -----------------------------------------------------------------------------
// by‑city lookup + format helpers (unchanged)
// -----------------------------------------------------------------------------

export const getPopularLocationsByCity = (
  cityName: string
): string[] => {
  const city = cityName.toLowerCase()
  if (
    POPULAR_LOCATIONS[
      city as keyof typeof POPULAR_LOCATIONS
    ]
  ) {
    return getRandomPopularLocations(
      POPULAR_LOCATIONS[
        city as keyof typeof POPULAR_LOCATIONS
      ],
      4
    )
  }
  return getRandomPopularLocations(
    POPULAR_LOCATIONS.default,
    4
  )
}

export const formatLocationName = (
  locationResult: LocationResult
): string => {
  return (
    locationResult.name ||
    locationResult.display_name.split(",")[0]
  )
}

export const isLocationInIndia = (
  locationResult: LocationResult
): boolean => {
  return locationResult.display_name
    .toLowerCase()
    .includes("india")
}

// -----------------------------------------------------------------------------
// default export
// -----------------------------------------------------------------------------

export default {
  searchLocations,
  debouncedSearchLocations,
  searchLocationsWithFallback,
  debouncedSearchLocationsWithFallback,
  getPopularLocations,
  getPopularLocationsFallback,
  getPopularLocationsByCity,
  getNearbyPopularPlaces,
  getNearestCity,
  getEffectiveLocation,
  formatLocationName,
  isLocationInIndia,
  POPULAR_LOCATIONS,
  USE_TEST_LOCATION,
  TEST_LOCATION
}
