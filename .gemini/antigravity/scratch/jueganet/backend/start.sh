#!/bin/bash
set -e
export PATH="/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:$PATH"
PHP=$(command -v php) || { echo "PHP not found"; exit 1; }

"$PHP" artisan optimize
"$PHP" artisan migrate --force

if [ "$SERVICE_TYPE" = "reverb" ]; then
  "$PHP" artisan reverb:start --host=0.0.0.0 --port=$PORT 2>&1 || echo "REVERB_CRASHED:$?" >&2
else
  "$PHP" artisan serve --host=0.0.0.0 --port=${PORT:-8080}
fi
