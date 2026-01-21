import requests
from bs4 import BeautifulSoup
import pandas as pd

url = "https://nepalhpf.org.np/government-approved-medical-list/"

response = requests.get(url)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

table = soup.find("table")
if not table:
    raise Exception("Table not found")

rows = table.find_all("tr")

data = []
for row in rows[1:]:
    cols = row.find_all("td")
    if len(cols) == 4:
        data.append({
            "SN": cols[0].get_text(strip=True),
            "Regd_No": cols[1].get_text(strip=True),
            "Name": cols[2].get_text(strip=True),
            "Address": cols[3].get_text(strip=True),
        })

df = pd.DataFrame(data)
df.to_csv("nepal_approved_hospitals.csv", index=False)

print(f"Scraped {len(df)} hospitals and saved to nepal_approved_hospitals.csv")
