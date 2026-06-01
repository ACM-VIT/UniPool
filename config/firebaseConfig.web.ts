// Firebase web SDK config for the UniPool web build.
//
// Values are taken from google-services.json (project acm-carpoolit).
// On native, react-native-firebase reads google-services.json /
// GoogleService-Info.plist automatically; the web SDK has no such file
// so we pass the config object explicitly here.
//
// appId is intentionally omitted: it is only required for Analytics and
// for a registered Firebase "Web app". Auth (the only Firebase product
// this app uses) works with apiKey + authDomain + projectId. Add the
// web appId here once a Web app is registered in the Firebase console
// if Analytics is ever wired up.
export const firebaseConfig = {
  apiKey: "__REMOVED_GOOGLE_API_KEY__",
  authDomain: "acm-carpoolit.firebaseapp.com",
  projectId: "acm-carpoolit",
  storageBucket: "acm-carpoolit.firebasestorage.app",
  messagingSenderId: "290309531485",
};
