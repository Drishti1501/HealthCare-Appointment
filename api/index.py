import os
import sys

backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_core.settings')

import django
django.setup()

from django.core.management import call_command
try:
    call_command('migrate', interactive=False)
    from seed_data import seed
    seed()
except Exception as e:
    print(f'[Vercel Startup Notice]: {e}')

from healthcare_core.wsgi import application

app = application
