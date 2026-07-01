import "expo-sqlite/localStorage/install";
import * as Location from "expo-location";
import baseURL from "../config/urlconfig";

const DEBUG_LOCATION_SERVICE =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_LOCATION_SERVICE === "1";

// -----------------------------------------------------------------------------
// Interfaces and Types
// -----------------------------------------------------------------------------

export interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  name?: string
  source?: string
  distance_km?: number
  score?: number
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

type LocationSearchOptions = {
  includeCurrentLocation?: boolean
}

export const POPULAR_LOCATIONS_WITH_COORDS = {
  "ahmedabad": {
    "Ahmedabad Junction": {
      "lat": 23.0263312,
      "lon": 72.601
    },
    "Sardar Vallabhbhai Patel Airport": {
      "lat": 23.0759129,
      "lon": 72.6305552
    },
    "CG Road": {
      "lat": 23.026011,
      "lon": 72.5567179
    },
    "SG Highway": {
      "lat": 23.1124781,
      "lon": 72.5356222
    },
    "Maninagar": {
      "lat": 22.9986596,
      "lon": 72.6114013
    },
    "Navrangpura": {
      "lat": 23.0359998,
      "lon": 72.5643429
    },
    "Ellis Bridge": {
      "lat": 23.0224833,
      "lon": 72.5753537
    },
    "Bodakdev": {
      "lat": 23.0445921,
      "lon": 72.517344
    },
    "Satellite": {
      "lat": 23.0279564,
      "lon": 72.5189752
    },
    "Prahlad Nagar": {
      "lat": 22.9999369,
      "lon": 72.5050111
    },
    "Bapunagar": {
      "lat": 23.0324369,
      "lon": 72.6313566
    },
    "Naroda": {
      "lat": 23.0732586,
      "lon": 72.6508299
    },
    "Paldi": {
      "lat": 23.0145531,
      "lon": 72.5635432
    },
    "Vastrapur": {
      "lat": 23.0400861,
      "lon": 72.5290418
    },
    "Drive-In Road": {
      "lat": 23.0447735,
      "lon": 72.543826
    },
    "Law Garden": {
      "lat": 23.0263944,
      "lon": 72.5610565
    },
    "Sabarmati Ashram": {
      "lat": 23.0601651,
      "lon": 72.5806382
    },
    "Gandhi Nagar": {
      "lat": 23.060271,
      "lon": 72.580985
    },
    "Vatva": {
      "lat": 22.9589978,
      "lon": 72.6297981
    },
    "Thaltej": {
      "lat": 23.0485393,
      "lon": 72.511742
    }
  },
  "aligarh": {
    "Aligarh Junction": {
      "lat": 27.8888068,
      "lon": 78.0747358
    },
    "Marris Road": {
      "lat": 27.8956922,
      "lon": 78.0834841
    },
    "Railway Road": {
      "lat": 27.8890596,
      "lon": 78.0752846
    },
    "Gandhi Park": {
      "lat": 27.8847392,
      "lon": 78.0738449
    },
    "Medical College": {
      "lat": 27.9189601,
      "lon": 78.0858006
    }
  },
  "allahabad": {
    "Allahabad Junction": {
      "lat": 25.4455616,
      "lon": 81.8287994
    },
    "Prayagraj Junction": {
      "lat": 25.4454322,
      "lon": 81.825958
    },
    "Civil Lines": {
      "lat": 25.4523026,
      "lon": 81.8329887
    },
    "Katra": {
      "lat": 25.4656097,
      "lon": 81.8520114
    },
    "Chowk": {
      "lat": 25.4384419,
      "lon": 81.8340224
    },
    "Triveni Sangam": {
      "lat": 25.4222299,
      "lon": 81.8923259
    },
    "Allahabad University": {
      "lat": 25.4657873,
      "lon": 81.8576436
    },
    "High Court": {
      "lat": 25.4533136,
      "lon": 81.8207936
    },
    "Naini": {
      "lat": 25.3926726,
      "lon": 81.8590806
    },
    "Jhunsi": {
      "lat": 25.4298361,
      "lon": 81.9052837
    },
    "Phaphamau": {
      "lat": 25.5288334,
      "lon": 81.856318
    },
    "Daraganj": {
      "lat": 25.4430353,
      "lon": 81.8804985
    },
    "Colonelganj": {
      "lat": 25.4562632,
      "lon": 81.8626414
    },
    "Govindpur": {
      "lat": 25.483881,
      "lon": 81.8759107
    }
  },
  "bangalore": {
    "Kempegowda International Airport": {
      "lat": 13.1976048,
      "lon": 77.7074856
    },
    "Majestic Bus Stand": {
      "lat": 12.9781846,
      "lon": 77.5721851
    },
    "M.G. Road": {
      "lat": 12.9741954,
      "lon": 77.6116653
    },
    "Brigade Road": {
      "lat": 12.9673575,
      "lon": 77.6064353
    },
    "Koramangala": {
      "lat": 12.9357366,
      "lon": 77.624081
    },
    "Indiranagar": {
      "lat": 12.9732913,
      "lon": 77.6404672
    },
    "Jayanagar": {
      "lat": 12.9292731,
      "lon": 77.5824229
    },
    "Malleshwaram": {
      "lat": 13.0027353,
      "lon": 77.5703253
    },
    "Whitefield": {
      "lat": 12.9963995,
      "lon": 77.7614229
    },
    "Electronic City": {
      "lat": 12.8487599,
      "lon": 77.648253
    },
    "HSR Layout": {
      "lat": 12.9116225,
      "lon": 77.6388622
    },
    "Basavanagudi": {
      "lat": 12.9417261,
      "lon": 77.5755021
    },
    "Sadashivanagar": {
      "lat": 13.0110193,
      "lon": 77.5808641
    },
    "Ulsoor": {
      "lat": 12.9778793,
      "lon": 77.6246697
    },
    "Richmond Town": {
      "lat": 12.963555,
      "lon": 77.6015856
    },
    "Banashankari": {
      "lat": 12.9278196,
      "lon": 77.556621
    },
    "Yelahanka": {
      "lat": 13.1006982,
      "lon": 77.5963454
    },
    "Marathahalli": {
      "lat": 12.9552572,
      "lon": 77.6984163
    },
    "BTM Layout": {
      "lat": 12.9140008,
      "lon": 77.6102821
    }
  },
  "bhopal": {
    "Bhopal Junction": {
      "lat": 23.2664845,
      "lon": 77.4130845
    },
    "Rani Kamlapati Railway Station (Habibganj)": {
      "lat": 23.2208832,
      "lon": 77.4393691
    },
    "New Market": {
      "lat": 23.2352467,
      "lon": 77.4002749
    },
    "MP Nagar": {
      "lat": 23.1666795,
      "lon": 77.4166773
    },
    "Arera Colony": {
      "lat": 23.2208721,
      "lon": 77.4293649
    },
    "BHEL Township": {
      "lat": 23.2324031,
      "lon": 77.4583924
    },
    "TT Nagar": {
      "lat": 23.2363001,
      "lon": 77.3943915
    },
    "Kolar Road": {
      "lat": 23.1940627,
      "lon": 77.4171433
    },
    "Shyamla Hills": {
      "lat": 23.239184,
      "lon": 77.3900841
    },
    "Vallabh Bhavan": {
      "lat": 23.2373697,
      "lon": 77.4181278
    },
    "Barkatullah University": {
      "lat": 23.2018097,
      "lon": 77.4526188
    },
    "Misrod": {
      "lat": 23.1684964,
      "lon": 77.4586234
    },
    "Govindpura": {
      "lat": 23.2460198,
      "lon": 77.4467044
    },
    "Berasia Road": {
      "lat": 23.2816456,
      "lon": 77.4020961
    },
    "Karond": {
      "lat": 23.2974227,
      "lon": 77.4025444
    }
  },
  "bhubaneswar": {
    "Bhubaneswar Railway Station": {
      "lat": 20.2667774,
      "lon": 85.8435592
    },
    "Biju Patnaik International Airport": {
      "lat": 20.2522954,
      "lon": 85.8134847
    },
    "Master Canteen Chowk": {
      "lat": 20.2685112,
      "lon": 85.8410902
    },
    "Saheed Nagar": {
      "lat": 20.2886824,
      "lon": 85.8488154
    },
    "Jayadev Vihar": {
      "lat": 20.2953226,
      "lon": 85.8248421
    },
    "Chandrasekharpur": {
      "lat": 20.3421722,
      "lon": 85.8201153
    },
    "Infocity": {
      "lat": 20.3428436,
      "lon": 85.8068018
    },
    "KIIT University": {
      "lat": 20.3530675,
      "lon": 85.8201467
    },
    "Old Town": {
      "lat": 20.2383012,
      "lon": 85.8316755
    },
    "Khandagiri": {
      "lat": 20.2661224,
      "lon": 85.7832241
    },
    "Nayapalli": {
      "lat": 20.2831912,
      "lon": 85.8186698
    },
    "Unit 1 Market": {
      "lat": 20.26574,
      "lon": 85.8325653
    },
    "Baramunda": {
      "lat": 20.2731096,
      "lon": 85.7953289
    },
    "Patia": {
      "lat": 20.360451,
      "lon": 85.8246128
    },
    "Forest Park": {
      "lat": 20.2579538,
      "lon": 85.8252953
    }
  },
  "chandigarh": {
    "Chandigarh Railway Station": {
      "lat": 30.7021622,
      "lon": 76.8214533
    },
    "Chandigarh Airport": {
      "lat": 30.6741922,
      "lon": 76.7909851
    },
    "Sector 22": {
      "lat": 30.7334256,
      "lon": 76.7713451
    },
    "Sector 35": {
      "lat": 30.7261215,
      "lon": 76.7598867
    },
    "Sector 7 (Madhya Marg)": {
      "lat": 30.7325473,
      "lon": 76.7994039
    },
    "Sector 8": {
      "lat": 30.7417025,
      "lon": 76.7994536
    },
    "Panjab University": {
      "lat": 30.7602415,
      "lon": 76.7664916
    },
    "PGI Chandigarh": {
      "lat": 30.7614305,
      "lon": 76.7749653
    },
    "Rock Garden": {
      "lat": 30.7531959,
      "lon": 76.8066302
    },
    "Sukhna Lake": {
      "lat": 30.7419776,
      "lon": 76.8176747
    },
    "Mohali": {
      "lat": 30.6767354,
      "lon": 76.7486214
    },
    "Panchkula": {
      "lat": 30.6990536,
      "lon": 76.8357208
    },
    "Industrial Area Phase I": {
      "lat": 30.7054046,
      "lon": 76.8009569
    },
    "Manimajra": {
      "lat": 30.7127455,
      "lon": 76.832944
    },
    "Daria": {
      "lat": 30.6983838,
      "lon": 76.8142779
    },
    "Hallomajra": {
      "lat": 30.6922961,
      "lon": 76.7999692
    }
  },
  "chennai": {
    "Chennai Central Railway Station": {
      "lat": 13.0825901,
      "lon": 80.2763077
    },
    "Chennai International Airport": {
      "lat": 12.993374,
      "lon": 80.1725867
    },
    "Anna Salai (Mount Road)": {
      "lat": 13.0326834,
      "lon": 80.2429056
    },
    "T. Nagar": {
      "lat": 13.0294483,
      "lon": 80.2309064
    },
    "Koyambedu": {
      "lat": 13.0734496,
      "lon": 80.1948363
    },
    "Velachery": {
      "lat": 12.9801655,
      "lon": 80.2228506
    },
    "Adyar": {
      "lat": 13.00645,
      "lon": 80.2577791
    },
    "Mylapore": {
      "lat": 13.0316473,
      "lon": 80.2700166
    },
    "Egmore": {
      "lat": 13.0728321,
      "lon": 80.2576906
    },
    "Tambaram": {
      "lat": 12.9205184,
      "lon": 80.1967752
    },
    "Porur": {
      "lat": 13.052959,
      "lon": 80.2346238
    },
    "Guindy": {
      "lat": 13.0086685,
      "lon": 80.2126063
    },
    "Nungambakkam": {
      "lat": 13.0620626,
      "lon": 80.240487
    },
    "Thiruvanmiyur": {
      "lat": 12.9858948,
      "lon": 80.2644215
    },
    "Perambur": {
      "lat": 13.1121242,
      "lon": 80.245022
    },
    "Old Mahabalipuram Road (OMR)": {
      "lat": 12.9209254,
      "lon": 80.2299723
    },
    "Sholinganallur": {
      "lat": 12.9174426,
      "lon": 80.2164902
    },
    "Sriperumbudur": {
      "lat": 13.0217323,
      "lon": 80.1452756
    }
  },
  "coimbatore": {
    "Coimbatore International Airport": {
      "lat": 11.0329077,
      "lon": 77.0427014
    },
    "Coimbatore Junction": {
      "lat": 10.9975681,
      "lon": 76.9663657
    },
    "Gandhipuram": {
      "lat": 11.0182714,
      "lon": 76.9677744
    },
    "RS Puram": {
      "lat": 11.0080177,
      "lon": 76.9501661
    },
    "Peelamedu": {
      "lat": 11.0269577,
      "lon": 76.9945813
    },
    "Saibaba Colony": {
      "lat": 11.024334,
      "lon": 76.9447875
    },
    "Race Course": {
      "lat": 11.0010788,
      "lon": 76.9779619
    },
    "Town Hall": {
      "lat": 10.9967542,
      "lon": 76.956623
    },
    "Ukkadam": {
      "lat": 10.9895218,
      "lon": 76.9561068
    },
    "Singanallur": {
      "lat": 11.0124691,
      "lon": 77.0391191
    },
    "Vadavalli": {
      "lat": 11.0253387,
      "lon": 76.9051251
    },
    "KK Pudur": {
      "lat": 10.9610718,
      "lon": 76.8040293
    },
    "Avinashi Road": {
      "lat": 11.0484876,
      "lon": 77.05559
    },
    "Brookefields Mall": {
      "lat": 11.0088739,
      "lon": 76.9593964
    },
    "Fun Republic Mall": {
      "lat": 11.0243516,
      "lon": 77.0106613
    },
    "Podanur": {
      "lat": 10.9585609,
      "lon": 76.988307
    },
    "Kalapatti": {
      "lat": 11.0787684,
      "lon": 77.0370419
    },
    "Thudiyalur": {
      "lat": 11.0805532,
      "lon": 76.9421498
    },
    "Perur": {
      "lat": 10.976406,
      "lon": 76.9141784
    },
    "Saravanampatti": {
      "lat": 11.0747296,
      "lon": 77.0027116
    }
  },
  "delhi": {
    "New Delhi Railway Station": {
      "lat": 28.6402816,
      "lon": 77.2204103
    },
    "Old Delhi Railway Station": {
      "lat": 28.660932,
      "lon": 77.2276494
    },
    "Indira Gandhi International Airport": {
      "lat": 28.5549889,
      "lon": 77.0846833
    },
    "Connaught Place": {
      "lat": 28.6314022,
      "lon": 77.2193791
    },
    "Chandni Chowk": {
      "lat": 28.6559834,
      "lon": 77.2321937
    },
    "Karol Bagh": {
      "lat": 28.6529982,
      "lon": 77.1890227
    },
    "Paharganj": {
      "lat": 28.6414989,
      "lon": 77.2140607
    },
    "Hauz Khas": {
      "lat": 28.5498086,
      "lon": 77.2077638
    },
    "Saket": {
      "lat": 28.521168,
      "lon": 77.2022237
    },
    "Lajpat Nagar": {
      "lat": 28.5660924,
      "lon": 77.2432851
    },
    "Dwarka": {
      "lat": 28.6149362,
      "lon": 77.0227628
    },
    "Rohini": {
      "lat": 28.7162092,
      "lon": 77.1170743
    },
    "Noida": {
      "lat": 28.5896797,
      "lon": 77.331223
    },
    "Gurgaon": {
      "lat": 28.3996098,
      "lon": 77.3364029
    },
    "Nehru Place": {
      "lat": 28.5492574,
      "lon": 77.2529526
    },
    "Janakpuri": {
      "lat": 28.6219272,
      "lon": 77.0874757
    },
    "Vasant Kunj": {
      "lat": 28.5292495,
      "lon": 77.1541335
    },
    "South Extension": {
      "lat": 28.5685664,
      "lon": 77.2205677
    },
    "Delhi University (North Campus)": {
      "lat": 28.6848257,
      "lon": 77.2084275
    }
  },
  "dhanbad": {
    "Dhanbad Junction": {
      "lat": 23.7913021,
      "lon": 86.4294782
    },
    "Katras": {
      "lat": 23.7975156,
      "lon": 86.2983397
    },
    "Jharia": {
      "lat": 23.7407998,
      "lon": 86.4145678
    },
    "Govindpur": {
      "lat": 23.7981279,
      "lon": 86.2827314
    },
    "Hirapur": {
      "lat": 23.7991476,
      "lon": 86.4403063
    },
    "Sindri": {
      "lat": 23.6751544,
      "lon": 86.4896289
    },
    "Barwadda": {
      "lat": 23.8371712,
      "lon": 86.4289738
    },
    "ISM (IIT Dhanbad)": {
      "lat": 23.8148779,
      "lon": 86.4425786
    },
    "Dhansar": {
      "lat": 23.7797531,
      "lon": 86.4139246
    },
    "Matkuria": {
      "lat": 23.7886449,
      "lon": 86.4122626
    },
    "Kusunda": {
      "lat": 23.7696849,
      "lon": 86.3821238
    },
    "Steel Gate": {
      "lat": 23.8135358,
      "lon": 86.4618207
    },
    "Bartand": {
      "lat": 23.8059453,
      "lon": 86.4311412
    },
    "Chirkunda": {
      "lat": 23.7451314,
      "lon": 86.7869794
    }
  },
  "gurgaon": {
    "MG Road (Gurugram)": {
      "lat": 28.4769544,
      "lon": 77.06624
    },
    "IFFCO Chowk": {
      "lat": 28.4723277,
      "lon": 77.0724222
    },
    "Cyber City": {
      "lat": 28.4980613,
      "lon": 77.0891604
    },
    "Udyog Vihar": {
      "lat": 28.4917349,
      "lon": 77.0819718
    },
    "Golf Course Road": {
      "lat": 28.4500618,
      "lon": 77.0991779
    },
    "Sohna Road": {
      "lat": 28.3836554,
      "lon": 77.0534279
    },
    "DLF Phase 1": {
      "lat": 28.4714258,
      "lon": 77.0939606
    },
    "Manesar": {
      "lat": 28.3247096,
      "lon": 76.9263787
    },
    "Sector 14": {
      "lat": 28.473784,
      "lon": 77.0471827
    },
    "Sushant Lok": {
      "lat": 28.4706634,
      "lon": 77.0798127
    },
    "Palam Vihar": {
      "lat": 28.5054709,
      "lon": 77.0381625
    },
    "Medanta (Sector 38)": {
      "lat": 28.4389466,
      "lon": 77.0402727
    },
    "Ambience Mall": {
      "lat": 28.5042583,
      "lon": 77.0972049
    },
    "Rajiv Chowk (Gurgaon)": {
      "lat": 28.4477252,
      "lon": 77.032607
    },
    "Sector 29": {
      "lat": 28.4669197,
      "lon": 77.0671306
    },
    "Dwarka Expressway": {
      "lat": 28.4428678,
      "lon": 76.9601665
    },
    "South City": {
      "lat": 28.4597391,
      "lon": 77.0612091
    },
    "Badshahpur": {
      "lat": 28.3932757,
      "lon": 77.0484201
    }
  },
  "guwahati": {
    "Guwahati Railway Station (Paltan Bazaar)": {
      "lat": 26.1821371,
      "lon": 91.7507423
    },
    "Paltan Bazaar": {
      "lat": 26.1792275,
      "lon": 91.7512716
    },
    "Pan Bazaar": {
      "lat": 26.1853572,
      "lon": 91.7472062
    },
    "Fancy Bazaar": {
      "lat": 26.1799322,
      "lon": 91.7362163
    },
    "Khanapara": {
      "lat": 26.1161783,
      "lon": 91.7972485
    },
    "Beltola": {
      "lat": 26.1161783,
      "lon": 91.7972485
    },
    "Maligaon": {
      "lat": 26.1600453,
      "lon": 91.6958086
    },
    "Chandmari": {
      "lat": 26.1841165,
      "lon": 91.7740906
    },
    "Six Mile": {
      "lat": 26.1161377,
      "lon": 91.7973256
    },
    "Ulubari": {
      "lat": 26.175003,
      "lon": 91.7576927
    },
    "Jalukbari": {
      "lat": 26.1554983,
      "lon": 91.671224
    },
    "Azara": {
      "lat": 26.1385795,
      "lon": 91.6350313
    },
    "Noonmati": {
      "lat": 26.1979372,
      "lon": 91.7998576
    },
    "Basistha": {
      "lat": 26.0945317,
      "lon": 91.7853471
    }
  },
  "hyderabad": {
    "Hyderabad Deccan (Nampally) Station": {
      "lat": 17.3924223,
      "lon": 78.4675956
    },
    "Secunderabad Junction": {
      "lat": 17.4338199,
      "lon": 78.5020402
    },
    "HITEC City": {
      "lat": 17.4490055,
      "lon": 78.3831376
    },
    "Gachibowli": {
      "lat": 17.4436222,
      "lon": 78.3519638
    },
    "Madhapur": {
      "lat": 17.4408924,
      "lon": 78.3916304
    },
    "Jubilee Hills": {
      "lat": 17.4308362,
      "lon": 78.4102882
    },
    "Banjara Hills": {
      "lat": 17.4177464,
      "lon": 78.4399014
    },
    "Somajiguda": {
      "lat": 17.4255053,
      "lon": 78.4585197
    },
    "Begumpet": {
      "lat": 17.446195,
      "lon": 78.463016
    },
    "Kondapur": {
      "lat": 17.4587912,
      "lon": 78.3730556
    },
    "Kukatpally": {
      "lat": 17.4930841,
      "lon": 78.4054408
    },
    "Charminar": {
      "lat": 17.3616024,
      "lon": 78.4746421
    },
    "Mehdipatnam": {
      "lat": 17.3942627,
      "lon": 78.4342514
    },
    "Abids": {
      "lat": 17.3894783,
      "lon": 78.477182
    },
    "L.B. Nagar": {
      "lat": 17.3498286,
      "lon": 78.5479138
    },
    "Dilsukhnagar": {
      "lat": 17.3684307,
      "lon": 78.5234283
    },
    "Necklace Road": {
      "lat": 17.4233355,
      "lon": 78.4631857
    },
    "Tank Bund": {
      "lat": 17.4162548,
      "lon": 78.485716
    },
    "Falaknuma": {
      "lat": 17.3326604,
      "lon": 78.4751984
    }
  },
  "indore": {
    "Indore Junction": {
      "lat": 22.7170064,
      "lon": 75.8684722
    },
    "Devi Ahilyabai Holkar Airport": {
      "lat": 22.7203745,
      "lon": 75.8032544
    },
    "Rajwada": {
      "lat": 22.7184344,
      "lon": 75.8547755
    },
    "Sarafa Bazaar": {
      "lat": 22.7178947,
      "lon": 75.8518582
    },
    "Vijay Nagar": {
      "lat": 22.6948381,
      "lon": 75.8539948
    },
    "Palasia": {
      "lat": 22.7247478,
      "lon": 75.8872048
    },
    "Bhanwarkuan": {
      "lat": 22.6926536,
      "lon": 75.8676588
    },
    "A.B. Road": {
      "lat": 22.639302,
      "lon": 75.8144443
    },
    "Bhawarkua": {
      "lat": 19.688906,
      "lon": 79.4106337
    },
    "Sudama Nagar": {
      "lat": 22.6883222,
      "lon": 75.8321475
    },
    "Navlakha": {
      "lat": 22.6987158,
      "lon": 75.8779002
    },
    "LIG Colony": {
      "lat": 22.7377373,
      "lon": 75.8867237
    },
    "Dwarkapuri": {
      "lat": 22.6917778,
      "lon": 75.8248064
    },
    "Khajrana": {
      "lat": 22.7331833,
      "lon": 75.9035394
    },
    "Rajendra Nagar": {
      "lat": 22.6700186,
      "lon": 75.8292229
    },
    "Mhow": {
      "lat": 22.5586725,
      "lon": 75.7686558
    }
  },
  "jaipur": {
    "Jaipur Junction": {
      "lat": 26.9207888,
      "lon": 75.7866539
    },
    "Jaipur International Airport": {
      "lat": 26.8281087,
      "lon": 75.8079888
    },
    "Bapu Bazaar": {
      "lat": 26.9163742,
      "lon": 75.8232007
    },
    "Hawa Mahal Road": {
      "lat": 26.923932,
      "lon": 75.8268652
    },
    "Sindhi Camp Bus Stand": {
      "lat": 26.923305,
      "lon": 75.8006345
    },
    "Vaishali Nagar": {
      "lat": 26.9095703,
      "lon": 75.7391732
    },
    "Mansarovar": {
      "lat": 26.8756076,
      "lon": 75.7509072
    },
    "Malviya Nagar": {
      "lat": 26.8593667,
      "lon": 75.8098088
    },
    "C-Scheme": {
      "lat": 26.9140181,
      "lon": 75.8067179
    },
    "Amer Fort": {
      "lat": 26.9854705,
      "lon": 75.8539676
    },
    "JLN Marg": {
      "lat": 26.8886213,
      "lon": 75.8135854
    },
    "Ajmeri Gate": {
      "lat": 26.9153191,
      "lon": 75.8169299
    },
    "Tonk Road": {
      "lat": 26.8392776,
      "lon": 75.7937325
    },
    "Bani Park": {
      "lat": 26.9316554,
      "lon": 75.7958012
    },
    "Raja Park": {
      "lat": 26.8966396,
      "lon": 75.8271072
    },
    "Shyam Nagar": {
      "lat": 26.8964768,
      "lon": 75.7706279
    },
    "Jawahar Circle": {
      "lat": 26.8397772,
      "lon": 75.8009153
    },
    "Gopalpura": {
      "lat": 26.8738221,
      "lon": 75.7780496
    }
  },
  "kanpur": {
    "Kanpur Central Railway Station": {
      "lat": 26.4538613,
      "lon": 80.3512433
    },
    "Kanpur Anwarganj Station": {
      "lat": 26.4558434,
      "lon": 80.3281028
    },
    "Kanpur Airport (Chakeri)": {
      "lat": 26.4054757,
      "lon": 80.41536
    },
    "IIT Kanpur": {
      "lat": 26.5093058,
      "lon": 80.2482323
    },
    "CSJM University": {
      "lat": 26.4964612,
      "lon": 80.2674068
    },
    "Kanpur Cantonment": {
      "lat": 26.4487664,
      "lon": 80.3650651
    },
    "Civil Lines": {
      "lat": 26.4760088,
      "lon": 80.3465098
    },
    "Naveen Market": {
      "lat": 26.4740673,
      "lon": 80.3454472
    },
    "The Mall (Mall Road)": {
      "lat": 26.476497,
      "lon": 80.3383406
    },
    "Govind Nagar": {
      "lat": 26.4664972,
      "lon": 80.3052854
    },
    "Kidwai Nagar": {
      "lat": 26.4409888,
      "lon": 80.3419876
    },
    "Panki": {
      "lat": 26.4595614,
      "lon": 80.2390699
    },
    "Kalpi Road": {
      "lat": 26.4623531,
      "lon": 80.3082989
    },
    "Shastri Nagar": {
      "lat": 26.4672535,
      "lon": 80.2977715
    },
    "Kakadeo": {
      "lat": 26.4735503,
      "lon": 80.2929783
    },
    "Kalyanpur": {
      "lat": 26.5037165,
      "lon": 80.2525473
    }
  },
  "kharagpur": {
    "Kharagpur Junction": {
      "lat": 22.3399404,
      "lon": 87.3250048
    },
    "Hijli": {
      "lat": 22.3196993,
      "lon": 87.3193294
    },
    "Inda": {
      "lat": 22.3470285,
      "lon": 87.3342063
    },
    "Kalaikunda": {
      "lat": 22.3283629,
      "lon": 87.2325182
    },
    "Gole Bazaar": {
      "lat": 22.3418444,
      "lon": 87.3170584
    },
    "Nimpura": {
      "lat": 22.3257081,
      "lon": 87.2653753
    },
    "Talbagicha": {
      "lat": 22.3146566,
      "lon": 87.2832656
    }
  },
  "kolkata": {
    "Sealdah Station": {
      "lat": 22.5652881,
      "lon": 88.3701979
    },
    "Park Street": {
      "lat": 22.5551591,
      "lon": 88.3501171
    },
    "Esplanade (Dharmatala)": {
      "lat": 22.5641292,
      "lon": 88.3502752
    },
    "Salt Lake City (Bidhannagar)": {
      "lat": 22.5847892,
      "lon": 88.4231722
    },
    "New Town (Rajarhat)": {
      "lat": 22.6236298,
      "lon": 88.45048
    },
    "Gariahat": {
      "lat": 22.5194439,
      "lon": 88.365148
    },
    "Tollygunge": {
      "lat": 22.498636,
      "lon": 88.3453908
    },
    "Jadavpur": {
      "lat": 22.495499,
      "lon": 88.3709006
    },
    "Behala": {
      "lat": 22.501572,
      "lon": 88.3209435
    },
    "College Street": {
      "lat": 22.5672156,
      "lon": 88.3601335
    },
    "Dum Dum": {
      "lat": 22.6210988,
      "lon": 88.3978255
    },
    "Shyambazar": {
      "lat": 22.601335,
      "lon": 88.3724974
    },
    "Kalighat": {
      "lat": 22.5153313,
      "lon": 88.3477052
    },
    "Alipore": {
      "lat": 22.5264928,
      "lon": 88.3323692
    },
    "Ballygunge": {
      "lat": 22.5280337,
      "lon": 88.3659084
    },
    "Howrah Maidan": {
      "lat": 22.5850528,
      "lon": 88.3469761
    },
    "EM Bypass": {
      "lat": 22.4690721,
      "lon": 88.3912838
    }
  },
  "lucknow": {
    "Charbagh Railway Station": {
      "lat": 26.83242,
      "lon": 80.9231122
    },
    "Chaudhary Charan Singh Airport (Amausi)": {
      "lat": 26.7608025,
      "lon": 80.8936031
    },
    "Hazratganj": {
      "lat": 26.8475285,
      "lon": 80.9432003
    },
    "Gomti Nagar": {
      "lat": 26.8605833,
      "lon": 81.0029055
    },
    "Alambagh": {
      "lat": 26.8140101,
      "lon": 80.9025123
    },
    "Aminabad": {
      "lat": 26.8487,
      "lon": 80.927
    },
    "Indira Nagar": {
      "lat": 26.8823182,
      "lon": 80.9900344
    },
    "Aliganj": {
      "lat": 26.90515,
      "lon": 80.9479913
    },
    "Chowk": {
      "lat": 26.8677148,
      "lon": 80.9042142
    },
    "Kaiserbagh": {
      "lat": 26.8498749,
      "lon": 80.9314544
    },
    "Thakurganj": {
      "lat": 26.8793864,
      "lon": 80.8905146
    },
    "Rajajipuram": {
      "lat": 26.8410454,
      "lon": 80.8525902
    },
    "Faizabad Road": {
      "lat": 26.8863181,
      "lon": 81.0510531
    },
    "Telibagh": {
      "lat": 26.7778063,
      "lon": 80.9429644
    },
    "Chinhat": {
      "lat": 26.8751435,
      "lon": 81.0355588
    }
  },
  "madurai": {
    "Madurai Airport": {
      "lat": 9.8362608,
      "lon": 78.0939177
    },
    "Madurai Junction": {
      "lat": 9.9192715,
      "lon": 78.1098809
    },
    "Meenakshi Amman Temple": {
      "lat": 9.9195433,
      "lon": 78.1188334
    },
    "Mattuthavani Bus Stand": {
      "lat": 9.9440908,
      "lon": 78.156043
    },
    "Periyar Bus Stand": {
      "lat": 9.9160536,
      "lon": 78.1111723
    },
    "K. Pudur": {
      "lat": 9.9471571,
      "lon": 78.1452905
    },
    "Goripalayam": {
      "lat": 9.9292458,
      "lon": 78.1294109
    },
    "Thirupparankundram": {
      "lat": 9.8807772,
      "lon": 78.0499917
    },
    "Avaniyapuram": {
      "lat": 9.9286118,
      "lon": 78.0981046
    },
    "Palanganatham": {
      "lat": 9.9040093,
      "lon": 78.0962583
    },
    "Arasaradi": {
      "lat": 9.9276237,
      "lon": 78.0997294
    },
    "Anna Nagar (Madurai)": {
      "lat": 9.9223354,
      "lon": 78.1493658
    },
    "KK Nagar (Madurai)": {
      "lat": 9.9695421,
      "lon": 78.1242879
    },
    "Simmakkal": {
      "lat": 9.9249211,
      "lon": 78.1210878
    },
    "Thirunagar": {
      "lat": 9.9385046,
      "lon": 78.0127284
    },
    "Tallakulam": {
      "lat": 9.9334996,
      "lon": 78.1388998
    },
    "Vilakkuthoon": {
      "lat": 9.917784,
      "lon": 78.1237595
    },
    "Melur": {
      "lat": 10.0858443,
      "lon": 78.3560235
    },
    "Thirumangalam": {
      "lat": 9.7980095,
      "lon": 77.9298426
    },
    "Othakadai": {
      "lat": 9.9604223,
      "lon": 78.1891222
    }
  },
  "manipal": {
    "Tiger Circle": {
      "lat": 13.3524094,
      "lon": 74.7872546
    },
    "Manipal Lake": {
      "lat": 13.3422976,
      "lon": 74.7856116
    },
    "End Point": {
      "lat": 13.3700386,
      "lon": 74.7848287
    },
    "Perampalli": {
      "lat": 13.3533178,
      "lon": 74.7840316
    },
    "Udupi Railway Station": {
      "lat": 13.3360724,
      "lon": 74.7708331
    },
    "KC Road": {
      "lat": 13.3498438,
      "lon": 74.7858476
    }
  },
  "mangalore": {
    "Mangalore Central Railway Station": {
      "lat": 12.8634037,
      "lon": 74.8432387
    },
    "Mangalore Junction (Kankanady)": {
      "lat": 12.866628,
      "lon": 74.8792308
    },
    "Mangalore International Airport": {
      "lat": 12.9546178,
      "lon": 74.8847182
    },
    "Hampankatta": {
      "lat": 12.8691203,
      "lon": 74.843432
    },
    "Kadri": {
      "lat": 12.8897288,
      "lon": 74.8501424
    },
    "Bejai": {
      "lat": 12.8880652,
      "lon": 74.8469598
    },
    "Kankanadi": {
      "lat": 12.866628,
      "lon": 74.8792308
    },
    "Balmatta": {
      "lat": 12.8791877,
      "lon": 74.8584005
    },
    "Car Street": {
      "lat": 12.8702004,
      "lon": 74.8366794
    },
    "Pandeshwar": {
      "lat": 12.85684,
      "lon": 74.8379984
    },
    "Surathkal": {
      "lat": 12.9798673,
      "lon": 74.8246658
    },
    "Panambur": {
      "lat": 12.945576,
      "lon": 74.8078986
    },
    "Kulur": {
      "lat": 12.9243563,
      "lon": 74.8293817
    },
    "Kudroli": {
      "lat": 12.8765518,
      "lon": 74.8302397
    },
    "Kavoor": {
      "lat": 12.9180644,
      "lon": 74.8593498
    }
  },
  "mumbai": {
    "Mumbai Central Station": {
      "lat": 18.9695855,
      "lon": 72.8193152
    },
    "Bandra": {
      "lat": 19.0549792,
      "lon": 72.8402203
    },
    "Andheri": {
      "lat": 19.1196976,
      "lon": 72.8464205
    },
    "Dadar": {
      "lat": 19.0192269,
      "lon": 72.8428479
    },
    "Colaba": {
      "lat": 18.915091,
      "lon": 72.8259691
    },
    "Nariman Point": {
      "lat": 18.927089,
      "lon": 72.8235859
    },
    "Marine Drive": {
      "lat": 18.9344628,
      "lon": 72.8239429
    },
    "Juhu": {
      "lat": 19.1070215,
      "lon": 72.8275275
    },
    "Bandra Kurla Complex (BKC)": {
      "lat": 19.0602338,
      "lon": 72.8549629
    },
    "Powai": {
      "lat": 19.1187195,
      "lon": 72.9073476
    },
    "Churchgate": {
      "lat": 18.9354797,
      "lon": 72.8271741
    },
    "Worli": {
      "lat": 18.9988404,
      "lon": 72.8170327
    },
    "Lower Parel": {
      "lat": 18.99568,
      "lon": 72.8302756
    },
    "Goregaon": {
      "lat": 19.1648688,
      "lon": 72.8495492
    },
    "Borivali": {
      "lat": 19.229068,
      "lon": 72.8573628
    },
    "Navi Mumbai": {
      "lat": 19.1511011,
      "lon": 72.9995356
    },
    "Thane": {
      "lat": 19.1714006,
      "lon": 72.9678207
    },
    "Mulund": {
      "lat": 19.1721762,
      "lon": 72.9562383
    },
    "Chembur": {
      "lat": 19.054818,
      "lon": 72.8979713
    },
    "Ghatkopar": {
      "lat": 19.0856928,
      "lon": 72.9083668
    },
    "Vashi": {
      "lat": 19.0632481,
      "lon": 72.9987966
    }
  },
  "mysore": {
    "Mysore Junction": {
      "lat": 12.3169685,
      "lon": 76.645346
    },
    "Mysore Airport (Mandakalli)": {
      "lat": 12.230206,
      "lon": 76.6526593
    },
    "Mysore Palace": {
      "lat": 12.3052196,
      "lon": 76.6553846
    },
    "Chamundi Hills": {
      "lat": 12.29286,
      "lon": 76.68275
    },
    "Jayalakshmipuram": {
      "lat": 12.3224157,
      "lon": 76.6217738
    },
    "Vijayanagar": {
      "lat": 12.333285,
      "lon": 76.6125598
    },
    "Gokulam": {
      "lat": 12.3260989,
      "lon": 76.628297
    },
    "Hebbal (Mysore)": {
      "lat": 12.3579894,
      "lon": 76.6105084
    },
    "Saraswathipuram": {
      "lat": 12.2985576,
      "lon": 76.628411
    },
    "Lashkar Mohalla": {
      "lat": 12.3117808,
      "lon": 76.6621332
    },
    "Nazarbad": {
      "lat": 12.3093335,
      "lon": 76.6657534
    },
    "Kuvempunagar": {
      "lat": 12.2933904,
      "lon": 76.6308591
    },
    "Krishnaraja Boulevard": {
      "lat": 12.2980313,
      "lon": 76.6386757
    },
    "Siddhartha Layout": {
      "lat": 12.3075127,
      "lon": 76.6826917
    },
    "Yadavagiri": {
      "lat": 12.327919,
      "lon": 76.6391525
    },
    "Hinkal": {
      "lat": 12.3299639,
      "lon": 76.6007405
    }
  },
  "nagpur": {
    "Nagpur Junction": {
      "lat": 21.152255,
      "lon": 79.0888669
    },
    "Dr. Babasaheb Ambedkar International Airport": {
      "lat": 21.0909079,
      "lon": 79.0546789
    },
    "Sitabuldi": {
      "lat": 21.1414478,
      "lon": 79.0824843
    },
    "Sadar": {
      "lat": 21.1705078,
      "lon": 79.0751299
    },
    "Civil Lines": {
      "lat": 21.1549282,
      "lon": 79.078932
    },
    "Dharampeth": {
      "lat": 21.1409684,
      "lon": 79.0624344
    },
    "Ramdaspeth": {
      "lat": 21.1365853,
      "lon": 79.0749872
    },
    "Itwari": {
      "lat": 21.1569338,
      "lon": 79.1102582
    },
    "MIHAN": {
      "lat": 21.0616937,
      "lon": 79.0460178
    },
    "Butibori": {
      "lat": 20.9281928,
      "lon": 79.0070802
    },
    "Wardha Road": {
      "lat": 21.1138092,
      "lon": 79.0710495
    },
    "Kamptee Road": {
      "lat": 21.2115786,
      "lon": 79.1601145
    },
    "Koradi": {
      "lat": 21.2414464,
      "lon": 79.1027747
    },
    "Mahal": {
      "lat": 21.1429969,
      "lon": 79.1101819
    },
    "Cotton Market": {
      "lat": 21.1460074,
      "lon": 79.0906452
    },
    "Ajni": {
      "lat": 21.1269226,
      "lon": 79.0825751
    },
    "Jaripatka": {
      "lat": 21.1886888,
      "lon": 79.0918769
    },
    "Manish Nagar": {
      "lat": 21.0920801,
      "lon": 79.0726499
    },
    "Shankar Nagar": {
      "lat": 21.1362125,
      "lon": 79.0616442
    }
  },
  "navi mumbai": {
    "Vashi": {
      "lat": 19.0632481,
      "lon": 72.9987966
    },
    "Nerul": {
      "lat": 19.0335938,
      "lon": 73.018164
    },
    "Belapur": {
      "lat": 19.0051696,
      "lon": 73.0282853
    },
    "Kharghar": {
      "lat": 19.025773,
      "lon": 73.0591845
    },
    "Panvel": {
      "lat": 19.0416496,
      "lon": 73.0284345
    },
    "Airoli": {
      "lat": 19.1585147,
      "lon": 72.9994019
    },
    "Kopar Khairane": {
      "lat": 19.1056227,
      "lon": 72.9988648
    },
    "Ghansoli": {
      "lat": 19.1163796,
      "lon": 73.0069928
    },
    "Sanpada": {
      "lat": 19.0659774,
      "lon": 73.0095329
    },
    "Seawoods": {
      "lat": 19.0213683,
      "lon": 73.018939
    },
    "CBD Belapur": {
      "lat": 19.0190244,
      "lon": 73.0390629
    },
    "Turbhe": {
      "lat": 19.0761648,
      "lon": 73.0176615
    },
    "Rabale": {
      "lat": 19.1366355,
      "lon": 73.0027824
    },
    "Mahape": {
      "lat": 19.1093012,
      "lon": 73.0235724
    },
    "Kalamboli": {
      "lat": 19.0235062,
      "lon": 73.1106092
    },
    "Kamothe": {
      "lat": 19.0164338,
      "lon": 73.0806552
    },
    "New Panvel": {
      "lat": 18.9982037,
      "lon": 73.1236641
    },
    "Digha": {
      "lat": 19.179578,
      "lon": 72.9964178
    },
    "Juinagar": {
      "lat": 19.0559456,
      "lon": 73.0182495
    }
  },
  "noida": {
    "Sector 62": {
      "lat": 28.6211447,
      "lon": 77.3643493
    },
    "Noida City Centre (Sector 32)": {
      "lat": 28.5752887,
      "lon": 77.3554229
    },
    "Film City (Sector 16A)": {
      "lat": 28.5628133,
      "lon": 77.316257
    },
    "Greater Noida": {
      "lat": 28.503475,
      "lon": 77.3987831
    },
    "Yamuna Expressway": {
      "lat": 28.406404,
      "lon": 77.520785
    },
    "Sector 15": {
      "lat": 28.5827978,
      "lon": 77.3102221
    },
    "Sector 37": {
      "lat": 28.5609423,
      "lon": 77.3360564
    },
    "Pari Chowk": {
      "lat": 28.4631285,
      "lon": 77.5080985
    },
    "Sector 50": {
      "lat": 28.5711552,
      "lon": 77.3674862
    },
    "Sector 135": {
      "lat": 28.4980046,
      "lon": 77.4000326
    },
    "Noida-Greater Noida Expressway": {
      "lat": 28.4610024,
      "lon": 77.4630568
    },
    "Sector 110": {
      "lat": 28.5311931,
      "lon": 77.3851697
    },
    "Sector 75": {
      "lat": 28.4716932,
      "lon": 77.5313411
    },
    "Botanical Garden": {
      "lat": 28.5639434,
      "lon": 77.3343995
    },
    "Okhla Bird Sanctuary": {
      "lat": 28.5569866,
      "lon": 77.3090031
    },
    "Sector 44": {
      "lat": 28.5531837,
      "lon": 77.3381716
    }
  },
  "patna": {
    "Patna Junction": {
      "lat": 25.6032109,
      "lon": 85.1376861
    },
    "Gandhi Maidan": {
      "lat": 25.6172993,
      "lon": 85.145078
    },
    "Fraser Road": {
      "lat": 25.6129358,
      "lon": 85.1411304
    },
    "Ashok Rajpath": {
      "lat": 25.6304278,
      "lon": 85.1188374
    },
    "Kankarbagh": {
      "lat": 25.5978353,
      "lon": 85.1528569
    },
    "Boring Road": {
      "lat": 25.616517,
      "lon": 85.1137693
    },
    "Bailey Road": {
      "lat": 25.610627,
      "lon": 85.1262786
    },
    "Danapur": {
      "lat": 25.6358901,
      "lon": 85.0474045
    },
    "Patna Sahib (Harmandir Takht)": {
      "lat": 25.5958292,
      "lon": 85.2297928
    },
    "Patna University": {
      "lat": 25.5424381,
      "lon": 84.8516072
    },
    "Rajendra Nagar": {
      "lat": 25.6005216,
      "lon": 85.1640085
    },
    "Phulwari Sharif": {
      "lat": 25.5866072,
      "lon": 85.0802796
    },
    "Saguna More": {
      "lat": 25.6233883,
      "lon": 85.0416756
    },
    "AIIMS Patna": {
      "lat": 25.5615706,
      "lon": 85.0422873
    },
    "Patliputra Colony": {
      "lat": 25.6291729,
      "lon": 85.1095929
    },
    "Anisabad": {
      "lat": 25.5858278,
      "lon": 85.0964126
    },
    "Agam Kuan": {
      "lat": 25.6006564,
      "lon": 85.1991882
    }
  },
  "pilani": {
    "CEERI Pilani": {
      "lat": 28.3672358,
      "lon": 75.5838129
    }
  },
  "pondicherry": {
    "Auroville": {
      "lat": 12.0170697,
      "lon": 79.8148229
    },
    "Paradise Beach": {
      "lat": 11.869834,
      "lon": 79.8198877
    },
    "Promenade Beach": {
      "lat": 11.9321674,
      "lon": 79.8360554
    },
    "Bharathi Park": {
      "lat": 11.9335989,
      "lon": 79.8347239
    },
    "Goubert Market": {
      "lat": 11.9357919,
      "lon": 79.8282948
    },
    "Botanical Garden": {
      "lat": 11.9297545,
      "lon": 79.8236771
    },
    "Aurobindo Ashram": {
      "lat": 11.9368043,
      "lon": 79.8342897
    },
    "Manakula Vinayagar Temple": {
      "lat": 11.9358379,
      "lon": 79.8335964
    },
    "Pondy Bazaar": {
      "lat": 11.946103,
      "lon": 79.8380746
    },
    "Lawspet": {
      "lat": 11.9546226,
      "lon": 79.8119343
    },
    "University of Pondicherry": {
      "lat": 12.0330772,
      "lon": 79.8589702
    },
    "Mission Street": {
      "lat": 11.9352952,
      "lon": 79.8310969
    },
    "Villiyanur": {
      "lat": 11.9200257,
      "lon": 79.7583485
    },
    "Thavalakuppam": {
      "lat": 11.8613452,
      "lon": 79.7922263
    }
  },
  "pune": {
    "Pune Junction": {
      "lat": 18.5288773,
      "lon": 73.8744146
    },
    "Pune International Airport (Lohegaon)": {
      "lat": 18.5803749,
      "lon": 73.9182265
    },
    "Hinjewadi": {
      "lat": 18.5740718,
      "lon": 73.6800349
    },
    "Viman Nagar": {
      "lat": 18.5703877,
      "lon": 73.9133336
    },
    "Koregaon Park": {
      "lat": 18.5366225,
      "lon": 73.8932738
    },
    "Aundh": {
      "lat": 18.5618834,
      "lon": 73.8101957
    },
    "Kalyani Nagar": {
      "lat": 18.5481382,
      "lon": 73.9025513
    },
    "Shivaji Nagar": {
      "lat": 18.532172,
      "lon": 73.8496602
    },
    "Deccan Gymkhana": {
      "lat": 18.5158926,
      "lon": 73.84116
    },
    "Swargate": {
      "lat": 18.5004949,
      "lon": 73.8529037
    },
    "Kothrud": {
      "lat": 18.5038889,
      "lon": 73.807673
    },
    "Magarpatta City": {
      "lat": 18.5111545,
      "lon": 73.9273823
    },
    "Kharadi": {
      "lat": 18.5512763,
      "lon": 73.9416575
    },
    "Hadapsar": {
      "lat": 18.5007741,
      "lon": 73.9379146
    },
    "Baner": {
      "lat": 18.5642431,
      "lon": 73.7768573
    },
    "Sinhagad Road": {
      "lat": 18.4915372,
      "lon": 73.8335232
    },
    "Bhosari": {
      "lat": 18.6210093,
      "lon": 73.8501298
    },
    "Bibwewadi": {
      "lat": 18.4807346,
      "lon": 73.8668072
    }
  },
  "raipur": {
    "Raipur Junction": {
      "lat": 21.2577979,
      "lon": 81.6302867
    },
    "Swami Vivekananda Airport": {
      "lat": 21.1853629,
      "lon": 81.7459285
    },
    "Naya Raipur (Atal Nagar)": {
      "lat": 21.1290954,
      "lon": 81.7656956
    },
    "Gudhiyari": {
      "lat": 21.2665922,
      "lon": 81.6320129
    },
    "Tatibandh": {
      "lat": 21.2586323,
      "lon": 81.5696355
    },
    "Devendra Nagar": {
      "lat": 21.2563469,
      "lon": 81.642101
    },
    "Shankar Nagar": {
      "lat": 21.2484764,
      "lon": 81.6609145
    },
    "Kachna": {
      "lat": 21.2741643,
      "lon": 81.6983496
    },
    "Mahoba Bazar": {
      "lat": 21.2590243,
      "lon": 81.5892076
    },
    "Mowa": {
      "lat": 21.2684799,
      "lon": 81.6718031
    },
    "Amanaka": {
      "lat": 21.2520432,
      "lon": 81.5980279
    },
    "GE Road": {
      "lat": 21.2394691,
      "lon": 81.626741
    }
  },
  "roorkee": {
    "Roorkee Railway Station": {
      "lat": 29.8520559,
      "lon": 77.8748206
    },
    "Civil Lines (Roorkee)": {
      "lat": 29.8720849,
      "lon": 77.8890695
    },
    "Ganeshpur": {
      "lat": 29.8597206,
      "lon": 77.8737863
    },
    "Bus Stand Roorkee": {
      "lat": 29.8640351,
      "lon": 77.8885689
    },
    "Roorkee Cantonment": {
      "lat": 29.8507068,
      "lon": 77.8958547
    },
    "Haridwar Road": {
      "lat": 29.8528484,
      "lon": 77.8757213
    },
    "Malviya Chowk": {
      "lat": 29.8672464,
      "lon": 77.8738589
    }
  },
  "salem": {
    "Salem Town Railway Station": {
      "lat": 11.6600537,
      "lon": 78.1619935
    },
    "Salem Junction": {
      "lat": 11.6707553,
      "lon": 78.1135427
    },
    "New Bus Stand (Salem)": {
      "lat": 11.6696127,
      "lon": 78.1401559
    },
    "Mettur": {
      "lat": 11.7928257,
      "lon": 77.8648624
    },
    "Yercaud": {
      "lat": 11.7852074,
      "lon": 78.2075392
    },
    "Attur": {
      "lat": 11.5995411,
      "lon": 78.5962711
    },
    "Sankagiri": {
      "lat": 11.4760857,
      "lon": 77.8704045
    },
    "Edappadi": {
      "lat": 11.5838413,
      "lon": 77.8347612
    },
    "Omalur": {
      "lat": 11.7428538,
      "lon": 78.0472667
    },
    "Karuppur": {
      "lat": 11.7200276,
      "lon": 78.092039
    },
    "Ammapet": {
      "lat": 11.6588239,
      "lon": 78.1809483
    },
    "Gorimedu": {
      "lat": 11.6952767,
      "lon": 78.1636545
    },
    "Hasthampatty": {
      "lat": 11.6696705,
      "lon": 78.1581874
    },
    "Steel Plant": {
      "lat": 11.6589588,
      "lon": 78.0361415
    },
    "Suramangalam": {
      "lat": 11.6753878,
      "lon": 78.1193157
    },
    "Seelanaickenpatti": {
      "lat": 11.6225098,
      "lon": 78.1441326
    },
    "Fairlands": {
      "lat": 11.6758097,
      "lon": 78.1432672
    },
    "Dadagapatti": {
      "lat": 11.633611,
      "lon": 78.152022
    },
    "Kannankurichi": {
      "lat": 11.698129,
      "lon": 78.1779462
    }
  },
  "surat": {
    "Surat Railway Station": {
      "lat": 21.2050337,
      "lon": 72.8407079
    },
    "Surat Diamond Bourse": {
      "lat": 21.1098618,
      "lon": 72.7950774
    },
    "Varachha": {
      "lat": 21.2130113,
      "lon": 72.8572587
    },
    "Adajan": {
      "lat": 21.2651204,
      "lon": 72.8499128
    },
    "Katargam": {
      "lat": 21.2288221,
      "lon": 72.8253083
    },
    "Udhna": {
      "lat": 21.1704267,
      "lon": 72.8509905
    },
    "Hazira": {
      "lat": 21.0956055,
      "lon": 72.6466021
    },
    "City Light": {
      "lat": 21.1632182,
      "lon": 72.7963597
    },
    "Nanpura": {
      "lat": 21.1898932,
      "lon": 72.815368
    },
    "Pal": {
      "lat": 21.1967679,
      "lon": 72.7782724
    },
    "Bhatar": {
      "lat": 21.1640107,
      "lon": 72.8160897
    },
    "Sachin GIDC": {
      "lat": 21.0991939,
      "lon": 72.8570816
    }
  },
  "thane": {
    "Thane Railway Station": {
      "lat": 19.1846144,
      "lon": 72.9710278
    },
    "Thane West": {
      "lat": 19.2568987,
      "lon": 73.1328761
    },
    "Thane East": {
      "lat": 19.1848999,
      "lon": 72.9766955
    },
    "Naupada": {
      "lat": 19.1896853,
      "lon": 72.9696845
    },
    "Panchpakhadi": {
      "lat": 19.1953526,
      "lon": 72.9646974
    },
    "Ghodbunder Road": {
      "lat": 19.2722898,
      "lon": 72.963141
    },
    "Majiwada": {
      "lat": 19.2130251,
      "lon": 72.9784852
    },
    "Kolshet": {
      "lat": 19.2389025,
      "lon": 72.9932692
    },
    "Vasant Vihar": {
      "lat": 19.2224897,
      "lon": 72.9663424
    },
    "Kopri": {
      "lat": 19.1825941,
      "lon": 72.9732621
    },
    "Louis Wadi": {
      "lat": 19.1962955,
      "lon": 72.9623222
    },
    "Wagle Estate": {
      "lat": 19.1985175,
      "lon": 72.9509778
    },
    "Balkum": {
      "lat": 19.2216908,
      "lon": 72.9844924
    },
    "Kalwa": {
      "lat": 19.1953415,
      "lon": 72.9967893
    },
    "Upvan": {
      "lat": 19.2204256,
      "lon": 72.9536489
    },
    "Hiranandani Estate": {
      "lat": 19.2570093,
      "lon": 72.9839263
    },
    "Kasarvadavali": {
      "lat": 19.2753837,
      "lon": 72.9688917
    },
    "Kopri Colony": {
      "lat": 19.1770747,
      "lon": 72.968098
    },
    "Ovala": {
      "lat": 19.2744049,
      "lon": 72.9605558
    },
    "Mumbra": {
      "lat": 19.1899425,
      "lon": 73.0230752
    }
  },
  "tiruchirappalli": {
    "Srirangam": {
      "lat": 10.8573308,
      "lon": 78.6930848
    },
    "Thillai Nagar": {
      "lat": 10.822226,
      "lon": 78.6834046
    },
    "Central Bus Stand (Trichy)": {
      "lat": 10.7986731,
      "lon": 78.6803703
    },
    "Chatram Bus Stand": {
      "lat": 10.8314408,
      "lon": 78.6936276
    },
    "Tiruchirappalli Cantonment": {
      "lat": 10.8048887,
      "lon": 78.6861204
    },
    "BHEL Township (Kailasapuram)": {
      "lat": 10.7787583,
      "lon": 78.7950236
    },
    "Golden Rock": {
      "lat": 10.7915686,
      "lon": 78.7104342
    },
    "Woraiyur": {
      "lat": 10.8280539,
      "lon": 78.6731113
    },
    "KK Nagar (Trichy)": {
      "lat": 10.7687504,
      "lon": 78.6836905
    },
    "Manapparai": {
      "lat": 10.6082305,
      "lon": 78.4231246
    },
    "Samayapuram": {
      "lat": 10.9203885,
      "lon": 78.7410027
    },
    "Gundur": {
      "lat": 10.7311593,
      "lon": 78.7196751
    },
    "Puthur": {
      "lat": 10.8149173,
      "lon": 78.6774838
    },
    "Ponmalai": {
      "lat": 10.7915686,
      "lon": 78.7104342
    }
  },
  "trivandrum": {
    "Thiruvananthapuram Central Station": {
      "lat": 8.4870167,
      "lon": 76.9526408
    },
    "Trivandrum International Airport": {
      "lat": 8.4820416,
      "lon": 76.919059
    },
    "East Fort": {
      "lat": 8.4835572,
      "lon": 76.9474606
    },
    "Statue Junction": {
      "lat": 8.4976401,
      "lon": 76.9485627
    },
    "Palayam": {
      "lat": 8.5030538,
      "lon": 76.9500997
    },
    "Technopark (Kazhakkoottam)": {
      "lat": 8.5578269,
      "lon": 76.8807437
    },
    "Kazhakoottam": {
      "lat": 8.556815,
      "lon": 76.8727534
    },
    "Medical College (Thiruvananthapuram)": {
      "lat": 8.5209794,
      "lon": 76.9226146
    },
    "Vellayambalam": {
      "lat": 8.511472,
      "lon": 76.9622965
    },
    "Kovalam": {
      "lat": 8.3902593,
      "lon": 76.9785152
    },
    "Thampanoor": {
      "lat": 8.4876666,
      "lon": 76.952434
    },
    "Ulloor": {
      "lat": 8.5300054,
      "lon": 76.928621
    },
    "Vazhuthacaud": {
      "lat": 8.5017399,
      "lon": 76.9595706
    },
    "Pattom": {
      "lat": 8.5186064,
      "lon": 76.9423829
    },
    "Nemom": {
      "lat": 8.4538721,
      "lon": 77.0104923
    },
    "Thirumala": {
      "lat": 8.5018495,
      "lon": 76.9920046
    },
    "Attingal": {
      "lat": 8.6985965,
      "lon": 76.8134401
    },
    "Neyyattinkara": {
      "lat": 8.385843,
      "lon": 77.0650429
    },
    "Vizhinjam": {
      "lat": 8.3818216,
      "lon": 76.9916058
    }
  },
  "varanasi": {
    "Lal Bahadur Shastri Airport": {
      "lat": 25.4509975,
      "lon": 82.8635994
    },
    "Kashi Vishwanath Temple": {
      "lat": 25.3108218,
      "lon": 83.0106679
    },
    "Assi Ghat": {
      "lat": 25.2890417,
      "lon": 83.0069736
    },
    "Godowlia": {
      "lat": 25.3092414,
      "lon": 83.0068406
    },
    "Banaras Hindu University (BHU)": {
      "lat": 25.2663747,
      "lon": 82.9904648
    },
    "Lanka": {
      "lat": 25.2810922,
      "lon": 82.9988377
    },
    "Sigra": {
      "lat": 25.3112567,
      "lon": 82.9852117
    },
    "Sarnath": {
      "lat": 25.3776274,
      "lon": 83.0275999
    },
    "Pandeypur": {
      "lat": 25.3354626,
      "lon": 82.9827056
    },
    "Mahmoorganj": {
      "lat": 25.3059635,
      "lon": 82.9837455
    },
    "Ramnagar": {
      "lat": 25.2701522,
      "lon": 83.0299258
    },
    "Maldahiya": {
      "lat": 25.3251266,
      "lon": 82.9951071
    },
    "Bhelupur": {
      "lat": 25.2952296,
      "lon": 82.9978359
    },
    "Chetganj": {
      "lat": 25.3204867,
      "lon": 83.0015206
    }
  },
  "vellore": {
    // Canonical name across all UniPool surfaces is "VIT Vellore" —
    // not "VIT University" or "Vellore Institute of Technology".
    // Picked because (a) it matches what students actually call the
    // place in conversation and (b) it disambiguates from the other
    // VIT campuses (Chennai, AP, Bhopal). Coordinates pulled from the
    // backend's curated source of truth so a search hit here and a
    // hit from /locations/search both point to the same pin.
    "VIT Vellore": {
      "lat": 12.9692,
      "lon": 79.1559
    },
    "Katpadi Junction": {
      "lat": 12.9721529,
      "lon": 79.1376369
    },
    "Vellore New Bus Stand": {
      "lat": 12.9346933,
      "lon": 79.1369774
    },
    "CMC Hospital": {
      "lat": 12.9255495,
      "lon": 79.1333775
    },
    "Vellore Fort": {
      "lat": 12.9204669,
      "lon": 79.1281816
    },
    "Bagayam": {
      "lat": 12.8817915,
      "lon": 79.1353324
    },
    "Gandhi Nagar": {
      "lat": 12.9489171,
      "lon": 79.1375685
    },
    "Sripuram Golden Temple": {
      "lat": 12.8738498,
      "lon": 79.088265
    },
    "Sathuvachari": {
      "lat": 12.9361096,
      "lon": 79.1557785
    },
    "Walajapet": {
      "lat": 12.9291275,
      "lon": 79.3638137
    },
    "Arcot": {
      "lat": 12.7864752,
      "lon": 79.1947328
    },
    "Pennathur": {
      "lat": 12.8380301,
      "lon": 79.1276944
    },
    "Thiruvalam": {
      "lat": 12.9857071,
      "lon": 79.2638223
    },
    "Gudiyatham": {
      "lat": 12.9485676,
      "lon": 78.8705336
    }
  },
  "vijayawada": {
    "Vijayawada Junction": {
      "lat": 16.5179683,
      "lon": 80.6195724
    },
    "Pandit Nehru Bus Station (PNBS)": {
      "lat": 16.5133305,
      "lon": 80.7076296
    },
    "Benz Circle": {
      "lat": 16.4979577,
      "lon": 80.6539187
    },
    "MG Road (Bandar Road)": {
      "lat": 16.5013955,
      "lon": 80.6446125
    },
    "Eluru Road": {
      "lat": 16.5137919,
      "lon": 80.6288263
    },
    "Governorpet": {
      "lat": 16.5124871,
      "lon": 80.6207343
    },
    "Autonagar": {
      "lat": 16.4906913,
      "lon": 80.6711891
    },
    "One Town": {
      "lat": 16.5029269,
      "lon": 80.6418934
    },
    "Kanaka Durga Temple": {
      "lat": 16.5154312,
      "lon": 80.6062147
    },
    "Bhavanipuram": {
      "lat": 16.5247607,
      "lon": 80.59317
    },
    "Patamata": {
      "lat": 16.4948783,
      "lon": 80.662537
    },
    "Labbipet": {
      "lat": 16.5041903,
      "lon": 80.6418471
    },
    "Singhnagar": {
      "lat": 16.5367769,
      "lon": 80.6362628
    },
    "Poranki": {
      "lat": 16.4764339,
      "lon": 80.7066674
    },
    "Gollapudi": {
      "lat": 16.5374528,
      "lon": 80.5848974
    },
    "Gunadala": {
      "lat": 16.5187985,
      "lon": 80.6588887
    }
  },
  "visakhapatnam": {
    "Visakhapatnam Railway Station": {
      "lat": 17.7219335,
      "lon": 83.2912803
    },
    "Visakhapatnam International Airport": {
      "lat": 17.7218283,
      "lon": 83.2354276
    },
    "Dwaraka Nagar": {
      "lat": 17.7285947,
      "lon": 83.3092963
    },
    "Gajuwaka": {
      "lat": 17.6813983,
      "lon": 83.2130062
    },
    "MVP Colony": {
      "lat": 17.7422648,
      "lon": 83.3356865
    },
    "Siripuram": {
      "lat": 17.7208185,
      "lon": 83.3172191
    },
    "RK Beach (Beach Road)": {
      "lat": 17.711361,
      "lon": 83.3177678
    },
    "Arilova": {
      "lat": 17.7651243,
      "lon": 83.3154134
    },
    "Waltair Uplands": {
      "lat": 17.7234741,
      "lon": 83.3133914
    },
    "NAD Junction": {
      "lat": 17.7447607,
      "lon": 83.2334046
    },
    "Gopalapatnam": {
      "lat": 17.7483718,
      "lon": 83.2200109
    },
    "Simhachalam": {
      "lat": 17.7453138,
      "lon": 83.2207916
    },
    "Anakapalle": {
      "lat": 17.6845257,
      "lon": 83.0067163
    },
    "Yendada": {
      "lat": 17.7829332,
      "lon": 83.357981
    },
    "Murali Nagar": {
      "lat": 17.7472651,
      "lon": 83.2649209
    }
  },
  "warangal": {
    "Warangal Railway Station": {
      "lat": 17.9732956,
      "lon": 79.6056068
    },
    "Hanamkonda": {
      "lat": 18.0041136,
      "lon": 79.5567776
    },
    "NIT Warangal (Kazipet)": {
      "lat": 17.9833537,
      "lon": 79.5335163
    },
    "Warangal Fort": {
      "lat": 17.9564946,
      "lon": 79.6154251
    },
    "Narsampet Road": {
      "lat": 17.9440194,
      "lon": 79.9044398
    },
    "Chintal": {
      "lat": 17.9816989,
      "lon": 79.6128251
    },
    "Mulkanoor": {
      "lat": 18.0898998,
      "lon": 79.3689835
    },
    "Shyampet": {
      "lat": 17.9238832,
      "lon": 79.690361
    },
    "Hunter Road": {
      "lat": 17.9758645,
      "lon": 79.5873627
    },
    "Parkal": {
      "lat": 18.2009179,
      "lon": 79.7017765
    }
  }
};


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
    "VIT Vellore",
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

