document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const imageContainer = document.getElementById('image-container');
    const apiKeyInput = document.getElementById('api-key');
    const promptInput = document.getElementById('prompt');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');
    const promptLengthLabel = document.getElementById('prompt-length');
    const promptHeatLabel = document.getElementById('prompt-heat');
    const teaseChips = Array.from(document.querySelectorAll('.chip'));

    const loadingMessages = [
        'Aquecendo os pixels com carinho...',
        'Caprichando no close e no brilho...',
        'Misturando luz, foco e segundas intencoes...',
        'Montando uma cena para olhar duas vezes...'
    ];

    const heatLevels = [
        { limit: 35, label: 'Morno' },
        { limit: 90, label: 'Quente' },
        { limit: Infinity, label: 'Fervendo' }
    ];

    promptInput.addEventListener('input', updatePromptMeta);
    updatePromptMeta();

    teaseChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const suggestion = chip.dataset.prompt;
            if (!suggestion) {
                return;
            }

            promptInput.value = suggestion;
            updatePromptMeta();
            promptInput.focus();

            const cursorIndex = promptInput.value.length;
            promptInput.setSelectionRange(cursorIndex, cursorIndex);
        });
    });

    generateBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const prompt = promptInput.value.trim();
        const model = document.querySelector('input[name="model"]:checked').value;

        if (!apiKey) {
            alert('Sem chave nao rola. Cole sua Gemini API Key primeiro.');
            apiKeyInput.focus();
            return;
        }

        if (!prompt) {
            alert('Sem prompt sem quimica. Escreva o que voce quer ver.');
            promptInput.focus();
            return;
        }

        setLoading(true);
        imageContainer.innerHTML = `
            <div class="empty-state">
                <div class="placeholder-icon small">LAB</div>
                <p>${pickRandom(loadingMessages)}</p>
            </div>
        `;

        try {
            const result = await generateImage(apiKey, model, prompt);
            imageContainer.innerHTML = '';
            imageContainer.appendChild(result);
        } catch (error) {
            console.error('Generation Error:', error);
            imageContainer.innerHTML = `
                <div class="empty-state" style="color: #ffb4a4;">
                    <div class="placeholder-icon small">OPS</div>
                    <p>${error.message}</p>
                    <p class="result-copy">Confira a chave e tente um prompt diferente.</p>
                </div>
            `;
        } finally {
            setLoading(false);
        }
    });

    function updatePromptMeta() {
        const trimmedLength = promptInput.value.trim().length;

        if (promptLengthLabel) {
            promptLengthLabel.textContent = `${trimmedLength} caracteres`;
        }

        if (!promptHeatLabel) {
            return;
        }

        const currentHeat = heatLevels.find((level) => trimmedLength <= level.limit);
        promptHeatLabel.textContent = currentHeat ? currentHeat.label : 'Morno';
    }

    function setLoading(isLoading) {
        if (isLoading) {
            generateBtn.disabled = true;
            generateBtn.setAttribute('aria-busy', 'true');
            btnText.classList.add('invisible');
            loader.classList.remove('hidden');
            return;
        }

        generateBtn.disabled = false;
        generateBtn.removeAttribute('aria-busy');
        btnText.classList.remove('invisible');
        loader.classList.add('hidden');
    }

    function pickRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    async function generateImage(apiKey, model, promptText) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText }
                ]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                throw new Error(`Falha na requisicao (${response.status}).`);
            }

            throw new Error(errorData.error?.message || `Falha na requisicao (${response.status}).`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Nenhuma imagem retornada. Teste um prompt mais claro.');
        }

        const parts = data.candidates[0].content.parts;
        const container = document.createDocumentFragment();

        let foundImage = false;

        for (const part of parts) {
            if (part.inlineData) {
                const img = document.createElement('img');
                img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                img.alt = promptText;
                container.appendChild(img);
                foundImage = true;
            } else if (part.text) {
                const p = document.createElement('p');
                p.textContent = part.text;
                p.className = 'result-copy';
                container.appendChild(p);
            }
        }

        if (!foundImage) {
            throw new Error('A resposta veio sem imagem. Ajuste o prompt e tente de novo.');
        }

        return container;
    }

    window.checkModels = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Cole sua API Key e tente novamente.');
            return;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (data.models) {
                console.group('Modelos Gemini disponiveis:');
                console.table(data.models.map((modelData) => ({
                    name: modelData.name,
                    methods: (modelData.supportedGenerationMethods || []).join(', ')
                })));
                console.groupEnd();
                alert(`Achei ${data.models.length} modelos. Veja o console (F12).`);
            }
        } catch (error) {
            console.error('Failed to list models:', error);
        }
    };

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('dblclick', window.checkModels);
    }
});
