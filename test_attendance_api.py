"""
Test script for attendance API endpoints
"""
import requests
import sys
import json

def test_attendance_endpoints(token):
    """Tests the attendance endpoints with the provided JWT token"""
    base_url = "http://localhost:5000/api"
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test endpoint 1: /api/attendance
    print("\nTesting /api/attendance endpoint...")
    try:
        response = requests.get(f"{base_url}/attendance", headers=headers)
        response.raise_for_status()
        print(f"SUCCESS - Status code: {response.status_code}")
        # Print a sample of the response
        data = response.json()
        print(f"Records: {len(data.get('records', []))} items")
        print(f"Pagination: {json.dumps(data.get('pagination', {}))}")
    except requests.exceptions.HTTPError as e:
        print(f"ERROR - Status code: {e.response.status_code}")
        try:
            print(f"Response: {e.response.json()}")
        except:
            print(f"Raw response: {e.response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
    
    # Test endpoint 2: /api/attendance/stats
    print("\nTesting /api/attendance/stats endpoint...")
    try:
        response = requests.get(f"{base_url}/attendance/stats", headers=headers)
        response.raise_for_status()
        print(f"SUCCESS - Status code: {response.status_code}")
        # Print the response
        data = response.json()
        print(f"Stats: {json.dumps(data.get('stats', {}))}")
    except requests.exceptions.HTTPError as e:
        print(f"ERROR - Status code: {e.response.status_code}")
        try:
            print(f"Response: {e.response.json()}")
        except:
            print(f"Raw response: {e.response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_attendance_api.py <jwt_token>")
        sys.exit(1)
    
    token = sys.argv[1]
    test_attendance_endpoints(token)
