import urllib.request
import re

try:
    html = urllib.request.urlopen("https://ticker-vault-cpjwbn83q-anishahuja1s-projects.vercel.app/").read().decode("utf-8")
    match = re.search(r"assets/index-[A-Za-z0-9_-]+\.js", html)
    if match:
        js_url = "https://ticker-vault-cpjwbn83q-anishahuja1s-projects.vercel.app/" + match.group(0)
        js = urllib.request.urlopen(js_url).read().decode("utf-8")
        
        print("Scraping VITE_API_URL from Vercel deployment:")
        urls = re.findall(r"http://localhost:8000|https://[A-Za-z0-9\-]+\.onrender\.com", js)
        print(set(urls))
    else:
        print("No JS match found in HTML")
except Exception as e:
    print("Error:", e)
