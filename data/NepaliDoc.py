import requests
from bs4 import BeautifulSoup
import pandas as pd


url = "https://www.healme.com.np/doctors"

response = requests.get(url)
response.raise_for_status()


soup = BeautifulSoup(response.text, "html.parser")

doctors = soup.select("body .doctor-details")  # adjust selector if needed


data = []
for doc in doctors:
    name = doc.find("h2")
    nmc = doc.find(text=lambda t: "NMC no" in t)
    speciality = doc.find(text=lambda t: "Speciality" in t)
    location = doc.find(text=lambda t: "Location" in t)
    details = {
        "Name": name.get_text(strip=True) if name else "",
        "NMC": nmc.split(":")[-1].strip() if nmc else "",
        "Speciality": speciality.split(":")[-1].strip() if speciality else "",
        "Location": location.split(":")[-1].strip() if location else "",
        "Extra Info": doc.get_text(separator=" | ", strip=True)
    }
    data.append(details)


df = pd.DataFrame(data)
df.to_csv("nepali_doctors1.csv", index=False)

print(f"Saved {len(df)} doctors to nepali_doctors1.csv")