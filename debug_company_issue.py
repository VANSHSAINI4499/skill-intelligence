#!/usr/bin/env python3
"""
Debug script for company shortlist issue
Run this to diagnose what's in your Firestore database
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

def debug_company_data():
    """Check what company data exists in Firestore"""

    print("🔍 Debugging Company Shortlist Issue...")
    print("=" * 60)

    # Initialize Firebase (if not already done)
    try:
        if not firebase_admin._apps:
            # You'll need to update this path to your service account key
            cred = credentials.Certificate("path/to/your/service-account-key.json")
            firebase_admin.initialize_app(cred)

        db = firestore.client()

        # You'll need to replace 'YOUR_UNIVERSITY_ID' with your actual university ID
        university_id = "YOUR_UNIVERSITY_ID"  # Update this!

        print(f"📋 Checking companies for university: {university_id}")
        print()

        # Check company requirements collection
        company_col = db.collection('universities').document(university_id).collection('company_requirements')
        companies = company_col.order_by("companyName").stream()

        found_companies = []
        for doc in companies:
            data = doc.to_dict()
            found_companies.append({
                'id': doc.id,
                'name': data.get('companyName', 'UNKNOWN'),
                'active': data.get('isActive', True),
                'created': data.get('createdAt'),
                'minCGPA': data.get('minCGPA', 0),
                'minLeetCode': data.get('minLeetCodeHard', 0),
            })

        if not found_companies:
            print("❌ NO COMPANIES FOUND!")
            print()
            print("POSSIBLE CAUSES:")
            print("1. University ID is wrong")
            print("2. No companies have been created yet")
            print("3. Firebase connection issue")
            print()
            print("SOLUTION: Create a company first using the admin panel")
            return False

        print(f"✅ Found {len(found_companies)} companies:")
        print()

        for i, comp in enumerate(found_companies, 1):
            status = "🟢 Active" if comp['active'] else "🔴 Inactive"
            print(f"{i}. {status}")
            print(f"   Company ID: {comp['id']}")
            print(f"   Company Name: {comp['name']}")
            print(f"   Min CGPA: {comp['minCGPA']}")
            print(f"   Min LeetCode: {comp['minLeetCode']}")
            print(f"   Created: {comp['created']}")
            print()

            # Check if this is your GOOGLE company
            if comp['name'].upper() == 'GOOGLE':
                print(f"🎯 FOUND YOUR GOOGLE COMPANY!")
                print(f"   ✅ Correct UUID: {comp['id']}")
                print(f"   ✅ Company Name: {comp['name']}")
                print()
                print("📝 FOR FRONTEND DEBUGGING:")
                print(f"   - The dropdown should send: '{comp['id']}'")
                print(f"   - NOT the company name: '{comp['name']}'")
                print()

        return True

    except Exception as e:
        print(f"❌ Firebase Error: {e}")
        print()
        print("SETUP REQUIRED:")
        print("1. Update the service account key path in this script")
        print("2. Update YOUR_UNIVERSITY_ID with your actual university ID")
        print("3. Ensure Firebase Admin SDK is installed: pip install firebase-admin")
        return False

def check_frontend_network():
    """Instructions to check frontend network calls"""

    print("\n🌐 FRONTEND DEBUGGING STEPS:")
    print("=" * 60)
    print()
    print("1. Open Chrome DevTools (F12)")
    print("2. Go to Network tab")
    print("3. Try generating shortlist again")
    print("4. Look for these API calls:")
    print()
    print("   📥 GET /api/admin/company-requirements")
    print("   Check Response → should show:")
    print("   [")
    print("     {")
    print('       "companyId": "abc123-uuid-here",  ← Should be UUID')
    print('       "companyName": "GOOGLE"           ← Display name')
    print("     }")
    print("   ]")
    print()
    print("   📤 POST /api/admin/shortlists")
    print("   Check Request Payload → should show:")
    print("   {")
    print('     "companyId": "abc123-uuid-here",  ← Should be UUID, NOT "GOOGLE"')
    print('     "batch": "2023",')
    print('     "limit": 20')
    print("   }")
    print()
    print("🔍 WHAT TO LOOK FOR:")
    print("- If GET shows correct UUID but POST sends 'GOOGLE' → frontend bug")
    print("- If GET shows 'GOOGLE' as companyId → database creation bug")
    print("- If dropdown is empty → API call failing")

if __name__ == "__main__":
    print("🚀 Company Shortlist Debug Tool")
    print("This script will help diagnose your 'Company GOOGLE not found' issue")
    print()

    success = debug_company_data()
    check_frontend_network()

    if success:
        print("\n✅ Debug complete! Check the output above for next steps.")
    else:
        print("\n❌ Debug incomplete. Fix Firebase setup and try again.")