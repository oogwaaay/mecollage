// Export functionality
import { i18n } from './i18n.js';

export class ExportManager {
    async export({ element, quality, format, images, decorations, settings }) {
        const exportBtn = document.getElementById('exportBtn');
        const originalLabel = exportBtn ? exportBtn.textContent : '';

        try {
            // Show loading state
            if (exportBtn) {
                exportBtn.textContent = i18n.t('export.exporting');
                exportBtn.disabled = true;
            }

            const canvas = await this.renderToCanvas({ element, images, decorations, settings, quality, format });

            // Convert to blob
            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, mimeType, format === 'jpg' ? quality : undefined);
            });

            // Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `collage-${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Reset button
            if (exportBtn) {
                exportBtn.textContent = originalLabel;
                exportBtn.disabled = false;
            }
        } catch (error) {
            console.error('Export error:', error);
            alert(i18n.t('export.failed'));
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.textContent = originalLabel || 'Export';
            }
        }
    }

    async renderToCanvas({ element, images = [], decorations = [], settings = {}, quality = 1, format = 'png' }) {
        const rect = element.getBoundingClientRect();
        const scaleBase = window.devicePixelRatio || 1;
        const scale = Math.max(scaleBase, quality * scaleBase);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width * scale));
        canvas.height = Math.max(1, Math.round(rect.height * scale));

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        ctx.scale(scale, scale);

        const originX = rect.left;
        const originY = rect.top;

        const backgroundColor = this.resolveBackgroundColor(settings.backgroundColor, format);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, rect.width, rect.height);

        const containerNodes = Array.from(element.querySelectorAll('.image-container'));

        containerNodes.forEach((containerNode, index) => {
            const imgEl = containerNode.querySelector('img');
            const containerBox = containerNode.getBoundingClientRect();
            const borderSize = Math.max(0, Number(settings.border) || 0);
            const borderColor = settings.borderColor || '#ffffff';
            const containerBg = window.getComputedStyle(containerNode).backgroundColor || backgroundColor;

            const baseX = containerBox.left - originX;
            const baseY = containerBox.top - originY;

            if (borderSize > 0) {
                ctx.fillStyle = borderColor;
                ctx.fillRect(baseX, baseY, containerBox.width, containerBox.height);
                ctx.fillStyle = containerBg;
                ctx.fillRect(
                    baseX + borderSize,
                    baseY + borderSize,
                    Math.max(0, containerBox.width - borderSize * 2),
                    Math.max(0, containerBox.height - borderSize * 2)
                );
            } else {
                ctx.fillStyle = containerBg;
                ctx.fillRect(baseX, baseY, containerBox.width, containerBox.height);
            }

            if (!imgEl) {
                return;
            }

            const imgBox = imgEl.getBoundingClientRect();
            const imageData = images[index];

            ctx.save();
            ctx.filter = this.buildFilterString(imageData?.filters);
            ctx.drawImage(
                imgEl,
                imgBox.left - originX,
                imgBox.top - originY,
                imgBox.width,
                imgBox.height
            );
            ctx.restore();
        });

        if (decorations && decorations.length) {
            this.drawDecorations(ctx, decorations, rect.width, rect.height);
        }

        return canvas;
    }

    buildFilterString(filters) {
        if (!filters || !filters.adjustments) {
            return 'none';
        }

        const { brightness = 100, contrast = 100, saturation = 100, warmth = 0 } = filters.adjustments;
        const blur = typeof filters.adjustments.blur === 'number' ? filters.adjustments.blur : 0;
        const parts = [
            `brightness(${brightness}%)`,
            `contrast(${contrast}%)`,
            `saturate(${saturation}%)`,
            `hue-rotate(${warmth * 0.8}deg)`
        ];

        if (saturation <= 0) {
            parts.push('grayscale(100%)');
        }

        parts.push(`blur(${Math.max(0, blur)}px)`);

        return parts.join(' ');
    }

    drawDecorations(ctx, decorations, width, height) {
        const maxWidth = width * 0.8;
        decorations.forEach((item) => {
            const { x, y } = this.resolveCoordinates(item, width, height);
            if (item.type === 'text') {
                const fontSize = this.getTextSizePx(item.size);
                ctx.save();
                ctx.filter = 'none';
                ctx.font = `600 ${fontSize}px "Nunito", "Segoe UI", sans-serif`;
                ctx.fillStyle = item.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 6;
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
                if (item.content) {
                    const text = item.content;
                    ctx.strokeText(text, x, y, maxWidth);
                    ctx.fillText(text, x, y, maxWidth);
                }
                ctx.restore();
            } else if (item.type === 'sticker') {
                const fontSize = this.getStickerSizePx(item.size);
                ctx.save();
                ctx.filter = 'none';
                ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Segoe UI", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.emoji, x, y);
                ctx.restore();
            }
        });
    }

    resolveCoordinates(item, width, height) {
        const clamp = (value) => {
            if (!Number.isFinite(value)) return 0.5;
            return Math.min(Math.max(value, 0.02), 0.98);
        };

        if (typeof item.x === 'number' && typeof item.y === 'number') {
            return {
                x: clamp(item.x) * width,
                y: clamp(item.y) * height
            };
        }

        const map = {
            'top-left': { x: 0.08, y: 0.12 },
            'top-center': { x: 0.5, y: 0.12 },
            'top-right': { x: 0.92, y: 0.12 },
            center: { x: 0.5, y: 0.5 },
            'bottom-left': { x: 0.12, y: 0.88 },
            'bottom-center': { x: 0.5, y: 0.88 },
            'bottom-right': { x: 0.88, y: 0.88 }
        };

        const key = item.position && map[item.position] ? item.position : 'center';
        const coords = map[key];
        return {
            x: coords.x * width,
            y: coords.y * height
        };
    }

    getTextSizePx(size) {
        const base = 16;
        switch (size) {
            case 'small':
                return base * 1.2;
            case 'large':
                return base * 2.2;
            case 'medium':
            default:
                return base * 1.6;
        }
    }

    getStickerSizePx(size) {
        const base = 16;
        switch (size) {
            case 'small':
                return base * 1.8;
            case 'large':
                return base * 3.2;
            case 'medium':
            default:
                return base * 2.4;
        }
    }

    resolveBackgroundColor(color, format) {
        const fallback = format === 'jpg' ? '#ffffff' : 'rgba(0,0,0,0)';
        if (!color) {
            return fallback;
        }

        const normalized = color.trim().toLowerCase();
        if (normalized === 'transparent' || normalized === 'rgba(0,0,0,0)' || normalized === 'rgba(0, 0, 0, 0)') {
            return fallback;
        }

        return color;
    }
}

