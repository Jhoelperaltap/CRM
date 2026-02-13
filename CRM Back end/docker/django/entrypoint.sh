#!/bin/bash
set -e

# For Celery workers connecting to local database, just run the command
if [[ "$1" == "celery" ]]; then
    echo "Starting Celery..."
    exec "$@"
fi

# For backend in Docker (if used)
echo "Waiting for PostgreSQL..."
until pg_isready -h "${DB_HOST:-db}" -p 5432 -U "${DB_USER:-postgres}" > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true

exec "$@"
