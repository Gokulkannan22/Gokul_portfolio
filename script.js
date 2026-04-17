// Global variable for Google Form submission
let submitted = false;

// Popup Functions
function showPopup() {
    document.getElementById('success-popup').classList.add('active');
    document.getElementById('contact-form').reset();
    submitted = false; // reset state
}

function closePopup() {
    document.getElementById('success-popup').classList.remove('active');
}

// Toggle menu icon and navbar
let menuIcon = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
};

// Scroll sections active link and sticky header
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

window.onscroll = () => {
    // Active links for smooth scroll
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (top >= offset && top < offset + height) {
            navLinks.forEach(links => {
                links.classList.remove('active');
                document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
            });
        };
    });

    // Sticky header
    let header = document.querySelector('header');
    header.classList.toggle('sticky', window.scrollY > 100);

    // Remove toggle icon and navbar when clicking navbar link (scroll)
    menuIcon.classList.remove('bx-x');
    navbar.classList.remove('active');
};

// ----------------------------------------------------
// Three.js 3D GLB Model Initialization
// loads robot_playground.glb with ambient lighting & cursor tracking
// ----------------------------------------------------
(function initThreeJSModel() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    
    const parent = canvas.parentElement;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(50, parent.clientWidth / parent.clientHeight, 0.1, 1000);
    camera.position.set(0, -0.4, 6); // Move camera down (-0.4) to shift the model UP on the screen

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(parent.clientWidth, parent.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const blueLight = new THREE.PointLight(0x00e0ff, 2, 20);
    blueLight.position.set(-3, 3, 3);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x7d2ae8, 2, 20);
    purpleLight.position.set(3, -3, 3);
    scene.add(purpleLight);

    // GLTF Loader with DRACO compression support
    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    let loadedModel = null;
    let mixer = null; // For animations if they exist

    // Add orbit controls or fallback scaling to ensure we see it
    loader.load('robot_playground.glb', function(gltf) {
        loadedModel = gltf.scene;

        // Spline exports often have very weird transformations, so wrap it in a group to center it properly
        const wrapper = new THREE.Group();
        wrapper.add(loadedModel);
        
        // Center the wrapper bounding box
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        loadedModel.position.x += (loadedModel.position.x - center.x);
        loadedModel.position.y += (loadedModel.position.y - center.y);
        loadedModel.position.z += (loadedModel.position.z - center.z);
        
        // Auto-scale to viewport
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = 5 / maxDim;
            wrapper.scale.set(scale, scale, scale);
        }

        // No need to arbitrarily shift right if it sits inside the right column container now
        wrapper.position.x = 0;
        
        // Spline exports often contain their own lights & cameras which can bug out the scene
        // Best practice is to extract only the meshes or rely on environmental lights
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambient);

        scene.add(wrapper);

        // Replace loadedModel ref to the wrapper so animation logic rotates in place
        loadedModel = wrapper;

        // Play Animation if present
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(loadedModel);
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });
        }
    }, undefined, function(error) {
        console.error('Error loading GLB model:', error);
    });

    // Mouse Tracking Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    window.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Mobile touch tracking
    window.addEventListener('touchmove', (event) => {
        if (event.touches.length > 0) {
            mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }, { passive: true });

    const clock = new THREE.Clock();

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        if (mixer) {
            mixer.update(delta);
        }

        // Smoothly rotate model towards mouse
        if (loadedModel) {
            targetX = mouseX * 0.5;
            targetY = mouseY * 0.5;
            
            // Add a slow continuous idle rotation plus cursor tracking
            loadedModel.rotation.y += 0.005; 
            
            // Subtle tilt based on cursor
            loadedModel.rotation.x += (targetY - loadedModel.rotation.x) * 0.05;
            loadedModel.rotation.z += (-targetX - loadedModel.rotation.z) * 0.05;
        }

        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        const parent = canvas.parentElement;
        camera.aspect = parent.clientWidth / parent.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(parent.clientWidth, parent.clientHeight);
    });
})();

// ----------------------------------------------------
// Scroll Reveal Animations
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    // Add .reveal class to elements we want to animate on scroll
    const elementsToReveal = document.querySelectorAll('.heading, .about-text, .timeline-box, .skills-box, .portfolio-box, .service-box, .contact form');

    elementsToReveal.forEach(el => {
        el.classList.add('reveal');
    });

    // Setup Intersection Observer
    const revealElements = document.querySelectorAll('.reveal');

    const revealCallback = function (entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // observer.unobserve(entry.target); 
            }
        });
    };

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
});

