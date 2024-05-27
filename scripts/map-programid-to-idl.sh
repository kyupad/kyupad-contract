#!/bin/bash

set -euo pipefail
replace_declare_id() {
    file_path="$1"
    new_value="$2"
    sed -i '' "s/[pP][rR][oO][gG][rR][aA][mM][iI][dD]/$new_value/g" $file_path
}

KEYS_LIST=$(anchor keys list)

while IFS=': ' read -r key value; do
    path="./target/idl/${key}.json"
    typesPath="./target/types/${key}.ts"
    if [ -f "$path" ]; then
      replace_declare_id $path $value
    fi
    if [ -f "$typesPath" ]; then
      replace_declare_id $typesPath $value
    fi
done <<< "$KEYS_LIST"

