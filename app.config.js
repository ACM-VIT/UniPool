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
  const iosMapsApiKey = mapsKeyOrFallback("GOOGLE_MAPS_API_KEY_IOS", "$(GOOGLE_MAPS_API_KEY_IOS)");
  const androidMapsApiKey = mapsKeyOrFallback("GOOGLE_MAPS_API_KEY_ANDROID", "${MAPS_API_KEY}");

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios.config,
        googleMapsApiKey: iosMapsApiKey,
      },
    },
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
