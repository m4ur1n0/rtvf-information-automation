from bs4 import BeautifulSoup
import csv

file_path = 'rtvflistserve.html'
with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

soup = BeautifulSoup(content, 'html.parser')
items = soup.find_all('item')

parsed_results = []

for item in items:
    title = item.find('title').get_text(strip=True) if item.find('title') else ""
    link = item.find('link').get_text(strip=True) if item.find('link') else ""
    date = item.find('dc:date').get_text(strip=True) if item.find('dc:date') else ""
    creator = item.find('dc:creator').get_text(strip=True) if item.find('dc:creator') else ""
    description = item.find('description').get_text(separator=" ", strip=True) if item.find('description') else ""
    
    parsed_results.append({
        'Title': title,
        'Date': date,
        'Creator': creator,
        'Link': link,
        'Description': description
    })

output_file = 'rtvf_data.csv'
keys = parsed_results[0].keys()

with open(output_file, 'w', newline='', encoding='utf-8') as f:
    dict_writer = csv.DictWriter(f, fieldnames=keys)
    dict_writer.writeheader()
    dict_writer.writerows(parsed_results)

print(f"Success! Processed {len(parsed_results)} items into {output_file}")