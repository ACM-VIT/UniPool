import * as Location from "expo-location";

// -----------------------------------------------------------------------------
// Interfaces and Types
// -----------------------------------------------------------------------------

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
  ]
};


// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export const USE_TEST_LOCATION = false // change to false for production
export const TEST_LOCATION: UserLocation = {
  latitude: 12.9165,
  longitude: 79.1325
}

// -----------------------------------------------------------------------------
// Caching
// -----------------------------------------------------------------------------

const searchCache = new Map<string, LocationResult[]>()
const nearbyPlacesCache = new Map<string, NearbyPlace[]>()
const popularLocationsCache = new Map<string, string[]>()
const geocodingCache = new Map<string, {lat: number, lon: number}>()

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function debounce<T extends (...args: any[]) => Promise<any>>(
  func: T, 
  wait = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
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
// Core Coordinate Resolution Functions
// -----------------------------------------------------------------------------

/**
 * Primary coordinate resolution using device's native geocoding
 * with OpenStreetMap as fallback
 */
export const getCoordinatesForLocation = async (
  locationName: string
): Promise<{lat: number, lon: number} | null> => {
  console.log(`🔍 Getting coordinates for: "${locationName}"`)
  
  const cacheKey = locationName.toLowerCase().trim()
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    console.log(`💾 Using cached coordinates for: ${locationName}`)
    return geocodingCache.get(cacheKey)!
  }
  
  // 1. Try native device geocoding first (primary method)
  try {
    console.log(`📱 Trying native geocoding for: "${locationName}"`)
    const results = await Location.geocodeAsync(`${locationName}, India`)
    
    if (results && results.length > 0) {
      const { latitude, longitude } = results[0]
      
      // Validate that coordinates are within India's bounds
      const isInIndiaBounds = latitude >= 6 && latitude <= 37 && longitude >= 68 && longitude <= 97
      
      if (isInIndiaBounds) {
        const coords = { lat: latitude, lon: longitude }
        console.log(`✅ Native geocoding success for "${locationName}": (${latitude}, ${longitude})`)
        
        // Cache the result
        geocodingCache.set(cacheKey, coords)
        return coords
      } else {
        console.warn(`⚠️ Native geocoding returned coordinates outside India for "${locationName}": (${latitude}, ${longitude})`)
      }
    } else {
      console.log(`❌ No results from native geocoding for: "${locationName}"`)
    }
  } catch (error) {
    console.warn(`❌ Native geocoding failed for "${locationName}":`, error)
  }
  
  // 2. Fallback to OpenStreetMap (Nominatim API)
  try {
    console.log(`🌍 Trying OpenStreetMap fallback for: "${locationName}"`)
    const osmResults = await searchLocations(locationName, "India", 1)
    
    if (osmResults.length > 0) {
      const result = osmResults[0]
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)
      
      // Validate bounds again
      const isInIndiaBounds = lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97
      
      if (isInIndiaBounds) {
        const coords = { lat, lon }
        console.log(`✅ OpenStreetMap fallback success for "${locationName}": (${lat}, ${lon})`)
        
        // Cache the result
        geocodingCache.set(cacheKey, coords)
        return coords
      } else {
        console.warn(`⚠️ OpenStreetMap returned coordinates outside India for "${locationName}": (${lat}, ${lon})`)
      }
    } else {
      console.log(`❌ No results from OpenStreetMap for: "${locationName}"`)
    }
  } catch (error) {
    console.warn(`❌ OpenStreetMap fallback failed for "${locationName}":`, error)
  }
  
  // 3. Last resort: Use known city coordinates for major Indian cities
  const knownCoords = getCityCoordinates(locationName)
  if (knownCoords.lat !== 12.9716 || knownCoords.lon !== 77.5946) {
    // If it's not the default fallback, we found a match
    console.log(`🏙️ Using known city coordinates for "${locationName}": (${knownCoords.lat}, ${knownCoords.lon})`)
    geocodingCache.set(cacheKey, knownCoords)
    return knownCoords
  }
  
  console.error(`❌ All coordinate resolution methods failed for: "${locationName}"`)
  return null
}

/**
 * Known coordinates for major Indian cities
 */