// ----------------------------------------------------
// AI Experience Lab - Image Upload & API Logic
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('waste-image-input');
    const predictionResult = document.getElementById('prediction-result');
    const imagePreview = document.getElementById('image-preview');
    const predClass = document.querySelector('#pred-class span');
    const predConf = document.querySelector('#pred-conf span');
    const loadingOverlay = document.getElementById('ai-loading');
    const resetBtn = document.getElementById('reset-ai-btn');

    // The live FastAPI endpoint deployed on Hugging Face Spaces
    const API_URL = "https://gokulb21-waste-classifier-ai.hf.space/predict";

    if (!uploadArea) return; // Exit if not on the page

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // File input change event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        predictionResult.style.display = 'none';
        uploadArea.style.display = 'block';
        fileInput.value = '';
    });

    function handleFileUpload(file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPG or PNG).');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadArea.style.display = 'none';
            predictionResult.style.display = 'none';
            loadingOverlay.style.display = 'flex';

            // Call API
            predictWaste(file);
        };
        reader.readAsDataURL(file);
    }

    async function predictWaste(file, retryCount = 5) {
        const formData = new FormData();
        // The FastAPI backend expects the key 'file'
        formData.append("file", file);

        // Update loading text to indicate possible cold start if retrying
        if (retryCount < 5) {
            document.querySelector('#ai-loading p').textContent = "Server waking up (can take up to a minute)...";
        } else {
            document.querySelector('#ai-loading p').textContent = "Analyzing waste...";
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();

            // Hide loading, show results
            loadingOverlay.style.display = 'none';
            predictionResult.style.display = 'flex';

            // Map the FastAPI response to the UI
            predClass.textContent = data.prediction || "Unknown";

            if (data.confidence !== undefined) {
                predConf.textContent = (data.confidence * 100).toFixed(2) + "%";
            } else {
                predConf.textContent = "--";
            }

        } catch (error) {
            console.error("Error during prediction API call:", error);

            if (retryCount > 0) {
                console.log(`Retrying in 10 seconds due to cold start... (${retryCount} attempts left)`);
                setTimeout(() => {
                    predictWaste(file, retryCount - 1);
                }, 10000);
            } else {
                loadingOverlay.style.display = 'none';
                predictionResult.style.display = 'flex';

                // Show error state
                predClass.textContent = "AI service temporarily unavailable. Please try again later.";
                predClass.style.color = "red";
                predClass.style.fontSize = "1.2rem";
                predConf.textContent = "";
            }
        }
    }
});

// ----------------------------------------------------
// AI Experience Lab - Car Damage Detection (HuggingFace Gradio API)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const carUploadArea = document.getElementById('car-upload-area');
    const carFileInput = document.getElementById('car-image-input');
    const carPredictionResult = document.getElementById('car-prediction-result');
    const carImagePreview = document.getElementById('car-image-preview');
    const carPredClass = document.querySelector('#car-pred-class span');
    const carLoadingOverlay = document.getElementById('car-loading');
    const carResetBtn = document.getElementById('reset-car-btn');

    if (!carUploadArea) return;

    carUploadArea.addEventListener('click', () => carFileInput.click());

    carUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        carUploadArea.classList.add('dragover');
    });

    carUploadArea.addEventListener('dragleave', () => {
        carUploadArea.classList.remove('dragover');
    });

    carUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        carUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleCarFileUpload(e.dataTransfer.files[0]);
        }
    });

    carFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleCarFileUpload(e.target.files[0]);
        }
    });

    carResetBtn.addEventListener('click', () => {
        carPredictionResult.style.display = 'none';
        carUploadArea.style.display = 'block';
        carFileInput.value = '';
    });

    function handleCarFileUpload(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPG or PNG).');
            return;
        }

        carUploadArea.style.display = 'none';
        carPredictionResult.style.display = 'none';
        carLoadingOverlay.style.display = 'flex';
        
        predictCarDamage(file);
    }

    async function predictCarDamage(file) {
        try {
            document.querySelector('#car-loading p').textContent = "Connecting to HuggingFace Spaces...";
            
            // Dynamically import the official Gradio Client natively in browser
            const module = await import("https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js");
            const { client } = module;
            
            const app = await client("https://gokulb21-car-damage-detection.hf.space");
            
            document.querySelector('#car-loading p').textContent = "Analyzing damage & generating Grad-CAM...";
            
            // Gradio client expects a Blob or Buffer
            const blob = new Blob([file], { type: file.type });
            
            const result = await app.predict("/analyze_image", [
                blob, // image input
            ]);
            
            // Expected Result Data Structure from my Gradio app.py:
            // result.data[0]: Heatmap Image Object { url: "..." }
            // result.data[1]: "PredictedLabel (Confidence%)" -> "F_Crushed (92.00%)"
            
            const heatmapObj = result.data[0];
            const predictionText = result.data[1] || "Unknown";
            
            // Parse out the confidence
            const match = predictionText.match(/(.+) \(([\d.]+)%\)/);
            let label = predictionText;
            let conf = "";
            let confidenceHTML = "";
            
            if (match) {
                label = match[1];
                conf = match[2] + "%";
                confidenceHTML = `<br><span style="font-size: 1.1rem; color: var(--text-muted); font-weight: normal;">Confidence: <span style="color: var(--accent-color); font-weight: 600;">${conf}</span></span>`;
            }
            
            if (heatmapObj && heatmapObj.url) {
                carImagePreview.src = heatmapObj.url;
            } else if (typeof heatmapObj === "string") {
                carImagePreview.src = heatmapObj; 
            }
            
            carImagePreview.style.maxHeight = "250px";
            carImagePreview.style.borderRadius = "10px";
            
            carPredClass.innerHTML = `<span style="color: var(--main-color); font-weight: 800; font-size: 1.8rem;">${label}</span>${confidenceHTML}`;
            
            carLoadingOverlay.style.display = 'none';
            carPredictionResult.style.display = 'flex';
            
        } catch (error) {
            console.error("Error during Gradio API inference:", error);
            
            carLoadingOverlay.style.display = 'none';
            carPredictionResult.style.display = 'flex';
            carPredClass.innerHTML = "AI service temporarily unavailable. Please try again later.";
            carPredClass.style.color = "red";
            carPredClass.style.fontSize = "1.2rem";
        }
    }
});

