"""
Script to cleanly delete Dr. Waqar Khan Gandapur's 3 test appointment records on live server (dikhancare.io).
"""
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

def call(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8') if data else None,
        headers=headers,
        method=method
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def main():
    print("1. Authenticating as Admin on https://dikhancare.io...")
    status, res = call(
        'https://dikhancare.io/api/v1/auth/login',
        'POST',
        {'email': 'ncpa.cpl@yahoomail.com', 'password': 'ABC1122abc098'}
    )
    if status != 200 or not res or 'access_token' not in res:
        print(f"Failed to authenticate as Admin: {res}")
        return

    token = res['access_token']
    doc_id = 'e3858a27-da7d-4d13-a4d4-9c6f1ffe7c71' # Dr. Waqar Khan Gandapur

    print(f"\n2. Calling DELETE endpoint for all appointments of Dr. Waqar ({doc_id})...")
    status, del_res = call(
        f'https://dikhancare.io/api/v1/admin/doctors/{doc_id}/appointments',
        'DELETE',
        token=token
    )
    print(f"Status: {status} | Result: {del_res}")

    # Check remaining appointments
    doc_status, doc_login = call(
        'https://dikhancare.io/api/v1/auth/login',
        'POST',
        {'email': 'waqarkhan@gmail.com', 'password': '1122334455'}
    )
    if doc_status == 200 and 'access_token' in doc_login:
        doc_token = doc_login['access_token']
        _, appts = call('https://dikhancare.io/api/v1/doctor/appointments', 'GET', token=doc_token)
        print(f"\nRemaining appointments for Dr. Waqar: {len(appts) if isinstance(appts, list) else appts}")

if __name__ == "__main__":
    main()
