# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
import gdown
import io

app = FastAPI(title="Waste Classification API")

# Allow CORS for all origins so the portfolio frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load class labels
class_names = ['E-waste', 'Metal', 'Organic', 'Paper', 'Plastic']

# Global model variable
model = None

def load_model():
    global model
    if model is not None:
        return model

    model_path = "final_waste_model.pth"
    if not os.path.exists(model_path):
        url = "https://drive.google.com/uc?export=download&id=1PVjwZ5Qgl3bGVSJDMtiTQOFoMjmjfu_X"
        print("Downloading model weights...")
        gdown.download(url, model_path, quiet=False, fuzzy=True)

    # Recreate model architecture (ResNet18)
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 5)  # 5 classes

    # Load the weights
    model.load_state_dict(
        torch.load(model_path, map_location=torch.device("cpu"))
    )

    model.eval()
    return model

def preprocess_image(image: Image.Image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

@app.on_event("startup")
async def startup_event():
    # Load model on startup so the first request isn't slow
    load_model()

@app.get("/")
def read_root():
    return {"message": "Waste Classification API is running. Send a POST request to /predict with an image."}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPEG or PNG image.")

    try:
        # Read the uploaded image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Ensure model is strictly loaded
        local_model = load_model()
        
        # Preprocess
        input_tensor = preprocess_image(image)
        
        # Inference
        with torch.no_grad():
            outputs = local_model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, preds = torch.max(probabilities, 0)
            
            pred_class = class_names[preds.item()]
            conf_score = float(confidence.item())
            
        return JSONResponse(content={
            "prediction": pred_class,
            "confidence": conf_score
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
