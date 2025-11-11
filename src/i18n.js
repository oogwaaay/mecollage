// Internationalization (i18n) System
const LANGUAGE_STORAGE_KEY = 'mecollage_lang';
const LEGACY_LANGUAGE_STORAGE_KEY = 'picstitch_lang';
export class I18n {
    constructor() {
        this.currentLang = this.getStoredLanguage() || 'en';
        this.translations = {};
        this.loadTranslations();
    }
    
    loadTranslations() {
        this.translations = {
            en: {
                common: {
                    backToTop: 'Back to top',
                    canvas: 'Canvas'
                },
                // Navigation
                nav: {
                    home: 'Home',
                    features: 'Features',
                    tutorial: 'Tutorial'
                },
                lang: {
                    name: 'English',
                    selector: 'Language',
                    options: {
                        en: 'English',
                        zh: '简体中文',
                        es: 'Español'
                    }
                },
                
                // Header
                header: {
                    title: 'MeCollage',
                    subtitle: 'Create beautiful collages with unlimited images',
                    description: 'Professional online image collage maker. Support horizontal, vertical, grid layouts and more. Easily create stunning image collages.',
                    badge1: '20+ Images',
                    badge2: 'Multiple Layouts',
                    badge3: 'Custom Grid',
                    badge4: 'Free to Use'
                },
                
                // Sidebar
                sidebar: {
                    uploadImages: 'Upload Images',
                    dragDrop: 'Drag & drop images here',
                    clickBrowse: 'or click to browse',
                    imagesLoaded: '{count} images loaded',
                    layoutTemplates: 'Layout Templates',
                    themeSpotlight: 'Theme Spotlight',
                    customGrid: 'Custom Grid',
                    rows: 'Rows',
                    columns: 'Columns',
                    apply: 'Apply',
                    settings: 'Settings',
                    spacing: 'Spacing',
                    border: 'Border',
                    borderColor: 'Border Color',
                    backgroundColor: 'Background Color',
                    imageFit: 'Image Fill',
                    imageFitCover: 'Fill (crop)',
                    imageFitContain: 'Fit (no crop)',
                    imageFitHintCover: 'Fill keeps the layout tight but may crop the photo edges.',
                    imageFitHintContain: 'Fit shows the full photo and adds gentle padding if needed.',
                    export: 'Export',
                    quality: 'Quality',
                    format: 'Format',
                    exportCollage: 'Export Collage',
                    selectPhotos: 'Select Photos',
                    decorate: 'Decorate',
                    filters: 'Filters',
                    aspectRatio: 'Canvas Ratio'
                },
                
                // Templates
                templates: {
                    horizontal: 'Horizontal',
                    vertical: 'Vertical',
                    twoColumns: 'Two Columns',
                    asymmetric: 'Asymmetric',
                    featured: 'Featured Grid',
                    grid1x1: '1x1 Grid',
                    grid1x2: '1x2 Grid',
                    grid2x1: '2x1 Grid',
                    grid2x2: '2x2 Grid',
                    grid2x3: '2x3 Grid',
                    grid3x2: '3x2 Grid',
                    grid3x3: '3x3 Grid',
                    grid3x4: '3x4 Grid',
                    grid4x3: '4x3 Grid',
                    grid4x4: '4x4 Grid',
                    grid4x5: '4x5 Grid',
                    grid5x4: '5x4 Grid',
                    grid5x5: '5x5 Grid',
                    grid6x4: '6x4 Grid',
                    grid6x5: '6x5 Grid',
                    grid5x6: '5x6 Grid',
                    grid4x6: '4x6 Grid',
                    grid7x3: '7x3 Grid',
                    grid3x7: '3x7 Grid',
                    grid8x3: '8x3 Grid',
                    grid3x8: '3x8 Grid',
                    grid10x2: '10x2 Grid',
                    grid2x10: '2x10 Grid',
                    grid10x3: '10x3 Grid',
                    grid3x10: '3x10 Grid',
                    grid6x6: '6x6 Grid',
                    grid7x5: '7x5 Grid',
                    grid5x7: '5x7 Grid',
                    grid7x7: '7x7 Grid',
                    grid8x6: '8x6 Grid',
                    grid6x8: '6x8 Grid',
                    grid8x8: '8x8 Grid',
                    grid9x6: '9x6 Grid',
                    grid6x9: '6x9 Grid',
                    grid9x9: '9x9 Grid',
                    grid10x8: '10x8 Grid',
                    grid8x10: '8x10 Grid',
                    grid10x10: '10x10 Grid',
                    grid12x8: '12x8 Grid',
                    grid8x12: '8x12 Grid',
                    grid12x12: '12x12 Grid',
                    grid16x9: '16x9 Grid',
                    grid9x16: '9x16 Grid',
                    grid20x1: '20x1 Grid',
                    grid1x20: '1x20 Grid',
                    categories: {
                        all: 'All Templates',
                        basics: 'Essentials',
                        gallery: 'Grid Gallery',
                        showcase: 'Showcase',
                        story: 'Story Boards',
                        panorama: 'Wide Panoramas'
                    },
                    favorite: {
                        add: 'Add to favorites',
                        remove: 'Remove from favorites'
                    },
                    themes: {
                        all: {
                            name: 'All Themes',
                            description: 'Browse every curated template with no filters applied.'
                        },
                        holiday: {
                            name: 'Holiday Greetings',
                            description: 'Festive grids for Christmas, New Year, and seasonal celebrations.'
                        },
                        commerce: {
                            name: 'E-commerce & Product',
                            description: 'Impactful layouts for product cards, catalogs, and promotions.'
                        },
                        travel: {
                            name: 'Travel Adventures',
                            description: 'Panoramic spreads for journeys and scenic highlights.'
                        },
                        photography: {
                            name: 'Photography Showcase',
                            description: 'Elegant layouts for curated portfolios and galleries.'
                        },
                        social: {
                            name: 'Social Media',
                            description: 'Feed-friendly grids for posts, Stories, and carousels.'
                        },
                        family: {
                            name: 'Family Memories',
                            description: 'Warm timelines for reunions, weddings, and milestones.'
                        }
                    },
                    recommendations: {
                        heading: 'AI Recommendation',
                        subtitle: 'Based on your current selection of {count} {photoLabel}.',
                        photo: {
                            single: 'photo',
                            plural: 'photos'
                        },
                        tags: {
                            exactFit: '{count} fit',
                            fitsUpTo: 'Up to {count}',
                            expandsTo: 'Holds {count}',
                            square: 'Square grid',
                            landscape: 'Wide layout',
                            portrait: 'Tall layout',
                            hero: 'Hero focus',
                            twoColumn: 'Split columns',
                            collage: 'Creative collage',
                            featured: 'Highlight grid',
                            story: 'Story flow',
                            flex: 'Flexible layout'
                        },
                        tooltip: {
                            moreInfo: 'View recommendation details',
                            gridExact: 'Every slot aligns with your {count} photo set.',
                            gridCapacity: 'Balanced arrangement for {count} photos (capacity {capacity}).',
                            gridExtra: 'Leaves {extra} open cell(s) for breathing room.',
                            gridOverflow: 'Fits up to {capacity} photos—currently {count} uploaded.',
                            gridNeedMore: 'Add {missing} more photo(s) to fill every slot.',
                            horizontalPrimary: 'Perfect for showcasing a wide hero image with support shots.',
                            horizontalSecondary: 'Best for covers, banners, and travel highlights.',
                            verticalPrimary: 'Tall layout ideal for portraits or story-style sequences.',
                            verticalSecondary: 'Works well as social stories or mood boards.',
                            twoColumnsPrimary: 'Split focus: compare products or pair imagery with details.',
                            twoColumnsSecondary: 'Keeps left/right columns balanced for clean storytelling.',
                            asymmetricPrimary: 'Dynamic collage with varied tile sizes for a curated look.',
                            asymmetricSecondary: 'Highlight one key visual with supporting snapshots.',
                            featuredPrimary: 'Spotlights a hero image surrounded by smaller accents.',
                            featuredSecondary: 'Great for announcements, menus, or portfolio hero moments.',
                            genericPrimary: 'Flexible layout ready to adapt to your photo mix.',
                            genericSecondary: 'Adjust spacing or add borders to fine-tune the balance.'
                        }
                    }
                },
                
                // Image Panel
                imagePanel: {
                    title: 'Image List',
                    dragHandle: 'Drag to reorder',
                    moveUp: 'Move up',
                    moveDown: 'Move down',
                    remove: 'Remove'
                },
                
                // Canvas
                canvas: {
                    placeholder: 'Upload images to start creating your collage',
                    expand: 'Expand Canvas',
                    collapse: 'Exit Fullscreen'
                },
                
                // Export
                export: {
                    exporting: 'Exporting...',
                    failed: 'Failed to export collage. Please try again.'
                },

                decorations: {
                    textHeading: 'Text Overlay',
                    textLabel: 'Text',
                    textColor: 'Color',
                    textSize: 'Size',
                    textPosition: 'Position',
                    addText: 'Add Text',
                    stickerHeading: 'Stickers',
                    stickerSize: 'Size',
                    stickerPosition: 'Position',
                    empty: 'No decorations yet',
                    sizeSmall: 'Small',
                    sizeMedium: 'Medium',
                    sizeLarge: 'Large',
                    sizeOriginal: 'Original',
                    sizeSquare: 'Square (1:1)',
                    sizeStory: 'Story (9:16)',
                    sizeLandscape: 'Landscape (16:9)',
                    positionTopLeft: 'Top Left',
                    positionTopCenter: 'Top Center',
                    positionTopRight: 'Top Right',
                    positionCenter: 'Center',
                    positionBottomLeft: 'Bottom Left',
                    positionBottomCenter: 'Bottom Center',
                    positionBottomRight: 'Bottom Right',
                    stickerSparkles: 'Sparkles',
                    stickerHeart: 'Heart',
                    stickerCamera: 'Camera',
                    stickerStar: 'Star',
                    stickerLeaf: 'Leaf',
                    remove: 'Remove',
                    moreColors: 'More',
                    presetWhite: 'White',
                    presetBlack: 'Black',
                    presetRed: 'Red',
                    presetYellow: 'Yellow',
                    presetGreen: 'Green',
                    textPlaceholder: '(Text)',
                    positionCustom: 'Custom position'
                },
                filters: {
                    presetsHeading: 'Quick Filters',
                    adjustHeading: 'Fine Tuning',
                    brightness: 'Brightness',
                    contrast: 'Contrast',
                    saturation: 'Saturation',
                    warmth: 'Warmth',
                    blur: 'Blur',
                    reset: 'Reset',
                    noImage: 'Upload an image to enable filters',
                    presetOriginal: 'Original',
                    presetWarm: 'Warm Glow',
                    presetVivid: 'Vivid Pop',
                    presetMono: 'Monochrome',
                    presetFilm: 'Film Grain',
                    presetSoft: 'Soft Pastel',
                    targetNone: 'Select an image to start editing filters',
                    targetSingle: 'Editing image {index} of {total}',
                    targetAll: 'Applying to all {total} images',
                    scopeLabel: 'Apply to',
                    scopeAria: 'Choose filter scope',
                    scopeCurrent: 'Current Image',
                    scopeAll: 'All Images'
                },
                
                // Features Page
                features: {
                    title: 'Features',
                    subtitle: 'Everything you need to create stunning collages',
                    unlimitedImages: {
                        title: 'Unlimited Images',
                        description: 'Support for 20+ images in a single collage. No restrictions on the number of images you can combine.'
                    },
                    multipleLayouts: {
                        title: 'Multiple Layout Templates',
                        description: 'Explore curated categories including Essentials, Grid Gallery, Showcase, Vertical Stories, and Wide Panoramas. Choose from horizontal, vertical, two-column, asymmetric, featured grids, and 25+ standard grid layouts.'
                    },
                smartSuggestions: {
                    title: 'Intelligent Layout Suggestions',
                    description: 'Let the AI recommend the best layouts as soon as you upload images. Suggested templates float to the top, auto-apply when appropriate, and adjust as you add or remove photos.'
                },
                    themeCollections: {
                        title: 'Curated Theme Collections',
                        description: 'Explore themed template groups for holidays, e-commerce, travel, photography, social media, and family memories—each with handpicked layouts tailored to the scenario.'
                    },
                    templateFavorites: {
                        title: 'Starred Template Favorites',
                        description: 'Click the star on any layout to build a personal favorites tray. Favorites stay highlighted, surface to the top of each category, and persist in your browser for quick reuse.'
                    },
                    customGrid: {
                        title: 'Custom Grid Layout',
                        description: 'Create your own grid with up to 30 rows and 30 columns. Perfect for large image collections.'
                    },
                    easyCustomization: {
                        title: 'Easy Customization',
                        description: 'Adjust spacing, borders, colors, background, apply quick filters or detailed sliders, and reorder uploads with drag-and-drop or quick arrows to perfect your story.'
                    },
                    highQualityExport: {
                        title: 'High Quality Export',
                        description: 'Export your collages in PNG or JPG format with adjustable quality settings. Perfect for sharing or printing.'
                    },
                    dragAndDrop: {
                        title: 'Drag & Drop Upload',
                        description: 'Simply drag and drop images or click to browse. Fast and intuitive image management.'
                    },
                    responsiveDesign: {
                        title: 'Responsive Design',
                        description: 'Works seamlessly on desktop, tablet, and mobile devices. Create collages anywhere, anytime.'
                    },
                    freeToUse: {
                        title: '100% Free',
                        description: 'No registration required. No watermarks. No hidden fees. Use all features completely free.'
                    }
                },
                
                // Tutorial Page
                tutorial: {
                    title: 'Tutorial',
                    subtitle: 'Learn how to create beautiful collages in minutes',
                    step1: {
                        title: 'Step 1: Upload Images',
                        description: 'Click the upload area or drag and drop your images. You can upload multiple images at once. Supports common image formats (JPG, PNG, GIF, WebP, etc.) supported by your browser.'
                    },
                    step2: {
                        title: 'Step 2: Choose a Layout',
                    description: 'Start with the AI recommendations pinned to the top. Use the theme spotlight chips to browse Holiday, Commerce, Travel, Photography, Social, or Family collections, and click the star on any layout to save it to your favorites. Drag images in the list—or tap the arrows—to reorder them before settling on a layout. You can still pick any preset manually or create a custom grid by specifying rows and columns.'
                    },
                    step3: {
                        title: 'Step 3: Customize Settings',
                        description: 'Adjust spacing, borders, background color, and apply filters using quick presets or detailed sliders—either per image or to all images at once.'
                    },
                    step4: {
                        title: 'Step 4: Preview & Export',
                        description: 'Preview your collage in real-time. When satisfied, choose your export format (PNG or JPG) and quality, then click Export to download.'
                    },
                    tips: {
                        title: 'Pro Tips',
                        tip1: 'For best results, use images with similar dimensions.',
                        tip2: 'Use custom grid layouts for large collections (20+ images).',
                        tip3: 'Adjust spacing to create breathing room between images.',
                        tip4: 'Export in PNG format for highest quality, JPG for smaller file sizes.',
                        tip5: 'You can remove individual images by hovering over them in the image list.',
                        tip6: 'Star frequently used layouts to keep them highlighted and ready for future collages.'
                    },
                    faq: {
                        title: 'Frequently Asked Questions',
                        q1: 'How many images can I use?',
                        a1: 'There is no hard limit. You can use as many images as you want, though we recommend keeping it under 50 for best performance.',
                        q2: 'What image formats are supported?',
                        a2: 'We support all image formats that your browser can handle, including JPG, PNG, GIF, WebP, and other common formats.',
                        q3: 'Can I rearrange images after uploading?',
                        a3: 'Yes. Drag thumbnails in the Image List or tap the up/down arrows to instantly update the order.',
                        q4: 'Is there a file size limit?',
                        a4: 'There is no strict limit, but very large images may take longer to process. We recommend images under 10MB each.',
                        q5: 'Can I use this on mobile devices?',
                        a5: 'Yes! MeCollage is fully responsive and works great on mobile devices, tablets, and desktops.'
                    }
                }
            },
            es: {
                common: {
                    backToTop: 'Volver arriba',
                    canvas: 'Lienzo'
                },
                nav: {
                    home: 'Inicio',
                    features: 'Funciones',
                    tutorial: 'Tutorial'
                },
                lang: {
                    name: 'Español',
                    selector: 'Idioma',
                    options: {
                        en: 'English',
                        zh: '简体中文',
                        es: 'Español'
                    }
                },
                header: {
                    title: 'MeCollage',
                    subtitle: 'Crea collages increíbles con imágenes ilimitadas',
                    description: 'Creador profesional de collages en línea. Admite composiciones horizontales, verticales, en rejilla y muchas más para lograr resultados sorprendentes.',
                    badge1: '20+ imágenes',
                    badge2: 'Múltiples diseños',
                    badge3: 'Rejilla personalizable',
                    badge4: 'Uso gratuito'
                },
                sidebar: {
                    uploadImages: 'Subir imágenes',
                    dragDrop: 'Arrastra y suelta aquí',
                    clickBrowse: 'o haz clic para buscar',
                    imagesLoaded: '{count} imágenes cargadas',
                    layoutTemplates: 'Plantillas de diseño',
                    themeSpotlight: 'Temas destacados',
                    customGrid: 'Rejilla personalizada',
                    rows: 'Filas',
                    columns: 'Columnas',
                    apply: 'Aplicar',
                    settings: 'Ajustes',
                    spacing: 'Espaciado',
                    border: 'Borde',
                    borderColor: 'Color del borde',
                    backgroundColor: 'Color de fondo',
                    imageFit: 'Ajuste de imagen',
                    imageFitCover: 'Rellenar (recorta)',
                    imageFitContain: 'Ajustar (sin recorte)',
                    imageFitHintCover: 'Rellenar mantiene el diseño compacto pero puede recortar los bordes de la foto.',
                    imageFitHintContain: 'Ajustar muestra la foto completa y agrega relleno cuando sea necesario.',
                    export: 'Exportar',
                    quality: 'Calidad',
                    format: 'Formato',
                    exportCollage: 'Exportar collage',
                    selectPhotos: 'Elegir fotos',
                    decorate: 'Decorar',
                    filters: 'Filtros',
                    aspectRatio: 'Relación del lienzo'
                },
                templates: {
                    horizontal: 'Horizontal',
                    vertical: 'Vertical',
                    twoColumns: 'Dos columnas',
                    asymmetric: 'Asimétrico',
                    featured: 'Rejilla destacada',
                    grid1x1: 'Rejilla 1x1',
                    grid1x2: 'Rejilla 1x2',
                    grid2x1: 'Rejilla 2x1',
                    grid2x2: 'Rejilla 2x2',
                    grid2x3: 'Rejilla 2x3',
                    grid3x2: 'Rejilla 3x2',
                    grid3x3: 'Rejilla 3x3',
                    grid3x4: 'Rejilla 3x4',
                    grid4x3: 'Rejilla 4x3',
                    grid4x4: 'Rejilla 4x4',
                    grid4x5: 'Rejilla 4x5',
                    grid5x4: 'Rejilla 5x4',
                    grid5x5: 'Rejilla 5x5',
                    grid6x4: 'Rejilla 6x4',
                    grid6x5: 'Rejilla 6x5',
                    grid5x6: 'Rejilla 5x6',
                    grid4x6: 'Rejilla 4x6',
                    grid7x3: 'Rejilla 7x3',
                    grid3x7: 'Rejilla 3x7',
                    grid8x3: 'Rejilla 8x3',
                    grid3x8: 'Rejilla 3x8',
                    grid10x2: 'Rejilla 10x2',
                    grid2x10: 'Rejilla 2x10',
                    grid10x3: 'Rejilla 10x3',
                    grid3x10: 'Rejilla 3x10',
                    grid6x6: 'Rejilla 6x6',
                    grid7x5: 'Rejilla 7x5',
                    grid5x7: 'Rejilla 5x7',
                    grid7x7: 'Rejilla 7x7',
                    grid8x6: 'Rejilla 8x6',
                    grid6x8: 'Rejilla 6x8',
                    grid8x8: 'Rejilla 8x8',
                    grid9x6: 'Rejilla 9x6',
                    grid6x9: 'Rejilla 6x9',
                    grid9x9: 'Rejilla 9x9',
                    grid10x8: 'Rejilla 10x8',
                    grid8x10: 'Rejilla 8x10',
                    grid10x10: 'Rejilla 10x10',
                    grid12x8: 'Rejilla 12x8',
                    grid8x12: 'Rejilla 8x12',
                    grid12x12: 'Rejilla 12x12',
                    grid16x9: 'Rejilla 16x9',
                    grid9x16: 'Rejilla 9x16',
                    grid20x1: 'Rejilla 20x1',
                    grid1x20: 'Rejilla 1x20',
                    categories: {
                        all: 'Todos los diseños',
                        basics: 'Esenciales',
                        gallery: 'Galería en rejilla',
                        showcase: 'Escaparate',
                        story: 'Historias verticales',
                        panorama: 'Panorámicas amplias'
                    },
                    favorite: {
                        add: 'Añadir a favoritos',
                        remove: 'Quitar de favoritos'
                    },
                    themes: {
                        all: {
                            name: 'Todos los temas',
                            description: 'Explora todas las plantillas seleccionadas sin filtros.'
                        },
                        holiday: {
                            name: 'Felicitaciones festivas',
                            description: 'Collages llenos de color para Navidad, Año Nuevo y celebraciones de temporada.'
                        },
                        commerce: {
                            name: 'E-commerce y producto',
                            description: 'Diseños impactantes para fichas de producto, catálogos y promociones.'
                        },
                        travel: {
                            name: 'Aventuras de viaje',
                            description: 'Composiciones panorámicas para rutas, paisajes y diarios de viaje.'
                        },
                        photography: {
                            name: 'Muestra fotográfica',
                            description: 'Estructuras elegantes para portfolios y galerías curadas.'
                        },
                        social: {
                            name: 'Redes sociales',
                            description: 'Rejillas optimizadas para publicaciones, Stories y carruseles.'
                        },
                        family: {
                            name: 'Recuerdos familiares',
                            description: 'Cronologías cálidas para reuniones, bodas y momentos especiales.'
                        }
                    },
                    recommendations: {
                        heading: 'Recomendación IA',
                        subtitle: 'Según tu selección actual de {count} {photoLabel}.',
                        photo: {
                            single: 'foto',
                            plural: 'fotos'
                        },
                        tags: {
                            exactFit: 'Justo para {count}',
                            fitsUpTo: 'Hasta {count}',
                            expandsTo: 'Admite {count}',
                            square: 'Rejilla cuadrada',
                            landscape: 'Diseño horizontal',
                            portrait: 'Diseño vertical',
                            hero: 'Imagen protagonista',
                            twoColumn: 'Columnas divididas',
                            collage: 'Collage creativo',
                            featured: 'Rejilla destacada',
                            story: 'Flujo tipo historia',
                            flex: 'Diseño flexible'
                        },
                        tooltip: {
                            moreInfo: 'Ver detalles de la recomendación',
                            gridExact: 'Cada espacio coincide con tus {count} fotos.',
                            gridCapacity: 'Disposición equilibrada para {count} fotos (capacidad {capacity}).',
                            gridExtra: 'Deja {extra} espacios libres para respirar.',
                            gridOverflow: 'Admite hasta {capacity} fotos; ahora hay {count} cargadas.',
                            gridNeedMore: 'Añade {missing} foto(s) más para completar todas las celdas.',
                            horizontalPrimary: 'Ideal para resaltar una imagen panorámica con apoyo visual.',
                            horizontalSecondary: 'Perfecto para portadas, banners y resúmenes de viaje.',
                            verticalPrimary: 'Diseño alto ideal para retratos o narrativas tipo historia.',
                            verticalSecondary: 'Funciona muy bien como secuencia para Stories o moodboards.',
                            twoColumnsPrimary: 'Divide el foco: compara productos o combina imagen y texto.',
                            twoColumnsSecondary: 'Mantiene el equilibrio izquierda/derecha para contar historias.',
                            asymmetricPrimary: 'Collage dinámico con tamaños variados para un look editorial.',
                            asymmetricSecondary: 'Destaca una imagen principal con fotos complementarias.',
                            featuredPrimary: 'Enmarca una imagen heroína rodeada de acentos.',
                            featuredSecondary: 'Genial para anuncios, menús o proyectos destacados.',
                            genericPrimary: 'Diseño flexible listo para adaptarse a tu selección.',
                            genericSecondary: 'Ajusta el espaciado o los bordes para equilibrar el conjunto.'
                        }
                    }
                },
                imagePanel: {
                    title: 'Listado de imágenes',
                    dragHandle: 'Arrastra para reordenar',
                    moveUp: 'Mover arriba',
                    moveDown: 'Mover abajo',
                    remove: 'Eliminar'
                },
                canvas: {
                    placeholder: 'Sube imágenes para empezar tu collage',
                    expand: 'Ampliar lienzo',
                    collapse: 'Salir de pantalla completa'
                },
                export: {
                    exporting: 'Exportando...',
                    failed: 'No se pudo exportar el collage. Inténtalo de nuevo.'
                },
                decorations: {
                    textHeading: 'Texto superpuesto',
                    textLabel: 'Texto',
                    textColor: 'Color',
                    textSize: 'Tamaño',
                    textPosition: 'Posición',
                    addText: 'Añadir texto',
                    stickerHeading: 'Stickers',
                    stickerSize: 'Tamaño',
                    stickerPosition: 'Posición',
                    empty: 'Aún no hay elementos',
                    sizeSmall: 'Pequeño',
                    sizeMedium: 'Mediano',
                    sizeLarge: 'Grande',
                    sizeOriginal: 'Original',
                    sizeSquare: 'Cuadrado (1:1)',
                    sizeStory: 'Historia (9:16)',
                    sizeLandscape: 'Horizontal (16:9)',
                    positionTopLeft: 'Arriba izquierda',
                    positionTopCenter: 'Arriba centro',
                    positionTopRight: 'Arriba derecha',
                    positionCenter: 'Centro',
                    positionBottomLeft: 'Abajo izquierda',
                    positionBottomCenter: 'Abajo centro',
                    positionBottomRight: 'Abajo derecha',
                    stickerSparkles: 'Destellos',
                    stickerHeart: 'Corazón',
                    stickerCamera: 'Cámara',
                    stickerStar: 'Estrella',
                    stickerLeaf: 'Hoja',
                    remove: 'Eliminar',
                    moreColors: 'Más colores',
                    presetWhite: 'Blanco',
                    presetBlack: 'Negro',
                    presetRed: 'Rojo',
                    presetYellow: 'Amarillo',
                    presetGreen: 'Verde',
                    textPlaceholder: '(Texto)',
                    positionCustom: 'Posición personalizada'
                },
                filters: {
                    presetsHeading: 'Filtros rápidos',
                    adjustHeading: 'Ajustes finos',
                    brightness: 'Brillo',
                    contrast: 'Contraste',
                    saturation: 'Saturación',
                    warmth: 'Calidez',
                    blur: 'Desenfoque',
                    reset: 'Restablecer',
                    noImage: 'Sube una imagen para activar los filtros',
                    presetOriginal: 'Original',
                    presetWarm: 'Brillo cálido',
                    presetVivid: 'Color intenso',
                    presetMono: 'Monocromo',
                    presetFilm: 'Película retro',
                    presetSoft: 'Suave pastel',
                    targetNone: 'Selecciona una imagen para ajustar filtros',
                    targetSingle: 'Editando la imagen {index} de {total}',
                    targetAll: 'Aplicando a las {total} imágenes',
                    scopeLabel: 'Aplicar a',
                    scopeAria: 'Elegir alcance del filtro',
                    scopeCurrent: 'Imagen actual',
                    scopeAll: 'Todas las imágenes'
                },
                features: {
                    title: 'Funciones',
                    subtitle: 'Todo lo necesario para crear collages espectaculares',
                    unlimitedImages: {
                        title: 'Imágenes ilimitadas',
                        description: 'Admite más de 20 fotos en un solo collage sin límites rígidos.'
                    },
                    multipleLayouts: {
                        title: 'Plantillas variadas',
                        description: 'Explora colecciones curadas: Esenciales, Galerías en rejilla, Escaparate, Historias verticales y Panorámicas. Incluye horizontales, verticales, dos columnas, asimétricas y más de 25 rejillas clásicas.'
                    },
                    smartSuggestions: {
                        title: 'Recomendaciones inteligentes',
                        description: 'La IA propone el mejor diseño en cuanto subes las fotos. Los sugeridos suben al inicio, pueden aplicarse automáticamente y cambian al agregar o quitar imágenes.'
                    },
                    themeCollections: {
                        title: 'Colecciones temáticas',
                        description: 'Grupos listos para festividades, e-commerce, viajes, fotografía, redes sociales y recuerdos familiares, cada uno con plantillas seleccionadas.'
                    },
                    templateFavorites: {
                        title: 'Favoritos con estrella',
                        description: 'Marca cualquier diseño con la estrella para guardarlo siempre a mano. Tus favoritos aparecen arriba y se guardan en el navegador.'
                    },
                    customGrid: {
                        title: 'Rejilla personalizada',
                        description: 'Diseña rejillas propias con hasta 30 filas y 30 columnas, ideal para colecciones grandes.'
                    },
                    easyCustomization: {
                        title: 'Personalización sencilla',
                        description: 'Ajusta espaciado, bordes, colores y fondo; aplica filtros rápidos o detallados y reorganiza fotos con arrastrar y soltar o flechas.'
                    },
                    highQualityExport: {
                        title: 'Exportación en alta calidad',
                        description: 'Descarga en PNG o JPG con control de calidad, perfecto para compartir o imprimir.'
                    },
                    dragAndDrop: {
                        title: 'Subida con arrastrar y soltar',
                        description: 'Gestiona las imágenes de forma rápida: arrastra desde tu carpeta o usa el botón de selección.'
                    },
                    responsiveDesign: {
                        title: 'Diseño adaptable',
                        description: 'Funciona fluidamente en escritorio, tablet y móvil para crear collages donde quieras.'
                    },
                    freeToUse: {
                        title: '100% gratuito',
                        description: 'Sin registros, marcas de agua ni cargos ocultos. Usa todas las funciones libremente.'
                    }
                },
                tutorial: {
                    title: 'Tutorial',
                    subtitle: 'Aprende a crear collages en pocos minutos',
                    step1: {
                        title: 'Paso 1: Subir imágenes',
                        description: 'Haz clic en la zona de subida o arrastra tus fotos. Puedes cargar varias a la vez en formatos JPG, PNG, GIF, WebP y otros compatibles.'
                    },
                    step2: {
                        title: 'Paso 2: Elegir diseño',
                        description: 'Comienza con las recomendaciones destacadas por la IA. Usa las fichas de temas para explorar Festividades, Comercio, Viajes, Fotografía, Social o Familia y marca tus favoritos. Arrastra el listado o usa las flechas para fijar el orden antes de confirmar un diseño. También puedes crear tu propia rejilla indicando filas y columnas.'
                    },
                    step3: {
                        title: 'Paso 3: Personalizar detalles',
                        description: 'Ajusta el espacio, los bordes, el color de fondo y aplica filtros rápidos o controles avanzados por imagen o en todas a la vez.'
                    },
                    step4: {
                        title: 'Paso 4: Previsualizar y exportar',
                        description: 'Visualiza el collage al instante. Cuando estés conforme, elige formato (PNG o JPG), calidad, y pulsa Exportar para descargarlo.'
                    },
                    tips: {
                        title: 'Consejos pro',
                        tip1: 'Usa fotos con dimensiones similares para un resultado uniforme.',
                        tip2: 'Apóyate en la rejilla personalizada para colecciones grandes (20+ imágenes).',
                        tip3: 'Mantén algo de espacio entre las fotos para que respiren.',
                        tip4: 'Exporta en PNG para máxima calidad y en JPG para archivos ligeros.',
                        tip5: 'Puedes quitar cualquier imagen desde la lista lateral en un instante.',
                        tip6: 'Marca tus diseños favoritos para reutilizarlos más rápido.'
                    },
                    faq: {
                        title: 'Preguntas frecuentes',
                        q1: '¿Cuántas imágenes puedo usar?',
                        a1: 'No hay un límite estricto, aunque recomendamos menos de 50 para un rendimiento óptimo.',
                        q2: '¿Qué formatos de imagen son compatibles?',
                        a2: 'Cualquier formato que admita tu navegador: JPG, PNG, GIF, WebP y otros habituales.',
                        q3: '¿Puedo reorganizar las fotos después de subirlas?',
                        a3: 'Sí. Arrastra las miniaturas en la lista o usa las flechas de subir/bajar para cambiar el orden al instante.',
                        q4: '¿Existe un límite de tamaño de archivo?',
                        a4: 'No hay un límite rígido, pero los archivos muy grandes pueden tardar más en procesarse. Recomendamos imágenes menores a 10 MB.',
                        q5: '¿Funciona en dispositivos móviles?',
                        a5: '¡Claro! MeCollage está totalmente adaptado a móviles, tablets y ordenadores.'
                    }
                }
            },
            zh: {
                common: {
                    backToTop: '返回顶部',
                    canvas: '画布'
                },
                // Navigation
                nav: {
                    home: '首页',
                    features: '功能特性',
                    tutorial: '使用教程'
                },
                lang: {
                    name: '简体中文',
                    selector: '语言',
                    options: {
                        en: 'English',
                        zh: '简体中文',
                        es: 'Español'
                    }
                },
                
                // Header
                header: {
                    title: 'MeCollage',
                    subtitle: '将多张照片拼接成精美的拼图',
                    description: '专业的在线图片拼接工具，支持横屏、竖屏、九宫图等多种布局，轻松创建精美的图片拼贴作品。',
                    badge1: '支持20+张图片',
                    badge2: '多种布局模板',
                    badge3: '自定义网格',
                    badge4: '免费使用'
                },
                
                // Sidebar
                sidebar: {
                    uploadImages: '上传图片',
                    dragDrop: '拖拽图片到这里',
                    clickBrowse: '或点击浏览',
                    imagesLoaded: '已加载 {count} 张图片',
                    layoutTemplates: '布局模板',
                    themeSpotlight: '主题精选',
                    customGrid: '自定义网格',
                    rows: '行数',
                    columns: '列数',
                    apply: '应用',
                    settings: '设置',
                    spacing: '间距',
                    border: '边框',
                    borderColor: '边框颜色',
                    backgroundColor: '背景颜色',
                    imageFit: '图片适配',
                    imageFitCover: '填满（可能裁剪）',
                    imageFitContain: '适应（不裁剪）',
                    imageFitHintCover: '选择填满可以铺满格子，但可能裁掉照片边缘。',
                    imageFitHintContain: '选择适应会完整显示照片，必要时在四周留出空白。',
                    export: '导出',
                    quality: '质量',
                    format: '格式',
                    exportCollage: '导出拼图',
                    selectPhotos: '选择照片',
                    decorate: '创意装饰',
                    filters: '滤镜调色',
                    aspectRatio: '画布比例'
                },
                
                // Templates
                templates: {
                    horizontal: '横向',
                    vertical: '纵向',
                    twoColumns: '两列',
                    asymmetric: '不对称',
                    featured: '特色网格',
                    grid2x2: '2x2 网格',
                    grid3x3: '3x3 网格',
                    grid4x4: '4x4 网格',
                    grid5x4: '5x4 网格',
                    grid4x5: '4x5 网格',
                    grid6x4: '6x4 网格',
                    grid4x6: '4x6 网格',
                    grid5x5: '5x5 网格',
                    grid6x5: '6x5 网格',
                    grid5x6: '5x6 网格',
                    grid7x3: '7x3 网格',
                    grid3x7: '3x7 网格',
                    grid8x3: '8x3 网格',
                    grid3x8: '3x8 网格',
                    grid10x2: '10x2 网格',
                    grid2x10: '2x10 网格',
                    grid10x3: '10x3 网格',
                    grid3x10: '3x10 网格',
                    grid20x1: '20x1 网格',
                    grid1x20: '1x20 网格',
                    categories: {
                        all: '全部模板',
                        basics: '基础布局',
                        gallery: '宫格画廊',
                        showcase: '焦点展示',
                        story: '故事拼贴',
                        panorama: '宽幅拼贴'
                    },
                    favorite: {
                        add: '加入收藏',
                        remove: '移出收藏'
                    },
                    themes: {
                        all: {
                            name: '全部主题',
                            description: '查看所有主题模板，不做任何筛选。'
                        },
                        holiday: {
                            name: '节日祝福',
                            description: '适用于圣诞、新年等节日的温馨拼贴。'
                        },
                        commerce: {
                            name: '电商/产品',
                            description: '突出商品卖点、价格信息与促销内容。'
                        },
                        travel: {
                            name: '旅行冒险',
                            description: '适合旅途记忆与全景风光的拼贴。'
                        },
                        photography: {
                            name: '摄影作品集',
                            description: '干净利落的作品展示与画廊排版。'
                        },
                        social: {
                            name: '社交媒体',
                            description: '为 Feed、Stories、轮播等社交内容优化的布局。'
                        },
                        family: {
                            name: '家庭纪念',
                            description: '温馨时刻、婚礼与聚会的时间轴与拼图。'
                        }
                    },
                    recommendations: {
                        heading: '智能推荐',
                        subtitle: '基于当前上传的 {count}{photoLabel}：',
                        photo: {
                            single: '张图片',
                            plural: '张图片'
                        },
                        tags: {
                            exactFit: '{count} 张刚好合适',
                            fitsUpTo: '可容纳至 {count} 张',
                            expandsTo: '最多可放 {count} 张',
                            square: '正方形布局',
                            landscape: '横向布局',
                            portrait: '纵向布局',
                            hero: '主图突出',
                            twoColumn: '双列对比',
                            collage: '创意拼贴',
                            featured: '重点呈现',
                            story: '故事纵向',
                            flex: '灵活布局'
                        },
                        tooltip: {
                            moreInfo: '查看更多推荐说明',
                            gridExact: '与当前 {count} 张图片数量完全匹配。',
                            gridCapacity: '平衡呈现 {count} 张图片（容量 {capacity}）。',
                            gridExtra: '保留 {extra} 个空格，营造呼吸感。',
                            gridOverflow: '此布局最多容纳 {capacity} 张，当前已有 {count} 张。',
                            gridNeedMore: '再补充 {missing} 张即可填满所有单元。',
                            horizontalPrimary: '适合横幅主图，搭配几张补充照片。',
                            horizontalSecondary: '适用于封面、旅行横向故事等场景。',
                            verticalPrimary: '纵向长图，适合人像或故事流程。',
                            verticalSecondary: '可作为社交 Stories 或氛围拼贴。',
                            twoColumnsPrimary: '双列分区，便于图文对比展示。',
                            twoColumnsSecondary: '左右平衡，信息层级清晰。',
                            asymmetricPrimary: '大小错落的拼贴，营造杂志感排版。',
                            asymmetricSecondary: '突出主视觉，搭配辅助照片。',
                            featuredPrimary: '中央主图搭配外围精致小图。',
                            featuredSecondary: '适合公告、菜单或作品重点展示。',
                            genericPrimary: '灵活布局，可随内容调整。',
                            genericSecondary: '可调节间距或边框，微调整体平衡。'
                        }
                    }
                },
                
                // Image Panel
                imagePanel: {
                    title: '图片列表',
                    dragHandle: '拖拽以调整顺序',
                    moveUp: '上移',
                    moveDown: '下移',
                    remove: '移除'
                },
                
                // Canvas
                canvas: {
                    placeholder: '上传图片即可开始创作拼图',
                    expand: '全屏查看画布',
                    collapse: '退出全屏'
                },
                
                // Export
                export: {
                    exporting: '正在导出...',
                    failed: '导出失败，请重试。'
                },

                decorations: {
                    textHeading: '文字叠加',
                    textLabel: '文字内容',
                    textColor: '颜色',
                    textSize: '字号',
                    textPosition: '位置',
                    addText: '添加文字',
                    stickerHeading: '贴纸',
                    stickerSize: '贴纸大小',
                    stickerPosition: '贴纸位置',
                    empty: '暂未添加装饰',
                    sizeSmall: '小号',
                    sizeMedium: '中号',
                    sizeLarge: '大号',
                    sizeOriginal: '原始比例',
                    sizeSquare: '方形 1:1',
                    sizeStory: '竖屏 9:16',
                    sizeLandscape: '横屏 16:9',
                    positionTopLeft: '左上',
                    positionTopCenter: '上中',
                    positionTopRight: '右上',
                    positionCenter: '居中',
                    positionBottomLeft: '左下',
                    positionBottomCenter: '下中',
                    positionBottomRight: '右下',
                    stickerSparkles: '亮闪',
                    stickerHeart: '爱心',
                    stickerCamera: '相机',
                    stickerStar: '星星',
                    stickerLeaf: '绿叶',
                    remove: '移除',
                    moreColors: '更多颜色',
                    presetWhite: '白色',
                    presetBlack: '黑色',
                    presetRed: '红色',
                    presetYellow: '黄色',
                    presetGreen: '绿色',
                    textPlaceholder: '（文字）',
                    positionCustom: '自定义位置'
                },
                filters: {
                    presetsHeading: '滤镜速选',
                    adjustHeading: '精细调整',
                    brightness: '亮度',
                    contrast: '对比度',
                    saturation: '饱和度',
                    warmth: '暖色调',
                    blur: '模糊',
                    reset: '重置',
                    noImage: '上传图片后即可使用滤镜',
                    presetOriginal: '原片',
                    presetWarm: '暖色柔光',
                    presetVivid: '炫彩增强',
                    presetMono: '黑白胶片',
                    presetFilm: '复古电影',
                    presetSoft: '柔焦粉调',
                    targetNone: '请选择图片后再调整滤镜',
                    targetSingle: '当前调整：第 {index} 张 / 共 {total} 张',
                    targetAll: '当前调整：应用于全部 {total} 张',
                    scopeLabel: '应用范围',
                    scopeAria: '选择滤镜应用范围',
                    scopeCurrent: '当前图片',
                    scopeAll: '全部图片'
                },
                
                // Features Page
                features: {
                    title: '功能特性',
                    subtitle: '打造惊艳拼图的一切所需',
                    unlimitedImages: {
                        title: '无限制图片数量',
                        description: '支持单次拼接20+张图片。对图片数量没有限制，可以自由组合任意数量的图片。'
                    },
                    multipleLayouts: {
                        title: '多种布局模板',
                        description: '按主题分类浏览基础排版、网格画廊、重点展示、竖版长图、横幅全景等模板。涵盖横向、纵向、两列、不对称、特色网格以及25+种标准网格布局。'
                    },
                smartSuggestions: {
                    title: '智能布局推荐',
                    description: '上传图片后，AI 会即时推荐最合适的布局并自动置顶展示，可按需一键应用，并会随着图片增减动态调整。'
                },
                    themeCollections: {
                        title: '主题精选模板',
                        description: '按节日祝福、电商产品、旅行冒险、摄影作品集、社交媒体、家庭纪念等场景预配模板合集，快速定位最匹配的排版方案。'
                    },
                    templateFavorites: {
                        title: '模板收藏夹',
                        description: '点击任意布局右上角的星标，即可建立个人收藏。收藏模板会高亮显示、在所属分类顶部优先展示，并保存在浏览器中方便下次继续使用。'
                    },
                    customGrid: {
                        title: '自定义网格布局',
                        description: '创建最多30行30列的自定义网格。非常适合大量图片的集合。'
                    },
                    easyCustomization: {
                        title: '轻松自定义',
                        description: '自由调节间距、边框、颜色与背景，搭配速选滤镜或滑杆微调，并可通过拖拽或快捷箭头调整图片顺序，全面掌控版面节奏。'
                    },
                    highQualityExport: {
                        title: '高质量导出',
                        description: '以PNG或JPG格式导出拼图，可调节质量设置。非常适合分享或打印。'
                    },
                    dragAndDrop: {
                        title: '拖拽上传',
                        description: '只需拖拽图片或点击浏览。快速直观的图片管理。'
                    },
                    responsiveDesign: {
                        title: '响应式设计',
                        description: '在桌面、平板和移动设备上无缝工作。随时随地创建拼图。'
                    },
                    freeToUse: {
                        title: '100% 免费',
                        description: '无需注册。无水印。无隐藏费用。完全免费使用所有功能。'
                    }
                },
                
                // Tutorial Page
                tutorial: {
                    title: '使用教程',
                    subtitle: '几分钟学会创建精美拼图',
                    step1: {
                        title: '步骤1：上传图片',
                        description: '点击上传区域或拖拽图片。可以一次上传多张图片。支持浏览器支持的所有常见图片格式（JPG、PNG、GIF、WebP等）。'
                    },
                    step2: {
                        title: '步骤 2：选择布局',
                    description: '从上方的智能推荐开始挑选，用主题标签浏览节日、电商、旅行、摄影、社交或家庭等场景，并可点击星标保存常用模板。随时拖拽右侧图片列表，或使用上下箭头，快速调整排列顺序。你仍然可以手动选择任意预设或通过设置行列创建自定义网格。'
                    },
                    step3: {
                        title: '步骤 3：调整细节',
                        description: '设置图片间距、边框、背景颜色，并使用滤镜速选或滑杆微调，可针对单张或全部图片调整，打造符合你构想的风格.'
                    },
                    step4: {
                        title: '步骤4：预览和导出',
                        description: '实时预览你的拼图。满意后，选择导出格式（PNG或JPG）和质量，然后点击导出下载.'
                    },
                    tips: {
                        title: '专业提示',
                        tip1: '为了获得最佳效果，请使用尺寸相似的图片。',
                        tip2: '对于大量图片（20+张），使用自定义网格布局。',
                        tip3: '调整间距以在图片之间创造呼吸空间。',
                        tip4: 'PNG格式导出质量最高，JPG格式文件更小。',
                        tip5: '可以通过悬停在图片列表中的图片上来删除单个图片。',
                        tip6: '给常用模板点亮星标，收藏后会高亮显示，方便下次继续使用。'
                    },
                    faq: {
                        title: '常见问题',
                        q1: '我可以使用多少张图片？',
                        a1: '没有硬性限制。你可以使用任意数量的图片，但我们建议保持在50张以下以获得最佳性能。',
                        q2: '支持哪些图片格式？',
                        a2: '我们支持浏览器可以处理的所有图片格式，包括JPG、PNG、GIF、WebP等常见格式。',
                        q3: '上传后还能重新排列图片顺序吗？',
                        a3: '可以。在图片列表中拖拽缩略图，或者点击上下箭头即可即时调整位置。',
                        q4: '图片大小有没有限制？',
                        a4: '没有严格限制，但超大的图片会耗时更久。建议单张图片控制在10MB以内。',
                        q5: '移动端能正常使用吗？',
                        a5: '当然可以！MeCollage 针对手机、平板与桌面端进行了完整优化。'
                    }
                }
            }
        };
    }
    