export const getCityCoordinates = (cityName: string): {lat: number, lon: number} => {
  const normalizedCity = cityName.toLowerCase().trim()
  
  const cityCoordinates: Record<string, {lat: number, lon: number}> = {
    // Major metros
    mumbai: { lat: 19.0760, lon: 72.8777 },
    delhi: { lat: 28.6139, lon: 77.2090 },
    "new delhi": { lat: 28.6139, lon: 77.2090 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
    bengaluru: { lat: 12.9716, lon: 77.5946 },
    hyderabad: { lat: 17.3850, lon: 78.4867 },
    chennai: { lat: 13.0827, lon: 80.2707 },
    kolkata: { lat: 22.5726, lon: 88.3639 },
    pune: { lat: 18.5204, lon: 73.8567 },
    ahmedabad: { lat: 23.0225, lon: 72.5714 },
    
    // Tier 2 cities
    jaipur: { lat: 26.9124, lon: 75.7873 },
    surat: { lat: 21.1702, lon: 72.8311 },
    lucknow: { lat: 26.8467, lon: 80.9462 },
    kanpur: { lat: 26.4499, lon: 80.3319 },
    nagpur: { lat: 21.1458, lon: 79.0882 },
    indore: { lat: 22.7196, lon: 75.8577 },
    thane: { lat: 19.2183, lon: 72.9781 },
    bhopal: { lat: 23.2599, lon: 77.4126 },
    visakhapatnam: { lat: 17.6868, lon: 83.2185 },
    pimpri: { lat: 18.6298, lon: 73.8073 },
    patna: { lat: 25.5941, lon: 85.1376 },
    vadodara: { lat: 22.3072, lon: 73.1812 },
    ghaziabad: { lat: 28.6692, lon: 77.4538 },
    ludhiana: { lat: 30.9010, lon: 75.8573 },
    agra: { lat: 27.1767, lon: 78.0081 },
    nashik: { lat: 19.9975, lon: 73.7898 },
    faridabad: { lat: 28.4089, lon: 77.3178 },
    meerut: { lat: 28.9845, lon: 77.7064 },
    rajkot: { lat: 23.2156, lon: 70.6369 },
    kalyan: { lat: 19.2437, lon: 73.1355 },
    vasai: { lat: 19.4559, lon: 72.8136 },
    varanasi: { lat: 25.3176, lon: 82.9739 },
    srinagar: { lat: 34.0837, lon: 74.7973 },
    aurangabad: { lat: 19.8762, lon: 75.3433 },
    dhanbad: { lat: 23.7957, lon: 86.4304 },
    amritsar: { lat: 31.6340, lon: 74.8723 },
    "navi mumbai": { lat: 19.0330, lon: 73.0297 },
    allahabad: { lat: 25.4358, lon: 81.8463 },
    prayagraj: { lat: 25.4358, lon: 81.8463 },
    ranchi: { lat: 23.3441, lon: 85.3096 },
    howrah: { lat: 22.5958, lon: 88.2636 },
    coimbatore: { lat: 11.0168, lon: 76.9558 },
    jabalpur: { lat: 23.1815, lon: 79.9864 },
    gwalior: { lat: 26.2183, lon: 78.1828 },
    vijayawada: { lat: 16.5062, lon: 80.6480 },
    jodhpur: { lat: 26.2389, lon: 73.0243 },
    madurai: { lat: 9.9252, lon: 78.1198 },
    raipur: { lat: 21.2514, lon: 81.6296 },
    kota: { lat: 25.2138, lon: 75.8648 },
    chandigarh: { lat: 30.7333, lon: 76.7794 },
    guwahati: { lat: 26.1445, lon: 91.7362 },
    salem: { lat: 11.6643, lon: 78.1460 },
    "jammu": { lat: 32.7266, lon: 74.8570 },
    noida: { lat: 28.5355, lon: 77.3910 },
    gurgaon: { lat: 28.4595, lon: 77.0266 },
    gurugram: { lat: 28.4595, lon: 77.0266 },
    
    // Educational hub cities
    vellore: { lat: 12.9165, lon: 79.1325 },
    "vit vellore": { lat: 12.9165, lon: 79.1325 },
    "vit university": { lat: 12.9165, lon: 79.1325 },
    manipal: { lat: 13.3409, lon: 74.7421 },
    pilani: { lat: 28.3670, lon: 75.5836 },
    "bits pilani": { lat: 28.3670, lon: 75.5836 },
    kharagpur: { lat: 22.3460, lon: 87.2320 },
    "iit kharagpur": { lat: 22.3460, lon: 87.2320 },
    roorkee: { lat: 29.8543, lon: 77.8880 },
    "iit roorkee": { lat: 29.8543, lon: 77.8880 },
    "nit trichy": { lat: 10.7905, lon: 78.7047 },
    tiruchirappalli: { lat: 10.7905, lon: 78.7047 },
    trichy: { lat: 10.7905, lon: 78.7047 },
    warangal: { lat: 18.0095, lon: 79.5378 },
    "nit warangal": { lat: 18.0095, lon: 79.5378 },
    
    // South Indian cities
    trivandrum: { lat: 8.5241, lon: 76.9366 },
    thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
    kochi: { lat: 9.9312, lon: 76.2673 },
    cochin: { lat: 9.9312, lon: 76.2673 },
    kozhikode: { lat: 11.2588, lon: 75.7804 },
    calicut: { lat: 11.2588, lon: 75.7804 },
    mysore: { lat: 12.2958, lon: 76.6394 },
    mysuru: { lat: 12.2958, lon: 76.6394 },
    mangalore: { lat: 12.9141, lon: 74.8560 },
    hubli: { lat: 15.3647, lon: 75.1240 },
    belgaum: { lat: 15.8497, lon: 74.4977 },
    pondicherry: { lat: 11.9416, lon: 79.8083 },
    puducherry: { lat: 11.9416, lon: 79.8083 },
    
    // North-East
    shillong: { lat: 25.5788, lon: 91.8933 },
    imphal: { lat: 24.8170, lon: 93.9368 },
    aizawl: { lat: 23.7271, lon: 92.7176 },
    agartala: { lat: 23.8315, lon: 91.2868 },
    gangtok: { lat: 27.3389, lon: 88.6065 },
    kohima: { lat: 25.6751, lon: 94.1086 },
    itanagar: { lat: 27.0844, lon: 93.6053 },
    dispur: { lat: 26.1445, lon: 91.7362 },
    
    // Other important cities
    aligarh: { lat: 27.8974, lon: 78.0880 },
    bareilly: { lat: 28.3670, lon: 79.4304 },
    moradabad: { lat: 28.8386, lon: 78.7733 },
    siliguri: { lat: 26.7271, lon: 88.3953 },
    durgapur: { lat: 23.5204, lon: 87.3119 },
    bhubaneswar: { lat: 20.2961, lon: 85.8245 },
    cuttack: { lat: 20.4625, lon: 85.8828 }
  }
  
  // Try exact match first
  if (cityCoordinates[normalizedCity]) {
    return cityCoordinates[normalizedCity]
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (key.includes(normalizedCity) || normalizedCity.includes(key)) {
      return coords
    }
  }
  
  // Default fallback (Bangalore)
  return { lat: 12.9716, lon: 77.5946 }
}

// -----------------------------------------------------------------------------
// OpenStreetMap (Nominatim) API Functions
// -----------------------------------------------------------------------------

export const searchLocations = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  const cacheKey = `${query}_${region}_${limit}`
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!
  }

  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=in&limit=${limit}&addressdetails=1&extratags=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Unipool-App/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const results: LocationResult[] = data.map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      place_id: item.place_id,
      name: item.name || item.display_name?.split(',')[0],
    }))

    searchCache.set(cacheKey, results)
    return results
  } catch (error) {
    console.error("Error searching locations:", error)
    return []
  }
}

