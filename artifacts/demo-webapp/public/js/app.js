document.addEventListener('DOMContentLoaded', () => {
    let selectedModel = null;
    let selectedFile = null; 
    let currentStep = 1;
    const historyData = new Map();

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const nextStep2Btn = document.getElementById('next-step2-top');
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
        let targetContent;
        if (step === 'history') {
            targetContent = document.querySelector('#history-content');
        } else if (step === 'result-detail') {
            targetContent = document.querySelector('#result-detail-content');
        } else {
            targetContent = document.querySelector(`#step${step}-content`);
        }
        
        if (targetContent) {
            targetContent.classList.remove('hidden');
            setTimeout(() => {
                targetContent.style.opacity = '1';
            }, 50);
        }
        
        // Only update step indicators for numbered steps
        if (typeof step === 'number') {
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

    // View History button handlers
    document.getElementById('view-history-btn-step1').addEventListener('click', () => {
        if (historyData.size > 0) {
            showHistoryPage();
        } else {
            alert('No processing history available yet.');
        }
    });
    
    // Only add listener if the button exists
    const viewHistoryBtnStep3 = document.getElementById('view-history-btn-step3');
    if (viewHistoryBtnStep3) {
        viewHistoryBtnStep3.addEventListener('click', () => {
            showHistoryPage();
        });
    }
    
    document.getElementById('close-history').addEventListener('click', () => {
        stopHeatmapAutoRefresh();
        showStep(1);
    });
    
    document.getElementById('close-result-detail').addEventListener('click', () => {
        stopHeatmapAutoRefresh();
        showHistoryPage();
    });
    
    document.getElementById('back-to-history-btn').addEventListener('click', () => {
        stopHeatmapAutoRefresh();
        showHistoryPage();
    });
    
    document.getElementById('process-new-from-history').addEventListener('click', () => {
        stopHeatmapAutoRefresh();
        resetForNewProcess();
        showStep(1);
    });

    // Step 2 navigation (top button only)
    document.getElementById('back-step2-top').addEventListener('click', () => {
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

    // Process New button handler
    document.getElementById('process-new').addEventListener('click', () => {
        resetForNewProcess();
        showStep(1);
    });
    
    // View History button handler
    document.getElementById('view-history-btn').addEventListener('click', () => {
        showHistoryPage();
    });
    
    function resetForNewProcess() {
        // Stop any active auto-refresh
        stopHeatmapAutoRefresh();
        
        // Reset state
        selectedFile = null;
        currentJobId = null;
        fileInput.value = '';
        filePreview.classList.add('hidden');
        imagePreview.classList.add('hidden');
        videoPreview.classList.add('hidden');
        fileName.textContent = '';
        nextStep2Btn.disabled = true;
        updateUploadButton();
        
        // Hide results view and show processing status
        document.getElementById('results-view').classList.add('hidden');
        document.getElementById('processing-status').classList.remove('hidden');
        
        // Hide action buttons
        document.getElementById('view-history-btn').classList.add('hidden');
        document.getElementById('process-new').classList.add('hidden');
    }
 
    let currentJobId = null;
    
    // Handle both next buttons (top and bottom)
    function handleNextStep2Click() {
        return async () => {
            if (!selectedFile || !selectedModel) return;

            showStep(3);
            document.getElementById('processing-file-name').textContent = selectedFile.name;
            document.getElementById('process-progress').style.width = '0%';
            document.getElementById('processing-status').classList.remove('hidden');
            document.getElementById('results-view').classList.add('hidden');
            
            // Hide action buttons during processing
            document.getElementById('view-history-btn').classList.add('hidden');
            document.getElementById('process-new').classList.add('hidden');

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('model', selectedModel);
            
            // Check if heatmaps are requested
            const includeHeatmaps = document.getElementById('includeHeatmaps').checked;
            formData.append('outputType', includeHeatmaps ? 'result + heatmaps' : 'result');

            try {
                nextStep2Btn.disabled = true;
                document.getElementById('process-progress').style.width = '30%';
                
                const response = await fetch('/api/process', {
                    method: 'POST',
                    body: formData
                });

                document.getElementById('process-progress').style.width = '60%';

            const result = await response.json();
            if (response.ok) {
                document.getElementById('process-progress').style.width = '100%';
                currentJobId = result.id;
                addToHistory(result);
                listenForJobCompletion(result.id, selectedFile);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload and process file: ' + error.message);
            document.getElementById('process-progress').style.width = '0%';
            backStep3Btn.disabled = false;
            backStep3Btn.classList.remove('cursor-not-allowed', 'opacity-50');
        } finally {
            nextStep2Btn.disabled = false;
        }
    };
    }
    
    nextStep2Btn.addEventListener('click', handleNextStep2Click());
 
    // Load history from server on page load
    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            if (response.ok) {
                const jobs = await response.json();
                jobs.forEach(job => {
                    historyData.set(job.id, job);
                });
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    function addToHistory(item) {
        historyData.set(item.id, item);
    }

    function showHistoryPage() {
        showStep('history');
        updateHistoryList();
    }

    function updateHistoryList() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        if (historyData.size === 0) {
            historyList.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <p>No processing history available yet.</p>
                </div>
            `;
            return;
        }
        
        [...historyData.values()].reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item transition-colors';
            
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
                <div class="flex justify-between items-center gap-6">
                    <div class="flex-1 history-item-content cursor-pointer">
                        <div class="font-medium text-gray-900">${item.fileName}</div>
                        <div class="text-sm text-gray-500 mt-1">
                            ${new Date(item.timestamp).toLocaleString()} · 
                            <span class="text-gray-700 font-medium">${item.model.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="status-badge ${statusClass}">
                            ${displayStatus}
                        </span>
                        <button class="delete-item-btn text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors" 
                                data-job-id="${item.id}" 
                                title="Delete this item">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Add click handler for viewing details
            const contentDiv = div.querySelector('.history-item-content');
            contentDiv.addEventListener('click', () => showResultDetail(item));
            
            // Add click handler for delete button
            const deleteBtn = div.querySelector('.delete-item-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the detail view
                deleteHistoryItem(item.id);
            });
            
            historyList.appendChild(div);
        });
    }
    
    async function deleteHistoryItem(jobId) {
        const item = historyData.get(jobId);
        if (!item) return;
        
        const confirmed = confirm(`Delete "${item.fileName}"?\n\nThis will permanently remove the file and all its results.`);
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/history/${jobId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                historyData.delete(jobId);
                updateHistoryList();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item: ' + error.message);
        }
    }
    
    async function showResultDetail(item) {
        showStep('result-detail');
        
        // Show loading state
        const resultDetailView = document.getElementById('result-detail-view');
        resultDetailView.innerHTML = `
            <div class="flex justify-center items-center p-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6968ae]"></div>
            </div>
        `;
        
        // Check for errors
        let hasErrors = false;
        let errorMessages = [];
        
        if (item.status === 'ERROR') {
            hasErrors = true;
            errorMessages = [item.error || 'Unknown error occurred'];
        } else if (item.result && (item.result.status === 'error' || item.result.errors)) {
            hasErrors = true;
            errorMessages = item.result.errors || ['Processing failed'];
        }
        
        if (hasErrors) {
            resultDetailView.innerHTML = `
                <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-red-800 mb-3">Processing Failed</h3>
                    <div class="space-y-2">
                        ${errorMessages.map(err => `<p class="text-red-700">• ${err}</p>`).join('')}
                    </div>
                </div>
            `;
            return;
        }
        
        // Try to fetch the full result from result.json file
        let fullResult = item.result;
        try {
            const resultResponse = await fetch(`/api/result/${item.id}`);
            if (resultResponse.ok) {
                fullResult = await resultResponse.json();
            }
        } catch (error) {
            console.log('Could not fetch result.json, using stored result:', error);
        }
        
        // Display results based on model type
        if (item.model === 'df-1') {
            await displayDF1ResultDetail(item, fullResult);
        } else if (item.model === 'ac-1') {
            await displayAC1ResultDetail(item, fullResult);
        }
    }
    
    async function displayDF1ResultDetail(item, result) {
        const resultDetailView = document.getElementById('result-detail-view');
        
        // Fetch heatmaps - backend now serves them with faststart via ffmpeg
        let heatmapVideos = [];
        if (item.hasHeatmaps) {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    heatmapVideos = data.heatmaps || [];
                }
            } catch (error) {
                console.error('Failed to load heatmaps:', error);
            }
        }
        
        // Get the original video URL
        const originalVideoPath = `/api/original/${item.id}`;
        
        resultDetailView.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">Video Analysis Results</h3>
                    
                    <div class="grid grid-cols-1 gap-6">
                        <!-- Original Video with Bounding Boxes -->
                        <div>
                            <h4 class="font-medium text-gray-700 mb-3">Original Video with Detection Overlay</h4>
                            <div class="relative inline-block w-full">
                                <video id="result-detail-video" class="w-full max-w-3xl mx-auto rounded-lg shadow-lg" controls>
                                    <source src="${originalVideoPath}" type="video/mp4">
                                </video>
                                <canvas id="result-detail-canvas" class="absolute top-0 left-0 pointer-events-none"></canvas>
                            </div>
                            <p class="text-xs text-gray-500 mt-2 text-center">Green boxes: Real | Red boxes: Fake</p>
                        </div>
                        
                        ${item.hasHeatmaps && heatmapVideos.length === 0 ? `
                            <!-- Heatmaps Generating Info -->
                            <div>
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                    <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <div class="flex-1">
                                        <p class="text-sm text-blue-800 font-medium">Heatmaps are being generated</p>
                                        <p class="text-sm text-blue-700 mt-1">This process may take a few minutes. The page will automatically check for updates.</p>
                                        <div class="mt-3 flex items-center gap-2">
                                            <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            <span class="text-xs text-blue-600">Checking for heatmaps... <span id="refresh-countdown">30</span>s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : heatmapVideos.length > 0 ? `
                            <!-- Heatmap Videos -->
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="font-medium text-gray-700">Heatmap Videos (${heatmapVideos.length})</h4>
                                    <a href="/api/heatmaps/${item.id}/download-all" 
                                       style="background-color: #6968ae; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: background-color 0.2s;" 
                                       onmouseover="this.style.backgroundColor='#5857a0'" 
                                       onmouseout="this.style.backgroundColor='#6968ae'">
                                        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                        </svg>
                                        Download All
                                    </a>
                                </div>
                                <div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                                    ${heatmapVideos.map((hm, index) => `
                                        <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div class="flex items-center gap-3">
                                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                                </svg>
                                                <span class="text-sm text-gray-700">${hm.filename}</span>
                                            </div>
                                            <a href="${hm.url}" download="${hm.filename}" 
                                               class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-2">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                                </svg>
                                                Download
                                            </a>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- Result Metadata -->
                        ${result ? `
                            <div>
                                <h4 class="font-medium text-gray-700 mb-3">Detection Metadata</h4>
                                <div class="bg-white border border-gray-200 rounded p-4">
                                    <pre class="text-sm overflow-auto max-h-64 text-gray-800">${JSON.stringify(result, null, 2)}</pre>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Initialize bounding box overlay
        const boundingBoxData = result?.boundingBoxes || result?.predictions;
        
        if (boundingBoxData) {
            const video = document.getElementById('result-detail-video');
            const canvas = document.getElementById('result-detail-canvas');
            
            video.addEventListener('loadedmetadata', () => {
                useBoundingBoxes(video, canvas, boundingBoxData);
            });
            
            if (video.readyState >= 1) {
                useBoundingBoxes(video, canvas, boundingBoxData);
            }
        }
        
        // Auto-refresh logic for heatmaps in history detail view
        if (item.hasHeatmaps && heatmapVideos.length === 0) {
            startHeatmapAutoRefreshForDetail(item, result, 'df-1');
        }
    }
    
    async function displayAC1ResultDetail(item, result) {
        const resultDetailView = document.getElementById('result-detail-view');
        
        // Fetch heatmap image
        let heatmapImage = null;
        if (item.hasHeatmaps) {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        heatmapImage = data.heatmaps[0];
                    }
                }
            } catch (error) {
                console.error('Failed to load heatmap:', error);
            }
        }
        
        resultDetailView.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">Image Analysis Results</h3>
                    
                    <div class="grid grid-cols-1 gap-6">
                        ${item.hasHeatmaps && !heatmapImage ? `
                            <!-- Heatmaps Generating Info -->
                            <div>
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                    <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <div class="flex-1">
                                        <p class="text-sm text-blue-800 font-medium">Heatmap is being generated</p>
                                        <p class="text-sm text-blue-700 mt-1">This process may take a few minutes. The page will automatically check for updates.</p>
                                        <div class="mt-3 flex items-center gap-2">
                                            <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            <span class="text-xs text-blue-600">Checking for heatmap... <span id="refresh-countdown">30</span>s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : heatmapImage ? `
                            <!-- Heatmap Image -->
                            <div>
                                <h4 class="font-medium text-gray-700 mb-3">Detection Heatmap</h4>
                                <img src="${heatmapImage.url}" alt="Detection Heatmap" class="w-full max-w-3xl rounded-lg shadow-lg mx-auto">
                                <p class="text-xs text-gray-500 mt-2 text-center">${heatmapImage.filename}</p>
                            </div>
                        ` : ''}
                        
                        <!-- Result Metadata -->
                        ${result ? `
                            <div>
                                <h4 class="font-medium text-gray-700 mb-3">Detection Metadata</h4>
                                <div class="bg-white border border-gray-200 rounded p-4">
                                    <pre class="text-sm overflow-auto max-h-96 text-gray-800">${JSON.stringify(result, null, 2)}</pre>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Auto-refresh logic for heatmaps in history detail view
        if (item.hasHeatmaps && !heatmapImage) {
            startHeatmapAutoRefreshForDetail(item, result, 'ac-1');
        }
    } 
    
    function listenForJobCompletion(jobId, originalFile) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
        
        ws.onmessage = async (event) => {
            const update = JSON.parse(event.data);
            if (update.id === jobId) {
                const item = historyData.get(jobId);
                if (item) {
                    Object.assign(item, update);
                    
                    if (update.status === 'COMPLETED' || update.status === 'ERROR') {
                        ws.close();
                        
                        // Hide processing status
                        document.getElementById('processing-status').classList.add('hidden');
                        
                        // Show action buttons after processing
                        document.getElementById('view-history-btn').classList.remove('hidden');
                        document.getElementById('process-new').classList.remove('hidden');
                        
                        // Show results
                        await displayProcessingResults(item, originalFile);
                    }
                }
            }
        };

        ws.onerror = () => {
            console.error('WebSocket error occurred');
            // Show action buttons on error
            document.getElementById('view-history-btn').classList.remove('hidden');
            document.getElementById('process-new').classList.remove('hidden');
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }
    
    async function displayProcessingResults(item, originalFile) {
        const resultsView = document.getElementById('results-view');
        const resultsContent = document.getElementById('results-content');
        
        resultsView.classList.remove('hidden');
        
        // Check for errors
        let hasErrors = false;
        let errorMessages = [];
        
        if (item.status === 'ERROR') {
            hasErrors = true;
            errorMessages = [item.error || 'Unknown error occurred'];
        } else if (item.result && (item.result.status === 'error' || item.result.errors)) {
            hasErrors = true;
            errorMessages = item.result.errors || ['Processing failed'];
        }
        
        if (hasErrors) {
            resultsContent.innerHTML = `
                <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-red-800 mb-3">Processing Failed</h3>
                    <div class="space-y-2">
                        ${errorMessages.map(err => `<p class="text-red-700">• ${err}</p>`).join('')}
                    </div>
                </div>
            `;
            return;
        }
        
        // Try to fetch the full result from result.json file
        let fullResult = item.result;
        try {
            const resultResponse = await fetch(`/api/result/${item.id}`);
            if (resultResponse.ok) {
                fullResult = await resultResponse.json();
            }
        } catch (error) {
            console.log('Could not fetch result.json, using stored result:', error);
        }
        
        // Display results based on model type
        if (item.model === 'df-1') {
            await displayDF1Results(item, originalFile, fullResult);
        } else if (item.model === 'ac-1') {
            await displayAC1Results(item, fullResult);
        }
    }
    
    async function displayDF1Results(item, originalFile, result) {
        const resultsContent = document.getElementById('results-content');
        
        // Fetch heatmaps - backend now serves them with faststart via ffmpeg
        let heatmapVideos = [];
        if (item.hasHeatmaps) {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    heatmapVideos = data.heatmaps || [];
                }
            } catch (error) {
                console.error('Failed to load heatmaps:', error);
            }
        }
        
        resultsContent.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 class="text-lg font-semibold mb-4">Video Analysis Results</h3>
                    
                    <!-- Original Video with Bounding Boxes -->
                    <div class="mb-6">
                        <h4 class="font-medium text-gray-700 mb-3">Original Video with Detection Overlay</h4>
                        <div class="relative inline-block">
                            <video id="original-video" class="w-full max-w-2xl rounded-lg shadow-lg" controls>
                                <source src="${URL.createObjectURL(originalFile)}" type="${originalFile.type}">
                            </video>
                            <canvas id="bbox-canvas" class="absolute top-0 left-0 pointer-events-none"></canvas>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Green boxes: Real | Red boxes: Fake</p>
                    </div>
                    
                    ${item.hasHeatmaps && heatmapVideos.length === 0 ? `
                        <!-- Heatmaps Generating Info with Auto-Refresh -->
                        <div class="mt-6">
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <div class="flex-1">
                                    <p class="text-sm text-blue-800 font-medium">Heatmaps are being generated</p>
                                    <p class="text-sm text-blue-700 mt-1">This process may take a few minutes. The page will automatically check for updates.</p>
                                    <div class="mt-3 flex items-center gap-2">
                                        <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        <span class="text-xs text-blue-600">Checking for heatmaps... <span id="refresh-countdown">30</span>s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : heatmapVideos.length > 0 ? `
                        <!-- Heatmap Videos -->
                        <div class="mt-6">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-medium text-gray-700">Heatmap Videos (${heatmapVideos.length})</h4>
                                <a href="/api/heatmaps/${item.id}/download-all" 
                                   style="background-color: #6968ae; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: background-color 0.2s;" 
                                   onmouseover="this.style.backgroundColor='#5857a0'" 
                                   onmouseout="this.style.backgroundColor='#6968ae'">
                                    <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                    Download All
                                </a>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                                ${heatmapVideos.map((hm, index) => `
                                    <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                            </svg>
                                            <span class="text-sm text-gray-700">${hm.filename}</span>
                                        </div>
                                        <a href="${hm.url}" download="${hm.filename}" 
                                           class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                            </svg>
                                            Download
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Result Metadata -->
                    ${result ? `
                        <div class="mt-6">
                            <h4 class="font-medium text-gray-700 mb-3">Detection Metadata</h4>
                            <div class="bg-white border border-gray-200 rounded p-4">
                                <pre class="text-sm overflow-auto max-h-64 text-gray-800">${JSON.stringify(result, null, 2)}</pre>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Initialize bounding box overlay
        const boundingBoxData = result?.boundingBoxes || result?.predictions;
        
        if (boundingBoxData) {
            const video = document.getElementById('original-video');
            const canvas = document.getElementById('bbox-canvas');
            
            video.addEventListener('loadedmetadata', () => {
                useBoundingBoxes(video, canvas, boundingBoxData);
            });
            
            if (video.readyState >= 1) {
                useBoundingBoxes(video, canvas, boundingBoxData);
            }
        }
        
        // Auto-refresh logic for heatmaps
        if (item.hasHeatmaps && heatmapVideos.length === 0) {
            startHeatmapAutoRefresh(item, originalFile, result);
        }
    }
    
    async function displayAC1Results(item, result) {
        const resultsContent = document.getElementById('results-content');
        
        // Fetch heatmap image
        let heatmapImage = null;
        if (item.hasHeatmaps) {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        heatmapImage = data.heatmaps[0];
                    }
                }
            } catch (error) {
                console.error('Failed to load heatmap:', error);
            }
        }
        
        resultsContent.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 class="text-lg font-semibold mb-4">Image Analysis Results</h3>
                    
                    ${item.hasHeatmaps && !heatmapImage ? `
                        <!-- Heatmaps Generating Info with Auto-Refresh -->
                        <div class="mb-6">
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <div class="flex-1">
                                    <p class="text-sm text-blue-800 font-medium">Heatmap is being generated</p>
                                    <p class="text-sm text-blue-700 mt-1">This process may take a few minutes. The page will automatically check for updates.</p>
                                    <div class="mt-3 flex items-center gap-2">
                                        <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        <span class="text-xs text-blue-600">Checking for heatmap... <span id="refresh-countdown">30</span>s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : heatmapImage ? `
                        <!-- Heatmap Image -->
                        <div class="mb-6">
                            <h4 class="font-medium text-gray-700 mb-3">Detection Heatmap</h4>
                            <img src="${heatmapImage.url}" alt="Detection Heatmap" class="w-full max-w-2xl rounded-lg shadow-lg mx-auto">
                            <p class="text-xs text-gray-500 mt-2 text-center">${heatmapImage.filename}</p>
                        </div>
                    ` : ''}
                    
                    <!-- Result Metadata -->
                    ${result ? `
                        <div>
                            <h4 class="font-medium text-gray-700 mb-3">Detection Metadata</h4>
                            <div class="bg-white border border-gray-200 rounded p-4">
                                <pre class="text-sm overflow-auto max-h-96 text-gray-800">${JSON.stringify(result, null, 2)}</pre>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Auto-refresh logic for heatmaps
        if (item.hasHeatmaps && !heatmapImage) {
            startHeatmapAutoRefreshForImage(item, result);
        }
    }
    
    // Auto-refresh functionality for DF-1 video heatmaps
    let refreshInterval = null;
    let countdownInterval = null;
    
    function startHeatmapAutoRefresh(item, originalFile, result) {
        let countdown = 30;
        
        // Update countdown every second
        countdownInterval = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('refresh-countdown');
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                countdown = 30;
            }
        }, 1000);
        
        // Check for heatmaps every 30 seconds
        refreshInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        // Heatmaps found! Stop refreshing and re-render
                        stopHeatmapAutoRefresh();
                        await displayDF1Results(item, originalFile, result);
                    }
                }
            } catch (error) {
                console.error('Failed to check for heatmaps:', error);
            }
        }, 30000); // 30 seconds
    }
    
    // Auto-refresh functionality for AC-1 image heatmaps
    function startHeatmapAutoRefreshForImage(item, result) {
        let countdown = 30;
        
        // Update countdown every second
        countdownInterval = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('refresh-countdown');
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                countdown = 30;
            }
        }, 1000);
        
        // Check for heatmaps every 30 seconds
        refreshInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        // Heatmap found! Stop refreshing and re-render
                        stopHeatmapAutoRefresh();
                        await displayAC1Results(item, result);
                    }
                }
            } catch (error) {
                console.error('Failed to check for heatmap:', error);
            }
        }, 30000); // 30 seconds
    }
    
    function stopHeatmapAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }
    
    // Auto-refresh for detail view (history)
    function startHeatmapAutoRefreshForDetail(item, result, modelType) {
        let countdown = 30;
        
        // Update countdown every second
        countdownInterval = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('refresh-countdown');
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                countdown = 30;
            }
        }, 1000);
        
        // Check for heatmaps every 30 seconds
        refreshInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/heatmaps/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.heatmaps && data.heatmaps.length > 0) {
                        // Heatmaps found! Stop refreshing and re-render
                        stopHeatmapAutoRefresh();
                        if (modelType === 'df-1') {
                            await displayDF1ResultDetail(item, result);
                        } else if (modelType === 'ac-1') {
                            await displayAC1ResultDetail(item, result);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to check for heatmaps:', error);
            }
        }, 30000); // 30 seconds
    }
    
    function useBoundingBoxes(video, canvas, boundingBoxes) {
        if (!video || !canvas) {
            return;
        }
        
        if (!boundingBoxes) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const syncCanvas = () => {
            const videoRect = video.getBoundingClientRect();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.style.width = videoRect.width + 'px';
            canvas.style.height = videoRect.height + 'px';
            canvas.style.top = video.offsetTop + 'px';
            canvas.style.left = video.offsetLeft + 'px';

            updateCanvas();
        };

        const drawRectangles = () => {
            if (!boundingBoxes) return;

            const frameRate = 29.97;
            const currentTime = video.currentTime;
            const currentFrame = Math.floor(currentTime * frameRate);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let boxesDrawn = 0;
            
            // Check if boundingBoxes is directly a frame-based object
            if (boundingBoxes[currentFrame] || boundingBoxes[currentFrame.toString()]) {
                // Direct frame-based structure: boundingBoxes[frameNumber] = [{x1, y1, x2, y2, label}, ...]
                const frameKey = currentFrame.toString();
                const boxes = boundingBoxes[currentFrame] || boundingBoxes[frameKey];
                
                if (Array.isArray(boxes)) {
                    boxes.forEach(box => {
                        // Handle both object and array formats
                        let x1, y1, x2, y2, label;
                        
                        if (Array.isArray(box) && box.length === 4) {
                            [x1, y1, x2, y2] = box;
                            label = 'REAL'; // default
                        } else if (typeof box === 'object') {
                            ({ x1, y1, x2, y2, label } = box);
                        } else {
                            return;
                        }
                        
                        // Set color based on label
                        const color = label === 'REAL' ? 'rgba(59, 255, 5, 0.6)' : 'rgba(255, 0, 0, 0.6)';
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 3;

                        // Draw rectangle
                        const width = x2 - x1;
                        const height = y2 - y1;
                        ctx.strokeRect(x1, y1, width, height);
                        boxesDrawn++;
                    });
                }
            } else {
                // Face-based structure: boundingBoxes.face_X.boundingBox[frameNumber]
                Object.keys(boundingBoxes).forEach(key => {
                    const faceData = boundingBoxes[key];
                    
                    // Check if boundingBox exists
                    if (!faceData || !faceData.boundingBox) {
                        return;
                    }
                    
                    const frameData = faceData.boundingBox[currentFrame.toString()];
                    if (frameData) {
                        const boxClass = faceData.class;
                        const strokeColor = boxClass === 'fake' ? 'rgba(255, 0, 0, 0.6)' : 'rgba(59, 255, 5, 0.6)';
                        if (Array.isArray(frameData) && frameData.length === 4) {
                            let [x1, y1, x2, y2] = frameData;
                            
                            // Scale coordinates by 2 (backend provides half-resolution coordinates)
                            x1 *= 2;
                            y1 *= 2;
                            x2 *= 2;
                            y2 *= 2;
                            
                            const width = x2 - x1;
                            const height = y2 - y1;

                            ctx.strokeStyle = strokeColor;
                            ctx.lineWidth = 2;
                            ctx.strokeRect(x1, y1, width, height);
                            
                            boxesDrawn++;
                        }
                    }
                });
            }
        };

        const updateCanvas = () => {
            drawRectangles();
            if (!video.paused && !video.ended) {
                requestAnimationFrame(updateCanvas);
            }
        };

        const handlePlay = () => {
            updateCanvas();
        };

        const handleSeeked = () => {
            drawRectangles();
        };
        
        const resizeObserver = new ResizeObserver(syncCanvas);
        resizeObserver.observe(video);

        window.addEventListener('resize', syncCanvas);

        syncCanvas();
        video.addEventListener('play', handlePlay);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('pause', handleSeeked);
        video.addEventListener('canplay', syncCanvas);

        // Cleanup
        const cleanup = () => {
            resizeObserver.disconnect();
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('pause', handleSeeked);
            video.removeEventListener('canplay', syncCanvas);
            window.removeEventListener('resize', syncCanvas);
        };
        
        // Store cleanup for later
        video.dataset.bboxCleanup = 'registered';
    }
 
    showStep(1);
    updateUploadButton();
    initModelSelection(); 
    loadHistory(); 
});