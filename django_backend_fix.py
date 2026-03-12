import torch
import torch.nn.functional as F
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

# Make sure this matches the exact classes from your PyTorch training setup
CLASS_NAMES = ['Plastic', 'Paper', 'Organic', 'Metal', 'E-waste']

@api_view(['POST'])
@permission_classes([AllowAny])
def scan_waste_item(request):
    """
    Django REST API View for classifying waste images.
    Ensure you import your model and preprocessing logic above!
    """
    # 1. Access the uploaded file (your frontend passes this as 'image')
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({"error": "No image provided"}, status=400)

    # 2. Preprocess the image to be passed into the PyTorch model
    # -> (Insert your image_to_tensor() logic here to create `input_tensor`)
    
    # Example placeholder:
    # input_tensor = preprocess_image(image_file)
    
    # 3. Predict using the PyTorch ResNet18 model
    with torch.no_grad():
        outputs = model(input_tensor) # Make sure your loaded 'model' is referenced here
        
        # Calculate raw softmax probabilities for each of the 5 classes
        probabilities = F.softmax(outputs, dim=1)
        
        # Extract the highest confidence and its corresponding index
        confidence_tensor, predicted_class_index = torch.max(probabilities, 1)
        
        # Map the index to the exact string class name (e.g. "Metal")
        predicted_class = CLASS_NAMES[predicted_class_index.item()]
        
        # Convert the tensor confidence value to a standard Python float
        confidence = float(confidence_tensor.item())

    # 4. Return the exact JSON dictionary your Vercel frontend is expecting
    return Response({
        "prediction": predicted_class,
        "confidence": confidence
    })
