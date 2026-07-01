const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");

function readDotEnvValue(name) {
  const direct = process.env[name];
  if (direct && direct.trim() !== "") {
    return direct.trim();
  }

  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return "";
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] !== name) {
      continue;
    }
    return match[2].replace(/^["']|["']$/g, "").trim();
  }

  return "";
}

function mapsKeyOrFallback(name, fallback) {
  const value = readDotEnvValue(name);
  if (!value || value.startsWith("your_")) {
    return fallback;
  }
  return value;
}

module.exports = () => {
  const config = appJson.expo;
  const androidMapsApiKey = mapsKeyOrFallback("GOOGLE_MAPS_API_KEY_ANDROID", "${MAPS_API_KEY}");

  // Optional web sub-path mount. Set EXPO_WEB_BASE_URL=/app to build the
  // web bundle for serving under a path (e.g. unipool.in/app). Gated
  // behind the env var so `expo start --web` and every native build are
  // unaffected when it's unset.
  const webBaseUrl = (process.env.EXPO_WEB_BASE_URL || "").trim();

  return {
    ...config,
    ...(webBaseUrl
      ? { experiments: { ...(config.experiments || {}), baseUrl: webBaseUrl } }
      : {}),
    plugins: Array.from(
      new Set([...(config.plugins || []), "@react-native-community/datetimepicker"])
    ),
    android: {
      ...config.android,
      config: {
        ...config.android.config,
        googleMaps: {
          ...config.android.config.googleMaps,
          apiKey: androidMapsApiKey,
        },
      },
    },
  };
};