    init() {
        this.setLanguage(this.currentLang);
    }
    
    getStoredLanguage() {
        try {
            const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (stored) {
                return stored;
            }
            const legacy = localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
            if (legacy) {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, legacy);
                localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
                return legacy;
            }
        } catch (error) {
            console.warn('Unable to read language preference', error);
        }
        return 'en';
    }
    
    setStoredLanguage(lang) {
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
            localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
        } catch (error) {
            console.warn('Unable to persist language preference', error);
        }
    }
    
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            this.setStoredLanguage(lang);
            this.updatePage();
            document.documentElement.lang = lang;
            document.dispatchEvent(new CustomEvent('language-changed', { detail: lang }));
        }
    }
    
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation missing: ${key}`);
                return key;
            }
        }
        
        // Replace parameters
        if (typeof value === 'string' && params) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value;
    }
    
    updatePage() {
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        if (navLinks.length >= 3) {
            navLinks[0].textContent = this.t('nav.home');
            navLinks[1].textContent = this.t('nav.features');
            navLinks[2].textContent = this.t('nav.tutorial');
        }
        
        // Update page content if on features or tutorial page
        this.updatePageContent();
        
        // Update language selector
        const langSelector = document.querySelector('.lang-selector span:last-child');
        if (langSelector) {
            langSelector.textContent = this.t('lang.name');
        }
        
        // Update header
        const title = document.querySelector('.ghibli-title');
        if (title) title.textContent = this.t('header.title');
        
        const subtitle = document.querySelector('.ghibli-subtitle');
        if (subtitle) subtitle.textContent = this.t('header.subtitle');
        
        const description = document.querySelector('.header-description');
        if (description) description.textContent = this.t('header.description');
        
        const badges = document.querySelectorAll('.badge');
        if (badges.length >= 4) {
            badges[0].textContent = this.t('header.badge1');
            badges[1].textContent = this.t('header.badge2');
            badges[2].textContent = this.t('header.badge3');
            badges[3].textContent = this.t('header.badge4');
        }
        
        // Update sidebar
        this.updateSidebar();
        
        // Update image panel
        const imagePanelTitle = document.querySelector('.image-panel h2');
        if (imagePanelTitle) {
            imagePanelTitle.textContent = this.t('imagePanel.title');
        }
        
        // Update canvas placeholder
        const canvasPlaceholder = document.querySelector('#canvasPlaceholder p');
        if (canvasPlaceholder) {
            canvasPlaceholder.textContent = this.t('canvas.placeholder');
        }
    }
    
    updateSidebar() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const paramsAttr = el.getAttribute('data-i18n-params');
            let params = {};
            
            if (paramsAttr) {
                try {
                    params = JSON.parse(paramsAttr);
                } catch (e) {
                    console.warn('Invalid i18n params:', paramsAttr);
                }
            }
            
            // Special handling for elements that contain inputs
            if (el.tagName === 'LABEL' && el.querySelector('input, select')) {
                const span = el.querySelector('span[data-i18n]');
                if (span) {
                    span.textContent = this.t(key, params);
                }
            } else {
                el.textContent = this.t(key, params);
            }
        });
        
        // Re-attach event listeners for inputs that were recreated
        this.reattachEventListeners();
    }
    
    reattachEventListeners() {
        // This will be handled by the main App class
        // We just need to make sure the inputs exist
    }
    
    updateTemplates() {
        // This will be called by TemplateManager after templates are rendered
        const templateNames = document.querySelectorAll('.template-name');
        const templateKeys = [
            'templates.horizontal',
            'templates.vertical',
            'templates.twoColumns',
            'templates.asymmetric',
            'templates.featured',
            'templates.grid2x2',
            'templates.grid3x3',
            'templates.grid4x4',
            'templates.grid5x4',
            'templates.grid4x5',
            'templates.grid6x4',
            'templates.grid4x6',
            'templates.grid5x5',
            'templates.grid6x5',
            'templates.grid5x6',
            'templates.grid7x3',
            'templates.grid3x7',
            'templates.grid8x3',
            'templates.grid3x8',
            'templates.grid10x2',
            'templates.grid2x10',
            'templates.grid10x3',
            'templates.grid3x10',
            'templates.grid20x1',
            'templates.grid1x20'
        ];
        
        templateNames.forEach((nameEl, index) => {
            if (templateKeys[index]) {
                nameEl.textContent = this.t(templateKeys[index]);
            }
        });
    }
    
    updateImageCount(count) {
        const imageCountEl = document.getElementById('imageCount');
        if (imageCountEl) {
            imageCountEl.textContent = this.t('sidebar.imagesLoaded', { count });
            // Update the data attribute for future language changes
            imageCountEl.setAttribute('data-i18n-params', JSON.stringify({ count }));
        }
    }
    
    updatePageContent() {
        // Update features page
        const featuresPage = document.getElementById('page-features');
        if (featuresPage) {
            const title = featuresPage.querySelector('.page-title');
            const subtitle = featuresPage.querySelector('.page-subtitle');
            if (title) title.textContent = this.t('features.title');
            if (subtitle) subtitle.textContent = this.t('features.subtitle');
            
            // Update feature cards
            const featureCards = featuresPage.querySelectorAll('.feature-card');
            const featureKeys = [
                'unlimitedImages',
                'multipleLayouts',
                'smartSuggestions',
                'themeCollections',
                'templateFavorites',
                'customGrid',
                'easyCustomization',
                'highQualityExport',
                'dragAndDrop',
                'responsiveDesign',
                'freeToUse'
            ];
            
            featureCards.forEach((card, index) => {
                if (featureKeys[index]) {
                    const cardTitle = card.querySelector('.feature-card-title');
                    const cardDesc = card.querySelector('.feature-card-desc');
                    if (cardTitle) cardTitle.textContent = this.t(`features.${featureKeys[index]}.title`);
                    if (cardDesc) cardDesc.textContent = this.t(`features.${featureKeys[index]}.description`);
                }
            });
        }
        
        // Update tutorial page
        const tutorialPage = document.getElementById('page-tutorial');
        if (tutorialPage) {
            const title = tutorialPage.querySelector('.page-title');
            const subtitle = tutorialPage.querySelector('.page-subtitle');
            if (title) title.textContent = this.t('tutorial.title');
            if (subtitle) subtitle.textContent = this.t('tutorial.subtitle');
            
            // Update steps
            const steps = tutorialPage.querySelectorAll('.tutorial-step');
            steps.forEach((step, index) => {
                const stepTitle = step.querySelector('.step-title');
                const stepDesc = step.querySelector('.step-desc');
                if (stepTitle) stepTitle.textContent = this.t(`tutorial.step${index + 1}.title`);
                if (stepDesc) stepDesc.textContent = this.t(`tutorial.step${index + 1}.description`);
            });
            
            // Update tips
            const tipsTitle = tutorialPage.querySelector('.tips-title');
            if (tipsTitle) tipsTitle.textContent = this.t('tutorial.tips.title');
            const tipItems = tutorialPage.querySelectorAll('.tip-item');
            tipItems.forEach((tip, index) => {
                if (tip) tip.textContent = this.t(`tutorial.tips.tip${index + 1}`);
            });
            
            // Update FAQ
            const faqTitle = tutorialPage.querySelector('.faq-title');
            if (faqTitle) faqTitle.textContent = this.t('tutorial.faq.title');
            const faqItems = tutorialPage.querySelectorAll('.faq-item');
            faqItems.forEach((item, index) => {
                const q = item.querySelector('.faq-question');
                const a = item.querySelector('.faq-answer');
                if (q) q.textContent = this.t(`tutorial.faq.q${index + 1}`);
                if (a) a.textContent = this.t(`tutorial.faq.a${index + 1}`);
            });
        }
    }
}

// Export singleton instance
export const i18n = new I18n();