export const USE_TEST_LOCATION = false
export const TEST_LOCATION: UserLocation = {
  latitude: 28.7041,
  longitude: 77.1025
}

// -----------------------------------------------------------------------------
// Caching
// -----------------------------------------------------------------------------

const searchCache = new Map<string, LocationResult[]>()
const nearbyPlacesCache = new Map<string, NearbyPlace[]>()
const popularLocationsCache = new Map<string, LocationResult[]>()
const geocodingCache = new Map<string, {lat: number, lon: number}>()
let localLocationIndex: LocationResult[] | null = null

type BackendLocationCacheEntry = {
  expiresAt: number
  locations: LocationResult[]
}

const LOCATION_SEARCH_CACHE_PREFIX = "unipool:location-search:v2:"
const LOCATION_SEARCH_TTL_MS = 12 * 60 * 60_000
const LOCATION_SEARCH_MEMORY_MAX = 150
const SEARCH_CACHE_MEMORY_MAX = 200
const backendLocationSearchCache = new Map<string, BackendLocationCacheEntry>()
const backendLocationSearchInflight = new Map<string, Promise<LocationResult[]>>()

const hashLocationSearch = (input: string) => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const trimBackendLocationSearchCache = () => {
  if (backendLocationSearchCache.size <= LOCATION_SEARCH_MEMORY_MAX) return
  Array.from(backendLocationSearchCache.entries())
    .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
    .slice(0, backendLocationSearchCache.size - LOCATION_SEARCH_MEMORY_MAX)
    .forEach(([key]) => backendLocationSearchCache.delete(key))
}

