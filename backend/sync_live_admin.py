import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

def live_request(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8') if data is not None else None,
        headers=headers,
        method=method
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        res = resp.read().decode('utf-8')
        return json.loads(res) if res else None

# 1. Login as admin
admin_res = live_request('https://dikhancare.io/api/v1/auth/login', 'POST', {
    'email': 'admin@dikhanhealth.pk',
    'password': 'AdminPass123!'
})
token = admin_res['access_token']
print('Admin logged in successfully.')

# 2. List current doctors
docs = live_request('https://dikhancare.io/api/v1/admin/doctors', 'GET', token=token)
print(f'Found {len(docs)} existing doctors:')
for d in docs:
    print(f" - {d['id']}: {d.get('full_name')} ({d.get('specialty')})")

# 3. Delete existing dummy doctors
for d in docs:
    doc_id = d['id']
    print(f"Deleting {d.get('full_name')} ({doc_id})...")
    res = live_request(f'https://dikhancare.io/api/v1/admin/doctors/{doc_id}', 'DELETE', token=token)
    print(f" -> Result: {res}")

# 4. Verify doctors are deleted
docs_after = live_request('https://dikhancare.io/api/v1/admin/doctors', 'GET', token=token)
print(f'Doctors count after deletion: {len(docs_after)}')

# 5. Create 3 Real Doctors
doctors_to_create = [
    {
        "full_name": "Dr. Waqar Khan Gandapur",
        "email": "dr.waqar.gandapur@dikhancare.io",
        "phone": "+923339876543",
        "password": "DoctorPass123!",
        "specialty": "General & Laparoscopic Surgeon",
        "sub_region": "Opposite DHQ Hospital",
        "clinic_address": "RK Surgical & Aesthetic Clinic, Jinnah 2, 1st Floor, Opposite DHQ Hospital, D.I. Khan",
        "fee_clinic": 1000.0,
        "shift": "EVENING",
        "morning_start": "09:00",
        "morning_end": "13:00",
        "evening_start": "16:00",
        "evening_end": "21:00",
        "qualification": "MBBS, MCPS, FCPS (Surgery)",
        "is_spotlight": True,
        "verification_status": "verified"
    },
    {
        "full_name": "Dr. Naveed Khan",
        "email": "dr.naveed.khan@dikhancare.io",
        "phone": "+923700593073",
        "password": "DoctorPass123!",
        "specialty": "Plastic & Aesthetic Surgeon",
        "sub_region": "Opposite DHQ Hospital",
        "clinic_address": "RK Surgical & Aesthetic Clinic, Jinnah 2, 1st Floor, Opposite DHQ Hospital, D.I. Khan",
        "fee_clinic": 1500.0,
        "shift": "EVENING",
        "morning_start": "10:00",
        "morning_end": "13:00",
        "evening_start": "16:00",
        "evening_end": "21:00",
        "qualification": "MBBS, MCPS, FCPS (Plastic Surgery)",
        "is_spotlight": True,
        "verification_status": "verified"
    },
    {
        "full_name": "Surgeon Dr. Ali Raza",
        "email": "dr.ali.raza@dikhancare.io",
        "phone": "+923369345566",
        "password": "DoctorPass123!",
        "specialty": "General & Laparoscopic Surgeon",
        "sub_region": "Opposite DHQ Hospital",
        "clinic_address": "Room #30, 1st Floor, Al-Shifa (Ali) Hospital, Opposite DHQ Hospital, D.I. Khan",
        "fee_clinic": 1000.0,
        "shift": "MORNING_EVENING",
        "morning_start": "08:00",
        "morning_end": "14:00",
        "evening_start": "14:30",
        "evening_end": "20:00",
        "qualification": "MBBS (Ayub), MCPS (Gen Surgery), FCPS (Gen Surgery)",
        "is_spotlight": True,
        "verification_status": "verified"
    }
]

created_docs = []
for doc_payload in doctors_to_create:
    print(f"Creating {doc_payload['full_name']}...")
    res = live_request('https://dikhancare.io/api/v1/admin/doctors', 'POST', data=doc_payload, token=token)
    print(f"Created: {res['id']} - {res['full_name']}")
    created_docs.append(res)

print("All 3 doctors created successfully via Admin Portal API!")

