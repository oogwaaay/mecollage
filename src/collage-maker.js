// Collage rendering
export class CollageMaker {
    render(container, images, layout, settings, decorations = []) {
        container.innerHTML = '';
        container.style.backgroundColor = settings.backgroundColor;
        container.style.padding = `${settings.spacing}px`;
        container.style.gap = `${settings.spacing}px`;
        if (settings.aspectRatio && settings.aspectRatio !== 'auto') {
            container.style.aspectRatio = settings.aspectRatio;
        } else {
            container.style.removeProperty('aspect-ratio');
        }

        if (images.length === 0) return;

        switch (layout.type) {
            case 'horizontal':
                this.renderHorizontal(container, images, settings);
                break;
            case 'vertical':
                this.renderVertical(container, images, settings);
                break;
            case 'twoColumns':
                this.renderTwoColumns(container, images, settings);
                break;
            case 'asymmetric':
                this.renderAsymmetric(container, images, settings);
                break;
            case 'featured':
                this.renderFeatured(container, images, settings);
                break;
            case 'grid':
                this.renderGrid(container, images, layout, settings);
                break;
            default:
                this.renderGrid(container, images, { rows: 3, cols: 3 }, settings);
        }

        this.renderDecorations(container, decorations);
    }

    renderHorizontal(container, images, settings) {
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.flexWrap = 'nowrap';
        container.style.alignItems = 'stretch';

        images.forEach(img => {
            const imgContainer = this.createImageContainer(img, settings);
            imgContainer.style.flex = '1';
            imgContainer.style.minWidth = '0';
            container.appendChild(imgContainer);
        });
    }

    renderVertical(container, images, settings) {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.flexWrap = 'nowrap';
        container.style.alignItems = 'stretch';

        images.forEach(img => {
            const imgContainer = this.createImageContainer(img, settings);
            imgContainer.style.flex = '1';
            imgContainer.style.minHeight = '0';
            container.appendChild(imgContainer);
        });
    }

    renderTwoColumns(container, images, settings) {
        // 2 columns layout - images alternate between left and right columns
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridAutoRows = '1fr';
        
        const imageCount = images.length;
        const rowsNeeded = Math.ceil(imageCount / 2);
        
        // Create grid cells alternating between columns
        for (let i = 0; i < rowsNeeded * 2; i++) {
            const imgIndex = i < imageCount ? i : null;
            const imgContainer = this.createImageContainer(
                imgIndex !== null ? images[imgIndex] : null,
                settings
            );
            container.appendChild(imgContainer);
        }
    }

