import pandas as pd
import re

# -------------------------------------------------------------------
# READ CSV SAFELY
# -------------------------------------------------------------------
df = pd.read_csv(
    "data/normalized_hospitals.csv",
    sep="|",
    engine="python",
    on_bad_lines="warn"
)

print(f"Loaded {len(df)} records")
print(f"Columns: {df.columns.tolist()}")

# -------------------------------------------------------------------
# CLEAN HOSPITAL NAME
# -------------------------------------------------------------------
def clean_hospital_name(name):
    if pd.isna(name):
        return None
    
    name = str(name).lower()
    
    # remove company suffixes
    name = re.sub(
        r'\b(pvt\.?|ltd\.?|pvt\.?\s*ltd\.?|private limited|pvt ltd)\b',
        '',
        name,
        flags=re.IGNORECASE
    )
    
    # remove extra spaces
    name = re.sub(r'\s+', ' ', name).strip()
    
    return name.title()

df["name_clean"] = df["Name"].apply(clean_hospital_name)

# -------------------------------------------------------------------
# INFER TYPE FROM NAME
# -------------------------------------------------------------------
def infer_type(name):
    if pd.isna(name):
        return "CLINIC"
    
    n = str(name).lower()
    
    if "hospital" in n:
        return "HOSPITAL"
    if "polyclinic" in n or "clinic" in n:
        return "CLINIC"
    if "diagnostic" in n or "pathology" in n or "lab" in n:
        return "DIAGNOSTIC CENTER"
    
    return "CLINIC"

df["type"] = df["name_clean"].apply(infer_type)

# -------------------------------------------------------------------
# CLEAN ADDRESS
# -------------------------------------------------------------------
def clean_address(address):
    if pd.isna(address):
        return None
    
    address = str(address).lower()
    
    # remove standalone numbers and ward numbers (like -4, 35, etc)
    address = re.sub(r'\b\d+\b', '', address)
    address = address.replace('-', ' ')
    
    # remove extra spaces and commas
    address = re.sub(r'\s+', ' ', address).strip()
    address = re.sub(r',\s*,', ',', address)  # remove double commas
    address = re.sub(r'^\s*,\s*|\s*,\s*$', '', address)  # remove leading/trailing commas
    
    return address.title()

df["address_clean"] = df["Address"].apply(clean_address)

# -------------------------------------------------------------------
# EXTRACT CITY FROM ORIGINAL ADDRESS
# -------------------------------------------------------------------
def extract_city(address):
    if pd.isna(address):
        return None
    
    address = str(address)
    
    # Split by comma and get the last part
    parts = [p.strip() for p in address.split(",") if p.strip()]
    
    if not parts:
        return None
    
    # Get the last part (usually the city)
    city = parts[-1].strip()
    
    # Remove any numbers from the city name
    city = re.sub(r'\d+', '', city).strip()
    city = re.sub(r'\s+', ' ', city).strip()
    
    return city.title()

df["city"] = df["Address"].apply(extract_city)

# -------------------------------------------------------------------
# ADD COUNTRY
# -------------------------------------------------------------------
df["country"] = "Nepal"

# -------------------------------------------------------------------
# CITY → DISTRICT MAPPING (EXPANDABLE)
# -------------------------------------------------------------------
city_to_district = {
    "Kathmandu": "Kathmandu",
    "Lalitpur": "Lalitpur",
    "Bhaktapur": "Bhaktapur",
    "Itahari": "Sunsari",
    "Dharan": "Sunsari",
    "Sunsari": "Sunsari",
    "Biratnagar": "Morang",
    "Morang": "Morang",
    "Butwal": "Rupandehi",
    "Rupandehi": "Rupandehi",
    "Ghorahi": "Dang",
    "Dang": "Dang",
    "Tulsipur": "Dang",
    "Dhangadhi": "Kailali",
    "Kailali": "Kailali",
    "Janakpur": "Dhanusha",
    "Dhanusha": "Dhanusha",
    "Birgunj": "Parsa",
    "Parsa": "Parsa",
    "Nepalgunj": "Banke",
    "Banke": "Banke",
    "Birtamod": "Jhapa",
    "Mechinagar": "Jhapa",
    "Damak": "Jhapa",
    "Jhapa": "Jhapa",
    "Pokhara": "Kaski",
    "Kaski": "Kaski",
    "Chitawan": "Chitawan",
    "Bharatpur": "Chitawan",
}

# -------------------------------------------------------------------
# DISTRICT INFERENCE FUNCTION
# -------------------------------------------------------------------
def get_district(city):
    if pd.isna(city):
        return "Unknown"
    
    city = str(city).strip().title()
    
    # Direct lookup
    if city in city_to_district:
        return city_to_district[city]
    
    # Try partial matches for common misspellings
    city_lower = city.lower()
    for key, value in city_to_district.items():
        if key.lower() in city_lower or city_lower in key.lower():
            return value
    
    return "Unknown"

# -------------------------------------------------------------------
# CREATE LOCATIONS DIMENSION TABLE
# -------------------------------------------------------------------
# First ensure we have valid cities
df_with_city = df[df["city"].notna()].copy()

locations = (
    df_with_city[["city", "country"]]
    .drop_duplicates()
    .reset_index(drop=True)
)

locations["district"] = locations["city"].apply(get_district)

# Add ID
locations.insert(0, "id", locations.index + 1)

print(f"\nCreated {len(locations)} unique locations")

# -------------------------------------------------------------------
# MERGE BACK TO FACT TABLE
# -------------------------------------------------------------------
df = df.merge(
    locations[["id", "city"]],
    on="city",
    how="left"
)

df.rename(columns={"id": "location_id"}, inplace=True)

# -------------------------------------------------------------------
# CREATE HOSPITALS DIMENSION TABLE
# -------------------------------------------------------------------
hospitals = df[[
    "name_clean",
    "type",
    "address_clean",
    "location_id"
]].drop_duplicates()

hospitals.reset_index(drop=True, inplace=True)
hospitals.insert(0, "id", hospitals.index + 1)

print(f"Created {len(hospitals)} unique hospitals")

# -------------------------------------------------------------------
# DISPLAY SAMPLE DATA
# -------------------------------------------------------------------
print("\n=== SAMPLE LOCATIONS ===")
print(locations.head(10))

print("\n=== SAMPLE HOSPITALS ===")
print(hospitals.head(10))

print("\n=== TYPE DISTRIBUTION ===")
print(df["type"].value_counts())

print("\n=== DISTRICT DISTRIBUTION ===")
print(locations["district"].value_counts())

# -------------------------------------------------------------------
# SAVE OUTPUT FILES
# -------------------------------------------------------------------
locations.to_csv("locations_clean.csv", index=False)
hospitals.to_csv("hospitals_clean.csv", index=False)

print("\n✓ Files saved successfully!")
print("  - locations_clean.csv")
print("  - hospitals_clean.csv")