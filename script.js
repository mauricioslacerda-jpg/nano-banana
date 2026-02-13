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
    const nsfwToggle = document.getElementById('nsfw-toggle');
    const nsfwCopy = document.getElementById('nsfw-copy');
    const statusPill = document.querySelector('.status-pill');

    const defaultPromptPlaceholder = 'Ex: editorial noturno de banana cromada, chuva fina, neon quente, lente 35mm';
    const nsfwPromptPlaceholder = 'Ex: ensaio boudoir adulto, luz baixa, textura cinematografica, atmosfera erotica';

    const loadingMessagesSafe = [
        'Aquecendo os pixels com carinho...',
        'Caprichando no close e no brilho...',
        'Misturando luz, foco e segundas intencoes...',
        'Montando uma cena para olhar duas vezes...'
    ];

    const loadingMessagesNsfw = [
        'Ativando clima adulto no set...',
        'Lapidando um frame picante e elegante...',
        'Subindo a tensao visual com luz e textura...',
        'Buscando um resultado erotico em tom artistico...'
    ];

    const heatLevels = [
        { limit: 35, label: 'Morno' },
        { limit: 90, label: 'Quente' },
        { limit: Infinity, label: 'Fervendo' }
    ];

    const nsfwPromptDirectives = [
        'adult-only subject',
        'sensual boudoir atmosphere',
        'erotic tone with artistic nudity allowed',
        'no minors',
        'no explicit sexual act',
        'high-end editorial photography style'
    ].join(', ');

    promptInput.addEventListener('input', updatePromptMeta);
    nsfwToggle?.addEventListener('change', syncNsfwMode);
    syncNsfwMode();
    updatePromptMeta();

    teaseChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const suggestion = getChipPrompt(chip);
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
        const finalPrompt = buildPrompt(prompt);

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
                <p>${pickRandom(getLoadingMessages())}</p>
            </div>
        `;

        try {
            const result = await generateImage(apiKey, model, finalPrompt, prompt);
            imageContainer.innerHTML = '';
            imageContainer.appendChild(result);
        } catch (error) {
            console.error('Generation Error:', error);
            imageContainer.innerHTML = `
                <div class="empty-state" style="color: #ffb4a4;">
                    <div class="placeholder-icon small">OPS</div>
                    <p>${formatGenerationError(error)}</p>
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
        const baseHeat = currentHeat ? currentHeat.label : 'Morno';
        promptHeatLabel.textContent = isNsfwEnabled() ? `${baseHeat} +18` : baseHeat;
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

    function isNsfwEnabled() {
        return Boolean(nsfwToggle?.checked);
    }

    function syncNsfwMode() {
        const active = isNsfwEnabled();
        document.body.classList.toggle('nsfw-mode', active);

        if (statusPill) {
            statusPill.textContent = active ? 'modo 18+' : 'modo flerte';
        }

        if (nsfwCopy) {
            nsfwCopy.textContent = active
                ? 'Ligado: clima adulto com erotismo artistico (sem explicito extremo).'
                : 'Desligado: sensual elegante e sugestivo.';
        }

        if (promptInput) {
            promptInput.placeholder = active ? nsfwPromptPlaceholder : defaultPromptPlaceholder;
        }

        updatePromptMeta();
    }

    function getChipPrompt(chip) {
        const safePrompt = chip.dataset.promptSafe || '';
        const nsfwPrompt = chip.dataset.promptNsfw || '';

        if (isNsfwEnabled()) {
            return nsfwPrompt || safePrompt;
        }

        return safePrompt || nsfwPrompt;
    }

    function getLoadingMessages() {
        return isNsfwEnabled() ? loadingMessagesNsfw : loadingMessagesSafe;
    }

    function buildPrompt(promptText) {
        if (!isNsfwEnabled()) {
            return promptText;
        }

        return `${promptText}. ${nsfwPromptDirectives}`;
    }

    function formatGenerationError(error) {
        const baseMessage = error instanceof Error ? error.message : 'Erro inesperado.';

        if (isNsfwEnabled() && /safety|blocked|policy|prohibited/i.test(baseMessage)) {
            return 'O modelo bloqueou o pedido por politica de seguranca. Reduza o nivel explicito do prompt.';
        }

        return baseMessage;
    }

    async function generateImage(apiKey, model, promptText, imageAltText = promptText) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText }
                ]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
            ]
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
        console.log('API Response:', JSON.stringify(data, null, 2));

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            const feedback = data.promptFeedback;
            if (feedback?.blockReason) {
                const reason = feedback.blockReason;
                const ratings = (feedback.safetyRatings || [])
                    .filter(r => r.probability !== 'NEGLIGIBLE')
                    .map(r => `${r.category}: ${r.probability}`)
                    .join(', ');
                throw new Error(
                    `Prompt bloqueado pelo filtro de seguranca (${reason}).${ratings ? ` Categorias: ${ratings}` : ''} Tente reformular o prompt.`
                );
            }

            // Check if candidate was blocked due to finish reason
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                throw new Error(
                    `Geracao interrompida: ${candidate.finishReason}. Tente um prompt diferente.`
                );
            }

            throw new Error('Nenhuma imagem retornada. Teste um prompt mais claro.');
        }

        const parts = data.candidates[0].content.parts;
        const container = document.createDocumentFragment();

        let foundImage = false;

        for (const part of parts) {
            if (part.inlineData) {
                const img = document.createElement('img');
                img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                img.alt = imageAltText;
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
