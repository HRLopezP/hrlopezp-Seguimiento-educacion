#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npm run build

pip install -r requeriments.txt

flask db upgrade