// ----------------------------------------------------
// AI Chatbot Widget Logic
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const chatbotToggler = document.getElementById('chatbot-toggler');
    const chatbotContainer = document.getElementById('chatbot-container');
    const closeChatbot = document.getElementById('close-chatbot');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatInput = document.getElementById('chat-input');
    const chatbotMessages = document.getElementById('chatbot-messages');

    if (!chatbotToggler) return;

    // Toggle Chatbot Visibility
    chatbotToggler.addEventListener('click', () => {
        chatbotContainer.classList.toggle('active');
        if (chatbotContainer.classList.contains('active')) {
            triggerLivelyAction('waving'); // Wave hello!
            setTimeout(() => {
                chatInput.focus();
            }, 300);
        }
    });

    closeChatbot.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
    });

    // Handle Sending Message
    sendChatBtn.addEventListener('click', handleUserMessage);

    // Global function for "Enter" keypress in HTML
    window.handleChatKeyPress = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUserMessage();
        }
    };

    // Global function for suggested prompt clicks
    window.sendSuggestedMessage = function (text) {
        chatInput.value = text;

        // Remove the suggestion pills so they don't clog up the chat history
        const suggestionsDivs = document.querySelectorAll('.chat-suggestions');
        suggestionsDivs.forEach(div => div.remove());

        handleUserMessage();
    };

    const allPrompts = [
        "What projects have you built?",
        "Tell me about the Waste Classification AI",
        "What is the AI Revenue Intelligence Platform?",
        "Explain the CRM Business Trend Analysis",
        "What machine learning algorithms do you use?",
        "What BI tools are you proficient in?",
        "What computer vision frameworks do you know?",
        "How do your projects solve real business problems?",
        "Summarize your technical skills"
    ];

    let isFirstSuggestionDisplay = true;

    function appendSuggestions() {
        let selectedPrompts = [];

        let availablePrompts = [...allPrompts];

        if (isFirstSuggestionDisplay) {
            selectedPrompts.push("Why should I hire Gokul?");
            isFirstSuggestionDisplay = false;
        }

        // Randomly pick remaining prompts to make 3 total
        while (selectedPrompts.length < 3) {
            const randomIndex = Math.floor(Math.random() * availablePrompts.length);
            const prompt = availablePrompts.splice(randomIndex, 1)[0];
            if (!selectedPrompts.includes(prompt)) {
                selectedPrompts.push(prompt);
            }
        }

        // Shuffle the final array so the hire question isn't always aggressively first
        for (let i = selectedPrompts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedPrompts[i], selectedPrompts[j]] = [selectedPrompts[j], selectedPrompts[i]];
        }

        let suggestionsHTML = "";
        selectedPrompts.forEach(prompt => {
            suggestionsHTML += `<span class="suggestion-pill" onclick="sendSuggestedMessage('${prompt.replace(/'/g, "\\'")}')">${prompt}</span>\n`;
        });

        const div = document.createElement("div");
        div.className = "chat-suggestions";
        div.innerHTML = suggestionsHTML;
        chatbotMessages.appendChild(div);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function handleUserMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Remove any existing suggestions if the user typed a custom message
        const suggestionsDivs = document.querySelectorAll('.chat-suggestions');
        suggestionsDivs.forEach(div => div.remove());

        // Display user message
        appendMessage(message, "user-msg");
        chatInput.value = "";

        // Generate Bot Response based on Keywords
        const floatingRobot = document.querySelector('.floating-robot');
        if (floatingRobot) floatingRobot.classList.add('thinking');

        setTimeout(() => {
            const botResponse = getBotResponse(message.toLowerCase());
            appendMessage(botResponse, "bot-msg");
            appendSuggestions(); // repeatedly show options
            if (floatingRobot) floatingRobot.classList.remove('thinking');
        }, 1200); // Simulate "thinking" delay
    }

    function appendMessage(text, className) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("chat-msg", className);

        if (className === "bot-msg") {
            msgDiv.innerHTML = `
                <img src="bot-avatar.jpg" alt="Bot" class="bot-avatar-msg">
                <div class="msg-content">${text}</div>
            `;
        } else {
            msgDiv.innerHTML = text; // User message, no avatar
        }

        chatbotMessages.appendChild(msgDiv);

        // Auto-scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Keyword matching logic
    function getBotResponse(input) {
        // Freelance & Hiring
        if (input.includes("freelance") || input.includes("fiverr") || input.includes("upwork") || input.includes("hire") || input.includes("contract")) {
            return `<b>Available for Freelance!</b><br>
                Gokul is currently accepting freelance analytics and AI projects. You can hire him directly through his:
                <ul>
                    <li><a href="https://www.upwork.com/freelancers/~015c907012fb1824d9" target="_blank" style="color:#00e0ff;">Upwork Profile</a></li>
                    <li><a href="https://www.fiverr.com/gokulkannan0078" target="_blank" style="color:#00e0ff;">Fiverr Profile</a></li>
                </ul>
                Or simply email him at <b>gokulkannan0078@gmail.com</b>!`;
        }

        // Services Overview
        if (input.includes("service") || input.includes("can you do") || input.includes("help") || input.includes("dashboard")) {
            return `<b>What Gokul Can Do For You:</b><br>
                <ul>
                    <li><b>Clean & Prepare Data:</b> Structuring messy data for reporting.</li>
                    <li><b>Build Power BI Dashboards:</b> Interactive executive KPI tracking.</li>
                    <li><b>Analyze & Give Insights:</b> Finding trends and business advice.</li>
                    <li><b>Create AI Solutions:</b> Advanced ML models for prediction/forecasting.</li>
                </ul>`;
        }

        // Experience & Internships
        if (input.includes("experience") || input.includes("intern") || input.includes("work history") || input.includes("job")) {
            return `<b>Recent Experience:</b><br>
                Gokul recently served as a Data Science Intern where he built an end-to-end CRM Analytics dashboard using Power BI. He analyzed over 19K+ live leads, tracked sales funnel drop-offs, and engineered data via Python (Pandas) to directly improve ROI!`;
        }

        // Project 1: Revenue Intelligence
        if (input.includes("revenue") || input.includes("platform") || input.includes("saas") || input.includes("forecast")) {
            return `<b>AI Revenue Intelligence Platform</b>:<br>
                <ul>
                    <li>Machine learning based revenue prediction system</li>
                    <li>Connected to a live FastAPI & React Dashboard</li>
                    <li>Analyzes a real 20,000+ row B2B SaaS dataset</li>
                    <li>Calculates live MRR, Churn Trends, and ARPU Growth</li>
                </ul>`;
        }

        // Project 2: Waste Classification
        if (input.includes("waste") || input.includes("classif") || input.includes("cnn") || input.includes("image")) {
            return `<b>Waste Classification AI</b>:<br>
                <ul>
                    <li>Computer vision model for waste classification</li>
                    <li>Built using CNN, PyTorch, and ResNet18</li>
                    <li>Supports 5 categories: Plastic, Paper, Organic, Metal, and E-waste</li>
                </ul>`;
        }

        // Project 3: CRM Trend Analysis
        if (input.includes("crm") || input.includes("trend") || input.includes("netcom") || (input.includes("power") && input.includes("bi"))) {
            return `<b>Netcom CRM Business Trend Analysis</b>:<br>
                <ul>
                    <li>Business intelligence analyzing massive CRM datasets</li>
                    <li>Built using Power BI, DAX, and Python</li>
                    <li>Identifies key customer trends and lead performance</li>
                </ul>`;
        }

        // General Projects overview
        if (input.includes("project") || input.includes("build") || input.includes("portfolio")) {
            return "I have built several data science projects! My top three are:<ul><li><b>AI Revenue Platform</b> (ML)</li><li><b>Waste Classification AI</b> (Computer Vision)</li><li><b>Netcom CRM Analysis</b> (Power BI)</li></ul>Which one would you like to know more about?";
        }

        // Skills & Technologies
        if (input.includes("tech") || input.includes("skill") || input.includes("use") || input.includes("tools") || input.includes("python") || input.includes("sql")) {
            return "Gokul's expertise encompasses:<ul><li><b>Programming:</b> Python, SQL, JavaScript</li><li><b>Machine Learning:</b> Scikit-Learn, XGBoost, CNNs</li><li><b>Web & Deployment:</b> React, FastAPI, Docker</li><li><b>BI & Viz:</b> Power BI, Pandas</li></ul>";
        }

        // Website features
        if (input.includes("website") || input.includes("background") || input.includes("seo") || input.includes("domain")) {
            return "Gokul built this entire highly-SEO optimized portfolio at <b>www.gokulanalytics.online</b>! He recently programmed this premium interactive background particle effect using raw HTML Canvas & Javascript! Pretty cool, right?";
        }

        // Greetings
        if (input.includes("hello") || input.includes("hi") || input.includes("hey") || input === "hi" || input === "hello") {
            return "Hello! I am Gokul's AI assistant on <b>gokulanalytics.online</b>. You can ask me about his Freelance services (Fiverr/Upwork), his Data Analytics projects (PowerBI/ML), or his CRM internship experience! How can I help you today?";
        }

        // Default Fallback
        return "I am Gokul's AI assistant focused on his Data Science portfolio! Please ask me about his <b>Freelance Services</b>, his <b>Data Projects</b> (like the AI Revenue Platform or Power BI CRM), or his <b>Internship Experience</b>!";
    }

    // Lively Bot Actions
    function triggerLivelyAction(action) {
        const floatingRobot = document.querySelector('.floating-robot');
        if (!floatingRobot) return;

        // Remove classes to reset animation
        floatingRobot.classList.remove('jumping', 'waving');
        
        // Force reflow
        void floatingRobot.offsetWidth;

        if (action) {
            floatingRobot.classList.add(action);
        } else {
            // Pick a random action
            const actions = ['jumping', 'waving'];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            floatingRobot.classList.add(randomAction);
        }

        // Remove class after animation finishes (approx 1s)
        setTimeout(() => {
            floatingRobot.classList.remove('jumping', 'waving');
        }, 1500);
    }

    // Set interval for random "lively" idle behaviors
    setInterval(() => {
        if (chatbotContainer.classList.contains('active')) {
            triggerLivelyAction();
        }
    }, 12000); // Every 12 seconds
});

// ----------------------------------------------------
// Typing Animation Setup
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
    const typedTextSpan = document.querySelector(".typed-text");
    const cursorSpan = document.querySelector(".cursor");

    if (typedTextSpan && cursorSpan) {
        const textArray = ["Data Analyst", "Business Analyst"];
        const typingDelay = 100;
        const erasingDelay = 50;
        const newTextDelay = 1000;
        let textArrayIndex = 0;
        let charIndex = 0;

        function type() {
            if (charIndex < textArray[textArrayIndex].length) {
                if(!cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
                typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
                charIndex++;
                setTimeout(type, typingDelay);
            } 
            else {
                cursorSpan.classList.remove("typing");
                setTimeout(erase, newTextDelay);
            }
        }

        function erase() {
            if (charIndex > 0) {
                if(!cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
                typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex-1);
                charIndex--;
                setTimeout(erase, erasingDelay);
            } 
            else {
                cursorSpan.classList.remove("typing");
                textArrayIndex++;
                if(textArrayIndex >= textArray.length) textArrayIndex = 0;
                setTimeout(type, typingDelay + 400);
            }
        }

        setTimeout(type, 250);
    }
});