export const debouncedSearchLocations = debounce(searchLocations, 300)

export const searchLocationsWithFallback = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  try {
    // Primary search
    const results = await searchLocations(query, region, limit)
    if (results.length > 0) {
      return results
    }

    // If no results, try a broader search
    const broaderQuery = query.split(',')[0].trim()
    if (broaderQuery !== query) {
      const broaderResults = await searchLocations(broaderQuery, region, limit)
      if (broaderResults.length > 0) {
        return broaderResults
      }
    }

    return []
  } catch (error) {
    console.error("Error in searchLocationsWithFallback:", error)
    return []
  }
}

export const debouncedSearchLocationsWithFallback = debounce(searchLocationsWithFallback, 300)

// -----------------------------------------------------------------------------
// Popular Locations Data
// -----------------------------------------------------------------------------


export const getPopularLocations = async (
  searchQuery: string,
  userLocation?: UserLocation
): Promise<string[]> => {
  const cacheKey = `${searchQuery}_${userLocation?.latitude}_${userLocation?.longitude}`
  
  if (popularLocationsCache.has(cacheKey)) {
    return popularLocationsCache.get(cacheKey)!
  }

  try {
    if (!userLocation) {
      console.warn("No user location provided for getting popular locations")
      return []
    }
    
    const cityName = await getNearestCity(userLocation)
    const cityLocations = POPULAR_LOCATIONS[cityName as keyof typeof POPULAR_LOCATIONS]
    
    if (!cityLocations) {
      console.warn(`No popular locations found for city: ${cityName}`)
      return []
    }
    
    if (searchQuery.trim() === "") {
      popularLocationsCache.set(cacheKey, cityLocations)
      return cityLocations
    }
    
    const filtered = cityLocations.filter(location =>
      location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    popularLocationsCache.set(cacheKey, filtered)
    return filtered
  } catch (error) {
    console.error("Error getting popular locations:", error)
    return []
  }
}

export const getPopularLocationsFallback = (searchQuery: string): string[] => {
  console.warn("getPopularLocationsFallback called - this should not be used anymore without user location")
  return []
}

export const getPopularLocationsByCity = (cityName: string): string[] => {
  const normalizedCity = cityName.toLowerCase().trim()
  const locations = POPULAR_LOCATIONS[normalizedCity as keyof typeof POPULAR_LOCATIONS]
  
  if (!locations) {
    console.warn(`No popular locations found for city: ${cityName}`)
    return []
  }
  
  return locations
}

export const getNearestCity = async (userLocation: UserLocation): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    })

    if (results.length > 0) {
      const result = results[0]
      const city = result.city || result.subregion || result.region
      
      if (city) {
        const normalizedCity = city.toLowerCase().trim()
        
        // Check if we have popular locations for this exact city
        if (POPULAR_LOCATIONS[normalizedCity as keyof typeof POPULAR_LOCATIONS]) {
          return normalizedCity
        }
        
        // Try to find a partial match in our city list
        const cityKeys = Object.keys(POPULAR_LOCATIONS)
        for (const cityKey of cityKeys) {
          if (cityKey.includes(normalizedCity) || normalizedCity.includes(cityKey)) {
            return cityKey
          }
        }
        
        console.warn(`City "${city}" not found in popular locations database`)
      }
    }
  } catch (error) {
    console.error("Error getting nearest city:", error)
  }
  
  // If all else fails, we can't determine the city
  throw new Error("Unable to determine nearest city from user location")
}

