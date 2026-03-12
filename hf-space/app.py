# app.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import gradio as gr
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
import io
import gdown

# Create traditional FastAPI App
app = FastAPI(title="Waste Classification API")

# Allow CORS so Vercel frontend can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class_names = ['E-waste', 'Metal', 'Organic', 'Paper', 'Plastic']
model = None

def load_model():
    global model
    if model is not None:
        return model

    model_path = "final_waste_model.pth"
    if not os.path.exists(model_path):
        url = "https://drive.google.com/uc?export=download&id=1PVjwZ5Qgl3bGVSJDMtiTQOFoMjmjfu_X"
        print("Downloading PyTorch model weights...")
        gdown.download(url, model_path, quiet=False, fuzzy=True)

    # Recreate the exact ResNet18 model architecture
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 5)

    # Load the trained weights
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

def gradio_predict(image):
    """Function specifically for mapping the Gradio Web UI"""
    local_model = load_model()
    input_tensor = preprocess_image(image)
    
    with torch.no_grad():
        outputs = local_model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, preds = torch.max(probabilities, 0)
        
        pred_class = class_names[preds.item()]
        conf_score = float(confidence.item())
        
    return {"prediction": pred_class, "confidence": conf_score}

# --- Original FastAPI Endpoint (For Vercel Portfolio Integration) ---
@app.post("/predict")
async def api_predict(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        local_model = load_model()
        input_tensor = preprocess_image(image)
        
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

# Pre-load model to prevent Gradio/FastAPI cold-start timeout
load_model()

# --- Gradio UI (Required by Hugging Face) ---
demo = gr.Interface(
    fn=gradio_predict,
    inputs=gr.Image(type="pil", label="Upload Waste Image"),
    outputs=gr.JSON(label="AI Model Verdict"),
    title="Waste Classification AI",
    description="Upload an image to securely classify waste type via PyTorch ResNet18.",
    allow_flagging="never"
)

# Mount Gradio onto the existing FastAPI app
app = gr.mount_gradio_app(app, demo, path="/")