const readBackendLocationSearchCache = (key: string): LocationResult[] | null => {
  const memoryEntry = backendLocationSearchCache.get(key)
  const now = Date.now()
  if (memoryEntry) {
    if (memoryEntry.expiresAt > now) return memoryEntry.locations
    backendLocationSearchCache.delete(key)
  }

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BackendLocationCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= now || !Array.isArray(parsed.locations)) {
      localStorage.removeItem(key)
      return null
    }
    backendLocationSearchCache.set(key, parsed)
    trimBackendLocationSearchCache()
    return parsed.locations
  } catch {
    return null
  }
}

const writeBackendLocationSearchCache = (key: string, locations: LocationResult[]) => {
  const entry: BackendLocationCacheEntry = {
    expiresAt: Date.now() + LOCATION_SEARCH_TTL_MS,
    locations,
  }
  backendLocationSearchCache.set(key, entry)
  trimBackendLocationSearchCache()
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Location suggestions should still work if persistent cache is full.
  }
}

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
    return TEST_LOCATION
  }
  return userLocation
}

const normalizeSearch = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, " ")

const safeNumber = (value: string | number): number | null => {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

const locationSourceRank = (source?: string) => {
  switch (source) {
    case "current":
      return 5
    case "curated":
      return 4
    case "local":
      return 3
    case "ride_history":
      return 2
    default:
      return 1
  }
}

const locationNameKey = (location: LocationResult) =>
  normalizeSearch(location.name || location.display_name.split(",")[0] || "")

const locationDisplayKey = (location: LocationResult) =>
  normalizeSearch(location.display_name)

const locationDedupeAliases = (location: LocationResult) => {
  if (location.source === "current") return ["current"]

  const name = locationNameKey(location)
  const display = locationDisplayKey(location)
  const lat = safeNumber(location.lat)
  const lon = safeNumber(location.lon)
  const aliases: string[] = []

  if (name && lat !== null && lon !== null) {
    // Roughly 1km buckets collapse "same campus / gate / road centroid"
    // geocoder variants while keeping same-named places in different
    // parts of a city separate.
    aliases.push(`name-near:${name}:${lat.toFixed(2)}:${lon.toFixed(2)}`)
  }
  if (display) aliases.push(`display:${display}`)

  return aliases
}

const betterLocationResult = (existing: LocationResult, next: LocationResult) => {
  const existingScore = existing.score ?? 0
  const nextScore = next.score ?? 0
  if (Math.abs(nextScore - existingScore) > 0.001) {
    return nextScore > existingScore ? next : existing
  }

  const existingRank = locationSourceRank(existing.source)
  const nextRank = locationSourceRank(next.source)
  if (existingRank !== nextRank) {
    return nextRank > existingRank ? next : existing
  }

  return next.display_name.length < existing.display_name.length ? next : existing
}

const searchLocationBucket = (userLocation?: UserLocation) => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (!effectiveLocation) return "no-location"
  return `${effectiveLocation.latitude.toFixed(3)},${effectiveLocation.longitude.toFixed(3)}`
}

