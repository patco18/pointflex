import requests
import json

# Step 1: Login to get a fresh token
login_url = "http://localhost:5000/api/auth/login"
login_data = {
    "email": "superadmin@pointflex.com",  # Using an existing user from the database
    "password": "password"  # Trying another common default password
}

try:
    # First, try to login
    print("Logging in to get fresh token...")
    login_response = requests.post(login_url, json=login_data)
    print(f"Login Status Code: {login_response.status_code}")
    
    if login_response.status_code == 200:
        # Extract the token from the login response
        token = login_response.json().get('access_token')
        print(f"Got token: {token[:20]}...")
        
        # Step 2: Use the token to make the office check-in request
        url = "http://localhost:5000/api/attendance/checkin/office"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        data = {
            "coordinates": {
                "latitude": 5.316667,
                "longitude": -4.033333,
                "accuracy": 20
            }
        }
        
        # Make the office check-in request
        print("\nMaking office check-in request...")
        response = requests.post(url, headers=headers, json=data)
        print(f"Check-in Status Code: {response.status_code}")
        print(f"Check-in Response: {response.text}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")