    renderAsymmetric(container, images, settings) {
        // Asymmetric layout: large left panel, two small right panels
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '2fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        container.style.gridTemplateAreas = `
            "left top-right"
            "left bottom-right"
        `;
        
        // Left large panel
        const leftContainer = this.createImageContainer(images[0] || null, settings);
        leftContainer.style.gridArea = 'left';
        container.appendChild(leftContainer);
        
        // Top right panel
        const topRightContainer = this.createImageContainer(images[1] || null, settings);
        topRightContainer.style.gridArea = 'top-right';
        container.appendChild(topRightContainer);
        
        // Bottom right panel
        const bottomRightContainer = this.createImageContainer(images[2] || null, settings);
        bottomRightContainer.style.gridArea = 'bottom-right';
        container.appendChild(bottomRightContainer);
    }

    renderFeatured(container, images, settings) {
        // Featured layout: 4x5 grid with featured center area (H-shape)
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(4, 1fr)';
        container.style.gridTemplateRows = 'repeat(5, 1fr)';
        container.style.gridTemplateAreas = `
            "a a b b"
            "a a b b"
            "c c d d"
            "c c d d"
            "e e f f"
        `;
        
        // Map images to grid areas
        const areas = ['a', 'b', 'c', 'd', 'e', 'f'];
        const imageCount = images.length;
        
        for (let i = 0; i < areas.length; i++) {
            const imgContainer = this.createImageContainer(
                i < imageCount ? images[i] : null,
                settings
            );
            imgContainer.style.gridArea = areas[i];
            container.appendChild(imgContainer);
        }
    }

    renderGrid(container, images, layout, settings) {
        const { rows, cols } = layout;
        container.style.display = 'grid';
        container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // Fill grid with images (only up to the number of images available)
        const totalCells = rows * cols;
        const imageCount = images.length;
        
        for (let i = 0; i < totalCells; i++) {
            const imgContainer = this.createImageContainer(
                i < imageCount ? images[i] : null,
                settings
            );
            container.appendChild(imgContainer);
        }
    }

    createImageContainer(img, settings) {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.border = `${settings.border}px solid ${settings.borderColor}`;
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.style.backgroundColor = '#f0f0f0';

        if (img) {
            const imgElement = document.createElement('img');
            imgElement.src = img.url;
            imgElement.loading = 'lazy';
            imgElement.decoding = 'async';
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            const fitMode = settings.imageFit === 'contain' ? 'contain' : 'cover';
            imgElement.style.objectFit = fitMode;
            imgElement.style.objectPosition = 'center';
            imgElement.style.display = 'block';
            imgElement.style.filter = this.buildFilterString(img.filters);
            if (fitMode === 'contain') {
                imgElement.style.backgroundColor = settings.backgroundColor || '#f0f0f0';
            }
            container.appendChild(imgElement);
        } else {
            // Empty cell
            container.style.minHeight = '100px';
        }

        return container;
    }

    renderDecorations(container, decorations) {
        if (!decorations || !decorations.length) return;

        const overlay = document.createElement('div');
        overlay.className = 'collage-overlay';

        decorations.forEach((item) => {
            const el = document.createElement('div');
            el.classList.add('overlay-item');
            el.dataset.id = item.id;

            const coords = this.getPositionStyles(item);
            el.style.left = `${coords.left}%`;
            el.style.top = `${coords.top}%`;
            el.style.transform = 'translate(-50%, -50%)';

            if (item.type === 'text') {
                el.classList.add('overlay-text');
                el.textContent = item.content;
                el.style.color = item.color || '#ffffff';
                el.style.fontSize = this.getTextSize(item.size);
                el.style.maxWidth = '80%';
                el.style.textAlign = 'center';
            } else if (item.type === 'sticker') {
                el.classList.add('overlay-sticker');
                el.textContent = item.emoji;
                el.style.fontSize = this.getStickerSize(item.size);
            }

            overlay.appendChild(el);
        });

        container.appendChild(overlay);
    }

    getPositionStyles(item) {
        if (typeof item.x === 'number' && typeof item.y === 'number') {
            return {
                left: this.clampPercentage(item.x * 100),
                top: this.clampPercentage(item.y * 100)
            };
        }

        const map = {
            'top-left': { left: 8, top: 12 },
            'top-center': { left: 50, top: 12 },
            'top-right': { left: 92, top: 12 },
            center: { left: 50, top: 50 },
            'bottom-left': { left: 12, top: 88 },
            'bottom-center': { left: 50, top: 88 },
            'bottom-right': { left: 88, top: 88 }
        };
        const key = item.position && map[item.position] ? item.position : 'center';
        return map[key];
    }

    getTextSize(size) {
        switch (size) {
            case 'small':
                return '1.2rem';
            case 'large':
                return '2.2rem';
            case 'medium':
            default:
                return '1.6rem';
        }
    }

    getStickerSize(size) {
        switch (size) {
            case 'small':
                return '1.8rem';
            case 'large':
                return '3.2rem';
            case 'medium':
            default:
                return '2.4rem';
        }
    }

    clampPercentage(value) {
        const clamped = Math.min(Math.max(value, 2), 98);
        return Number.isFinite(clamped) ? clamped : 50;
    }

    buildFilterString(filters) {
        if (!filters || !filters.adjustments) {
            return 'none';
        }

        const { brightness = 100, contrast = 100, saturation = 100, warmth = 0 } = filters.adjustments;
        const blur = typeof filters.adjustments.blur === 'number' ? filters.adjustments.blur : 0;
        const brightnessValue = `${brightness}%`;
        const contrastValue = `${contrast}%`;
        const saturationValue = `${saturation}%`;
        const warmthDeg = warmth * 0.8; // convert to degrees

        const parts = [
            `brightness(${brightnessValue})`,
            `contrast(${contrastValue})`,
            `saturate(${saturationValue})`,
            `hue-rotate(${warmthDeg}deg)`
        ];

        if (saturation <= 0) {
            parts.push('grayscale(100%)');
        }

        parts.push(`blur(${Math.max(0, blur)}px)`);

        return parts.join(' ');
    }
}

