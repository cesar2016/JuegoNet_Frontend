#!/bin/bash
set -e

php artisan optimize
php artisan migrate --force

if [ -n "$REVERB_HOST" ]; then
  php artisan reverb:start --host="0.0.0.0" --port="${REVERB_SERVER_PORT:-8081}" &
fi

php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
