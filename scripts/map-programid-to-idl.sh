#!/bin/bash

set -euo pipefail
replace_declare_id() {
    file_path="$1"
    new_value="$2"
    sed -i '' "s/PROGRAMID/$new_value/g" $file_path
}

KEYS_LIST=$(anchor keys list)

while IFS=': ' read -r key value; do
    path="./target/idl/${key}.json"
    if [ -f "$path" ]; then
      replace_declare_id $path $value
    fi
done <<< "$KEYS_LIST"

