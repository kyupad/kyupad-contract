#!/bin/bash

set -euo pipefail

PROGRAM_MAPS="./scripts/programs.map"

map_program() {
    local key="$1"
    local value
    value=$(grep "^$key=" "$PROGRAM_MAPS" | cut -d'=' -f2-)
    echo "$value"
}

ENV_FILE=".env"

replace_declare_id() {
    file_path="$1"
    new_value="$2"
    sed -i '' "s/[pP][rR][oO][gG][rR][aA][mM][iI][dD]/$new_value/g" "$file_path"
}

while IFS='=' read -r key value; do
    program_id=$(map_program "$key")
    if [ -n "$program_id" ]; then
        echo "Replacing program ID for $program_id with $value"
        replace_declare_id "./target/idl/${program_id}.json" "$value"
        replace_declare_id "./target/types/${program_id}.ts" "$value"
    fi
done < "$ENV_FILE"
