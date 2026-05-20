#!/usr/bin/env bash
set -euo pipefail

plist_path="${BUILT_PRODUCTS_DIR}/${INFOPLIST_PATH}"
env_file="${SRCROOT}/../.env"
maps_key="${GOOGLE_MAPS_API_KEY_IOS:-}"

if [[ -z "${maps_key}" && -f "${env_file}" ]]; then
  while IFS= read -r line; do
    case "${line}" in
      GOOGLE_MAPS_API_KEY_IOS=*)
        maps_key="${line#GOOGLE_MAPS_API_KEY_IOS=}"
        ;;
    esac
  done < "${env_file}"
fi

maps_key="${maps_key%\"}"
maps_key="${maps_key#\"}"
maps_key="${maps_key%\'}"
maps_key="${maps_key#\'}"

if [[ -z "${maps_key}" || "${maps_key}" == your_* ]]; then
  echo "warning: GOOGLE_MAPS_API_KEY_IOS is not set; iOS Google Maps will not render."
  exit 0
fi

if [[ ! -f "${plist_path}" ]]; then
  echo "warning: built Info.plist not found at ${plist_path}; cannot inject GMSApiKey."
  exit 0
fi

/usr/libexec/PlistBuddy -c "Set :GMSApiKey ${maps_key}" "${plist_path}" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :GMSApiKey string ${maps_key}" "${plist_path}"