const searchCacheKey = (prefix: string, query: string, region: string | undefined, limit: number) =>
  `${prefix}:${normalizeSearch(query)}:${normalizeSearch(region ?? "global")}:${limit}`

const mergedSearchCacheKey = (
  query: string,
  region: string | undefined,
  limit: number,
  userLocation?: UserLocation,
  options: LocationSearchOptions = {}
) =>
  `${searchCacheKey("merged", query, region, limit)}:${searchLocationBucket(userLocation)}:${options.includeCurrentLocation !== false}`

const setSearchCacheEntry = (key: string, results: LocationResult[]) => {
  if (searchCache.has(key)) searchCache.delete(key)
  searchCache.set(key, results)
  while (searchCache.size > SEARCH_CACHE_MEMORY_MAX) {
    const oldestKey = searchCache.keys().next().value
    if (!oldestKey) break
    searchCache.delete(oldestKey)
  }
}

const distanceKm = (from: UserLocation, to: { latitude: number; longitude: number }) => {
  const R = 6371
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180
  const lat1 = (from.latitude * Math.PI) / 180
  const lat2 = (to.latitude * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const makeLocalResult = (
  locationName: string,
  cityName: string,
  coordinates: { lat: number; lon: number },
  source = "local"
): LocationResult => ({
  display_name: `${locationName}, ${cityName}, India`,
  lat: String(coordinates.lat),
  lon: String(coordinates.lon),
  place_id: `${source}_${normalizeSearch(cityName)}_${normalizeSearch(locationName)}`.replace(/[^a-z0-9]+/g, "_"),
  name: locationName,
  source,
})

const makeCurrentLocationResult = (userLocation: UserLocation): LocationResult => ({
  display_name: "Current location",
  lat: String(userLocation.latitude),
  lon: String(userLocation.longitude),
  place_id: `current_${userLocation.latitude.toFixed(5)}_${userLocation.longitude.toFixed(5)}`,
  name: "Current location",
  source: "current",
  distance_km: 0,
  score: 1000,
})

const getLocalLocationIndex = (): LocationResult[] => {
  if (localLocationIndex) return localLocationIndex

  const seen = new Set<string>()
  const results: LocationResult[] = []

  Object.entries(POPULAR_LOCATIONS_WITH_COORDS).forEach(([cityName, cityLocations]) => {
    Object.entries(cityLocations as Record<string, { lat: number; lon: number }>).forEach(
      ([locationName, coordinates]) => {
        const key = `${normalizeSearch(locationName)}|${coordinates.lat.toFixed(5)}|${coordinates.lon.toFixed(5)}`
        if (seen.has(key)) return
        seen.add(key)
        results.push(makeLocalResult(locationName, cityName, coordinates))
      }
    )
  })

  localLocationIndex = results
  return results
}

const matchScore = (location: LocationResult, query: string, userLocation?: UserLocation) => {
  const q = normalizeSearch(query)
  const name = normalizeSearch(location.name || location.display_name.split(",")[0] || "")
  const display = normalizeSearch(location.display_name)
  let score = 0

  if (!q) {
    score = 40
  } else if (name === q) {
    score = 160
  } else if (name.startsWith(q)) {
    score = 130
  } else if (name.includes(q)) {
    score = 95
  } else if (display.includes(q)) {
    score = 60
  } else {
    const words = q.split(" ").filter((word) => word.length >= 2)
    const matchedWords = words.filter((word) => display.includes(word)).length
    if (words.length > 0 && matchedWords === words.length) score = 45
  }

  if (score <= 0) return 0

  const lat = safeNumber(location.lat)
  const lon = safeNumber(location.lon)
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (effectiveLocation && lat !== null && lon !== null) {
    const d = distanceKm(effectiveLocation, { latitude: lat, longitude: lon })
    location.distance_km = d
    if (d <= 2) score += 50
    else if (d <= 10) score += 40
    else if (d <= 50) score += 24
    else if (d <= 150) score += 12
  }

  if (/(airport|junction|station|bus stand|university|college|hospital|mall)/i.test(location.name || "")) {
    score += 12
  }

  return score
}

const dedupeAndRankLocations = (
  locations: LocationResult[],
  query: string,
  userLocation?: UserLocation,
  limit = 10
) => {
  const aliasToKey = new Map<string, string>()
  const byKey = new Map<string, LocationResult>()

  locations.forEach((location) => {
    if (!location?.display_name || !location?.lat || !location?.lon) return
    const score = location.score ?? matchScore(location, query, userLocation)
    if (score <= 0) return
    // Current-location rows collapse to a single key so we never end
    // up with two of them, no matter what the backend sends or how
    // lat/lon precision drifts. The first one in wins (the client
    // injects its own canonical entry at the head of the list).
    const next = { ...location, score }
    const aliases = locationDedupeAliases(next)
    if (aliases.length === 0) return

    const existingKey = aliases.map((alias) => aliasToKey.get(alias)).find(Boolean)
    const key = existingKey ?? aliases[0]
    const existing = byKey.get(key)
    const winner = existing ? betterLocationResult(existing, next) : next
    byKey.set(key, winner)
    aliases.forEach((alias) => aliasToKey.set(alias, key))
  })

  return Array.from(byKey.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit)
}

export const getInstantLocationResults = (
  query: string,
  userLocation?: UserLocation,
  limit = 8,
  options: LocationSearchOptions = {}
): LocationResult[] => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  const q = normalizeSearch(query)
  const includeCurrentLocation = options.includeCurrentLocation !== false
  const localResults = getLocalLocationIndex().filter((location) => {
    if (q !== "" || !effectiveLocation) return true
    const lat = safeNumber(location.lat)
    const lon = safeNumber(location.lon)
    if (lat === null || lon === null) return false
    return distanceKm(effectiveLocation, { latitude: lat, longitude: lon }) <= 150
  })
  const seed =
    q === "" && effectiveLocation && includeCurrentLocation
      ? [makeCurrentLocationResult(effectiveLocation), ...localResults]
      : localResults

  return dedupeAndRankLocations(seed, query, userLocation, limit)
}

const searchBackendLocations = async (
  query: string,
  userLocation?: UserLocation,
  limit = 10,
  signal?: AbortSignal,
  options: LocationSearchOptions = {}
): Promise<LocationResult[]> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })
  // Always tell the backend to skip its own "Current location" entry.
  // The client injects a canonical one via `makeCurrentLocationResult`
  // (with the exact GPS coordinates and the literal "Current location"
  // label). If the backend ALSO appends one, two issues compound:
  //   1. Dedupe-by-name fails when the backend's Nominatim reverse-
  //      geocode succeeds and renames the entry to the place itself
  //      ("Katpadi", "VIT Vellore", etc.).
  //   2. Lat/lon precision drift between the two sources defeats the
  //      lat/lon-based dedupe key.
  // The result was two "Current location"-ish rows at the top of the
  // selector. Forcing include_current=false makes the client the
  // single source of truth for that entry.
  params.set("include_current", "false")
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (effectiveLocation) {
    params.set("lat", effectiveLocation.latitude.toFixed(4))
    params.set("lng", effectiveLocation.longitude.toFixed(4))
  }

  const cacheKey = `${LOCATION_SEARCH_CACHE_PREFIX}${hashLocationSearch(params.toString())}`
  const cached = readBackendLocationSearchCache(cacheKey)
  if (cached) {
    return cached
  }

  const requestUrl = `${baseURL}/locations/search?${params.toString()}`
  const loadLocations = async (requestSignal?: AbortSignal) => {
    const response = await fetch(requestUrl, requestSignal ? { signal: requestSignal } : undefined)
    if (!response.ok) throw new Error(`Location search failed: ${response.status}`)
    const json = await response.json()
    const locations = Array.isArray(json?.locations) ? json.locations : []
    writeBackendLocationSearchCache(cacheKey, locations)
    return locations
  }

  if (signal) {
    return loadLocations(signal)
  }

  const existing = backendLocationSearchInflight.get(cacheKey)
  if (existing) return existing

  const promise = loadLocations()
  backendLocationSearchInflight.set(cacheKey, promise)
  promise.then(
    () => {
      if (backendLocationSearchInflight.get(cacheKey) === promise) {
        backendLocationSearchInflight.delete(cacheKey)
      }
    },
    () => {
      if (backendLocationSearchInflight.get(cacheKey) === promise) {
        backendLocationSearchInflight.delete(cacheKey)
      }
    }
  )
  return promise
}

