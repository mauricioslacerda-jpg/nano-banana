document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const imageContainer = document.getElementById('image-container');
    const apiKeyInput = document.getElementById('api-key');
    const promptInput = document.getElementById('prompt');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    generateBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const prompt = promptInput.value.trim();
        const model = document.querySelector('input[name="model"]:checked').value;

        // Validation
        if (!apiKey) {
            alert('Please enter your Gemini API Key first!');
            apiKeyInput.focus();
            return;
        }

        if (!prompt) {
            alert('Please describe the image you want to generate!');
            promptInput.focus();
            return;
        }

        // Set Loading State
        setLoading(true);
        imageContainer.innerHTML = `
            <div class="empty-state">
                <div class="placeholder-icon" style="font-size: 2rem;">✨</div>
                <p>Dreaming up your image...</p>
            </div>
        `;

        try {
            const result = await generateImage(apiKey, model, prompt);

            if (result.error) {
                throw new Error(result.error.message || 'Unknown error occurred');
            }

            // Display Image
            const imageBase64 = result.images[0].imageBytes;
            if (!imageBase64) {
                throw new Error("No image data returned from API.");
            }

            const img = document.createElement('img');
            img.src = `data:image/png;base64,${imageBase64}`;
            img.alt = prompt;

            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);

        } catch (error) {
            console.error('Generation Error:', error);
            imageContainer.innerHTML = `
                <div class="empty-state" style="color: #ef4444;">
                    <div class="placeholder-icon">⚠️</div>
                    <p>Error: ${error.message}</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">Check your API key and try again.</p>
                </div>
            `;
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            generateBtn.disabled = true;
            btnText.classList.add('invisible');
            loader.classList.remove('hidden');
        } else {
            generateBtn.disabled = false;
            btnText.classList.remove('invisible');
            loader.classList.add('hidden');
        }
    }

    async function generateImage(apiKey, model, promptText) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

        const payload = {
            instances: [
                {
                    prompt: promptText
                }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1"
            }
        };

        console.log(`Calling API: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Response:", errorData);
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        // Imagen response structure: { predictions: [ { bytesBase64Encoded: "..." } ] }
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            return {
                images: [{ imageBytes: data.predictions[0].bytesBase64Encoded }]
            };
        }

        // Safety filter check or other empty states
        if (data.predictions && data.predictions[0] && !data.predictions[0].bytesBase64Encoded) {
            console.warn("Prediction returned but no image bytes:", data.predictions[0]);
            throw new Error("Image generation failed (likely safety filters). Try a different prompt.");
        }

        throw new Error("Unexpected response structure from API");
    }

    // Debug Utility: Log available models (double-click logo to trigger)
    window.checkModels = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("Enter your API Key first, then double-click the logo again.");
            return;
        }

        console.log("Checking available models...");
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (data.models) {
                console.group("Available Gemini Models:");
                const imageModels = data.models.filter(m =>
                    (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("predict")) ||
                    m.name.includes("image") ||
                    m.name.includes("imagen")
                );
                console.table(imageModels.map(m => ({ name: m.name, methods: (m.supportedGenerationMethods || []).join(', ') })));
                console.log("All Models:", data.models);
                console.groupEnd();
                alert(`Found ${data.models.length} total models, ${imageModels.length} image-related. Check console (F12) for details.`);
            } else {
                console.error("No models found or error:", data);
                alert("Could not list models. Check console for details.");
            }
        } catch (e) {
            console.error("Failed to list models:", e);
        }
    };

    document.querySelector('.logo').addEventListener('dblclick', window.checkModels);
});
