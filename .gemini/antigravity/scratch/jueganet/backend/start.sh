#!/bin/bash
set -e

php artisan optimize
php artisan migrate --force

if [ -n "$REVERB_HOST" ] && [ -n "$REVERB_PORT" ]; then
  php artisan reverb:start --host="$REVERB_HOST" --port="$REVERB_PORT" &
fi

php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