// -----------------------------------------------------------------------------
// Core Coordinate Resolution Functions
// -----------------------------------------------------------------------------

/**
 * Get coordinates for a location, preferring hardcoded coordinates for popular locations
 */
export const getCoordinatesForLocation = async (
  locationName: string,
  cityName?: string
): Promise<{lat: number, lon: number} | null> => {
  if (DEBUG_LOCATION_SERVICE) console.log(`Getting coordinates for: "${locationName}"`)
  
  const cacheKey = locationName.toLowerCase().trim()
  
  if (geocodingCache.has(cacheKey)) {
    if (DEBUG_LOCATION_SERVICE) console.log(`Using cached coordinates for: ${locationName}`)
    return geocodingCache.get(cacheKey)!
  }
  
  if (cityName) {
    const cityCoords = POPULAR_LOCATIONS_WITH_COORDS[cityName as keyof typeof POPULAR_LOCATIONS_WITH_COORDS]
    if (cityCoords) {
      const locationCoords = cityCoords[locationName as keyof typeof cityCoords] as { lat: number, lon: number } | undefined
      if (locationCoords) {
        const coords = { lat: locationCoords.lat, lon: locationCoords.lon }
        if (DEBUG_LOCATION_SERVICE) console.log(`Using hardcoded coordinates for "${locationName}": (${coords.lat}, ${coords.lon})`)
        geocodingCache.set(cacheKey, coords)
        return coords
      }
    }
  }
  
  try {
    if (DEBUG_LOCATION_SERVICE) console.log(`Trying native geocoding for: "${locationName}"`)
    const searchQuery = cityName ? `${locationName}, ${cityName}, India` : `${locationName}, India`
    const results = await Location.geocodeAsync(searchQuery)
    
    if (results && results.length > 0) {
      const { latitude, longitude } = results[0]
      
      const isInIndiaBounds = latitude >= 6 && latitude <= 37 && longitude >= 68 && longitude <= 97
      
      if (isInIndiaBounds) {
        const coords = { lat: latitude, lon: longitude }
        if (DEBUG_LOCATION_SERVICE) console.log(`Native geocoding success for "${locationName}": (${latitude}, ${longitude})`)
        
        geocodingCache.set(cacheKey, coords)
        return coords
      } else {
        console.warn(`Native geocoding returned coordinates outside India for "${locationName}": (${latitude}, ${longitude})`)
      }
    } else {
      if (DEBUG_LOCATION_SERVICE) console.log(`No results from native geocoding for: "${locationName}"`)
    }
  } catch (error) {
    console.warn(`Native geocoding failed for "${locationName}":`, error)
  }
  
  try {
    if (DEBUG_LOCATION_SERVICE) console.log(`Trying OpenStreetMap fallback for: "${locationName}"`)
    const searchQuery = cityName ? `${locationName}, ${cityName}, India` : locationName
    const osmResults = await searchLocations(searchQuery, "India", 1)
    
    if (osmResults.length > 0) {
      const result = osmResults[0]
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)
      
      const isInIndiaBounds = lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97
      
      if (isInIndiaBounds) {
        const coords = { lat, lon }
        if (DEBUG_LOCATION_SERVICE) console.log(`OpenStreetMap fallback success for "${locationName}": (${lat}, ${lon})`)
        
        geocodingCache.set(cacheKey, coords)
        return coords
      } else {
        console.warn(`OpenStreetMap returned coordinates outside India for "${locationName}": (${lat}, ${lon})`)
      }
    } else {
      if (DEBUG_LOCATION_SERVICE) console.log(`No results from OpenStreetMap for: "${locationName}"`)
    }
  } catch (error) {
    console.warn(`OpenStreetMap fallback failed for "${locationName}":`, error)
  }
  
  const knownCoords = getCityCoordinates(locationName)
  if (knownCoords.lat !== 12.9716 || knownCoords.lon !== 77.5946) {
    if (DEBUG_LOCATION_SERVICE) console.log(`Using known city coordinates for "${locationName}": (${knownCoords.lat}, ${knownCoords.lon})`)
    geocodingCache.set(cacheKey, knownCoords)
    return knownCoords
  }
  
  console.error(`All coordinate resolution methods failed for: "${locationName}"`)
  return null
}

