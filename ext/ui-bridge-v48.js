/**
 * AGraph UI Bridge v4.8
 * Connects new Figma-based UI to existing main.js functionality
 */

(function() {
    'use strict';

    // ============================================
    // DOM Elements
    // ============================================
    
    let layoutToggle = null;
    let groupNameDisplay = null;
    let groupSelect = null;
    let cardSizeSlider = null;
    let resizeBar = null;
    let velocityToggle = null;
    let accelerationToggle = null;
    let screen = null;

    // ============================================
    // State
    // ============================================
    
    let currentLayout = 'vertical';
    let cardSize = 64; // Default card size in pixels
    let isDraggingSlider = false;
    let isDraggingResize = false;

    // ============================================
    // Initialization
    // ============================================
    
    function init() {
        // Get DOM elements
        screen = document.querySelector('.screen');
        layoutToggle = document.getElementById('layoutToggle');
        groupNameDisplay = document.getElementById('groupNameDisplay');
        groupSelect = document.getElementById('groupSelect');
        cardSizeSlider = document.getElementById('cardSizeSlider');
        resizeBar = document.getElementById('resizeBar');
        velocityToggle = document.getElementById('showVelocityToggle');
        accelerationToggle = document.getElementById('showAccelerationToggle');

        if (!screen) {
            console.error('UI Bridge: Screen element not found');
            return;
        }

        // Load saved layout preference
        loadLayoutPreference();

        // Setup event listeners
        setupLayoutToggle();
        setupGroupNameSync();
        setupCardSizeSlider();
        setupResizeBar();
        setupToggleButtons();

        console.log('AGraph UI Bridge v4.8 initialized');
    }

    // ============================================
    // Layout Toggle
    // ============================================
    
    function setupLayoutToggle() {
        if (!layoutToggle) return;

        layoutToggle.addEventListener('click', () => {
            toggleLayout();
        });
    }

    function toggleLayout() {
        currentLayout = currentLayout === 'vertical' ? 'horizontal' : 'vertical';
        applyLayout(currentLayout);
        saveLayoutPreference();
    }

    function applyLayout(layout) {
        if (!screen) return;

        // Remove both classes
        screen.classList.remove('vertical', 'horizontal');
        
        // Add appropriate class
        screen.classList.add(layout);
        
        // Update data-layout attribute
        screen.setAttribute('data-layout', layout);

        // Adjust canvas size if needed
        adjustCanvasSize(layout);

        console.log('Layout switched to:', layout);
    }

    function adjustCanvasSize(layout) {
        const canvas = document.getElementById('valueChart');
        if (!canvas) return;

        // Trigger canvas redraw if main.js has a redraw function
        if (typeof window.redrawGraph === 'function') {
            window.redrawGraph();
        }
    }

    function loadLayoutPreference() {
        try {
            const savedLayout = localStorage.getItem('accelcurve_layout');
            if (savedLayout === 'horizontal' || savedLayout === 'vertical') {
                currentLayout = savedLayout;
                applyLayout(currentLayout);
            }
        } catch (e) {
            console.warn('Could not load layout preference:', e);
        }
    }

    function saveLayoutPreference() {
        try {
            localStorage.setItem('accelcurve_layout', currentLayout);
        } catch (e) {
            console.warn('Could not save layout preference:', e);
        }
    }

    // ============================================
    // Group Name Sync
    // ============================================
    
    function setupGroupNameSync() {
        if (!groupSelect || !groupNameDisplay) return;

        // Sync display when select changes
        groupSelect.addEventListener('change', () => {
            updateGroupNameDisplay();
        });

        // Make display clickable to open select
        groupNameDisplay.addEventListener('click', () => {
            // Create a custom dropdown menu
            showGroupDropdown();
        });

        // Initial sync
        updateGroupNameDisplay();

        // Watch for changes to select options (from main.js)
        const observer = new MutationObserver(() => {
            updateGroupNameDisplay();
        });

        observer.observe(groupSelect, {
            childList: true,
            subtree: true
        });
    }

    function updateGroupNameDisplay() {
        if (!groupSelect || !groupNameDisplay) return;

        const selectedOption = groupSelect.options[groupSelect.selectedIndex];
        if (selectedOption) {
            groupNameDisplay.textContent = selectedOption.text;
        }
    }

    function showGroupDropdown() {
        if (!groupSelect || !groupNameDisplay) return;

        // Create dropdown overlay
        const dropdown = document.createElement('div');
        dropdown.className = 'group-dropdown-overlay';
        dropdown.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
        `;

        const rect = groupNameDisplay.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: absolute;
            left: ${rect.left}px;
            top: ${rect.bottom + 2}px;
            background-color: var(--panel-bg);
            border: 1px solid var(--fuscous-gray);
            border-radius: 3px;
            min-width: ${rect.width}px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 10001;
        `;

        // Add options
        Array.from(groupSelect.options).forEach((option, index) => {
            const item = document.createElement('div');
            item.textContent = option.text;
            item.style.cssText = `
                padding: 4px 8px;
                cursor: pointer;
                color: var(--nobel);
                font-family: var(--font-family-roboto);
                font-size: var(--font-size-m);
                ${groupSelect.selectedIndex === index ? 'background-color: var(--fuscous-gray);' : ''}
            `;

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--fuscous-gray)';
            });

            item.addEventListener('mouseleave', () => {
                if (groupSelect.selectedIndex !== index) {
                    item.style.backgroundColor = 'transparent';
                }
            });

            item.addEventListener('click', () => {
                groupSelect.selectedIndex = index;
                groupSelect.dispatchEvent(new Event('change'));
                document.body.removeChild(dropdown);
            });

            menu.appendChild(item);
        });

        dropdown.appendChild(menu);

        // Close on click outside
        dropdown.addEventListener('click', (e) => {
            if (e.target === dropdown) {
                document.body.removeChild(dropdown);
            }
        });

        document.body.appendChild(dropdown);
    }

    // ============================================
    // Card Size Slider
    // ============================================
    
    function setupCardSizeSlider() {
        if (!cardSizeSlider) return;

        const knob = cardSizeSlider.querySelector('.ellipse-1');
        if (!knob) return;

        cardSizeSlider.addEventListener('mousedown', startDragSlider);
        document.addEventListener('mousemove', dragSlider);
        document.addEventListener('mouseup', stopDragSlider);

        // Load saved card size
        loadCardSizePreference();
    }

    function startDragSlider(e) {
        isDraggingSlider = true;
        updateSliderValue(e);
    }

    function dragSlider(e) {
        if (!isDraggingSlider) return;
        updateSliderValue(e);
    }

    function stopDragSlider() {
        if (isDraggingSlider) {
            isDraggingSlider = false;
            saveCardSizePreference();
        }
    }

    function updateSliderValue(e) {
        const slider = cardSizeSlider;
        const knob = slider.querySelector('.ellipse-1');
        if (!slider || !knob) return;

        const rect = slider.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;

        // Card size range: 24px to 128px
        cardSize = Math.round(24 + (percentage * 104));

        // Update knob position
        knob.style.left = `${x - 5}px`;

        // Apply card size
        applyCardSize(cardSize);
    }

    function applyCardSize(size) {
        const container = document.getElementById('presetCardsContainer');
        if (!container) return;

        const cards = container.querySelectorAll('.dummy, .preset-card');
        cards.forEach(card => {
            card.style.width = `${size}px`;
            card.style.height = `${size}px`;
            
            // カード内のキャンバスサイズも調整
            const canvas = card.querySelector('.preset-card-canvas');
            if (canvas) {
                const canvasDisplayWidth = size - 2; // border分を引く
                const canvasDisplayHeight = size - 2; // border分を引く
                // Retina対応: 実際のピクセル数は2倍
                const dpr = window.devicePixelRatio || 2;
                canvas.width = canvasDisplayWidth * dpr;
                canvas.height = canvasDisplayHeight * dpr;
                canvas.style.width = `${canvasDisplayWidth}px`;
                canvas.style.height = `${canvasDisplayHeight}px`;
                
                // カーブを再描画（CSS適用を待つ）
                const presetId = card.dataset.presetId;
                if (presetId && window.AGraphExtension) {
                    const presetData = window.AGraphExtension.getPresetData();
                    if (presetData) {
                        const preset = presetData.presets.find(p => p.id === presetId);
                        if (preset && window.drawCurveThumbnail) {
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    window.drawCurveThumbnail(canvas, preset.keyframes);
                                });
                            });
                        }
                    }
                }
            }
        });
    }

    function loadCardSizePreference() {
        try {
            const csInterface = new CSInterface();
            csInterface.evalScript('loadPreference("cardsize")', function(result) {
                try {
                    const data = JSON.parse(result);
                    if (data.success && data.value) {
                        cardSize = parseInt(data.value, 10);
                        if (cardSize >= 24 && cardSize <= 128) {
                            applyCardSize(cardSize);
                            
                            // Update slider knob position
                            const knob = cardSizeSlider.querySelector('.ellipse-1');
                            if (knob) {
                                const percentage = (cardSize - 24) / 104;
                                const sliderWidth = 60; // from CSS
                                knob.style.left = `${(percentage * sliderWidth) - 5}px`;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Could not load card size preference:', e);
                }
            });
        } catch (e) {
            console.warn('Could not load card size preference:', e);
        }
    }

    function saveCardSizePreference() {
        try {
            const csInterface = new CSInterface();
            csInterface.evalScript(`savePreference("cardsize", "${cardSize}")`, function(result) {
                // カードサイズは静かに保存(アラート非表示)
            });
        } catch (e) {
            console.error('Save Error: ' + e.message);
        }
    }

    // ============================================
    // Resize Bar
    // ============================================
    
    function setupResizeBar() {
        if (!resizeBar) return;

        resizeBar.addEventListener('mousedown', startDragResize);
        document.addEventListener('mousemove', dragResize);
        document.addEventListener('mouseup', stopDragResize);
        
        // Load saved resize position
        if (currentLayout === 'vertical') {
            loadPreference('resizeBarVertical', function(value) {
                if (value) {
                    const graphSection = document.querySelector('.section-graph');
                    const presetSection = document.querySelector('.section-1');
                    if (graphSection && presetSection) {
                        const flexValue = parseFloat(value);
                        graphSection.style.flex = flexValue.toString();
                        presetSection.style.flex = (1 - flexValue).toString();
                    }
                }
            });
        } else {
            loadPreference('resizeBarHorizontal', function(value) {
                if (value) {
                    const leftSection = document.querySelector('.section-left');
                    const rightSection = document.querySelector('.section-right');
                    if (leftSection && rightSection) {
                        const flexValue = parseFloat(value);
                        leftSection.style.flex = flexValue.toString();
                        rightSection.style.flex = (1 - flexValue).toString();
                    }
                }
            });
        }
    }

    function startDragResize(e) {
        isDraggingResize = true;
        e.preventDefault();
    }

    function dragResize(e) {
        if (!isDraggingResize) return;

        const mianDiv = document.querySelector('.mian-div');
        if (!mianDiv) return;

        if (currentLayout === 'vertical') {
            // Vertical: resize height split between graph and presets
            const rect = mianDiv.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const percentage = (y / rect.height) * 100;

            // Limit to 20%-80%
            const clampedPercentage = Math.max(20, Math.min(80, percentage));

            // Apply flex-grow to sections
            const graphSection = document.querySelector('.section-graph');
            const presetSection = document.querySelector('.section-1');

            if (graphSection && presetSection) {
                graphSection.style.flex = `${clampedPercentage / 100}`;
                presetSection.style.flex = `${(100 - clampedPercentage) / 100}`;
            }
        } else {
            // Horizontal: resize width split between left and right
            const rect = mianDiv.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;

            // Limit to 30%-70%
            const clampedPercentage = Math.max(30, Math.min(70, percentage));

            // Apply flex-grow to sections
            const leftSection = document.querySelector('.section-left');
            const rightSection = document.querySelector('.section-right');

            if (leftSection && rightSection) {
                leftSection.style.flex = `${clampedPercentage / 100}`;
                rightSection.style.flex = `${(100 - clampedPercentage) / 100}`;
            }
        }
    }

    function stopDragResize() {
        isDraggingResize = false;
        
        // Save current resize position
        const mianDiv = document.querySelector('.mian-div');
        if (!mianDiv) return;
        
        if (currentLayout === 'vertical') {
            const graphSection = document.querySelector('.section-graph');
            if (graphSection) {
                const flexValue = graphSection.style.flex || '0.6';
                savePreference('resizeBarVertical', flexValue);
            }
        } else {
            const leftSection = document.querySelector('.section-left');
            if (leftSection) {
                const flexValue = leftSection.style.flex || '0.5';
                savePreference('resizeBarHorizontal', flexValue);
            }
        }
    }

    // ============================================
    // Toggle Buttons
    // ============================================
    
    function setupToggleButtons() {
        if (velocityToggle) {
            velocityToggle.addEventListener('change', function() {
                savePreference('showVelocity', this.checked ? '1' : '0');
            });
            // Load saved state
            loadPreference('showVelocity', function(value) {
                if (value) {
                    velocityToggle.checked = value === '1';
                }
            });
        }

        if (accelerationToggle) {
            accelerationToggle.addEventListener('change', function() {
                savePreference('showAcceleration', this.checked ? '1' : '0');
            });
            // Load saved state
            loadPreference('showAcceleration', function(value) {
                if (value) {
                    accelerationToggle.checked = value === '1';
                }
            });
        }
    }

    // ============================================
    // Dynamic Preset Card Observer
    // ============================================
    
    function setupPresetCardObserver() {
        const container = document.getElementById('presetCardsContainer');
        if (!container) return;

        // Apply card size to newly added cards
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node.classList.contains('preset-card') || node.classList.contains('dummy'))) {
                        node.style.width = `${cardSize}px`;
                        node.style.height = `${cardSize}px`;
                    }
                });
            });
        });

        observer.observe(container, {
            childList: true
        });
    }

    // ============================================
    // Public API
    // ============================================
    
    window.AGraphUI = {
        toggleLayout: toggleLayout,
        setLayout: applyLayout,
        getLayout: () => currentLayout,
        setCardSize: applyCardSize,
        getCardSize: () => cardSize
    };

    // ============================================
    // Auto-initialize when DOM is ready
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Setup preset card observer after init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupPresetCardObserver);
    } else {
        setupPresetCardObserver();
    }

    // localStorage Debug Button
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        const checkBtn = document.getElementById('checkLocalStorageButton');
        if (checkBtn) {
            checkBtn.addEventListener('click', function() {
                const csInterface = new CSInterface();
                csInterface.evalScript('loadPreference("cardsize")', function(result) {
                    try {
                        const data = JSON.parse(result);
                        if (data.success) {
                            alert('Preference Check:\n\ncardsize: ' + (data.value || 'NOT SET'));
                        } else {
                            alert('Error: ' + (data.error || 'Unknown error'));
                        }
                    } catch (e) {
                        alert('Parse Error: ' + e.message + '\n\nRaw result: ' + result);
                    }
                });
            });
        }
        
        // Load saved preset after a delay to ensure presetData is loaded
        setTimeout(function() {
            loadPreference('selectedPreset', function(presetId) {
                if (presetId && typeof window.selectPresetCard === 'function') {
                    window.selectPresetCard(presetId);
                }
            });
        }, 500);
    });
    
    // ============================================
    // Expose helper functions globally
    // ============================================
    window.savePreference = savePreference;
    window.loadPreference = loadPreference;

})();
