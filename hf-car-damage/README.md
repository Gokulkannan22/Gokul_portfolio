---
title: Car Damage Detection Demo
emoji: 🚗
colorFrom: blue
sdk: docker
app_file: app.py
pinned: false
---

# Car Damage Detection Demo 🚗

Welcome to the Car Damage Detection AI Demo! This application uses a fine-tuned PyTorch **ResNet18** model to classify different types of car damages.

It features **Grad-CAM (Gradient-weighted Class Activation Mapping)** visualization, which generates a heat map illustrating which parts of the image the model focused on when making its decision.

### Running it locally
```bash
pip install -r requirements.txt
python app.py
```