/**
 * Known coordinates for major Indian cities
 */
export const getCityCoordinates = (cityName: string): { lat: number; lon: number } => {
  const normalizedCity = cityName.toLowerCase().trim();

  const cityCoordinates: Record<string, { lat: number; lon: number }> = {
    delhi:        { lat: 28.704060, lon: 77.102493 },
    "new delhi": { lat: 28.613890, lon: 77.208890 },

    // Major metros
    mumbai:       { lat: 19.075984, lon: 72.877656 },
    bangalore:   { lat: 12.971599, lon: 77.594563 },
    bengaluru:   { lat: 12.971599, lon: 77.594563 },
    hyderabad:   { lat: 17.385044, lon: 78.486671 },
    chennai:     { lat: 13.082680, lon: 80.270718 },
    kolkata:     { lat: 22.572646, lon: 88.363895 },
    pune:        { lat: 18.520430, lon: 73.856743 },
    ahmedabad:   { lat: 23.022505, lon: 72.571365 },

    // Tier 2 cities
    jaipur:      { lat: 26.912434, lon: 75.787270 },
    surat:       { lat: 21.170240, lon: 72.831062 },
    lucknow:     { lat: 26.846695, lon: 80.946166 },
    kanpur:      { lat: 26.449923, lon: 80.331874 },
    nagpur:      { lat: 21.145800, lon: 79.088154 },
    indore:      { lat: 22.719568, lon: 75.857727 },
    thane:       { lat: 19.218330, lon: 72.978088 },
    bhopal:      { lat: 23.259933, lon: 77.412613 },
    visakhapatnam:{ lat: 17.686816, lon: 83.218483 },
    pimpri:      { lat: 18.629819, lon: 73.799664 },
    patna:       { lat: 25.594094, lon: 85.137566 },
    vadodara:    { lat: 22.307158, lon: 73.181218 },
    ghaziabad:   { lat: 28.669154, lon: 77.453758 },
    ludhiana:    { lat: 30.901014, lon: 75.857276 },
    agra:        { lat: 27.176670, lon: 78.008074 },
    nashik:      { lat: 19.997453, lon: 73.789803 },
    faridabad:   { lat: 28.408966, lon: 77.317789 },
    meerut:      { lat: 28.984464, lon: 77.706413 },
    rajkot:      { lat: 22.300000, lon: 70.783300 },
    kalyan:      { lat: 19.240000, lon: 73.130000 },
    vasai:       { lat: 19.470000, lon: 72.800000 },
    varanasi:    { lat: 25.317644, lon: 82.973914 },
    srinagar:    { lat: 34.083656, lon: 74.797371 },
    aurangabad:  { lat: 19.876165, lon: 75.343324 },
    dhanbad:     { lat: 23.795715, lon: 86.430421 },
    amritsar:    { lat: 31.634035, lon: 74.872264 },
    "navi mumbai":{ lat: 19.033000, lon: 73.029700 },
    allahabad:   { lat: 25.435800, lon: 81.846300 },
    prayagraj:   { lat: 25.435800, lon: 81.846300 },
    ranchi:      { lat: 23.344099, lon: 85.309563 },
    howrah:      { lat: 22.595821, lon: 88.263640 },
    coimbatore:  { lat: 11.016844, lon: 76.955832 },
    jabalpur:    { lat: 23.181467, lon: 79.986407 },
    gwalior:     { lat: 26.218258, lon: 78.182830 },
    vijayawada:  { lat: 16.506174, lon: 80.648015 },
    jodhpur:     { lat: 26.238947, lon: 73.024309 },
    madurai:     { lat: 9.925203,  lon: 78.119775 },
    raipur:      { lat: 21.251384, lon: 81.629637 },
    kota:        { lat: 25.213814, lon: 75.864799 },
    chandigarh:  { lat: 30.733314, lon: 76.779418 },
    guwahati:    { lat: 26.144518, lon: 91.736237 },
    salem:       { lat: 11.664325, lon: 78.146012 },
    jammu:       { lat: 32.726603, lon: 74.857025 },
    noida:       { lat: 28.535516, lon: 77.391026 },
    gurgaon:     { lat: 28.459496, lon: 77.026638 },
    gurugram:    { lat: 28.459496, lon: 77.026638 },

    vellore:     { lat: 12.916500, lon: 79.132500 },
    "vit vellore":   { lat: 12.9692, lon: 79.1559},
    manipal:     { lat: 13.340556, lon: 74.741667 },
    pilani:      { lat: 28.358333, lon: 75.586667 },
    "bits pilani":   { lat: 28.358333, lon: 75.586667 },
    kharagpur:   { lat: 22.346000, lon: 87.232000 },
    "iit kharagpur": { lat: 22.346000, lon: 87.232000 },
    roorkee:     { lat: 29.854300, lon: 77.888000 },
    "iit roorkee":   { lat: 29.854300, lon: 77.888000 },
    "nit trichy":    { lat: 10.790483, lon: 78.704673 },
    tiruchirappalli: { lat: 10.790483, lon: 78.704673 },
    trichy:      { lat: 10.790483, lon: 78.704673 },
    warangal:    { lat: 17.968900, lon: 79.594100 },
    "nit warangal":  { lat: 17.968900, lon: 79.594100 },

    // South Indian cities
    trivandrum:  { lat: 8.524100, lon: 76.936600 },
    thiruvananthapuram: { lat: 8.524100, lon: 76.936600 },
    kochi:       { lat: 9.931200, lon: 76.267300 },
    cochin:      { lat: 9.931200, lon: 76.267300 },
    kozhikode:   { lat: 11.258800, lon: 75.780400 },
    calicut:     { lat: 11.258800, lon: 75.780400 },
    mysore:      { lat: 12.295800, lon: 76.639400 },
    mysuru:      { lat: 12.295800, lon: 76.639400 },
    mangalore:   { lat: 12.914100, lon: 74.856000 },
    hubli:       { lat: 15.364700, lon: 75.124000 },
    belgaum:     { lat: 15.849694, lon: 74.497672 },
    pondicherry: { lat: 11.941600, lon: 79.808300 },
    puducherry:  { lat: 11.941600, lon: 79.808300 },

    // North-East
    shillong:    { lat: 25.578800, lon: 91.893300 },
    imphal:      { lat: 24.817000, lon: 93.936800 },
    aizawl:      { lat: 23.727100, lon: 92.717600 },
    agartala:    { lat: 23.831500, lon: 91.286800 },
    gangtok:     { lat: 27.338900, lon: 88.606500 },
    kohima:      { lat: 25.675100, lon: 94.108600 },
    itanagar:    { lat: 27.084400, lon: 93.605300 },
    dispur:      { lat: 26.144500, lon: 91.736200 },

    // Other important cities
    aligarh:     { lat: 27.897400, lon: 78.088000 },
    bareilly:    { lat: 28.367000, lon: 79.430400 },
    moradabad:   { lat: 28.838600, lon: 78.773300 },
    siliguri:    { lat: 26.727100, lon: 88.395300 },
    durgapur:    { lat: 23.520400, lon: 87.311900 },
    bhubaneswar: { lat: 20.296100, lon: 85.824500 },
    cuttack:     { lat: 20.462500, lon: 85.882800 },
  };

  // exact match
  if (cityCoordinates[normalizedCity]) {
    return cityCoordinates[normalizedCity];
  }

  // Partial match — prefer the most specific (longest) matching key. Iterating
  // in insertion order and returning the first hit let a broad city name shadow
  // a campus alias: "VIT Vellore ..." contains "vellore", so the central-city
  // "vellore" entry (declared first) was winning over "vit vellore" and the pin
  // landed in central Vellore instead of on campus. Longest key wins fixes this
  // generally (nit trichy > trichy, iit kharagpur > kharagpur, etc.).
  let bestCoords: { lat: number; lon: number } | null = null;
  let bestKeyLength = 0;
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (key.includes(normalizedCity) || normalizedCity.includes(key)) {
      if (key.length > bestKeyLength) {
        bestCoords = coords;
        bestKeyLength = key.length;
      }
    }
  }
  if (bestCoords) {
    return bestCoords;
  }

  // fallback
  return { lat: 12.971599, lon: 77.594563 };
};

