import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "superadmin@system.com"

def test():
    try:
        # Login
        print("Attempting login...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": "12345678"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return
        
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
        
        # List Accounts
        print("Listing accounts...")
        resp = requests.get(f"{BASE_URL}/telegram-accounts", headers=headers)
        print("Response text:", resp.text)
        if resp.status_code != 200:
            print(f"List accounts failed: {resp.status_code} {resp.text}")
            return
        
        accounts = resp.json()
        print(f"Found {len(accounts)} accounts.")
        if not accounts:
            print("No accounts found.")
            return
        
        # Iterate accounts to test connectivity
        for acc in accounts:
            aid = acc["id"]
            phone = acc["phone_number"]
            print(f"\nTesting account {aid} ({phone})...")
            
            # Get Groups
            resp = requests.get(f"{BASE_URL}/telegram-accounts/{aid}/groups", headers=headers)
            print(f"Groups API status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                groups = data.get("groups", [])
                print(f"Success! Found {len(groups)} groups/channels.")
                if groups:
                    print(f"First group: {groups[0].get('title')} ({groups[0].get('type')})")
            else:
                print(f"Error fetching groups: {resp.text}")

    except Exception as e:
        print(f"Exception during test: {e}")

if __name__ == "__main__":
    test()
