#!/bin/bash

set -euo pipefail

PROGRAM_MAPS="./scripts/programs.map"
map_program() {
    local key="$1"
    local value
    value=$(grep "^$key=" $PROGRAM_MAPS | cut -d'=' -f2-)
    echo "$value"
}

ANCHOR_PROGRAMS_KEYS=$(anchor keys list)
ENV_FILE=".env"
while IFS='=' read -r key value; do
    identifier=$(map_program $key)
    if [ -n "$identifier" ]; then
      new_value=$(echo "$ANCHOR_PROGRAMS_KEYS" | grep -o "^$identifier:.*" | cut -d' ' -f2-)
      echo "Mapped ${new_value} to $key in .env file"
      if [ -n "$new_value" ]; then
          sed -i '' "s/$key=$value/$key=$new_value/g" "$ENV_FILE"
      fi
    fi
done < "$ENV_FILE"