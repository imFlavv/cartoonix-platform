import os, requests
from dotenv import dotenv_values
B = (dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL")).rstrip("/")
t = requests.post(f"{B}/api/auth/login", json={"email": "admin@cartoonix.ro", "password": "admin1234"}).json()["token"]
h = {"Authorization": f"Bearer {t}"}
items = requests.get(f"{B}/api/admin/announcements", headers=h).json()["items"]
for i in items:
    if i["title"].startswith("TEST_"):
        print("deleting", i["title"], requests.delete(f"{B}/api/admin/announcements/{i['id']}", headers=h).status_code)
print([i["title"] for i in requests.get(f"{B}/api/admin/announcements", headers=h).json()["items"]])