// -----------------------------------------------------------------------------
// OpenStreetMap (Nominatim) API Functions
// -----------------------------------------------------------------------------

// Map a friendly region name to a Nominatim ISO 3166-1 alpha-2 code.
// Returns `undefined` for an unknown / empty region so the caller can
// fall back to a global search.
const regionToCountryCode = (region?: string): string | undefined => {
  if (!region) return undefined
  const r = region.trim().toLowerCase()
  if (r === "" || r === "global" || r === "any" || r === "world") return undefined
  const map: Record<string, string> = {
    india: "in",
    in: "in",
    usa: "us",
    "united states": "us",
    us: "us",
    uk: "gb",
    "united kingdom": "gb",
    gb: "gb",
  }
  return map[r]
}

export const searchLocations = async (
  query: string,
  region?: string,
  limit = 10
): Promise<LocationResult[]> => {
  const cacheKey = searchCacheKey("osm", query, region, limit)
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!
  }

  try {
    const encodedQuery = encodeURIComponent(query)
    // Country restriction is opt-in. Was hard-coded to `countrycodes=in`,
    // which silently dropped every non-Indian result. Now: no restriction
    // by default → Nominatim returns global results ranked by importance.
    const cc = regionToCountryCode(region)
    const ccParam = cc ? `&countrycodes=${cc}` : ""
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}${ccParam}&limit=${limit}&addressdetails=1&extratags=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UniPool-App/1.0',
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

    setSearchCacheEntry(cacheKey, results)
    return results
  } catch (error) {
    console.error("Error searching locations:", error)
    return []
  }
}

