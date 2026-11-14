import urllib.request
import json
import ssl
from datetime import datetime, timedelta

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

# Doctor data to update
doctors = [
    {
        "email": "dr.waqar.gandapur@dikhancare.io",
        "password": "DoctorPass123!",
        "profile": {
            "fee_clinic": 1000.0,
            "shift": "EVENING",
            "morning_start": "09:00",
            "morning_end": "13:00",
            "evening_start": "16:00",
            "evening_end": "21:00",
            "off_days": "friday,sunday",
            "bio": "Dr. Waqar Khan Gandapur is a renowned Consultant General and Laparoscopic Surgeon (MBBS, MCPS, FCPS Surgery) practicing in Dera Ismail Khan. Specializing in advanced laparoscopic gallbladder surgery, hernia repair, appendectomy, piles/fistula surgeries, and abdominal procedures at RK Surgical & Aesthetic Clinic.",
            "expertise": "Gallbladder Surgery, Appendix Surgery, Hernia Surgery, Piles & Fistula, Ovarian Cyst, Hysterectomy, Breast Surgery, Male Infertility, Bariatric Surgery",
            "experience_years": 12,
            "qualification": "MBBS, MCPS, FCPS (Surgery)",
            "services_offered": "Laparoscopic Gallbladder (Cholecystectomy), Appendix Surgery, Hernia Repair, Piles & Fistula Surgery, Ovarian Cyst Removal, Hysterectomy, Breast Surgery, Male Infertility Treatment, Weight Loss Surgery",
            "conditions_treated": "Gallstones, Appendicitis, Hernia, Hemorrhoids & Piles, Ovarian Cysts, Uterine Fibroids, Breast Tumors, Male Infertility, Morbid Obesity",
            "hospital_affiliations": "RK Surgical & Aesthetic Clinic, D.I. Khan",
            "custom_sunday_enabled": False
        },
        "slot_gen": {
            "shift": "EVENING",
            "evening_start": "16:00",
            "evening_end": "21:00",
            "slot_duration_minutes": 20,
            "off_days": ["friday", "sunday"]
        }
    },
    {
        "email": "dr.naveed.khan@dikhancare.io",
        "password": "DoctorPass123!",
        "profile": {
            "fee_clinic": 1500.0,
            "shift": "EVENING",
            "morning_start": "10:00",
            "morning_end": "13:00",
            "evening_start": "16:00",
            "evening_end": "21:00",
            "off_days": "friday,sunday",
            "bio": "Dr. Naveed Khan is a premier Consultant Plastic and Aesthetic Surgeon (MBBS, MCPS, FCPS Plastic Surgery) in Dera Ismail Khan. With specialized fellowship training in aesthetic procedures, he excels in hair transplants (FUE/FUT), facial cosmetic surgery, scar revision, and advanced skin rejuvenation at RK Surgical & Aesthetic Clinic.",
            "expertise": "Hair Transplant, Cosmetic Facial Surgery, Body Contouring, Aesthetic Skin Treatments, Scar Revision, Anti-Aging",
            "experience_years": 10,
            "qualification": "MBBS, MCPS, FCPS (Plastic Surgery)",
            "services_offered": "Hair Transplant (FUE / FUT), Cosmetic Facial Surgery, Rhinoplasty, Blepharoplasty, Skin Rejuvenation, Scar Revision, Anti-Aging & Aesthetic Injectables, Body Contouring",
            "conditions_treated": "Hair Loss & Baldness, Facial Aging & Wrinkles, Post-Surgical & Burn Scars, Skin Pores Dilatation, Aesthetic Body Contouring",
            "hospital_affiliations": "RK Surgical & Aesthetic Clinic, D.I. Khan",
            "custom_sunday_enabled": False
        },
        "slot_gen": {
            "shift": "EVENING",
            "evening_start": "16:00",
            "evening_end": "21:00",
            "slot_duration_minutes": 20,
            "off_days": ["friday", "sunday"]
        }
    },
    {
        "email": "dr.ali.raza@dikhancare.io",
        "password": "DoctorPass123!",
        "profile": {
            "fee_clinic": 1000.0,
            "shift": "MORNING_EVENING",
            "morning_start": "08:00",
            "morning_end": "14:00",
            "evening_start": "14:30",
            "evening_end": "20:00",
            "off_days": "friday",
            "bio": "Surgeon Dr. Ali Raza is the Registrar of Surgery at District Headquarter (DHQ) Hospital D.I. Khan and Senior Consultant General & Laparoscopic Surgeon. Holding MBBS, MCPS, and FCPS from Ayub Medical College & Teaching Hospital Abbottabad, he practices daily (2:30 PM - 8:00 PM) and Sundays (8:00 AM - 8:00 PM) at Room #30, 1st Floor, Al-Shifa (Ali) Hospital, Opposite DHQ Hospital.",
            "expertise": "Hernia, Gallstones, Stomach Cancer, Appendicitis, Intestinal Surgery, Kidney & Bladder Stones, Cancer & Tumors, Diabetic Foot, Thyroid Goiter, Prostate Surgery, Liver Surgery, Breast Cancer, Piles, Uterine Fibroids",
            "experience_years": 11,
            "qualification": "MBBS (Ayub), MCPS (Gen Surgery), FCPS (Gen Surgery)",
            "services_offered": "Laparoscopic Gallbladder Surgery, Hernia Repair Surgery, Appendix Removal, Cancer Surgery, Thyroid Gland Surgery, Prostate Surgery, Liver Resection, Breast Cancer Surgery, Piles & Fistula Surgery, Diabetic Wound Care",
            "conditions_treated": "Hernia, Gallbladder Stones, Stomach Cancer, Appendicitis, Intestinal Obstruction, Kidney & Bladder Stones, Tumors & Cancers, Diabetic Foot Ulcers, Thyroid Goiter, Prostate Enlargement, Breast Tumors, Piles (Bawasir), Uterine Fibroids",
            "hospital_affiliations": "Registrar Surgery, District Headquarter (DHQ) Hospital D.I. Khan",
            "custom_sunday_enabled": True,
            "sunday_start": "08:00",
            "sunday_end": "20:00"
        },
        "slot_gen": {
            "shift": "BOTH",
            "morning_start": "08:00",
            "morning_end": "14:00",
            "evening_start": "14:30",
            "evening_end": "20:00",
            "slot_duration_minutes": 20,
            "off_days": ["friday"]
        }
    }
]

today = datetime.now()
start_date_str = today.strftime("%Y-%m-%d")
end_date_str = (today + timedelta(days=7)).strftime("%Y-%m-%d")

for doc in doctors:
    print(f"\n--- Logging in as {doc['email']} ---")
    login_res = live_request('https://dikhancare.io/api/v1/auth/login', 'POST', {
        'email': doc['email'],
        'password': doc['password']
    })
    token = login_res['access_token']
    print("Token obtained.")

    # 1. Update Profile
    print("Updating profile...")
    prof_res = live_request('https://dikhancare.io/api/v1/doctor/profile', 'PUT', data=doc['profile'], token=token)
    print("Profile updated successfully.")

    # 2. Generate Slots
    print(f"Generating slots from {start_date_str} to {end_date_str}...")
    slot_payload = {
        "start_date": start_date_str,
        "end_date": end_date_str,
        **doc['slot_gen']
    }
    slot_res = live_request('https://dikhancare.io/api/v1/doctor/slots/generate', 'POST', data=slot_payload, token=token)
    print("Slots generated response:", slot_res)

print("\nAll doctors updated with rich clinical profiles & booking slots!")
