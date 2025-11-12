document.addEventListener('DOMContentLoaded', () => {
    let selectedModel = null;
    let selectedFile = null; 
    const historyData = new Map();

    // Common DOM references
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const nextStep2Btn = document.getElementById('next-step2');
    const imagePreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');

    // Step navigation functions
    function showStep(step) {
        currentStep = step;
        
        // Hide all content sections with fade out
        document.querySelectorAll('.step-content').forEach(content => {
            content.style.opacity = '0';
            content.classList.add('hidden');
        });
        
        // Show target content with fade in
        const targetContent = document.querySelector(`#step${step}-content`);
        targetContent.classList.remove('hidden');
        setTimeout(() => {
            targetContent.style.opacity = '1';
        }, 50);
        
        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            const indicatorStep = parseInt(indicator.dataset.step);
            const span = indicator.querySelector('span');
            
            if (indicatorStep < step) {
                indicator.style.background = '#6968ae';
                span.classList.add('text-white');
                indicator.classList.add('shadow-lg');
            } else if (indicatorStep === step) {
                indicator.style.background = '#6968ae';
                span.classList.add('text-white');
                indicator.classList.add('shadow-lg');
            } else {
                indicator.style.background = '#f3f4f6';
                span.classList.remove('text-white');
                indicator.classList.remove('shadow-lg');
            }
            
            // Update step text color
            const stepText = indicator.parentElement.querySelector('span:not([class*="text-lg"])');
            if (indicatorStep <= step) {
                stepText.classList.remove('text-gray-400');
                stepText.classList.add('text-[#6968ae]');
            } else {
                stepText.classList.add('text-gray-400');
                stepText.classList.remove('text-[#6968ae]');
            }
        });
        
        // Update progress lines with animation
        const progressLines = document.querySelectorAll('.progress-line');
        progressLines.forEach((line, index) => {
            if (index < step - 1) {
                line.style.transform = 'scaleX(1)';
            } else {
                line.style.transform = 'scaleX(0)';
            }
        });
    }

    // Model selection
    const modelOptions = document.querySelectorAll('.model-option');
    const modelInputs = document.querySelectorAll('input[name="model"]');

    function updateModelSelection(option) {
        if (!option) return;

        const input = option.querySelector('input[type="radio"]');
        const inner = option.querySelector('.radio-inner');
        const outer = option.querySelector('.radio-outer');
        const card = option.querySelector('.model-card');

        if (!input || !inner || !card) {
            return;
        }

        selectedModel = input.value;
        input.checked = true;
        document.getElementById('next-step1').disabled = false;
        document.getElementById('next-step1').classList.remove('cursor-not-allowed', 'bg-gray-400');
        document.getElementById('next-step1').style.backgroundColor = '#6968ae';
 
        // Reset all options
        modelOptions.forEach(opt => {
            const optInner = opt.querySelector('.radio-inner');
            const optOuter = opt.querySelector('.radio-outer');
            const optCard = opt.querySelector('.model-card');
            opt.setAttribute('aria-checked', 'false');
            opt.classList.remove('selected');
            
            if (optInner) {
                optInner.style.width = '0';
                optInner.style.height = '0';
            }
            if (optOuter) {
                optOuter.classList.remove('border-[#6968ae]');
                optOuter.classList.add('border-gray-400');
            }
            if (optCard) {
                optCard.classList.remove('border-[#6968ae]', 'shadow-xl');
                optCard.classList.add('border-gray-200');
            }
        });

        // Activate selected option
        option.setAttribute('aria-checked', 'true');
        option.classList.add('selected');
        inner.style.width = '100%';
        inner.style.height = '100%';
        if (outer) {
            outer.classList.remove('border-gray-400');
            outer.classList.add('border-[#6968ae]');
        }
        card.classList.remove('border-gray-200');
        card.classList.add('border-[#6968ae]', 'shadow-xl');

        // Reset any previously selected file when model changes
        selectedFile = null;
        fileInput.value = '';
        filePreview.classList.add('hidden');
        imagePreview.classList.add('hidden');
        videoPreview.classList.add('hidden');
        fileName.textContent = '';
        nextStep2Btn.disabled = true;
        updateUploadButton();
    }

    modelOptions.forEach(option => {
        option.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const input = option.querySelector('input[type="radio"]');
                if (input) {
                    input.checked = true;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });

    modelInputs.forEach(input => {
        input.addEventListener('change', () => {
            const option = input.closest('.model-option');
            updateModelSelection(option);
        });
    });

    // Allow clicking the whole card/label to select the model (helps when input is hidden)
    modelOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            // If user clicked a control inside that already handles selection, let it bubble
            const input = option.querySelector('input[type="radio"]');
            if (input) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    // Initialize model visuals on page load. If no radio is checked, respect any
    // pre-set aria-checked="true" on the label (this handles the DF-1 case in HTML).
    function initModelSelection() {
        const checkedInput = document.querySelector('input[name="model"]:checked');
        if (checkedInput) {
            const option = checkedInput.closest('.model-option');
            updateModelSelection(option);
            return;
        }

        // Fallback: look for a label that was pre-marked with aria-checked="true"
        const preselected = document.querySelector('.model-option[aria-checked="true"]');
        if (preselected) {
            const input = preselected.querySelector('input[type="radio"]');
            if (input) {
                input.checked = true;
                updateModelSelection(preselected);
            }
        }
    }

    // Step 1 navigation
    document.getElementById('next-step1').addEventListener('click', () => {
        showStep(2);
        const modelSummary = selectedModel === 'ac-1'
            ? 'AC-1 · AI Generated Image Detection'
            : 'DF-1 · Deepfake & Face Swap Detection';
        document.getElementById('selected-model-display').textContent = modelSummary;
        const acceptType = selectedModel === 'ac-1' ? 'image/*' : 'video/*';
        fileInput.setAttribute('accept', acceptType);
    });

    // View History button
    document.getElementById('view-history-btn').addEventListener('click', () => {
        if (historyData.size > 0) {
            showStep(3);
        } else {
            alert('No processing history available yet.');
        }
    });

    // Step 2 navigation
    document.getElementById('back-step2').addEventListener('click', () => {
        showStep(1);
    });

    document.getElementById('change-model').addEventListener('click', () => {
        showStep(1);
    });

    // File upload handling
    browseBtn.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            // Check if file type matches selected model
            if ((selectedModel === 'ac-1' && !isImage) || (selectedModel === 'df-1' && !isVideo)) {
                alert(`Please select a ${selectedModel === 'ac-1' ? 'image' : 'video'} file for ${selectedModel}`);
                return;
            }

            selectedFile = file;
            fileName.textContent = file.name;
            filePreview.classList.remove('hidden');

            if (isImage) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.classList.remove('hidden');
                videoPreview.classList.add('hidden');
            } else if (isVideo) {
                videoPreview.src = URL.createObjectURL(file);
                videoPreview.classList.remove('hidden');
                imagePreview.classList.add('hidden');
            }

            updateUploadButton();
        }
    }

    function updateUploadButton() {
        const canProceed = Boolean(selectedModel && selectedFile);
        nextStep2Btn.disabled = !canProceed;
        nextStep2Btn.classList.toggle('btn-disabled', !canProceed);
        
        if (canProceed) {
            nextStep2Btn.setAttribute('aria-disabled', 'false');
            nextStep2Btn.classList.remove('cursor-not-allowed', 'bg-gray-400');
            nextStep2Btn.style.backgroundColor = '#6968ae';
        } else {
            nextStep2Btn.setAttribute('aria-disabled', 'true');
            nextStep2Btn.classList.add('cursor-not-allowed', 'bg-gray-400');
            nextStep2Btn.style.backgroundColor = '';
        }
    }
 
    document.getElementById('back-step3').addEventListener('click', () => {
        showStep(2);
    });

    document.getElementById('process-new').addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        filePreview.classList.add('hidden');
        imagePreview.classList.add('hidden');
        videoPreview.classList.add('hidden');
        fileName.textContent = '';
        nextStep2Btn.disabled = true;
        updateUploadButton();
        showStep(1);
    });
 
    document.getElementById('next-step2').addEventListener('click', async () => {
        if (!selectedFile || !selectedModel) return;

        showStep(3);
        document.getElementById('processing-file-name').textContent = selectedFile.name;
        document.getElementById('process-progress').style.width = '0%';

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('model', selectedModel);
        
        // Check if heatmaps are requested
        const includeHeatmaps = document.getElementById('includeHeatmaps').checked;
        formData.append('outputType', includeHeatmaps ? 'result + heatmaps' : 'result');

        try {
            document.getElementById('next-step2').disabled = true;
            document.getElementById('process-progress').style.width = '30%';
            
            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            document.getElementById('process-progress').style.width = '60%';

            const result = await response.json();
            if (response.ok) {
                document.getElementById('process-progress').style.width = '100%';
                addToHistory(result);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload and process file: ' + error.message);
            document.getElementById('process-progress').style.width = '0%';
        } finally {
            document.getElementById('next-step2').disabled = false;
        }
    });
 
    const history = document.getElementById('history');
    
    // Load history from server on page load
    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            if (response.ok) {
                const jobs = await response.json();
                jobs.forEach(job => {
                    historyData.set(job.id, job);
                });
                if (jobs.length > 0) {
                    document.getElementById('history-section').classList.remove('hidden');
                    updateHistoryView();
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    function addToHistory(item) {
        historyData.set(item.id, item);
        document.getElementById('history-section').classList.remove('hidden');
        updateHistoryView();
        listenForUpdates(item.id);
    }

    function updateHistoryView() {
        history.innerHTML = '';
        [...historyData.values()].reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            // Determine display status based on actual status and results
            let displayStatus = item.status;
            let statusClass = item.status.toLowerCase();
            
            // Check if job has error results even if marked as COMPLETED
            if (item.status === 'COMPLETED' && item.result) {
                if (item.result.status === 'error' || item.result.errors) {
                    displayStatus = 'ERROR';
                    statusClass = 'error';
                }
            }
            
            div.innerHTML = `
                <div>
                    <div class="font-medium">${item.fileName}</div>
                    <div class="text-sm text-gray-500">
                        ${new Date(item.timestamp).toLocaleString()} · 
                        <span class="text-gray-700">${item.model.toUpperCase()}</span>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">
                    ${displayStatus}
                </span>
            `;
            div.addEventListener('click', () => showResults(item));
            history.appendChild(div);
        });
    }
 
    const modal = document.getElementById('resultsModal');
    const modalContent = document.getElementById('resultContent');
    const modalClose = document.querySelector('.modal-close');

    modalClose.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    async function showResults(item) {
        // Determine actual status
        let actualStatus = item.status;
        let hasErrors = false;
        let errorMessages = [];
        
        if (item.status === 'COMPLETED' && item.result) {
            if (item.result.status === 'error' || item.result.errors) {
                actualStatus = 'ERROR';
                hasErrors = true;
                errorMessages = item.result.errors || [];
            }
        } else if (item.error) {
            hasErrors = true;
            errorMessages = [item.error];
        }
        
        // Fetch heatmaps if available
        let heatmapsHtml = '';
        if (item.hasHeatmaps && item.status === 'COMPLETED' && !hasErrors) {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        const isVideo = item.model === 'df-1';
                        heatmapsHtml = `
                            <div>
                                <h4 class="font-medium text-gray-700">Heatmaps (${data.heatmaps.length})</h4>
                                <div class="grid grid-cols-2 gap-3 mt-2 max-h-96 overflow-auto">
                                    ${data.heatmaps.map(hm => `
                                        <div class="border border-gray-200 rounded overflow-hidden">
                                            ${isVideo ? `
                                                <video controls class="w-full">
                                                    <source src="${hm.url}" type="video/mp4">
                                                </video>
                                            ` : `
                                                <img src="${hm.url}" alt="${hm.filename}" class="w-full h-auto">
                                            `}
                                            <p class="text-xs text-gray-600 p-2 bg-gray-50">${hm.filename}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error('Failed to load heatmaps:', error);
            }
        }
        
        modalContent.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-medium text-gray-700">File Name</h4>
                    <p class="text-gray-900">${item.fileName}</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-700">Model</h4>
                    <p class="text-gray-900">${item.model.toUpperCase()}</p>
                </div>
                ${item.resultFolder ? `
                    <div>
                        <h4 class="font-medium text-gray-700">Result Folder</h4>
                        <p class="text-gray-900 font-mono text-sm">${item.resultFolder}</p>
                    </div>
                ` : ''}
                <div>
                    <h4 class="font-medium text-gray-700">Status</h4>
                    <p class="text-gray-900">
                        <span class="status-badge ${actualStatus.toLowerCase()}">${actualStatus}</span>
                    </p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-700">Timestamp</h4>
                    <p class="text-gray-900">${new Date(item.timestamp).toLocaleString()}</p>
                </div>
                ${hasErrors ? `
                    <div>
                        <h4 class="font-medium text-red-600">Errors</h4>
                        <div class="bg-red-50 border border-red-200 rounded p-3 mt-2">
                            ${errorMessages.map(err => `<p class="text-red-700 text-sm">• ${err}</p>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${item.result && !hasErrors ? `
                    <div>
                        <h4 class="font-medium text-gray-700">Results</h4>
                        <div class="bg-gray-50 border border-gray-200 rounded p-4 mt-2">
                            <pre class="text-sm overflow-auto max-h-96 text-gray-800">${JSON.stringify(item.result, null, 2)}</pre>
                        </div>
                    </div>
                ` : ''}
                ${heatmapsHtml}
                ${item.status === 'PROCESSING' ? `
                    <div class="bg-blue-50 border border-blue-200 rounded p-3">
                        <p class="text-blue-700 text-sm">
                            <span class="inline-block animate-pulse mr-2">●</span>
                            This job is currently being processed...
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
        modal.classList.remove('hidden');
    } 
    function listenForUpdates(jobId) {
        const ws = new WebSocket(`ws://${window.location.host}/ws`);
        
        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            if (update.id === jobId) {
                const item = historyData.get(jobId);
                if (item) {
                    Object.assign(item, update);
                    updateHistoryView();
                    if (update.status === 'COMPLETED' || update.status === 'ERROR') {
                        ws.close();
                    }
                }
            }
        };

        ws.onerror = () => {
            console.error('WebSocket error occurred');
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }
 
    showStep(1);
    updateUploadButton();
    initModelSelection(); 
    loadHistory(); 
});