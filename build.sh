#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Building Frontend (React + Vite) ---"
cd frontend
npm install
npm run build
cd ..

echo "--- Installing Backend Dependencies ---"
cd backend
pip install -r requirements.txt

echo "--- Running Database Migrations ---"
python manage.py makemigrations authentication appointments prescriptions integrations
python manage.py migrate

echo "--- Seeding Database ---"
python seed_data.py

echo "--- Collecting Static Files ---"
python manage.py collectstatic --no-input

echo "--- Build Completed Successfully! ---"