// -----------------------------------------------------------------------------
// Nearby Places Functions
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
    return nearbyPlacesCache.get(cacheKey)!
  }

  try {
    const places: NearbyPlace[] = []
    const priorityCategories = [
      "amenity=university",
      "railway=station", 
      "amenity=hospital"
    ]

    const overallController = new AbortController()
    const overallTimeoutId = setTimeout(() => {
      overallController.abort()
    }, overallTimeoutMs)

    try {
      // Fetch priority categories first
      for (const category of priorityCategories) {
        if (overallController.signal.aborted) break
        
        try {
          const categoryPlaces = await fetchPlacesForCategory(
            effectiveLocation, 
            category, 
            radius, 
            overallController.signal
          )
          places.push(...categoryPlaces.slice(0, 2))
        } catch (error) {
          if (!overallController.signal.aborted) {
            console.warn(`Failed to fetch ${category}:`, error)
          }
        }
      }

      nearbyPlacesCache.set(cacheKey, places)
    } finally {
      clearTimeout(overallTimeoutId)
    }

    return places
  } catch (error) {
    console.error("Error fetching nearby places:", error)
    return []
  }
}

const fetchPlacesForCategory = async (
  location: UserLocation,
  category: string,
  radius: number,
  signal: AbortSignal
): Promise<NearbyPlace[]> => {
  const { latitude, longitude } = location
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:5];(node[${category}](around:${radius * 1000},${latitude},${longitude}););out geom;`

  const response = await fetch(url, { 
    signal,
    headers: {
      'User-Agent': 'Unipool-App/1.0',
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data.elements?.map((element: any) => ({
    name: element.tags?.name || `${category.split('=')[1]}`,
    category: category.split('=')[1],
    lat: element.lat,
    lon: element.lon,
    distance: calculateDistance(latitude, longitude, element.lat, element.lon)
  })) || []
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

export const formatLocationName = (locationResult: LocationResult): string => {
  const parts = locationResult.display_name.split(',')
  if (parts.length >= 2) {
    return `${parts[0].trim()}, ${parts[1].trim()}`
  }
  return locationResult.display_name
}

export const isLocationInIndia = (locationResult: LocationResult): boolean => {
  const lat = parseFloat(locationResult.lat)
  const lon = parseFloat(locationResult.lon)
  
  return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97
}
