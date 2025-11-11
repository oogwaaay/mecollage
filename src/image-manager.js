// Image management
export class ImageManager {
    constructor() {
        this.images = [];
    }

    async addImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.images.push({
                        file,
                        url: e.target.result,
                        width: img.width,
                        height: img.height,
                        element: img,
                        filters: this.getDefaultFilters()
                    });
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    removeImage(index) {
        this.images.splice(index, 1);
    }

    reorderImages(fromIndex, toIndex, options = {}) {
        const { insertAfter = false } = options;
        const total = this.images.length;
        if (fromIndex < 0 || fromIndex >= total) {
            return false;
        }
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= total) toIndex = total - 1;

        if (fromIndex === toIndex && !insertAfter) {
            return false;
        }

        const [moved] = this.images.splice(fromIndex, 1);

        let insertIndex;
        if (insertAfter) {
            if (fromIndex <= toIndex) {
                insertIndex = toIndex;
            } else {
                insertIndex = toIndex + 1;
            }
        } else {
            if (fromIndex < toIndex) {
                insertIndex = toIndex - 1;
            } else {
                insertIndex = toIndex;
            }
        }

        insertIndex = Math.max(0, Math.min(insertIndex, this.images.length));
        this.images.splice(insertIndex, 0, moved);
        return insertIndex;
    }

    getImages() {
        return this.images;
    }

    clearImages() {
        this.images = [];
    }

    getImage(index) {
        return this.images[index];
    }

    getDefaultFilters() {
        return {
            preset: 'original',
            adjustments: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                warmth: 0,
                blur: 0
            }
        };
    }
}

