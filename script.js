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

        setLoading(true);
        imageContainer.innerHTML = `
            <div class="empty-state">
                <div class="placeholder-icon" style="font-size: 2rem;">✨</div>
                <p>Dreaming up your image...</p>
            </div>
        `;

        try {
            const result = await generateImage(apiKey, model, prompt);
            imageContainer.innerHTML = '';
            imageContainer.appendChild(result);
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
        // Official Gemini API: use generateContent endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText }
                ]
            }],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"]
            }
        };

        console.log(`Calling API: ${model}:generateContent`);

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
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        // Parse response: candidates[0].content.parts[]
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error("No candidates returned. The prompt may have been blocked by safety filters.");
        }

        const parts = data.candidates[0].content.parts;
        const container = document.createDocumentFragment();

        let foundImage = false;
        for (const part of parts) {
            if (part.inlineData) {
                // Image part
                const img = document.createElement('img');
                img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                img.alt = promptText;
                container.appendChild(img);
                foundImage = true;
            } else if (part.text) {
                // Text part (sometimes the model returns text alongside the image)
                const p = document.createElement('p');
                p.textContent = part.text;
                p.style.color = 'var(--text-secondary)';
                p.style.marginTop = '1rem';
                p.style.fontSize = '0.9rem';
                container.appendChild(p);
            }
        }

        if (!foundImage) {
            throw new Error("No image was generated. Try a different prompt or check safety filters.");
        }

        return container;
    }

    // Debug: double-click logo to list available models
    window.checkModels = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("Enter your API Key first, then double-click the logo.");
            return;
        }
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (data.models) {
                console.group("Available Gemini Models:");
                console.table(data.models.map(m => ({
                    name: m.name,
                    methods: (m.supportedGenerationMethods || []).join(', ')
                })));
                console.groupEnd();
                alert(`Found ${data.models.length} models. Check console (F12).`);
            }
        } catch (e) {
            console.error("Failed to list models:", e);
        }
    };
    document.querySelector('.logo').addEventListener('dblclick', window.checkModels);
});
