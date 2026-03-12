import base64
import requests
import json

with open("profile.jpg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")
    
data = {
    "data": [f"data:image/jpeg;base64,{b64}"]
}

url = "https://gokulb21-waste-classifier-ai.hf.space/run/predict" # For Gradio 3, or /api/predict for Gradio 2, or /call/predict for Gradio 4
# Let's try /api/predict first (Gradio 3/4 legacy support)

try:
    res = requests.post("https://gokulb21-waste-classifier-ai.hf.space/api/predict", json=data)
    print("API:", res.status_code, res.text[:200])
except Exception as e:
    print(e)