export const debouncedSearchLocations = debounce(searchLocations, 300)

export const searchLocationsWithFallback = async (
  query: string,
  region?: string,
  limit = 10,
  userLocation?: UserLocation,
  signal?: AbortSignal,
  options: LocationSearchOptions = {}
): Promise<LocationResult[]> => {
  const cacheKey = mergedSearchCacheKey(query, region, limit, userLocation, options)
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!
  }

  const localResults = getInstantLocationResults(query, userLocation, limit, options)

  try {
    const backendResults = await searchBackendLocations(query, userLocation, limit, signal, options)
    const merged = dedupeAndRankLocations(
      [...localResults, ...backendResults],
      query,
      userLocation,
      limit
    )
    if (merged.length > 0) {
      setSearchCacheEntry(cacheKey, merged)
      return merged
    }

    const broaderQuery = query.split(',')[0].trim()
    if (broaderQuery !== query) {
      const broaderResults = await searchBackendLocations(broaderQuery, userLocation, limit, signal, options)
      const broaderMerged = dedupeAndRankLocations(
        [...localResults, ...broaderResults],
        broaderQuery,
        userLocation,
        limit
      )
      if (broaderMerged.length > 0) {
        setSearchCacheEntry(cacheKey, broaderMerged)
        return broaderMerged
      }
    }

    if (query.trim().length >= 3) {
      const osmResults = await searchLocations(query, region, limit)
      const fallbackResults = dedupeAndRankLocations([...localResults, ...osmResults], query, userLocation, limit)
      setSearchCacheEntry(cacheKey, fallbackResults)
      return fallbackResults
    }

    setSearchCacheEntry(cacheKey, localResults)
    return localResults
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      return localResults
    }
    console.error("Error in searchLocationsWithFallback:", error)
    return localResults
  }
}

export const debouncedSearchLocationsWithFallback = debounce(searchLocationsWithFallback, 300)

// -----------------------------------------------------------------------------
// Popular Locations Data
// -----------------------------------------------------------------------------


export const getPopularLocations = async (
  searchQuery: string,
  userLocation?: UserLocation,
  options: LocationSearchOptions = {}
): Promise<LocationResult[]> => {
  const cacheKey = `popular:${normalizeSearch(searchQuery)}:${searchLocationBucket(userLocation)}:${options.includeCurrentLocation !== false}`
  
  if (popularLocationsCache.has(cacheKey)) {
    return popularLocationsCache.get(cacheKey)!
  }

  const instantResults = getInstantLocationResults(searchQuery, userLocation, 12, options)
  let results = instantResults
  try {
    const backendResults = await searchBackendLocations(searchQuery, userLocation, 12, undefined, options)
    results = dedupeAndRankLocations(
      [...instantResults, ...backendResults],
      searchQuery,
      userLocation,
      12
    )
  } catch {
    results = instantResults
  }
  popularLocationsCache.set(cacheKey, results)
  return results
}

export const getPopularLocationsFallback = (searchQuery: string): LocationResult[] => {
  return getInstantLocationResults(searchQuery, undefined, 8)
}

export const getPopularLocationsByCity = (cityName: string): LocationResult[] => {
  const normalizedCity = cityName.toLowerCase().trim()
  const locations = POPULAR_LOCATIONS[normalizedCity as keyof typeof POPULAR_LOCATIONS]
  
  if (!locations) {
    console.warn(`No popular locations found for city: ${cityName}`)
    return []
  }
  
  // Convert string array to LocationResult array with geocoding
  return locations.map(locationName => {
    const coordinates = getCityCoordinates(locationName)
    return {
      display_name: `${locationName}, ${cityName}, India`,
      lat: coordinates.lat.toString(),
      lon: coordinates.lon.toString(),
      place_id: `popular_${locationName.replace(/\s+/g, '_').toLowerCase()}_${cityName}`,
      name: locationName
    }
  })
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

/**
 * Resolves a UserLocation into a short, human-readable place name suitable for
 * the ride from/to fields ("MG Road, Bangalore"). Exists so the picker never
 * persists the literal string "Current location" — that label is a UX
 * shorthand for "use my GPS", not a real place, and surfacing it on ride
 * cards / trip history / share text reads as a bug to viewers (whose
 * "current location" is somewhere else entirely).
 *
 * Strategy: prefer street/name + city, fall back through subregion / region
 * / district, finally null. The caller is expected to keep "Current location"
 * as a transient placeholder until this resolves and then swap it in.
 *
 * Uses Expo's Location.reverseGeocodeAsync — same off-device call already
 * used by getNearestCity above, so no new permission surface.
 */
export const reverseGeocodeShort = async (
  userLocation: UserLocation,
): Promise<string | null> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    })
    if (results.length === 0) return null
    const r = results[0]
    // Street is most specific; `name` (POI) is the iOS fallback when
    // street isn't populated (e.g. inside a campus / mall). District
    // and subregion fill in for very dense / very sparse areas.
    const primary =
      r.street ||
      r.name ||
      r.district ||
      r.subregion ||
      r.city ||
      null
    // City pairs with primary to give the user enough context to tell
    // it apart from another street with the same name in another city.
    // If primary already equals the city, skip the comma.
    const city = r.city || r.subregion || r.region || null
    if (!primary && !city) return null
    if (primary && city && primary !== city) {
      return `${primary}, ${city}`
    }
    return primary || city
  } catch (error) {
    console.warn("reverseGeocodeShort failed", error)
    return null
  }
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

  const cacheKey = `${effectiveLocation.latitude.toFixed(3)},${effectiveLocation.longitude.toFixed(3)}:${radius}:${categories.join("|")}`
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

/**
 * Render-time fallback for ride locations that were stored as the
 * literal string "Current location" before reverseGeocodeShort was
 * wired into the picker. "Current location" only means something to
 * the person who picked it — and even for them, only at the moment
 * of picking. Showing it on a ride card or trip history row, or in
 * share text sent to other users, reads as a bug. Map it to a
 * neutral "Pickup point" placeholder anywhere it would otherwise
 * surface.
 *
 * Defensive null/whitespace handling so render sites can drop it in
 * without `s ?? ""` boilerplate.
 */
export const displayRideLocation = (s: string | null | undefined): string => {
  if (!s) return ""
  const trimmed = s.trim()
  if (trimmed.toLowerCase() === "current location") return "Pickup point"
  return s
}

export const isLocationInIndia = (locationResult: LocationResult): boolean => {
  const lat = parseFloat(locationResult.lat)
  const lon = parseFloat(locationResult.lon)
  
  return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97
}

export const getLocationDisplayName = (location: LocationResult | string): string => {
  if (typeof location === 'string') {
    return location
  }
  return location.name || location.display_name || 'Unknown Location'
}

export const validateLocationResults = (locations: LocationResult[]): LocationResult[] => {
  return locations.filter(location => {
    if (!location || typeof location !== 'object') {
      console.warn('Invalid location object:', location)
      return false
    }
    
    if (!location.lat || !location.lon || !location.display_name) {
      console.warn('Location missing required fields:', location)
      return false
    }
    
    const lat = parseFloat(location.lat)
    const lon = parseFloat(location.lon)
    
    if (isNaN(lat) || isNaN(lon)) {
      console.warn('Location has invalid coordinates:', location)
      return false
    }
    
    return true
  })
}
