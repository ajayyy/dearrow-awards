#!/bin/sh
set -e
echo 'Entrypoint script'
cd /usr/src/app

node index.js
