var ie=Object.defineProperty,oe=Object.defineProperties;var se=Object.getOwnPropertyDescriptors;var A=Object.getOwnPropertySymbols;var _=Object.prototype.hasOwnProperty,Y=Object.prototype.propertyIsEnumerable;var V=(u,e,t)=>e in u?ie(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t,v=(u,e)=>{for(var t in e||(e={}))_.call(e,t)&&V(u,t,e[t]);if(A)for(var t of A(e))Y.call(e,t)&&V(u,t,e[t]);return u},P=(u,e)=>oe(u,se(e));var M=(u,e)=>{var t={};for(var a in u)_.call(u,a)&&e.indexOf(a)<0&&(t[a]=u[a]);if(u!=null&&A)for(var a of A(u))e.indexOf(a)<0&&Y.call(u,a)&&(t[a]=u[a]);return t};var x=(u,e,t)=>new Promise((a,i)=>{var o=r=>{try{l(t.next(r))}catch(g){i(g)}},s=r=>{try{l(t.throw(r))}catch(g){i(g)}},l=r=>r.done?a(r.value):Promise.resolve(r.value).then(o,s);l((t=t.apply(u,e)).next())});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function t(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(i){if(i.ep)return;i.ep=!0;const o=t(i);fetch(i.href,o)}})();const re="modulepreload",le=function(u){return"/"+u},J={},Q=function(e,t,a){let i=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),l=(s==null?void 0:s.nonce)||(s==null?void 0:s.getAttribute("nonce"));i=Promise.allSettled(t.map(r=>{if(r=le(r),r in J)return;J[r]=!0;const g=r.endsWith(".css"),c=g?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${c}`))return;const d=document.createElement("link");if(d.rel=g?"stylesheet":re,g||(d.as="script"),d.crossOrigin="",d.href=r,l&&d.setAttribute("nonce",l),document.head.appendChild(d),g)return new Promise((p,m)=>{d.addEventListener("load",p),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${r}`)))})}))}function o(s){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=s,window.dispatchEvent(l),!l.defaultPrevented)throw s}return i.then(s=>{for(const l of s||[])l.status==="rejected"&&o(l.reason);return e().catch(o)})};class ne{render(e,t,a,i,o=[]){if(e.innerHTML="",e.style.backgroundColor=i.backgroundColor,e.style.padding=`${i.spacing}px`,e.style.gap=`${i.spacing}px`,i.aspectRatio&&i.aspectRatio!=="auto"?e.style.aspectRatio=i.aspectRatio:e.style.removeProperty("aspect-ratio"),t.length!==0){switch(a.type){case"horizontal":this.renderHorizontal(e,t,i);break;case"vertical":this.renderVertical(e,t,i);break;case"twoColumns":this.renderTwoColumns(e,t,i);break;case"asymmetric":this.renderAsymmetric(e,t,i);break;case"featured":this.renderFeatured(e,t,i);break;case"grid":this.renderGrid(e,t,a,i);break;default:this.renderGrid(e,t,{rows:3,cols:3},i)}this.renderDecorations(e,o)}}renderHorizontal(e,t,a){e.style.display="flex",e.style.flexDirection="row",e.style.flexWrap="nowrap",e.style.alignItems="stretch",t.forEach(i=>{const o=this.createImageContainer(i,a);o.style.flex="1",o.style.minWidth="0",e.appendChild(o)})}renderVertical(e,t,a){e.style.display="flex",e.style.flexDirection="column",e.style.flexWrap="nowrap",e.style.alignItems="stretch",t.forEach(i=>{const o=this.createImageContainer(i,a);o.style.flex="1",o.style.minHeight="0",e.appendChild(o)})}renderTwoColumns(e,t,a){e.style.display="grid",e.style.gridTemplateColumns="1fr 1fr",e.style.gridAutoRows="1fr";const i=t.length,o=Math.ceil(i/2);for(let s=0;s<o*2;s++){const l=s<i?s:null,r=this.createImageContainer(l!==null?t[l]:null,a);e.appendChild(r)}}renderAsymmetric(e,t,a){e.style.display="grid",e.style.gridTemplateColumns="2fr 1fr",e.style.gridTemplateRows="1fr 1fr",e.style.gridTemplateAreas=`
            "left top-right"
            "left bottom-right"
        `;const i=this.createImageContainer(t[0]||null,a);i.style.gridArea="left",e.appendChild(i);const o=this.createImageContainer(t[1]||null,a);o.style.gridArea="top-right",e.appendChild(o);const s=this.createImageContainer(t[2]||null,a);s.style.gridArea="bottom-right",e.appendChild(s)}renderFeatured(e,t,a){e.style.display="grid",e.style.gridTemplateColumns="repeat(4, 1fr)",e.style.gridTemplateRows="repeat(5, 1fr)",e.style.gridTemplateAreas=`
            "a a b b"
            "a a b b"
            "c c d d"
            "c c d d"
            "e e f f"
        `;const i=["a","b","c","d","e","f"],o=t.length;for(let s=0;s<i.length;s++){const l=this.createImageContainer(s<o?t[s]:null,a);l.style.gridArea=i[s],e.appendChild(l)}}renderGrid(e,t,a,i){const{rows:o,cols:s}=a;e.style.display="grid",e.style.gridTemplateRows=`repeat(${o}, 1fr)`,e.style.gridTemplateColumns=`repeat(${s}, 1fr)`;const l=o*s,r=t.length;for(let g=0;g<l;g++){const c=this.createImageContainer(g<r?t[g]:null,i);e.appendChild(c)}}createImageContainer(e,t){const a=document.createElement("div");if(a.className="image-container",a.style.border=`${t.border}px solid ${t.borderColor}`,a.style.overflow="hidden",a.style.position="relative",a.style.backgroundColor="#f0f0f0",e){const i=document.createElement("img");i.src=e.url,i.loading="lazy",i.decoding="async",i.style.width="100%",i.style.height="100%";const o=t.imageFit==="contain"?"contain":"cover";i.style.objectFit=o,i.style.objectPosition="center",i.style.display="block",i.style.filter=this.buildFilterString(e.filters),o==="contain"&&(i.style.backgroundColor=t.backgroundColor||"#f0f0f0"),a.appendChild(i)}else a.style.minHeight="100px";return a}renderDecorations(e,t){if(!t||!t.length)return;const a=document.createElement("div");a.className="collage-overlay",t.forEach(i=>{const o=document.createElement("div");o.classList.add("overlay-item"),o.dataset.id=i.id;const s=this.getPositionStyles(i);o.style.left=`${s.left}%`,o.style.top=`${s.top}%`,o.style.transform="translate(-50%, -50%)",i.type==="text"?(o.classList.add("overlay-text"),o.textContent=i.content,o.style.color=i.color||"#ffffff",o.style.fontSize=this.getTextSize(i.size),o.style.maxWidth="80%",o.style.textAlign="center"):i.type==="sticker"&&(o.classList.add("overlay-sticker"),o.textContent=i.emoji,o.style.fontSize=this.getStickerSize(i.size)),a.appendChild(o)}),e.appendChild(a)}getPositionStyles(e){if(typeof e.x=="number"&&typeof e.y=="number")return{left:this.clampPercentage(e.x*100),top:this.clampPercentage(e.y*100)};const t={"top-left":{left:8,top:12},"top-center":{left:50,top:12},"top-right":{left:92,top:12},center:{left:50,top:50},"bottom-left":{left:12,top:88},"bottom-center":{left:50,top:88},"bottom-right":{left:88,top:88}},a=e.position&&t[e.position]?e.position:"center";return t[a]}getTextSize(e){switch(e){case"small":return"1.2rem";case"large":return"2.2rem";case"medium":default:return"1.6rem"}}getStickerSize(e){switch(e){case"small":return"1.8rem";case"large":return"3.2rem";case"medium":default:return"2.4rem"}}clampPercentage(e){const t=Math.min(Math.max(e,2),98);return Number.isFinite(t)?t:50}buildFilterString(e){if(!e||!e.adjustments)return"none";const{brightness:t=100,contrast:a=100,saturation:i=100,warmth:o=0}=e.adjustments,s=typeof e.adjustments.blur=="number"?e.adjustments.blur:0,l=`${t}%`,r=`${a}%`,g=`${i}%`,c=o*.8,d=[`brightness(${l})`,`contrast(${r})`,`saturate(${g})`,`hue-rotate(${c}deg)`];return i<=0&&d.push("grayscale(100%)"),d.push(`blur(${Math.max(0,s)}px)`),d.join(" ")}}const F="mecollage_lang",j="picstitch_lang";class ce{constructor(){this.currentLang=this.getStoredLanguage()||"en",this.translations={},this.loadTranslations()}loadTranslations(){this.translations={en:{common:{backToTop:"Back to top",canvas:"Canvas"},nav:{home:"Home",features:"Features",tutorial:"Tutorial",blog:"Blog"},blog:{title:"Blog & Tutorials",subtitle:"Learn how to create stunning photo collages with our guides and tips",searchPlaceholder:"Search articles...",popularTags:"Popular tags:",noArticles:"No articles found. Try a different search or category.",readMore:"Read more",backToBlog:"Back to Blog",shareArticle:"Share this article:",by:"By",relatedArticles:"Related Articles",keepExploring:"Keep exploring:",categories:{all:"All",tutorial:"Tutorial",designTips:"Design Tips",holiday:"Holiday",mobile:"Mobile",socialMedia:"Social Media",portfolio:"Portfolio"}},share:{copyLink:"Copy link",copied:"Link copied",copyPrompt:"Copy this link:",systemShare:"Share�?,notSupported:"System share not supported",twitter:"Twitter/X",facebook:"Facebook",reddit:"Reddit",pinterest:"Pinterest",whatsapp:"WhatsApp",telegram:"Telegram",linkedin:"LinkedIn"},works:{uploadAndLink:"Upload & Get Public Link",uploading:"Uploading...",uploadDone:"Upload completed",viewPublicPage:"View public page",copyImageUrl:"Copy image URL",copyEmbedCode:"Copy embed code",embedLabel:"Embed code",pageTitle:"Public Work",pageSubtitle:"A publicly shared collage created with MeCollage"},lang:{name:"English",selector:"Language",options:{en:"English",zh:"简体中�?,es:"Español"}},header:{title:"MeCollage",subtitle:"Create beautiful collages with unlimited images",description:"Professional online image collage maker. Support horizontal, vertical, grid layouts and more. Easily create stunning image collages.",badge1:"20+ Images",badge2:"Multiple Layouts",badge3:"Custom Grid",badge4:"Free to Use"},sidebar:{uploadImages:"Upload Images",dragDrop:"Drag & drop images here",clickBrowse:"or click to browse",imagesLoaded:"{count} images loaded",layoutTemplates:"Layout Templates",themeSpotlight:"Theme Spotlight",customGrid:"Custom Grid",rows:"Rows",columns:"Columns",apply:"Apply",settings:"Settings",spacing:"Spacing",border:"Border",borderColor:"Border Color",backgroundColor:"Background Color",imageFit:"Image Fill",imageFitCover:"Fill (crop)",imageFitContain:"Fit (no crop)",imageFitHintCover:"Fill keeps the layout tight but may crop the photo edges.",imageFitHintContain:"Fit shows the full photo and adds gentle padding if needed.",export:"Export",quality:"Quality",format:"Format",exportCollage:"Export Collage",selectPhotos:"Select Photos",decorate:"Decorate",filters:"Filters",aspectRatio:"Canvas Ratio"},templates:{horizontal:"Horizontal",vertical:"Vertical",twoColumns:"Two Columns",asymmetric:"Asymmetric",featured:"Featured Grid",grid1x1:"1x1 Grid",grid1x2:"1x2 Grid",grid2x1:"2x1 Grid",grid2x2:"2x2 Grid",grid2x3:"2x3 Grid",grid3x2:"3x2 Grid",grid3x3:"3x3 Grid",grid3x4:"3x4 Grid",grid4x3:"4x3 Grid",grid4x4:"4x4 Grid",grid4x5:"4x5 Grid",grid5x4:"5x4 Grid",grid5x5:"5x5 Grid",grid6x4:"6x4 Grid",grid6x5:"6x5 Grid",grid5x6:"5x6 Grid",grid4x6:"4x6 Grid",grid7x3:"7x3 Grid",grid3x7:"3x7 Grid",grid8x3:"8x3 Grid",grid3x8:"3x8 Grid",grid10x2:"10x2 Grid",grid2x10:"2x10 Grid",grid10x3:"10x3 Grid",grid3x10:"3x10 Grid",grid6x6:"6x6 Grid",grid7x5:"7x5 Grid",grid5x7:"5x7 Grid",grid7x7:"7x7 Grid",grid8x6:"8x6 Grid",grid6x8:"6x8 Grid",grid8x8:"8x8 Grid",grid9x6:"9x6 Grid",grid6x9:"6x9 Grid",grid9x9:"9x9 Grid",grid10x8:"10x8 Grid",grid8x10:"8x10 Grid",grid10x10:"10x10 Grid",grid12x8:"12x8 Grid",grid8x12:"8x12 Grid",grid12x12:"12x12 Grid",grid16x9:"16x9 Grid",grid9x16:"9x16 Grid",grid20x1:"20x1 Grid",grid1x20:"1x20 Grid",categories:{all:"All Templates",basics:"Essentials",gallery:"Grid Gallery",showcase:"Showcase",story:"Story Boards",panorama:"Wide Panoramas"},favorite:{add:"Add to favorites",remove:"Remove from favorites"},themes:{all:{name:"All Themes",description:"Browse every curated template with no filters applied."},holiday:{name:"Holiday Greetings",description:"Festive grids for Christmas, New Year, and seasonal celebrations."},commerce:{name:"E-commerce & Product",description:"Impactful layouts for product cards, catalogs, and promotions."},travel:{name:"Travel Adventures",description:"Panoramic spreads for journeys and scenic highlights."},photography:{name:"Photography Showcase",description:"Elegant layouts for curated portfolios and galleries."},social:{name:"Social Media",description:"Feed-friendly grids for posts, Stories, and carousels."},family:{name:"Family Memories",description:"Warm timelines for reunions, weddings, and milestones."}},recommendations:{heading:"AI Recommendation",subtitle:"Based on your current selection of {count} {photoLabel}.",photo:{single:"photo",plural:"photos"},tags:{exactFit:"{count} fit",fitsUpTo:"Up to {count}",expandsTo:"Holds {count}",square:"Square grid",landscape:"Wide layout",portrait:"Tall layout",hero:"Hero focus",twoColumn:"Split columns",collage:"Creative collage",featured:"Highlight grid",story:"Story flow",flex:"Flexible layout"},tooltip:{moreInfo:"View recommendation details",gridExact:"Every slot aligns with your {count} photo set.",gridCapacity:"Balanced arrangement for {count} photos (capacity {capacity}).",gridExtra:"Leaves {extra} open cell(s) for breathing room.",gridOverflow:"Fits up to {capacity} photos—currently {count} uploaded.",gridNeedMore:"Add {missing} more photo(s) to fill every slot.",horizontalPrimary:"Perfect for showcasing a wide hero image with support shots.",horizontalSecondary:"Best for covers, banners, and travel highlights.",verticalPrimary:"Tall layout ideal for portraits or story-style sequences.",verticalSecondary:"Works well as social stories or mood boards.",twoColumnsPrimary:"Split focus: compare products or pair imagery with details.",twoColumnsSecondary:"Keeps left/right columns balanced for clean storytelling.",asymmetricPrimary:"Dynamic collage with varied tile sizes for a curated look.",asymmetricSecondary:"Highlight one key visual with supporting snapshots.",featuredPrimary:"Spotlights a hero image surrounded by smaller accents.",featuredSecondary:"Great for announcements, menus, or portfolio hero moments.",genericPrimary:"Flexible layout ready to adapt to your photo mix.",genericSecondary:"Adjust spacing or add borders to fine-tune the balance."}}},imagePanel:{title:"Image List",dragHandle:"Drag to reorder",moveUp:"Move up",moveDown:"Move down",remove:"Remove"},canvas:{placeholder:"Upload images to start creating your collage",expand:"Expand Canvas",collapse:"Exit Fullscreen"},export:{exporting:"Exporting...",failed:"Failed to export collage. Please try again."},decorations:{textHeading:"Text Overlay",textLabel:"Text",textColor:"Color",textSize:"Size",textPosition:"Position",addText:"Add Text",stickerHeading:"Stickers",stickerSize:"Size",stickerPosition:"Position",empty:"No decorations yet",sizeSmall:"Small",sizeMedium:"Medium",sizeLarge:"Large",sizeOriginal:"Original",sizeSquare:"Square (1:1)",sizeStory:"Story (9:16)",sizeLandscape:"Landscape (16:9)",positionTopLeft:"Top Left",positionTopCenter:"Top Center",positionTopRight:"Top Right",positionCenter:"Center",positionBottomLeft:"Bottom Left",positionBottomCenter:"Bottom Center",positionBottomRight:"Bottom Right",stickerSparkles:"Sparkles",stickerHeart:"Heart",stickerCamera:"Camera",stickerStar:"Star",stickerLeaf:"Leaf",remove:"Remove",moreColors:"More",presetWhite:"White",presetBlack:"Black",presetRed:"Red",presetYellow:"Yellow",presetGreen:"Green",textPlaceholder:"(Text)",positionCustom:"Custom position"},filters:{presetsHeading:"Quick Filters",adjustHeading:"Fine Tuning",brightness:"Brightness",contrast:"Contrast",saturation:"Saturation",warmth:"Warmth",blur:"Blur",reset:"Reset",noImage:"Upload an image to enable filters",presetOriginal:"Original",presetWarm:"Warm Glow",presetVivid:"Vivid Pop",presetMono:"Monochrome",presetFilm:"Film Grain",presetSoft:"Soft Pastel",targetNone:"Select an image to start editing filters",targetSingle:"Editing image {index} of {total}",targetAll:"Applying to all {total} images",scopeLabel:"Apply to",scopeAria:"Choose filter scope",scopeCurrent:"Current Image",scopeAll:"All Images"},features:{title:"Features",subtitle:"Everything you need to create stunning collages",unlimitedImages:{title:"Unlimited Images",description:"Support for 20+ images in a single collage. No restrictions on the number of images you can combine."},multipleLayouts:{title:"Multiple Layout Templates",description:"Explore curated categories including Essentials, Grid Gallery, Showcase, Vertical Stories, and Wide Panoramas. Choose from horizontal, vertical, two-column, asymmetric, featured grids, and 25+ standard grid layouts."},smartSuggestions:{title:"Intelligent Layout Suggestions",description:"Let the AI recommend the best layouts as soon as you upload images. Suggested templates float to the top, auto-apply when appropriate, and adjust as you add or remove photos."},themeCollections:{title:"Curated Theme Collections",description:"Explore themed template groups for holidays, e-commerce, travel, photography, social media, and family memories—each with handpicked layouts tailored to the scenario."},templateFavorites:{title:"Starred Template Favorites",description:"Click the star on any layout to build a personal favorites tray. Favorites stay highlighted, surface to the top of each category, and persist in your browser for quick reuse."},customGrid:{title:"Custom Grid Layout",description:"Create your own grid with up to 30 rows and 30 columns. Perfect for large image collections."},easyCustomization:{title:"Easy Customization",description:"Adjust spacing, borders, colors, background, apply quick filters or detailed sliders, and reorder uploads with drag-and-drop or quick arrows to perfect your story."},highQualityExport:{title:"High Quality Export",description:"Export your collages in PNG or JPG format with adjustable quality settings. Perfect for sharing or printing."},dragAndDrop:{title:"Drag & Drop Upload",description:"Simply drag and drop images or click to browse. Fast and intuitive image management."},responsiveDesign:{title:"Responsive Design",description:"Works seamlessly on desktop, tablet, and mobile devices. Create collages anywhere, anytime."},freeToUse:{title:"100% Free",description:"No registration required. No watermarks. No hidden fees. Use all features completely free."}},tutorial:{title:"Tutorial",subtitle:"Learn how to create beautiful collages in minutes",step1:{title:"Step 1: Upload Images",description:"Click the upload area or drag and drop your images. You can upload multiple images at once. Supports common image formats (JPG, PNG, GIF, WebP, etc.) supported by your browser."},step2:{title:"Step 2: Choose a Layout",description:"Start with the AI recommendations pinned to the top. Use the theme spotlight chips to browse Holiday, Commerce, Travel, Photography, Social, or Family collections, and click the star on any layout to save it to your favorites. Drag images in the list—or tap the arrows—to reorder them before settling on a layout. You can still pick any preset manually or create a custom grid by specifying rows and columns."},step3:{title:"Step 3: Customize Settings",description:"Adjust spacing, borders, background color, and apply filters using quick presets or detailed sliders—either per image or to all images at once."},step4:{title:"Step 4: Preview & Export",description:"Preview your collage in real-time. When satisfied, choose your export format (PNG or JPG) and quality, then click Export to download."},tips:{title:"Pro Tips",tip1:"For best results, use images with similar dimensions.",tip2:"Use custom grid layouts for large collections (20+ images).",tip3:"Adjust spacing to create breathing room between images.",tip4:"Export in PNG format for highest quality, JPG for smaller file sizes.",tip5:"You can remove individual images by hovering over them in the image list.",tip6:"Star frequently used layouts to keep them highlighted and ready for future collages."},faq:{title:"Frequently Asked Questions",q1:"How many images can I use?",a1:"There is no hard limit. You can use as many images as you want, though we recommend keeping it under 50 for best performance.",q2:"What image formats are supported?",a2:"We support all image formats that your browser can handle, including JPG, PNG, GIF, WebP, and other common formats.",q3:"Can I rearrange images after uploading?",a3:"Yes. Drag thumbnails in the Image List or tap the up/down arrows to instantly update the order.",q4:"Is there a file size limit?",a4:"There is no strict limit, but very large images may take longer to process. We recommend images under 10MB each.",q5:"Can I use this on mobile devices?",a5:"Yes! MeCollage is fully responsive and works great on mobile devices, tablets, and desktops."}}},es:{common:{backToTop:"Volver arriba",canvas:"Lienzo"},nav:{home:"Inicio",features:"Funciones",tutorial:"Tutorial",blog:"Blog"},blog:{title:"Blog y Tutoriales",subtitle:"Aprende a crear collages de fotos impresionantes con nuestras guías y consejos",searchPlaceholder:"Buscar artículos...",popularTags:"Etiquetas populares:",noArticles:"No se encontraron artículos. Prueba con otra búsqueda o categoría.",readMore:"Leer más",backToBlog:"Volver al Blog",shareArticle:"Compartir este artículo:",by:"Por",relatedArticles:"Artículos Relacionados",keepExploring:"Sigue explorando:",categories:{all:"Todos",tutorial:"Tutorial",designTips:"Consejos de Diseño",holiday:"Festivos",mobile:"Móvil",socialMedia:"Redes Sociales",portfolio:"Portafolio"}},share:{copyLink:"Copiar enlace",copied:"Enlace copiado",copyPrompt:"Copia este enlace:",systemShare:"Compartir�?,notSupported:"Compartir del sistema no disponible",twitter:"Twitter/X",facebook:"Facebook",reddit:"Reddit",pinterest:"Pinterest",whatsapp:"WhatsApp",telegram:"Telegram",linkedin:"LinkedIn"},works:{uploadAndLink:"Subir y obtener enlace público",uploading:"Subiendo...",uploadDone:"Subida completa",viewPublicPage:"Ver página pública",copyImageUrl:"Copiar URL de imagen",copyEmbedCode:"Copiar código de inserción",embedLabel:"Código de inserción",pageTitle:"Obra pública",pageSubtitle:"Un collage público creado con MeCollage"},lang:{name:"Español",selector:"Idioma",options:{en:"English",zh:"简体中�?,es:"Español"}},header:{title:"MeCollage",subtitle:"Crea collages increíbles con imágenes ilimitadas",description:"Creador profesional de collages en línea. Admite composiciones horizontales, verticales, en rejilla y muchas más para lograr resultados sorprendentes.",badge1:"20+ imágenes",badge2:"Múltiples diseños",badge3:"Rejilla personalizable",badge4:"Uso gratuito"},sidebar:{uploadImages:"Subir imágenes",dragDrop:"Arrastra y suelta aquí",clickBrowse:"o haz clic para buscar",imagesLoaded:"{count} imágenes cargadas",layoutTemplates:"Plantillas de diseño",themeSpotlight:"Temas destacados",customGrid:"Rejilla personalizada",rows:"Filas",columns:"Columnas",apply:"Aplicar",settings:"Ajustes",spacing:"Espaciado",border:"Borde",borderColor:"Color del borde",backgroundColor:"Color de fondo",imageFit:"Ajuste de imagen",imageFitCover:"Rellenar (recorta)",imageFitContain:"Ajustar (sin recorte)",imageFitHintCover:"Rellenar mantiene el diseño compacto pero puede recortar los bordes de la foto.",imageFitHintContain:"Ajustar muestra la foto completa y agrega relleno cuando sea necesario.",export:"Exportar",quality:"Calidad",format:"Formato",exportCollage:"Exportar collage",selectPhotos:"Elegir fotos",decorate:"Decorar",filters:"Filtros",aspectRatio:"Relación del lienzo"},templates:{horizontal:"Horizontal",vertical:"Vertical",twoColumns:"Dos columnas",asymmetric:"Asimétrico",featured:"Rejilla destacada",grid1x1:"Rejilla 1x1",grid1x2:"Rejilla 1x2",grid2x1:"Rejilla 2x1",grid2x2:"Rejilla 2x2",grid2x3:"Rejilla 2x3",grid3x2:"Rejilla 3x2",grid3x3:"Rejilla 3x3",grid3x4:"Rejilla 3x4",grid4x3:"Rejilla 4x3",grid4x4:"Rejilla 4x4",grid4x5:"Rejilla 4x5",grid5x4:"Rejilla 5x4",grid5x5:"Rejilla 5x5",grid6x4:"Rejilla 6x4",grid6x5:"Rejilla 6x5",grid5x6:"Rejilla 5x6",grid4x6:"Rejilla 4x6",grid7x3:"Rejilla 7x3",grid3x7:"Rejilla 3x7",grid8x3:"Rejilla 8x3",grid3x8:"Rejilla 3x8",grid10x2:"Rejilla 10x2",grid2x10:"Rejilla 2x10",grid10x3:"Rejilla 10x3",grid3x10:"Rejilla 3x10",grid6x6:"Rejilla 6x6",grid7x5:"Rejilla 7x5",grid5x7:"Rejilla 5x7",grid7x7:"Rejilla 7x7",grid8x6:"Rejilla 8x6",grid6x8:"Rejilla 6x8",grid8x8:"Rejilla 8x8",grid9x6:"Rejilla 9x6",grid6x9:"Rejilla 6x9",grid9x9:"Rejilla 9x9",grid10x8:"Rejilla 10x8",grid8x10:"Rejilla 8x10",grid10x10:"Rejilla 10x10",grid12x8:"Rejilla 12x8",grid8x12:"Rejilla 8x12",grid12x12:"Rejilla 12x12",grid16x9:"Rejilla 16x9",grid9x16:"Rejilla 9x16",grid20x1:"Rejilla 20x1",grid1x20:"Rejilla 1x20",categories:{all:"Todos los diseños",basics:"Esenciales",gallery:"Galería en rejilla",showcase:"Escaparate",story:"Historias verticales",panorama:"Panorámicas amplias"},favorite:{add:"Añadir a favoritos",remove:"Quitar de favoritos"},themes:{all:{name:"Todos los temas",description:"Explora todas las plantillas seleccionadas sin filtros."},holiday:{name:"Felicitaciones festivas",description:"Collages llenos de color para Navidad, Año Nuevo y celebraciones de temporada."},commerce:{name:"E-commerce y producto",description:"Diseños impactantes para fichas de producto, catálogos y promociones."},travel:{name:"Aventuras de viaje",description:"Composiciones panorámicas para rutas, paisajes y diarios de viaje."},photography:{name:"Muestra fotográfica",description:"Estructuras elegantes para portfolios y galerías curadas."},social:{name:"Redes sociales",description:"Rejillas optimizadas para publicaciones, Stories y carruseles."},family:{name:"Recuerdos familiares",description:"Cronologías cálidas para reuniones, bodas y momentos especiales."}},recommendations:{heading:"Recomendación IA",subtitle:"Según tu selección actual de {count} {photoLabel}.",photo:{single:"foto",plural:"fotos"},tags:{exactFit:"Justo para {count}",fitsUpTo:"Hasta {count}",expandsTo:"Admite {count}",square:"Rejilla cuadrada",landscape:"Diseño horizontal",portrait:"Diseño vertical",hero:"Imagen protagonista",twoColumn:"Columnas divididas",collage:"Collage creativo",featured:"Rejilla destacada",story:"Flujo tipo historia",flex:"Diseño flexible"},tooltip:{moreInfo:"Ver detalles de la recomendación",gridExact:"Cada espacio coincide con tus {count} fotos.",gridCapacity:"Disposición equilibrada para {count} fotos (capacidad {capacity}).",gridExtra:"Deja {extra} espacios libres para respirar.",gridOverflow:"Admite hasta {capacity} fotos; ahora hay {count} cargadas.",gridNeedMore:"Añade {missing} foto(s) más para completar todas las celdas.",horizontalPrimary:"Ideal para resaltar una imagen panorámica con apoyo visual.",horizontalSecondary:"Perfecto para portadas, banners y resúmenes de viaje.",verticalPrimary:"Diseño alto ideal para retratos o narrativas tipo historia.",verticalSecondary:"Funciona muy bien como secuencia para Stories o moodboards.",twoColumnsPrimary:"Divide el foco: compara productos o combina imagen y texto.",twoColumnsSecondary:"Mantiene el equilibrio izquierda/derecha para contar historias.",asymmetricPrimary:"Collage dinámico con tamaños variados para un look editorial.",asymmetricSecondary:"Destaca una imagen principal con fotos complementarias.",featuredPrimary:"Enmarca una imagen heroína rodeada de acentos.",featuredSecondary:"Genial para anuncios, menús o proyectos destacados.",genericPrimary:"Diseño flexible listo para adaptarse a tu selección.",genericSecondary:"Ajusta el espaciado o los bordes para equilibrar el conjunto."}}},imagePanel:{title:"Listado de imágenes",dragHandle:"Arrastra para reordenar",moveUp:"Mover arriba",moveDown:"Mover abajo",remove:"Eliminar"},canvas:{placeholder:"Sube imágenes para empezar tu collage",expand:"Ampliar lienzo",collapse:"Salir de pantalla completa"},export:{exporting:"Exportando...",failed:"No se pudo exportar el collage. Inténtalo de nuevo."},decorations:{textHeading:"Texto superpuesto",textLabel:"Texto",textColor:"Color",textSize:"Tamaño",textPosition:"Posición",addText:"Añadir texto",stickerHeading:"Stickers",stickerSize:"Tamaño",stickerPosition:"Posición",empty:"Aún no hay elementos",sizeSmall:"Pequeño",sizeMedium:"Mediano",sizeLarge:"Grande",sizeOriginal:"Original",sizeSquare:"Cuadrado (1:1)",sizeStory:"Historia (9:16)",sizeLandscape:"Horizontal (16:9)",positionTopLeft:"Arriba izquierda",positionTopCenter:"Arriba centro",positionTopRight:"Arriba derecha",positionCenter:"Centro",positionBottomLeft:"Abajo izquierda",positionBottomCenter:"Abajo centro",positionBottomRight:"Abajo derecha",stickerSparkles:"Destellos",stickerHeart:"Corazón",stickerCamera:"Cámara",stickerStar:"Estrella",stickerLeaf:"Hoja",remove:"Eliminar",moreColors:"Más colores",presetWhite:"Blanco",presetBlack:"Negro",presetRed:"Rojo",presetYellow:"Amarillo",presetGreen:"Verde",textPlaceholder:"(Texto)",positionCustom:"Posición personalizada"},filters:{presetsHeading:"Filtros rápidos",adjustHeading:"Ajustes finos",brightness:"Brillo",contrast:"Contraste",saturation:"Saturación",warmth:"Calidez",blur:"Desenfoque",reset:"Restablecer",noImage:"Sube una imagen para activar los filtros",presetOriginal:"Original",presetWarm:"Brillo cálido",presetVivid:"Color intenso",presetMono:"Monocromo",presetFilm:"Película retro",presetSoft:"Suave pastel",targetNone:"Selecciona una imagen para ajustar filtros",targetSingle:"Editando la imagen {index} de {total}",targetAll:"Aplicando a las {total} imágenes",scopeLabel:"Aplicar a",scopeAria:"Elegir alcance del filtro",scopeCurrent:"Imagen actual",scopeAll:"Todas las imágenes"},features:{title:"Funciones",subtitle:"Todo lo necesario para crear collages espectaculares",unlimitedImages:{title:"Imágenes ilimitadas",description:"Admite más de 20 fotos en un solo collage sin límites rígidos."},multipleLayouts:{title:"Plantillas variadas",description:"Explora colecciones curadas: Esenciales, Galerías en rejilla, Escaparate, Historias verticales y Panorámicas. Incluye horizontales, verticales, dos columnas, asimétricas y más de 25 rejillas clásicas."},smartSuggestions:{title:"Recomendaciones inteligentes",description:"La IA propone el mejor diseño en cuanto subes las fotos. Los sugeridos suben al inicio, pueden aplicarse automáticamente y cambian al agregar o quitar imágenes."},themeCollections:{title:"Colecciones temáticas",description:"Grupos listos para festividades, e-commerce, viajes, fotografía, redes sociales y recuerdos familiares, cada uno con plantillas seleccionadas."},templateFavorites:{title:"Favoritos con estrella",description:"Marca cualquier diseño con la estrella para guardarlo siempre a mano. Tus favoritos aparecen arriba y se guardan en el navegador."},customGrid:{title:"Rejilla personalizada",description:"Diseña rejillas propias con hasta 30 filas y 30 columnas, ideal para colecciones grandes."},easyCustomization:{title:"Personalización sencilla",description:"Ajusta espaciado, bordes, colores y fondo; aplica filtros rápidos o detallados y reorganiza fotos con arrastrar y soltar o flechas."},highQualityExport:{title:"Exportación en alta calidad",description:"Descarga en PNG o JPG con control de calidad, perfecto para compartir o imprimir."},dragAndDrop:{title:"Subida con arrastrar y soltar",description:"Gestiona las imágenes de forma rápida: arrastra desde tu carpeta o usa el botón de selección."},responsiveDesign:{title:"Diseño adaptable",description:"Funciona fluidamente en escritorio, tablet y móvil para crear collages donde quieras."},freeToUse:{title:"100% gratuito",description:"Sin registros, marcas de agua ni cargos ocultos. Usa todas las funciones libremente."}},tutorial:{title:"Tutorial",subtitle:"Aprende a crear collages en pocos minutos",step1:{title:"Paso 1: Subir imágenes",description:"Haz clic en la zona de subida o arrastra tus fotos. Puedes cargar varias a la vez en formatos JPG, PNG, GIF, WebP y otros compatibles."},step2:{title:"Paso 2: Elegir diseño",description:"Comienza con las recomendaciones destacadas por la IA. Usa las fichas de temas para explorar Festividades, Comercio, Viajes, Fotografía, Social o Familia y marca tus favoritos. Arrastra el listado o usa las flechas para fijar el orden antes de confirmar un diseño. También puedes crear tu propia rejilla indicando filas y columnas."},step3:{title:"Paso 3: Personalizar detalles",description:"Ajusta el espacio, los bordes, el color de fondo y aplica filtros rápidos o controles avanzados por imagen o en todas a la vez."},step4:{title:"Paso 4: Previsualizar y exportar",description:"Visualiza el collage al instante. Cuando estés conforme, elige formato (PNG o JPG), calidad, y pulsa Exportar para descargarlo."},tips:{title:"Consejos pro",tip1:"Usa fotos con dimensiones similares para un resultado uniforme.",tip2:"Apóyate en la rejilla personalizada para colecciones grandes (20+ imágenes).",tip3:"Mantén algo de espacio entre las fotos para que respiren.",tip4:"Exporta en PNG para máxima calidad y en JPG para archivos ligeros.",tip5:"Puedes quitar cualquier imagen desde la lista lateral en un instante.",tip6:"Marca tus diseños favoritos para reutilizarlos más rápido."},faq:{title:"Preguntas frecuentes",q1:"¿Cuántas imágenes puedo usar?",a1:"No hay un límite estricto, aunque recomendamos menos de 50 para un rendimiento óptimo.",q2:"¿Qué formatos de imagen son compatibles?",a2:"Cualquier formato que admita tu navegador: JPG, PNG, GIF, WebP y otros habituales.",q3:"¿Puedo reorganizar las fotos después de subirlas?",a3:"Sí. Arrastra las miniaturas en la lista o usa las flechas de subir/bajar para cambiar el orden al instante.",q4:"¿Existe un límite de tamaño de archivo?",a4:"No hay un límite rígido, pero los archivos muy grandes pueden tardar más en procesarse. Recomendamos imágenes menores a 10 MB.",q5:"¿Funciona en dispositivos móviles?",a5:"¡Claro! MeCollage está totalmente adaptado a móviles, tablets y ordenadores."}}},zh:{common:{backToTop:"返回顶部",canvas:"画布"},nav:{home:"首页",features:"功能特�?,tutorial:"使用教程",blog:"博客"},blog:{title:"博客与教�?,subtitle:"学习如何通过我们的指南和技巧创建精美的照片拼图",searchPlaceholder:"搜索文章...",popularTags:"热门标签:",noArticles:"未找到文章。请尝试其他搜索或分类�?,readMore:"阅读更多",backToBlog:"返回博客",shareArticle:"分享这篇文章:",by:"作�?,relatedArticles:"相关文章",keepExploring:"继续探索�?,categories:{all:"全部",tutorial:"教程",designTips:"设计技�?,holiday:"节日",mobile:"移动�?,socialMedia:"社交媒体",portfolio:"作品�?}},share:{copyLink:"复制链接",copied:"已复制链�?,copyPrompt:"复制此链接：",systemShare:"系统分享�?,notSupported:"当前浏览器不支持系统分享",twitter:"Twitter/X",facebook:"Facebook",reddit:"Reddit",pinterest:"Pinterest",whatsapp:"WhatsApp",telegram:"Telegram",linkedin:"LinkedIn"},works:{uploadAndLink:"上传并获取公开链接",uploading:"正在上传...",uploadDone:"上传完成",viewPublicPage:"查看公开页面",copyImageUrl:"复制图片链接",copyEmbedCode:"复制嵌入代码",embedLabel:"嵌入代码",pageTitle:"公开作品",pageSubtitle:"使用 MeCollage 创建并公开分享的拼�?},lang:{name:"简体中�?,selector:"语言",options:{en:"English",zh:"简体中�?,es:"Español"}},header:{title:"MeCollage",subtitle:"将多张照片拼接成精美的拼�?,description:"专业的在线图片拼接工具，支持横屏、竖屏、九宫图等多种布局，轻松创建精美的图片拼贴作品�?,badge1:"支持20+张图�?,badge2:"多种布局模板",badge3:"自定义网�?,badge4:"免费使用"},sidebar:{uploadImages:"上传图片",dragDrop:"拖拽图片到这�?,clickBrowse:"或点击浏�?,imagesLoaded:"已加�?{count} 张图�?,layoutTemplates:"布局模板",themeSpotlight:"主题精�?,customGrid:"自定义网�?,rows:"行数",columns:"列数",apply:"应用",settings:"设置",spacing:"间距",border:"边框",borderColor:"边框颜色",backgroundColor:"背景颜色",imageFit:"图片适配",imageFitCover:"填满（可能裁剪）",imageFitContain:"适应（不裁剪�?,imageFitHintCover:"选择填满可以铺满格子，但可能裁掉照片边缘�?,imageFitHintContain:"选择适应会完整显示照片，必要时在四周留出空白�?,export:"导出",quality:"质量",format:"格式",exportCollage:"导出拼图",selectPhotos:"选择照片",decorate:"创意装饰",filters:"滤镜调色",aspectRatio:"画布比例"},templates:{horizontal:"横向",vertical:"纵向",twoColumns:"两列",asymmetric:"不对�?,featured:"特色网格",grid2x2:"2x2 网格",grid3x3:"3x3 网格",grid4x4:"4x4 网格",grid5x4:"5x4 网格",grid4x5:"4x5 网格",grid6x4:"6x4 网格",grid4x6:"4x6 网格",grid5x5:"5x5 网格",grid6x5:"6x5 网格",grid5x6:"5x6 网格",grid7x3:"7x3 网格",grid3x7:"3x7 网格",grid8x3:"8x3 网格",grid3x8:"3x8 网格",grid10x2:"10x2 网格",grid2x10:"2x10 网格",grid10x3:"10x3 网格",grid3x10:"3x10 网格",grid20x1:"20x1 网格",grid1x20:"1x20 网格",categories:{all:"全部模板",basics:"基础布局",gallery:"宫格画廊",showcase:"焦点展示",story:"故事拼贴",panorama:"宽幅拼贴"},favorite:{add:"加入收藏",remove:"移出收藏"},themes:{all:{name:"全部主题",description:"查看所有主题模板，不做任何筛选�?},holiday:{name:"节日祝福",description:"适用于圣诞、新年等节日的温馨拼贴�?},commerce:{name:"电商/产品",description:"突出商品卖点、价格信息与促销内容�?},travel:{name:"旅行冒险",description:"适合旅途记忆与全景风光的拼贴�?},photography:{name:"摄影作品�?,description:"干净利落的作品展示与画廊排版�?},social:{name:"社交媒体",description:"�?Feed、Stories、轮播等社交内容优化的布局�?},family:{name:"家庭纪念",description:"温馨时刻、婚礼与聚会的时间轴与拼图�?}},recommendations:{heading:"智能推荐",subtitle:"基于当前上传�?{count}{photoLabel}�?,photo:{single:"张图�?,plural:"张图�?},tags:{exactFit:"{count} 张刚好合�?,fitsUpTo:"可容纳至 {count} �?,expandsTo:"最多可�?{count} �?,square:"正方形布局",landscape:"横向布局",portrait:"纵向布局",hero:"主图突出",twoColumn:"双列对比",collage:"创意拼贴",featured:"重点呈现",story:"故事纵向",flex:"灵活布局"},tooltip:{moreInfo:"查看更多推荐说明",gridExact:"与当�?{count} 张图片数量完全匹配�?,gridCapacity:"平衡呈现 {count} 张图片（容量 {capacity}）�?,gridExtra:"保留 {extra} 个空格，营造呼吸感�?,gridOverflow:"此布局最多容�?{capacity} 张，当前已有 {count} 张�?,gridNeedMore:"再补�?{missing} 张即可填满所有单元�?,horizontalPrimary:"适合横幅主图，搭配几张补充照片�?,horizontalSecondary:"适用于封面、旅行横向故事等场景�?,verticalPrimary:"纵向长图，适合人像或故事流程�?,verticalSecondary:"可作为社�?Stories 或氛围拼贴�?,twoColumnsPrimary:"双列分区，便于图文对比展示�?,twoColumnsSecondary:"左右平衡，信息层级清晰�?,asymmetricPrimary:"大小错落的拼贴，营造杂志感排版�?,asymmetricSecondary:"突出主视觉，搭配辅助照片�?,featuredPrimary:"中央主图搭配外围精致小图�?,featuredSecondary:"适合公告、菜单或作品重点展示�?,genericPrimary:"灵活布局，可随内容调整�?,genericSecondary:"可调节间距或边框，微调整体平衡�?}}},imagePanel:{title:"图片列表",dragHandle:"拖拽以调整顺�?,moveUp:"上移",moveDown:"下移",remove:"移除"},canvas:{placeholder:"上传图片即可开始创作拼�?,expand:"全屏查看画布",collapse:"退出全�?},export:{exporting:"正在导出...",failed:"导出失败，请重试�?},decorations:{textHeading:"文字叠加",textLabel:"文字内容",textColor:"颜色",textSize:"字号",textPosition:"位置",addText:"添加文字",stickerHeading:"贴纸",stickerSize:"贴纸大小",stickerPosition:"贴纸位置",empty:"暂未添加装饰",sizeSmall:"小号",sizeMedium:"中号",sizeLarge:"大号",sizeOriginal:"原始比例",sizeSquare:"方形 1:1",sizeStory:"竖屏 9:16",sizeLandscape:"横屏 16:9",positionTopLeft:"左上",positionTopCenter:"上中",positionTopRight:"右上",positionCenter:"居中",positionBottomLeft:"左下",positionBottomCenter:"下中",positionBottomRight:"右下",stickerSparkles:"亮闪",stickerHeart:"爱心",stickerCamera:"相机",stickerStar:"星星",stickerLeaf:"绿叶",remove:"移除",moreColors:"更多颜色",presetWhite:"白色",presetBlack:"黑色",presetRed:"红色",presetYellow:"黄色",presetGreen:"绿色",textPlaceholder:"（文字）",positionCustom:"自定义位�?},filters:{presetsHeading:"滤镜速�?,adjustHeading:"精细调整",brightness:"亮度",contrast:"对比�?,saturation:"饱和�?,warmth:"暖色�?,blur:"模糊",reset:"重置",noImage:"上传图片后即可使用滤�?,presetOriginal:"原片",presetWarm:"暖色柔光",presetVivid:"炫彩增强",presetMono:"黑白胶片",presetFilm:"复古电影",presetSoft:"柔焦粉调",targetNone:"请选择图片后再调整滤镜",targetSingle:"当前调整：第 {index} �?/ �?{total} �?,targetAll:"当前调整：应用于全部 {total} �?,scopeLabel:"应用范围",scopeAria:"选择滤镜应用范围",scopeCurrent:"当前图片",scopeAll:"全部图片"},features:{title:"功能特�?,subtitle:"打造惊艳拼图的一切所需",unlimitedImages:{title:"无限制图片数�?,description:"支持单次拼接20+张图片。对图片数量没有限制，可以自由组合任意数量的图片�?},multipleLayouts:{title:"多种布局模板",description:"按主题分类浏览基础排版、网格画廊、重点展示、竖版长图、横幅全景等模板。涵盖横向、纵向、两列、不对称、特色网格以�?5+种标准网格布局�?},smartSuggestions:{title:"智能布局推荐",description:"上传图片后，AI 会即时推荐最合适的布局并自动置顶展示，可按需一键应用，并会随着图片增减动态调整�?},themeCollections:{title:"主题精选模�?,description:"按节日祝福、电商产品、旅行冒险、摄影作品集、社交媒体、家庭纪念等场景预配模板合集，快速定位最匹配的排版方案�?},templateFavorites:{title:"模板收藏�?,description:"点击任意布局右上角的星标，即可建立个人收藏。收藏模板会高亮显示、在所属分类顶部优先展示，并保存在浏览器中方便下次继续使用�?},customGrid:{title:"自定义网格布局",description:"创建最�?0�?0列的自定义网格。非常适合大量图片的集合�?},easyCustomization:{title:"轻松自定�?,description:"自由调节间距、边框、颜色与背景，搭配速选滤镜或滑杆微调，并可通过拖拽或快捷箭头调整图片顺序，全面掌控版面节奏�?},highQualityExport:{title:"高质量导�?,description:"以PNG或JPG格式导出拼图，可调节质量设置。非常适合分享或打印�?},dragAndDrop:{title:"拖拽上传",description:"只需拖拽图片或点击浏览。快速直观的图片管理�?},responsiveDesign:{title:"响应式设�?,description:"在桌面、平板和移动设备上无缝工作。随时随地创建拼图�?},freeToUse:{title:"100% 免费",description:"无需注册。无水印。无隐藏费用。完全免费使用所有功能�?}},tutorial:{title:"使用教程",subtitle:"几分钟学会创建精美拼�?,step1:{title:"步骤1：上传图�?,description:"点击上传区域或拖拽图片。可以一次上传多张图片。支持浏览器支持的所有常见图片格式（JPG、PNG、GIF、WebP等）�?},step2:{title:"步骤 2：选择布局",description:"从上方的智能推荐开始挑选，用主题标签浏览节日、电商、旅行、摄影、社交或家庭等场景，并可点击星标保存常用模板。随时拖拽右侧图片列表，或使用上下箭头，快速调整排列顺序。你仍然可以手动选择任意预设或通过设置行列创建自定义网格�?},step3:{title:"步骤 3：调整细�?,description:"设置图片间距、边框、背景颜色，并使用滤镜速选或滑杆微调，可针对单张或全部图片调整，打造符合你构想的风�?"},step4:{title:"步骤4：预览和导出",description:"实时预览你的拼图。满意后，选择导出格式（PNG或JPG）和质量，然后点击导出下�?"},tips:{title:"专业提示",tip1:"为了获得最佳效果，请使用尺寸相似的图片�?,tip2:"对于大量图片�?0+张），使用自定义网格布局�?,tip3:"调整间距以在图片之间创造呼吸空间�?,tip4:"PNG格式导出质量最高，JPG格式文件更小�?,tip5:"可以通过悬停在图片列表中的图片上来删除单个图片�?,tip6:"给常用模板点亮星标，收藏后会高亮显示，方便下次继续使用�?},faq:{title:"常见问题",q1:"我可以使用多少张图片�?,a1:"没有硬性限制。你可以使用任意数量的图片，但我们建议保持在50张以下以获得最佳性能�?,q2:"支持哪些图片格式�?,a2:"我们支持浏览器可以处理的所有图片格式，包括JPG、PNG、GIF、WebP等常见格式�?,q3:"上传后还能重新排列图片顺序吗�?,a3:"可以。在图片列表中拖拽缩略图，或者点击上下箭头即可即时调整位置�?,q4:"图片大小有没有限制？",a4:"没有严格限制，但超大的图片会耗时更久。建议单张图片控制在10MB以内�?,q5:"移动端能正常使用吗？",a5:"当然可以！MeCollage 针对手机、平板与桌面端进行了完整优化�?}}}}}init(){this.setLanguage(this.currentLang)}getStoredLanguage(){try{const e=localStorage.getItem(F);if(e)return e;const t=localStorage.getItem(j);if(t)return localStorage.setItem(F,t),localStorage.removeItem(j),t}catch(e){console.warn("Unable to read language preference",e)}return"en"}setStoredLanguage(e){try{localStorage.setItem(F,e),localStorage.removeItem(j)}catch(t){console.warn("Unable to persist language preference",t)}}setLanguage(e){this.translations[e]&&(this.currentLang=e,this.setStoredLanguage(e),this.updatePage(),document.documentElement.lang=e,document.dispatchEvent(new CustomEvent("language-changed",{detail:e})))}t(e,t={}){const a=e.split(".");let i=this.translations[this.currentLang];for(const o of a)if(i&&i[o])i=i[o];else return console.warn(`Translation missing: ${e}`),e;return typeof i=="string"&&t?i.replace(/\{(\w+)\}/g,(o,s)=>t[s]!==void 0?t[s]:o):i}updatePage(){const e=document.querySelectorAll(".nav-link");e.length>=3&&(e[0].textContent=this.t("nav.home"),e[1].textContent=this.t("nav.features"),e[2].textContent=this.t("nav.tutorial"),e[3]&&(e[3].textContent=this.t("nav.blog"))),this.updatePageContent();const t=document.querySelector(".lang-selector span:last-child");t&&(t.textContent=this.t("lang.name"));const a=document.querySelector(".ghibli-title");a&&(a.textContent=this.t("header.title"));const i=document.querySelector(".ghibli-subtitle");i&&(i.textContent=this.t("header.subtitle"));const o=document.querySelector(".header-description");o&&(o.textContent=this.t("header.description"));const s=document.querySelectorAll(".badge");s.length>=4&&(s[0].textContent=this.t("header.badge1"),s[1].textContent=this.t("header.badge2"),s[2].textContent=this.t("header.badge3"),s[3].textContent=this.t("header.badge4")),this.updateSidebar();const l=document.querySelector(".image-panel h2");l&&(l.textContent=this.t("imagePanel.title"));const r=document.querySelector("#canvasPlaceholder p");r&&(r.textContent=this.t("canvas.placeholder"))}updateSidebar(){document.querySelectorAll("[data-i18n]").forEach(e=>{const t=e.getAttribute("data-i18n"),a=e.getAttribute("data-i18n-params");let i={};if(a)try{i=JSON.parse(a)}catch(s){console.warn("Invalid i18n params:",a)}if(e.tagName==="LABEL"&&e.querySelector("input, select")){const s=e.querySelector("span[data-i18n]");s&&(s.textContent=this.t(t,i))}else e.textContent=this.t(t,i);const o=e.getAttribute("data-i18n-placeholder");o&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")&&(e.placeholder=this.t(o,i))}),this.reattachEventListeners()}reattachEventListeners(){}updateTemplates(){const e=document.querySelectorAll(".template-name"),t=["templates.horizontal","templates.vertical","templates.twoColumns","templates.asymmetric","templates.featured","templates.grid2x2","templates.grid3x3","templates.grid4x4","templates.grid5x4","templates.grid4x5","templates.grid6x4","templates.grid4x6","templates.grid5x5","templates.grid6x5","templates.grid5x6","templates.grid7x3","templates.grid3x7","templates.grid8x3","templates.grid3x8","templates.grid10x2","templates.grid2x10","templates.grid10x3","templates.grid3x10","templates.grid20x1","templates.grid1x20"];e.forEach((a,i)=>{t[i]&&(a.textContent=this.t(t[i]))})}updateImageCount(e){const t=document.getElementById("imageCount");t&&(t.textContent=this.t("sidebar.imagesLoaded",{count:e}),t.setAttribute("data-i18n-params",JSON.stringify({count:e})))}updatePageContent(){const e=document.getElementById("page-features");if(e){const a=e.querySelector(".page-title"),i=e.querySelector(".page-subtitle");a&&(a.textContent=this.t("features.title")),i&&(i.textContent=this.t("features.subtitle"));const o=e.querySelectorAll(".feature-card"),s=["unlimitedImages","multipleLayouts","smartSuggestions","themeCollections","templateFavorites","customGrid","easyCustomization","highQualityExport","dragAndDrop","responsiveDesign","freeToUse"];o.forEach((l,r)=>{if(s[r]){const g=l.querySelector(".feature-card-title"),c=l.querySelector(".feature-card-desc");g&&(g.textContent=this.t(`features.${s[r]}.title`)),c&&(c.textContent=this.t(`features.${s[r]}.description`))}})}const t=document.getElementById("page-tutorial");if(t){const a=t.querySelector(".page-title"),i=t.querySelector(".page-subtitle");a&&(a.textContent=this.t("tutorial.title")),i&&(i.textContent=this.t("tutorial.subtitle")),t.querySelectorAll(".tutorial-step").forEach((c,d)=>{const p=c.querySelector(".step-title"),m=c.querySelector(".step-desc");p&&(p.textContent=this.t(`tutorial.step${d+1}.title`)),m&&(m.textContent=this.t(`tutorial.step${d+1}.description`))});const s=t.querySelector(".tips-title");s&&(s.textContent=this.t("tutorial.tips.title")),t.querySelectorAll(".tip-item").forEach((c,d)=>{c&&(c.textContent=this.t(`tutorial.tips.tip${d+1}`))});const r=t.querySelector(".faq-title");r&&(r.textContent=this.t("tutorial.faq.title")),t.querySelectorAll(".faq-item").forEach((c,d)=>{const p=c.querySelector(".faq-question"),m=c.querySelector(".faq-answer");p&&(p.textContent=this.t(`tutorial.faq.q${d+1}`)),m&&(m.textContent=this.t(`tutorial.faq.a${d+1}`))})}}}const n=new ce,de=[{key:"all",nameKey:"templates.categories.all"},{key:"basics",nameKey:"templates.categories.basics"},{key:"gallery",nameKey:"templates.categories.gallery"},{key:"showcase",nameKey:"templates.categories.showcase"},{key:"story",nameKey:"templates.categories.story"},{key:"panorama",nameKey:"templates.categories.panorama"}],ge=[{key:"all",nameKey:"templates.themes.all.name",descriptionKey:"templates.themes.all.description",accentClass:"theme-all"},{key:"holiday",nameKey:"templates.themes.holiday.name",descriptionKey:"templates.themes.holiday.description",accentClass:"theme-holiday"},{key:"commerce",nameKey:"templates.themes.commerce.name",descriptionKey:"templates.themes.commerce.description",accentClass:"theme-commerce"},{key:"travel",nameKey:"templates.themes.travel.name",descriptionKey:"templates.themes.travel.description",accentClass:"theme-travel"},{key:"photography",nameKey:"templates.themes.photography.name",descriptionKey:"templates.themes.photography.description",accentClass:"theme-photography"},{key:"social",nameKey:"templates.themes.social.name",descriptionKey:"templates.themes.social.description",accentClass:"theme-social"},{key:"family",nameKey:"templates.themes.family.name",descriptionKey:"templates.themes.family.description",accentClass:"theme-family"}],q="mecollage_template_favorites",R="picstitch_template_favorites";class pe{constructor(){this.templates=[{key:"horizontal",type:"horizontal",icon:"↔️",category:"basics",themes:["travel"]},{key:"vertical",type:"vertical",icon:"↕️",category:"basics",themes:["photography"]},{key:"twoColumns",type:"twoColumns",category:"basics",themes:["commerce"]},{key:"asymmetric",type:"asymmetric",category:"showcase",themes:["commerce","social"]},{key:"featured",type:"featured",category:"showcase",themes:["holiday","photography","social"]},{key:"grid2x2",type:"grid",rows:2,cols:2,category:"gallery",themes:["holiday"]},{key:"grid3x3",type:"grid",rows:3,cols:3,category:"gallery",themes:["holiday","social"]},{key:"grid4x4",type:"grid",rows:4,cols:4,category:"gallery",themes:["holiday","social"]},{key:"grid5x4",type:"grid",rows:5,cols:4,category:"gallery",themes:["commerce","family"]},{key:"grid4x5",type:"grid",rows:4,cols:5,category:"story",themes:["family"]},{key:"grid6x4",type:"grid",rows:6,cols:4,category:"story",themes:["travel","family"]},{key:"grid4x6",type:"grid",rows:4,cols:6,category:"panorama",themes:["travel","commerce"]},{key:"grid5x5",type:"grid",rows:5,cols:5,category:"gallery",themes:["travel","photography"]},{key:"grid6x5",type:"grid",rows:6,cols:5,category:"story",themes:["family"]},{key:"grid5x6",type:"grid",rows:5,cols:6,category:"panorama",themes:["travel","family"]},{key:"grid7x3",type:"grid",rows:7,cols:3,category:"story",themes:["commerce"]},{key:"grid3x7",type:"grid",rows:3,cols:7,category:"panorama",themes:["commerce"]},{key:"grid8x3",type:"grid",rows:8,cols:3,category:"story",themes:["photography"]},{key:"grid3x8",type:"grid",rows:3,cols:8,category:"panorama",themes:["photography"]},{key:"grid10x2",type:"grid",rows:10,cols:2,category:"story",themes:["social"]},{key:"grid2x10",type:"grid",rows:2,cols:10,category:"panorama",themes:["travel"]},{key:"grid10x3",type:"grid",rows:10,cols:3,category:"story",themes:["social"]},{key:"grid3x10",type:"grid",rows:3,cols:10,category:"panorama",themes:["social"]},{key:"grid20x1",type:"grid",rows:20,cols:1,category:"story",themes:["family"]},{key:"grid1x20",type:"grid",rows:1,cols:20,category:"panorama",themes:["holiday"]}].map((e,t)=>P(v({},e),{originalIndex:t})),this.templateMap=new Map(this.templates.map(e=>[e.key,e])),this.categories=de,this.categorySet=new Set(this.categories.map(e=>e.key)),this.selectedCategory="all",this.themeGroups=ge,this.themeGroupMap=new Map(this.themeGroups.map(e=>[e.key,e])),this.themeContainer=null,this.selectedTheme="all",this.categoryContainer=null,this.recommendedKeys=[],this.activeKey=null,this.displayTemplates=[...this.templates],this.templateGridElement=null,this.favorites=new Set,this.recommendationDetails=new Map,this.visibleRecommended=[],this.currentImageCount=0,this.textRefreshCallbacks=new Map}renderCategories(){const e=document.getElementById("templateCategories");e&&(e.innerHTML=this.categories.map(t=>`
            <button class="template-category${t.key===this.selectedCategory?" active":""}" data-key="${t.key}">
                ${n.t(t.nameKey)}
            </button>
        `).join(""),this.categoryContainer=e,e.querySelectorAll(".template-category").forEach(t=>{t.addEventListener("click",()=>{const a=t.getAttribute("data-key");this.setCategory(a)})}))}renderThemeNavigator(){const e=document.getElementById("templateThemes");if(!e)return;const t=this.themeGroups.map(a=>{const i=this.selectedTheme===a.key||this.selectedTheme==="all"&&a.key==="all",o=a.accentClass?` ${a.accentClass}`:"",s=this.escapeHtml(n.t(a.nameKey)),l=this.escapeHtml(n.t(a.descriptionKey));return`
                <button class="theme-chip${o}${i?" active":""}" data-key="${a.key}" aria-pressed="${i}">
                    <span class="theme-chip-name">${s}</span>
                    <span class="theme-chip-desc">${l}</span>
                </button>
            `}).join("");e.innerHTML=`<div class="template-theme-row">${t}</div>`,this.themeContainer=e,e.querySelectorAll(".theme-chip").forEach(a=>{a.addEventListener("click",()=>{const i=a.getAttribute("data-key");this.setTheme(i)})}),this.updateThemeState()}setCategory(e){!this.categorySet.has(e)||this.selectedCategory===e||(this.selectedCategory=e,this.selectedTheme!=="all"&&(this.selectedTheme="all",this.renderThemeNavigator()),this.renderCategories(),this.renderTemplates(),this.displayTemplates.some(t=>t.key===this.activeKey)||(this.activeKey=null,this.updateActiveState()))}setTheme(e){const t=this.themeGroupMap.has(e)?e:"all";if(this.selectedTheme===t){if(t==="all")return;this.selectedTheme="all"}else this.selectedTheme=t;this.selectedTheme!=="all"&&this.selectedCategory!=="all"&&(this.selectedCategory="all",this.renderCategories()),this.renderThemeNavigator(),this.renderTemplates()}renderTemplates(){const e=document.getElementById("templateGrid");if(!e)return;this.recommendationDetails=new Map,this.recommendedKeys.forEach(d=>{const p=this.templateMap.get(d);if(p){const m=this.buildRecommendationDetail(p,this.currentImageCount);m&&this.recommendationDetails.set(d,m)}});const t=this.templates.filter(d=>this.selectedCategory==="all"||d.category===this.selectedCategory),a=new Set(t.map(d=>d.key)),i=this.selectedTheme==="all"?t:t.filter(d=>Array.isArray(d.themes)&&d.themes.includes(this.selectedTheme)),o=new Set(i.map(d=>d.key)),s=this.recommendedKeys.map(d=>this.templateMap.get(d)).filter(d=>d&&a.has(d.key)&&o.has(d.key)),l=new Set(s.map(d=>d.key));this.visibleRecommended=s;const r=i.filter(d=>!l.has(d.key)).sort((d,p)=>d.originalIndex-p.originalIndex),g=r.filter(d=>this.favorites.has(d.key)),c=r.filter(d=>!this.favorites.has(d.key));this.displayTemplates=[...s,...g,...c],e.innerHTML=this.displayTemplates.map(d=>{const p=d.key===this.activeKey,m=l.has(d.key),f=this.favorites.has(d.key),h=f?"templates.favorite.remove":"templates.favorite.add",y=this.escapeHtml(n.t(h)),w=this.recommendationDetails.get(d.key),S=w?this.getInsightTagsMarkup(w):"",b=this.getVisualMarkup(d);return`
                <div class="template-item${p?" active":""}${m?" recommended":""}${f?" favorite":""}" data-key="${d.key}">
                    <button class="template-favorite-btn${f?" is-favorite":""}" data-key="${d.key}" aria-label="${y}" aria-pressed="${f}" title="${y}"></button>
                    ${b}
                    <div class="template-name" data-template-key="${d.key}" data-i18n="templates.${d.key}">${n.t(`templates.${d.key}`)}</div>
                    ${S}
                    ${this.getThemeTagsMarkup(d)}
                </div>
            `}).join(""),this.templateGridElement=e,e.querySelectorAll(".template-item").forEach(d=>{const p=d.getAttribute("data-key");d.addEventListener("click",()=>{this.activateTemplate(p,{dispatch:!0,auto:!1})})}),e.querySelectorAll(".template-favorite-btn").forEach(d=>{d.addEventListener("click",p=>{p.stopPropagation();const m=d.getAttribute("data-key");this.toggleFavorite(m)})}),this.updateActiveState(),this.updateThemeState(),this.renderRecommendationSummary(),this.refreshTemplateTexts()}getTemplate(e){return this.templates[e]}activateTemplate(e,{dispatch:t=!1,auto:a=!1,forceDispatch:i=!1}={}){const o=this.templateMap.get(e);if(!o)return!1;const s=this.activeKey;if(this.activeKey=e,this.updateActiveState(),t&&(i||s!==e)){const l=o,{originalIndex:r}=l,g=M(l,["originalIndex"]);document.dispatchEvent(new CustomEvent("template-selected",{detail:{template:v({},g),auto:a}}))}return!0}ensureActiveTemplate({dispatch:e=!1,force:t=!1}={}){let a=null;return this.activeKey&&this.templateMap.has(this.activeKey)&&(a=this.activeKey),!a&&this.recommendedKeys.length&&(a=this.recommendedKeys.find(i=>this.templateMap.has(i))||null),!a&&this.displayTemplates.length&&(a=this.displayTemplates[0].key),!a&&this.templates.length&&(a=this.templates[0].key),a?this.activateTemplate(a,{dispatch:e,auto:!0,forceDispatch:t}):!1}getActiveTemplatePayload(){if(!this.activeKey)return null;const e=this.templateMap.get(this.activeKey);if(!e)return null;const i=e,{originalIndex:t}=i,a=M(i,["originalIndex"]);return P(v({},a),{key:e.key})}getRecommendedKeys(){return Array.isArray(this.recommendedKeys)?[...this.recommendedKeys]:[]}getDefaultTemplateKey(){return this.templates.length?this.templates[0].key:null}getActiveTemplateKey(){return this.activeKey||null}refreshTemplateTexts(){const e=document.getElementById("templateGrid");e&&(e.querySelectorAll("[data-template-key]").forEach(t=>{const a=t.getAttribute("data-template-key");if(a)try{t.textContent=n.t(`templates.${a}`)}catch(i){}}),e.querySelectorAll("[data-theme-key]").forEach(t=>{const a=t.getAttribute("data-theme-key");if(!a)return;const i=this.themeGroupMap.get(a);if(i)try{t.textContent=n.t(i.nameKey)}catch(o){}}))}updateActiveState(){this.templateGridElement&&this.templateGridElement.querySelectorAll(".template-item").forEach(e=>{const t=e.getAttribute("data-key");e.classList.toggle("active",t===this.activeKey),e.classList.toggle("favorite",this.favorites.has(t));const a=e.querySelector(".template-favorite-btn");if(a){const i=this.favorites.has(t);a.classList.toggle("is-favorite",i),a.setAttribute("aria-pressed",String(i));try{const o=n.t(i?"templates.favorite.remove":"templates.favorite.add");a.setAttribute("aria-label",o),a.setAttribute("title",o)}catch(o){}}})}updateThemeState(){this.themeContainer&&this.themeContainer.querySelectorAll(".theme-chip").forEach(e=>{const t=e.getAttribute("data-key"),a=this.selectedTheme===t||this.selectedTheme==="all"&&t==="all";e.classList.toggle("active",a),e.setAttribute("aria-pressed",String(a))})}updateRecommendations(e){this.currentImageCount=e,this.recommendedKeys=this.getRecommendationKeys(e),this.renderTemplates()}getRecommendationKeys(e){return e<=0?[]:e===1?["horizontal","vertical","featured"]:e===2?["horizontal","vertical","twoColumns"]:e<=4?["grid2x2","twoColumns","featured"]:e<=6?["grid3x3","asymmetric","twoColumns"]:e<=9?["grid3x3","grid4x4","featured"]:e<=12?["grid4x4","grid5x4","grid4x5"]:e<=16?["grid5x4","grid4x6","grid5x5"]:e<=20?["grid5x5","grid6x4","grid4x6","grid7x3","grid3x7"]:["grid5x6","grid6x5","grid20x1","grid1x20"]}autoSelectFirstRecommendation(){if(!this.displayTemplates.length)return!1;const t=this.displayTemplates.find(a=>this.recommendedKeys.includes(a.key))||this.displayTemplates[0];return t?this.activateTemplate(t.key,{dispatch:!0,auto:!0}):!1}getTemplateByKey(e){const t=this.templateMap.get(e);if(!t)return null;const o=t,{originalIndex:a}=o,i=M(o,["originalIndex"]);return v({},i)}clearActiveSelection(){this.activeKey=null,this.updateActiveState()}getThemeTagsMarkup(e){return!e.themes||!e.themes.length?"":`<div class="template-tags">${e.themes.slice(0,2).map(i=>{const o=this.themeGroupMap.get(i);if(!o)return"";const s=this.escapeHtml(n.t(o.nameKey));return`<span class="template-tag${o.accentClass?` ${o.accentClass}`:""}" data-theme-key="${i}" data-i18n="${o.nameKey}">${s}</span>`}).join("")}</div>`}getInsightTagsMarkup(e){return!e||!e.tags||!e.tags.length?"":`<div class="insight-tags">
            ${e.tags.map(t=>`<span class="insight-tag${t.className?` ${t.className}`:""}">${this.escapeHtml(t.label)}</span>`).join("")}
        </div>`}buildRecommendationDetail(e,t){if(!e||t<=0)return null;const a={tags:[],lines:[]};if(e.type==="grid"){const o=e.rows||1,s=e.cols||1,l=o*s,r=l===t,g=l>=t,c=Math.abs(l-t);r?(a.tags.push({label:n.t("templates.recommendations.tags.exactFit",{count:t}),className:"tag-fit"}),a.lines.push(n.t("templates.recommendations.tooltip.gridExact",{count:t}))):g?(a.tags.push({label:n.t("templates.recommendations.tags.fitsUpTo",{count:l}),className:"tag-fit"}),a.lines.push(n.t("templates.recommendations.tooltip.gridCapacity",{count:t,capacity:l})),c>0&&a.lines.push(n.t("templates.recommendations.tooltip.gridExtra",{extra:c}))):(a.tags.push({label:n.t("templates.recommendations.tags.expandsTo",{count:l}),className:"tag-fit"}),a.lines.push(n.t("templates.recommendations.tooltip.gridOverflow",{count:t,capacity:l})),c>0&&a.lines.push(n.t("templates.recommendations.tooltip.gridNeedMore",{missing:c})))}const i=this.getGridOrientation(rows,cols);return a.tags.push({label:n.t(`templates.recommendations.tags.${i}`,{rows,cols}),className:"tag-orientation"}),e.type==="horizontal"&&(a.tags.push({label:n.t("templates.recommendations.tags.landscape"),className:"tag-orientation"}),a.tags.push({label:n.t("templates.recommendations.tags.hero"),className:"tag-style"}),a.lines.push(n.t("templates.recommendations.tooltip.horizontalPrimary",{count:t})),a.lines.push(n.t("templates.recommendations.tooltip.horizontalSecondary"))),e.type==="vertical"&&(a.tags.push({label:n.t("templates.recommendations.tags.portrait"),className:"tag-orientation"}),a.tags.push({label:n.t("templates.recommendations.tags.story"),className:"tag-style"}),a.lines.push(n.t("templates.recommendations.tooltip.verticalPrimary",{count:t})),a.lines.push(n.t("templates.recommendations.tooltip.verticalSecondary"))),e.type==="twoColumns"&&(a.tags.push({label:n.t("templates.recommendations.tags.twoColumn"),className:"tag-style"}),a.lines.push(n.t("templates.recommendations.tooltip.twoColumnsPrimary")),a.lines.push(n.t("templates.recommendations.tooltip.twoColumnsSecondary"))),e.type==="asymmetric"&&(a.tags.push({label:n.t("templates.recommendations.tags.collage"),className:"tag-style"}),a.lines.push(n.t("templates.recommendations.tooltip.asymmetricPrimary")),a.lines.push(n.t("templates.recommendations.tooltip.asymmetricSecondary"))),e.type==="featured"&&(a.tags.push({label:n.t("templates.recommendations.tags.featured"),className:"tag-style"}),a.lines.push(n.t("templates.recommendations.tooltip.featuredPrimary")),a.lines.push(n.t("templates.recommendations.tooltip.featuredSecondary"))),a}getGridOrientation(e,t){return e===t?"square":e>t?"portrait":"landscape"}renderRecommendationSummary(){var d;const e=document.getElementById("recommendationSummary");if(!e)return;if(!this.visibleRecommended.length||this.currentImageCount<=0){e.classList.add("is-hidden"),e.innerHTML="";return}const t=this.visibleRecommended[0],a=this.recommendationDetails.get(t.key);if(!a){e.classList.add("is-hidden"),e.innerHTML="";return}const i=this.escapeHtml(n.t(`templates.${t.key}`)),s=(a.tags?a.tags.slice(0,3):[]).map(p=>`<span class="summary-tag">${this.escapeHtml(p.label)}</span>`).join(""),l=this.currentImageCount===1?"templates.recommendations.photo.single":"templates.recommendations.photo.plural",r=n.t(l),g=this.escapeHtml(n.t("templates.recommendations.subtitle",{count:this.currentImageCount,photoLabel:r})),c=(d=a.lines)!=null&&d[0]?`<div class="summary-note">${this.escapeHtml(a.lines[0])}</div>`:"";e.innerHTML=`
            <div class="summary-heading">${n.t("templates.recommendations.heading")}</div>
            <div class="summary-subtitle">${g} <span class="summary-template">${i}</span></div>
            ${s?`<div class="summary-tags">${s}</div>`:""}
            ${c}
        `,e.classList.remove("is-hidden")}getBestTemplateKeyForCount(e){if(this.recommendedKeys.length){const i=this.recommendedKeys.find(o=>this.templateMap.has(o));if(i)return i}let t=null,a=1/0;return this.templates.forEach(i=>{if(i.type!=="grid")return;const o=i.rows*i.cols;if(o<e)return;const s=o-e;s<a?(a=s,t=i):s===a&&t&&i.rows*i.cols<t.rows*t.cols&&(t=i)}),t?t.key:null}toggleFavorite(e){this.templateMap.has(e)&&(this.favorites.has(e)?this.favorites.delete(e):this.favorites.add(e),this.persistFavorites(),this.renderTemplates())}loadFavorites(){if(typeof window=="undefined"||!window.localStorage){this.favorites=new Set;return}try{let e=window.localStorage.getItem(q);if(!e){const t=window.localStorage.getItem(R);t&&(e=t,window.localStorage.setItem(q,t),window.localStorage.removeItem(R))}if(e){const t=JSON.parse(e);Array.isArray(t)&&(this.favorites=new Set(t.filter(a=>this.templateMap.has(a))))}}catch(e){console.warn("Failed to load template favorites",e),this.favorites=new Set}}persistFavorites(){if(!(typeof window=="undefined"||!window.localStorage))try{const e=JSON.stringify([...this.favorites]);window.localStorage.setItem(q,e),window.localStorage.removeItem(R)}catch(e){console.warn("Failed to persist template favorites",e)}}escapeHtml(e){return String(e).replace(/[&<>"']/g,t=>{switch(t){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";case"'":return"&#39;";default:return t}})}getVisualMarkup(e){return e.type==="grid"&&e.rows&&e.cols?`<div class="template-icon">${this.buildUniformIcon(e.rows,e.cols)}</div>`:e.type==="horizontal"||e.type==="vertical"?`<div class="template-icon">${this.getIconMarkup(e)}</div>`:e.type==="twoColumns"?this.buildCustomIcon("repeat(2, 1fr)","1fr",["grid-column: 1; grid-row: 1;","grid-column: 2; grid-row: 1;"],"two-columns"):e.type==="asymmetric"?this.buildCustomIcon("2.5fr 1fr","repeat(2, 1fr)",["grid-column: 1; grid-row: 1 / span 2;","grid-column: 2; grid-row: 1;","grid-column: 2; grid-row: 2;"],"asymmetric"):e.type==="featured"?this.buildCustomIcon("repeat(4, 1fr)","repeat(5, 1fr)",["grid-column: 1 / span 2; grid-row: 1 / span 2;","grid-column: 3 / span 2; grid-row: 1 / span 2;","grid-column: 1 / span 2; grid-row: 3 / span 2;","grid-column: 3 / span 2; grid-row: 3 / span 2;","grid-column: 1 / span 4; grid-row: 5;"],"featured"):this.getPreviewMarkup(e,{rows:3,cols:3})}getPreviewMarkup(e,t){const a=e.rows||(t==null?void 0:t.rows),i=e.cols||(t==null?void 0:t.cols);return!a||!i?'<div class="template-preview" aria-hidden="true"></div>':`<div class="template-preview" aria-hidden="true">${this.buildUniformPreview(a,i)}</div>`}getIconMarkup(e){return e.type==="horizontal"?`
                <div class="template-icon-grid custom-horizontal">
                    <span class="icon-bar"></span>
                    <span class="icon-arrow">�?/span>
                    <span class="icon-bar"></span>
                </div>
            `:e.type==="vertical"?`
                <div class="template-icon-grid custom-vertical">
                    <span class="icon-bar"></span>
                    <span class="icon-arrow">�?/span>
                    <span class="icon-bar"></span>
                </div>
            `:e.type==="twoColumns"?`
                <div class="template-icon-grid two-columns">
                    <span></span>
                    <span></span>
                </div>
            `:e.type==="asymmetric"?`
                <div class="template-icon-grid asymmetric">
                    <span class="asym-left"></span>
                    <span class="asym-top"></span>
                    <span class="asym-bottom"></span>
                </div>
            `:e.type==="featured"?`
                <div class="template-icon-grid featured">
                    <span class="feat-a"></span>
                    <span class="feat-b"></span>
                    <span class="feat-c"></span>
                    <span class="feat-d"></span>
                    <span class="feat-e"></span>
                </div>
            `:e.icon?`<span>${e.icon}</span>`:"<span>�?/span>"}buildUniformPreview(e,t){const a=`grid-template-columns: repeat(${t}, 1fr); grid-template-rows: repeat(${e}, 1fr);`,i=Array.from({length:e*t},()=>'<span class="preview-cell"></span>').join("");return`<div class="template-preview-grid" style="${a}">${i}</div>`}buildCustomPreview(e,t,a){const i=[];e&&i.push(`grid-template-columns: ${e};`),t&&i.push(`grid-template-rows: ${t};`);const o=a.map(s=>`<span class="preview-cell" style="${s}"></span>`).join("");return`<div class="template-preview-grid" style="${i.join(" ")}">${o}</div>`}buildUniformIcon(e,t,a=""){const i=t>=12||e>=12?1:t>=6||e>=6?2:3,o=t>=8||e>=8?"dense":"",s=`grid-template-columns: repeat(${t}, 1fr); grid-template-rows: repeat(${e}, 1fr); gap: ${i}px;`,l=Array.from({length:e*t},()=>"<span></span>").join("");return`<div class="${["template-icon-grid",a,o].filter(Boolean).join(" ")}" style="${s}">${l}</div>`}buildCustomIcon(e,t,a,i=""){const o=[];e&&o.push(`grid-template-columns: ${e};`),t&&o.push(`grid-template-rows: ${t};`);const l=`gap: ${e!=null&&e.includes("repeat")||t!=null&&t.includes("repeat")?2:3}px;`,r=a.map(c=>`<span style="${c}"></span>`).join("");return`<div class="${["template-icon-grid",i].filter(Boolean).join(" ")}" style="${o.join(" ")} ${l}">${r}</div>`}}class ue{constructor(){this.images=[]}addImage(e){return x(this,null,function*(){return new Promise((t,a)=>{const i=new FileReader;i.onload=o=>{const s=new Image;s.onload=()=>{this.images.push({file:e,url:o.target.result,width:s.width,height:s.height,element:s,filters:this.getDefaultFilters()}),t()},s.onerror=a,s.src=o.target.result},i.onerror=a,i.readAsDataURL(e)})})}removeImage(e){this.images.splice(e,1)}reorderImages(e,t,a={}){const{insertAfter:i=!1}=a,o=this.images.length;if(e<0||e>=o||(t<0&&(t=0),t>=o&&(t=o-1),e===t&&!i))return!1;const[s]=this.images.splice(e,1);let l;return i?e<=t?l=t:l=t+1:e<t?l=t-1:l=t,l=Math.max(0,Math.min(l,this.images.length)),this.images.splice(l,0,s),l}getImages(){return this.images}clearImages(){this.images=[]}getImage(e){return this.images[e]}getDefaultFilters(){return{preset:"original",adjustments:{brightness:100,contrast:100,saturation:100,warmth:0,blur:0}}}}class he{export(l){return x(this,arguments,function*({element:e,quality:t,format:a,images:i,decorations:o,settings:s}){const r=document.getElementById("exportBtn"),g=r?r.textContent:"";try{r&&(r.textContent=n.t("export.exporting"),r.disabled=!0);const c=yield this.renderToCanvas({element:e,images:i,decorations:o,settings:s,quality:t,format:a}),d=a==="jpg"?"image/jpeg":"image/png",p=yield new Promise(h=>{c.toBlob(h,d,a==="jpg"?t:void 0)}),m=URL.createObjectURL(p),f=document.createElement("a");f.href=m,f.download=`collage-${Date.now()}.${a}`,document.body.appendChild(f),f.click(),document.body.removeChild(f),URL.revokeObjectURL(m);try{const h=yield this.renderSocialPreview(c);if(h){const y=URL.createObjectURL(h),w=document.createElement("a");w.href=y,w.download=`collage-social-${Date.now()}.jpg`,document.body.appendChild(w),w.click(),document.body.removeChild(w),URL.revokeObjectURL(y)}}catch(h){console.warn("Social preview generation failed:",h)}r&&(r.textContent=g,r.disabled=!1)}catch(c){console.error("Export error:",c),alert(n.t("export.failed")),r&&(r.disabled=!1,r.textContent=g||"Export")}})}renderToCanvas(l){return x(this,arguments,function*({element:e,images:t=[],decorations:a=[],settings:i={},quality:o=1,format:s="png"}){const r=e.getBoundingClientRect(),g=window.devicePixelRatio||1,c=Math.max(g,o*g),d=document.createElement("canvas");d.width=Math.max(1,Math.round(r.width*c)),d.height=Math.max(1,Math.round(r.height*c));const p=d.getContext("2d",{willReadFrequently:!1});p.scale(c,c);const m=r.left,f=r.top,h=this.resolveBackgroundColor(i.backgroundColor,s);return p.fillStyle=h,p.fillRect(0,0,r.width,r.height),Array.from(e.querySelectorAll(".image-container")).map(S=>{const b=S.querySelector("img");return{node:S,box:S.getBoundingClientRect(),img:b,imgBox:b?b.getBoundingClientRect():null}}).forEach(({node:S,box:b,img:W,imgBox:E},te)=>{const T=Math.max(0,Number(i.border)||0),ae=i.borderColor||"#ffffff",O=window.getComputedStyle(S).backgroundColor||h,D=b.left-m,z=b.top-f;if(T>0?(p.fillStyle=ae,p.fillRect(D,z,b.width,b.height),p.fillStyle=O,p.fillRect(D+T,z+T,Math.max(0,b.width-T*2),Math.max(0,b.height-T*2))):(p.fillStyle=O,p.fillRect(D,z,b.width,b.height)),!W||!E)return;const $=t[te];p.save(),p.filter=this.buildFilterString($==null?void 0:$.filters),p.drawImage(W,E.left-m,E.top-f,E.width,E.height),p.restore()}),a&&a.length&&this.drawDecorations(p,a,r.width,r.height),d})}renderSocialPreview(e){return x(this,null,function*(){const i=document.createElement("canvas");i.width=1200,i.height=630;const o=i.getContext("2d",{willReadFrequently:!1});o.fillStyle="#ffffff",o.fillRect(0,0,1200,630);const s=e.width,l=e.height;if(!s||!l)return null;const r=Math.min(1200/s,630/l),g=Math.round(s*r),c=Math.round(l*r),d=Math.floor((1200-g)/2),p=Math.floor((630-c)/2);return o.drawImage(e,d,p,g,c),yield new Promise(f=>i.toBlob(f,"image/jpeg",.9))})}buildFilterString(e){if(!e||!e.adjustments)return"none";const{brightness:t=100,contrast:a=100,saturation:i=100,warmth:o=0}=e.adjustments,s=typeof e.adjustments.blur=="number"?e.adjustments.blur:0,l=[`brightness(${t}%)`,`contrast(${a}%)`,`saturate(${i}%)`,`hue-rotate(${o*.8}deg)`];return i<=0&&l.push("grayscale(100%)"),l.push(`blur(${Math.max(0,s)}px)`),l.join(" ")}drawDecorations(e,t,a,i){const o=a*.8;t.forEach(s=>{const{x:l,y:r}=this.resolveCoordinates(s,a,i);if(s.type==="text"){const g=this.getTextSizePx(s.size);if(e.save(),e.filter="none",e.font=`600 ${g}px "Nunito", "Segoe UI", sans-serif`,e.fillStyle=s.color||"#ffffff",e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(0, 0, 0, 0.35)",e.shadowBlur=6,e.lineWidth=2,e.strokeStyle="rgba(0, 0, 0, 0.15)",s.content){const c=s.content;e.strokeText(c,l,r,o),e.fillText(c,l,r,o)}e.restore()}else if(s.type==="sticker"){const g=this.getStickerSizePx(s.size);e.save(),e.filter="none",e.font=`${g}px "Segoe UI Emoji", "Apple Color Emoji", "Segoe UI", sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(s.emoji,l,r),e.restore()}})}resolveCoordinates(e,t,a){const i=r=>Number.isFinite(r)?Math.min(Math.max(r,.02),.98):.5;if(typeof e.x=="number"&&typeof e.y=="number")return{x:i(e.x)*t,y:i(e.y)*a};const o={"top-left":{x:.08,y:.12},"top-center":{x:.5,y:.12},"top-right":{x:.92,y:.12},center:{x:.5,y:.5},"bottom-left":{x:.12,y:.88},"bottom-center":{x:.5,y:.88},"bottom-right":{x:.88,y:.88}},s=e.position&&o[e.position]?e.position:"center",l=o[s];return{x:l.x*t,y:l.y*a}}getTextSizePx(e){switch(e){case"small":return 16*1.2;case"large":return 16*2.2;case"medium":default:return 16*1.6}}getStickerSizePx(e){switch(e){case"small":return 16*1.8;case"large":return 16*3.2;case"medium":default:return 16*2.4}}resolveBackgroundColor(e,t){const a=t==="jpg"?"#ffffff":"rgba(0,0,0,0)";if(!e)return a;const i=e.trim().toLowerCase();return i==="transparent"||i==="rgba(0,0,0,0)"||i==="rgba(0, 0, 0, 0)"?a:e}}class me{constructor(){this.baseUrl="https://www.mecollage.top",this.faqContent={home:[{question:"Is MeCollage completely free to use?",answer:"Yes. You can upload unlimited images, use every template, and export PNG or JPG files without logging in or paying."},{question:"Do exports include a watermark?",answer:"No. Every download is watermark-free so you can share collages on any platform."}],features:[{question:"How many images can I add to a collage?",answer:"You can add 20+ images by default and the custom grid allows expanding even further depending on your layout settings."},{question:"Which layouts and sizes are available?",answer:"Choose from horizontal, vertical, story, square, multi-grid, and fully custom layouts with adjustable spacing and borders."}],tutorial:[{question:"What is the fastest way to create a collage?",answer:"Upload all photos, pick a template from the recommendations, adjust spacing or colors, then click Export to download your collage."},{question:"Can I edit collages on mobile?",answer:"Yes. The UI is responsive so you can drag, resize, and export collages on phones and tablets."}]},this.init()}init(){this.ensureMetaTags()}ensureMetaTags(){const e=document.head;if(!document.querySelector('link[rel="canonical"]')){const i=document.createElement("link");i.rel="canonical",e.appendChild(i)}["og:title","og:description","og:url","og:type"].forEach(i=>{if(!document.querySelector(`meta[property="${i}"]`)){const o=document.createElement("meta");o.setAttribute("property",i),e.appendChild(o)}}),["twitter:title","twitter:description"].forEach(i=>{if(!document.querySelector(`meta[name="${i}"]`)){const o=document.createElement("meta");o.setAttribute("name",i),e.appendChild(o)}})}getSEOConfig(e,t=null){var s,l;const a=n.currentLang,i={en:{home:{title:"MeCollage | Free Online Photo Collage Maker (No Watermark)",description:"Design photo collages with unlimited images, 20+ layouts, custom grids, filters, and instant PNG/JPG export. No login, no watermark, totally free.",keywords:"free collage maker, no watermark collage, online photo collage, unlimited images collage, custom grid collage, png jpg export",canonical:`${this.baseUrl}/`},features:{title:"Collage Maker Features | 20+ Layouts, AI Ideas & Custom Grids",description:"Explore every MeCollage feature: AI template suggestions, responsive grids, spacing controls, stickers, filters, story/square exports, and watermark-free downloads.",keywords:"collage maker features, ai collage templates, custom grid collage, collage spacing controls, story collage maker",canonical:`${this.baseUrl}/features`},tutorial:{title:"How to Use MeCollage | Step-by-Step Free Collage Tutorial",description:"Follow this quick start guide to upload photos, pick templates, fine-tune spacing, add text, and export a collage in under five minutes.",keywords:"how to use mecollage, free collage tutorial, quick collage guide, photo collage tips",canonical:`${this.baseUrl}/tutorial`},blog:{title:"Collage Tips, Layout Ideas & Templates | MeCollage Blog",description:"Weekly guides covering layout ideas, social-ready sizes, design trends, and free templates to level up every collage project.",keywords:"collage tips, collage ideas, free collage templates, collage design blog, social media collage guide",canonical:`${this.baseUrl}/blog`},works:{title:"Public Collage Gallery | MeCollage Inspiration Board",description:"Browse shareable collages created by the community. Copy the embed code or share the work to inspire your next layout.",keywords:"public collage gallery, collage inspiration, embed collage, mecollage works",canonical:`${this.baseUrl}/works`}},zh:{home:{title:"MeCollage｜免费在线照片拼图工具（无水印）",description:"无限张图片�?0+模板、自定义网格与滤镜特效，几分钟即可导�?PNG/JPG 拼图，无需登录、无任何水印�?,keywords:"免费拼图工具, 无水印拼�? 在线照片拼图, 自定义网格拼�? 拼图导出PNG",canonical:`${this.baseUrl}/?lang=zh`},features:{title:"功能亮点�?0+ 模板、AI 推荐、自定义网格",description:"了解 MeCollage 的全部功能：AI 模板推荐、响应式网格、边�?边框控制、贴纸滤镜、故�?方形尺寸导出，全程免费�?,keywords:"拼图功能, AI 拼图模板, 自定义拼图网�? 拼图边距设置, 拼图导出",canonical:`${this.baseUrl}/features?lang=zh`},tutorial:{title:"新手教程�? 分钟完成高质量拼�?,description:"按步骤上传照片、选择模板、调节间距颜色、添加文字贴纸，最后一键导出。移动端同样适用�?,keywords:"拼图教程, 拼图步骤, 手机拼图指南, 快速拼�?,canonical:`${this.baseUrl}/tutorial?lang=zh`},blog:{title:"拼图灵感与模板推荐｜MeCollage 博客",description:"定期更新拼图灵感、社媒尺寸、节日模板、设计技巧与免费素材，帮助你快速出片�?,keywords:"拼图灵感, 拼图模板推荐, 社媒拼图, 拼图设计技�?,canonical:`${this.baseUrl}/blog?lang=zh`},works:{title:"公开拼图画廊｜社区灵感墙",description:"浏览用户公开分享的拼图作品，获取布局灵感或复制嵌入代码展示在自己网站上�?,keywords:"拼图画廊, 拼图灵感, 拼图嵌入, MeCollage 作品",canonical:`${this.baseUrl}/works?lang=zh`}},es:{home:{title:"MeCollage | Creador de collages gratis sin marca de agua",description:"Diseña collages con imágenes ilimitadas, 20+ plantillas y cuadrículas personalizadas. Exporta en PNG/JPG sin registrarte ni dejar marca de agua.",keywords:"creador de collage gratis, collage sin marca de agua, collage online, plantillas de collage",canonical:`${this.baseUrl}/?lang=es`},features:{title:"Funciones clave | Plantillas, IA y cuadrículas personalizadas",description:"Conoce las funciones de MeCollage: sugerencias con IA, cuadrículas responsivas, controles de espaciado, filtros y exportaciones optimizadas para redes.",keywords:"funciones creador collage, plantillas collage, IA collage, cuadrículas personalizadas",canonical:`${this.baseUrl}/features?lang=es`},tutorial:{title:"Tutorial rápido | Cómo crear un collage en 5 minutos",description:"Guía paso a paso para subir fotos, elegir plantillas, ajustar colores y descargar tu collage gratis en menos de cinco minutos.",keywords:"tutorial collage gratis, cómo usar mecollage, guía collage paso a paso",canonical:`${this.baseUrl}/tutorial?lang=es`},blog:{title:"Ideas, plantillas y consejos de collage | Blog MeCollage",description:"Artículos con ideas de diseño, tamaños ideales para redes, guías de temporada y plantillas gratuitas para inspirar tus collages.",keywords:"ideas de collage, plantillas gratis collage, consejos de diseño collage, blog collage",canonical:`${this.baseUrl}/blog?lang=es`},works:{title:"Galería pública de collages | Inspiración MeCollage",description:"Explora collages creados por la comunidad, comparte enlaces públicos o usa el código de inserción para mostrarlos en tu web.",keywords:"galería de collages, inspiración collage, incrustar collage, mecollage works",canonical:`${this.baseUrl}/works?lang=es`}}};let o=((s=i[a])==null?void 0:s[e])||i.en[e];if(t&&e.startsWith("blog/")){const r=window.blogManager?window.blogManager.getLocalizedPost(t,a):t,g=e.replace("blog/",""),c=`${this.baseUrl}/blog/${g}${a!=="en"?`?lang=${a}`:""}`;o={title:`${r.title} | MeCollage Blog`,description:r.excerpt||o.description,keywords:t.tags.join(", ")+", collage tutorial, photo collage guide",canonical:c}}if(e&&e.startsWith("works/")){const r=e.replace("works/",""),g=`${this.baseUrl}/works/${r}${a!=="en"?`?lang=${a}`:""}`,c=((l=i[a])==null?void 0:l.works)||i.en.works;o={title:`${c.title} | ${r}`,description:c.description,keywords:c.keywords,canonical:g}}return o}updateSEO(e,t=null){const a=this.getSEOConfig(e,t),i=n.currentLang;document.title=a.title;let o=document.querySelector('meta[name="description"]');o||(o=document.createElement("meta"),o.setAttribute("name","description"),document.head.appendChild(o)),o.setAttribute("content",a.description);let s=document.querySelector('meta[name="keywords"]');s||(s=document.createElement("meta"),s.setAttribute("name","keywords"),document.head.appendChild(s)),s.setAttribute("content",a.keywords);let l=document.querySelector('link[rel="canonical"]');l||(l=document.createElement("link"),l.setAttribute("rel","canonical"),document.head.appendChild(l)),l.setAttribute("href",a.canonical),this.updateOGTag("og:title",a.title),this.updateOGTag("og:description",a.description),this.updateOGTag("og:url",a.canonical),this.updateOGTag("og:type",e.startsWith("blog/")?"article":"website"),this.updateMetaTag("twitter:title",a.title),this.updateMetaTag("twitter:description",a.description);const r={en:"en",zh:"zh-CN",es:"es-ES"};document.documentElement.setAttribute("lang",r[i]||"en"),this.updateStructuredData(e,t,a),this.updateHrefLangLinks(e,t)}updateOGTag(e,t){let a=document.querySelector(`meta[property="${e}"]`);a||(a=document.createElement("meta"),a.setAttribute("property",e),document.head.appendChild(a)),a.setAttribute("content",t)}updateMetaTag(e,t){let a=document.querySelector(`meta[name="${e}"]`);a||(a=document.createElement("meta"),a.setAttribute("name",e),document.head.appendChild(a)),a.setAttribute("content",t)}updateStructuredData(e,t,a){this.updateBreadcrumbSchema(e,t,a),this.updateFAQSchema(e)}updateBreadcrumbSchema(e,t,a){const i=[{"@type":"ListItem",position:1,name:"Home",item:`${this.baseUrl}/`}],o=(r,g)=>{i.push({"@type":"ListItem",position:i.length+1,name:r,item:g})},s=n.currentLang&&n.currentLang!=="en"?`?lang=${n.currentLang}`:"";if(e==="features")o("Features",`${this.baseUrl}/features${s}`);else if(e==="tutorial")o("Tutorial",`${this.baseUrl}/tutorial${s}`);else if(e==="blog")o("Blog",`${this.baseUrl}/blog${s}`);else if(e==="works")o("Public Works",`${this.baseUrl}/works${s}`);else if(e&&e.startsWith("blog/")){const r=e.replace("blog/","");o("Blog",`${this.baseUrl}/blog${s}`),o((t==null?void 0:t.title)||"Post",(a==null?void 0:a.canonical)||`${this.baseUrl}/blog/${r}`)}else if(e&&e.startsWith("works/")){const r=e.replace("works/","");o("Public Works",`${this.baseUrl}/works${s}`),o(r,(a==null?void 0:a.canonical)||`${this.baseUrl}/works/${r}`)}const l={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:i};this.setJSONLDScript("structured-breadcrumb",l)}updateFAQSchema(e){const t=this.faqContent[e];if(!t){this.setJSONLDScript("structured-faq",null);return}const a={"@context":"https://schema.org","@type":"FAQPage",mainEntity:t.map(i=>({"@type":"Question",name:i.question,acceptedAnswer:{"@type":"Answer",text:i.answer}}))};this.setJSONLDScript("structured-faq",a)}setJSONLDScript(e,t){let a=document.getElementById(e);if(!t){a&&a.remove();return}a||(a=document.createElement("script"),a.type="application/ld+json",a.id=e,document.head.appendChild(a)),a.textContent=JSON.stringify(t)}updateHrefLangLinks(e,t){const a=["en","zh","es"],i=document.head;Array.from(i.querySelectorAll('link[rel="alternate"][hreflang]')).forEach(c=>{c.dataset.static||c.remove()});const o=this.baseUrl,s=(c,d="")=>{if(!d)return c==="en"?`${o}/`:`${o}/?lang=${c}`;if(c==="en")return`${o}${d}`;const p=d.includes("?")?"&":"?";return`${o}${d}${p}lang=${c}`},l={home:"",features:"/features",tutorial:"/tutorial",blog:"/blog"};let r="";if(l[e]!==void 0?r=l[e]:e&&e.startsWith("blog/")?r=`/blog/${e.replace("blog/","")}`:e&&e.startsWith("works/")?r=`/works/${e.replace("works/","")}`:e==="works"&&(r="/works"),r===null)return;const g=[];a.forEach(c=>{g.push({hreflang:c,href:s(c,r)})}),g.push({hreflang:"x-default",href:r?`${o}${r}`:`${o}/`}),g.forEach(({hreflang:c,href:d})=>{const p=document.createElement("link");p.rel="alternate",p.hreflang=c,p.href=d,i.appendChild(p)})}}const k=new me;function N(u,e){const t=new URL(u,window.location.origin),a=t.searchParams;return Object.entries(e).forEach(([i,o])=>{o!=null&&o!==""&&a.set(i,o)}),t.search=a.toString(),t.toString()}function H(u){var e;try{const t=u||((e=window.router)==null?void 0:e.currentPage)||"home";return k.getSEOConfig(t).canonical||window.location.href}catch(t){return window.location.href}}function Z({url:u,title:e,text:t,campaign:a="share",medium:i="social"}={}){const o=u||H(),s=e||document.title||"MeCollage",l=t||s,r=(m,f,h={})=>N(m,v({utm_source:f,utm_medium:i,utm_campaign:a},h)),g=encodeURIComponent,c=g(o),d=g(s),p=g(l);return[{id:"copy",labelKey:"share.copyLink",href:"#",isAction:!0},{id:"system",labelKey:"share.systemShare",href:"#",isAction:!0},{id:"twitter",labelKey:"share.twitter",href:r(`https://twitter.com/intent/tweet?text=${d}&url=${c}`,"twitter")},{id:"facebook",labelKey:"share.facebook",href:r(`https://www.facebook.com/sharer/sharer.php?u=${c}`,"facebook")},{id:"reddit",labelKey:"share.reddit",href:r(`https://www.reddit.com/submit?url=${c}&title=${d}`,"reddit")},{id:"pinterest",labelKey:"share.pinterest",href:r(`https://pinterest.com/pin/create/button/?url=${c}&description=${p}`,"pinterest")},{id:"whatsapp",labelKey:"share.whatsapp",href:r(`https://api.whatsapp.com/send?text=${p}%20${c}`,"whatsapp")},{id:"telegram",labelKey:"share.telegram",href:r(`https://t.me/share/url?url=${c}&text=${p}`,"telegram")},{id:"linkedin",labelKey:"share.linkedin",href:r(`https://www.linkedin.com/sharing/share-offsite/?url=${c}`,"linkedin")}]}function K(u,e={}){if(!u)return;const t=Z(e),a=n.t("blog.shareArticle");u.innerHTML=`
		<span class="blog-share-label">${a}</span>
		<div class="blog-share-links">
			${t.map(i=>`<a href="${i.href}" class="blog-share-link share-${i.id}" data-share="${i.id}" rel="noopener" target="${i.isAction?"_self":"_blank"}">${n.t(i.labelKey)}</a>`).join("")}
		</div>
	`,ee(u,e)}function ee(u,{url:e,title:t,text:a,campaign:i,medium:o}={}){if(!u)return;const s=e||H(),l=t||document.title||"MeCollage",r=a||l;u.addEventListener("click",g=>x(this,null,function*(){const c=g.target.closest("a[data-share]");if(!c)return;const d=c.dataset.share;if(d==="copy"){g.preventDefault();try{yield navigator.clipboard.writeText(N(s,{utm_source:"copy",utm_medium:o||"social",utm_campaign:i||"share"})),B(n.t("share.copied"))}catch(p){console.warn("Clipboard failed, fallback to prompt",p),window.prompt(n.t("share.copyPrompt"),s)}}else if(d==="system")if(g.preventDefault(),navigator.share)try{yield navigator.share({title:l,text:r,url:N(s,{utm_source:"system",utm_medium:o||"social",utm_campaign:i||"share"})})}catch(p){}else B(n.t("share.notSupported"))}))}function B(u){let e=document.getElementById("globalToast");e||(e=document.createElement("div"),e.id="globalToast",e.className="toast",document.body.appendChild(e)),e.textContent=u,e.classList.add("is-visible"),window.clearTimeout(B._timer),B._timer=window.setTimeout(()=>{e.classList.remove("is-visible")},1800)}const X=Object.freeze(Object.defineProperty({__proto__:null,attachShareHandlers:ee,buildShareTargets:Z,getCanonicalForCurrent:H,renderShareLinks:K},Symbol.toStringTag,{value:"Module"}));class fe{constructor(){this.currentPage="home",this.pages={home:"home",features:"features",tutorial:"tutorial",works:"works"},this.init()}init(){window.addEventListener("popstate",t=>{const a=this.getPathFromURL();this.navigateToPath(a,!1)});const e=this.getPathFromURL();this.navigateToPath(e,!1)}getPathFromURL(){const e=window.location.pathname;if(e==="/"||e==="/index.html")return"home";let t=e.replace(/^\//,"").replace(/\.html$/,"");return t.startsWith("blog/")?t.replace(/\.(en|zh|es)$/,""):t.startsWith("works/")?t:{features:"features",tutorial:"tutorial",blog:"blog"}[t]||"home"}navigateToPath(e,t=!0){this.showPage(e,t)}navigate(e){this.pages[e]&&this.showPage(e,!0)}showPage(e,t=!0){if(e.startsWith("works/")){const o=e.replace("works/","");this.showWorkPage(o,t);return}this.setPageVisibility(`page-${e}`);const a=document.querySelector(".ghibli-header");if(a&&(e==="home"?a.style.display="block":a.style.display="none"),document.getElementById(`page-${e}`)&&(this.currentPage=e,k.updateSEO(e),document.querySelectorAll(".nav-link").forEach(o=>{o.classList.remove("active"),o.dataset.page===e&&o.classList.add("active")}),window.scrollTo({top:0,behavior:"smooth"}),t)){const o=e==="home"?"/":`/${e}`;window.history.pushState({page:e},"",o)}}showWorkPage(e,t=!0){this.setPageVisibility("page-works");const a=document.querySelector(".ghibli-header");a&&(a.style.display="none"),document.getElementById("page-works")&&(this.currentPage=`works/${e}`,this.renderWorkPage(e),k.updateSEO(this.currentPage),t&&window.history.pushState({page:`works/${e}`},"",`/works/${e}`),window.scrollTo({top:0,behavior:"smooth"}))}renderWorkPage(e){const t=document.getElementById("works-content");if(!t)return;const{i18n:a}=window,i=a.t("works.pageTitle"),o=a.t("works.pageSubtitle"),s=decodeURIComponent(e);t.innerHTML=`
            <h1 class="page-title">${i}</h1>
            <p class="page-subtitle">${o}</p>
            <div class="work-hero">
                <img src="https://res.cloudinary.com/dztbpf6ke/image/upload/${s}" alt="Public Work" loading="lazy" decoding="async">
            </div>
        `}setPageVisibility(e){if(document.querySelectorAll(".page-content").forEach(a=>a.classList.remove("is-visible")),e){const a=document.getElementById(e);a&&a.classList.add("is-visible")}document.body.classList.add("spa-ready")}renderBlogPost(e){const t=document.getElementById("blog-post-content");if(!t)return;const a=n.currentLang,i=window.blogManager?window.blogManager.getLocalizedPost(e,a):e,o=n.t("blog.backToBlog"),s=n.t("blog.by");n.t("blog.shareArticle");const l=n.t("blog.relatedArticles"),r=n.t("blog.readMore"),g={Tutorial:n.t("blog.categories.tutorial"),"Design Tips":n.t("blog.categories.designTips"),Holiday:n.t("blog.categories.holiday"),Mobile:n.t("blog.categories.mobile"),"Social Media":n.t("blog.categories.socialMedia"),Portfolio:n.t("blog.categories.portfolio")},c=window.blogManager?window.blogManager.getRelatedPosts(e.id,3,a):[];let d="";c.length>0&&(d=`
                <div class="blog-related-posts">
                    <h2 class="blog-related-title">${l}</h2>
                    <div class="blog-related-list">
                        ${c.map(h=>{const y=window.blogManager.getLocalizedPost(h,a);return`
                                <article class="blog-related-item">
                                    <h3 class="blog-related-item-title">
                                        <a href="/blog/${h.id}">${y.title}</a>
                                    </h3>
                                    <p class="blog-related-item-excerpt">${y.excerpt}</p>
                                    <a href="/blog/${h.id}" class="blog-related-item-link">${r} �?/a>
                                </article>
                            `}).join("")}
                    </div>
                </div>
            `);const p=(e.internalLinks||[]).map(h=>{var S,b;if(!h)return null;const y=((S=h.labels)==null?void 0:S[a])||((b=h.labels)==null?void 0:b.en)||h.href,w=h.href.startsWith("http")||a==="en"?h.href:`${h.href}${h.href.includes("?")?"&":"?"}lang=${a}`;return{label:y,href:w}}).filter(Boolean);let m="";p.length&&(m=`
                <div class="blog-cta-grid">
                    <h2 class="blog-cta-title">${n.t("blog.keepExploring")}</h2>
                    <div class="blog-cta-cards">
                        ${p.map(y=>`
                            <a class="blog-cta-card" href="${y.href}">
                                <span>${y.label}</span>
                                <span aria-hidden="true">�?/span>
                            </a>
                        `).join("")}
                    </div>
                </div>
            `),t.innerHTML=`
            <div class="blog-post-header">
                <a href="/blog" class="blog-back-link">�?${o}</a>
                <h1 class="blog-post-main-title">${i.title}</h1>
                <div class="blog-post-meta">
                    <span class="blog-date">${this.formatDate(e.date)}</span>
                    <span class="blog-category">${g[e.category]||e.category}</span>
                    <span class="blog-author">${s} ${e.author}</span>
                </div>
                <div class="blog-post-tags">
                    ${e.tags.map(h=>`<span class="blog-tag">#${h}</span>`).join("")}
                </div>
            </div>
            <div class="blog-post-body">
                ${i.content}
                ${m}
            </div>
            ${d}
            <div class="blog-post-footer">
                <a href="/blog" class="blog-back-link">�?${o}</a>
                <div class="blog-share" id="blogShare"></div>
            </div>
        `;const f=document.getElementById("blogShare");K(f,{title:i.title,text:i.excerpt||i.title,campaign:`blog_${e.id}`})}formatDate(e){const t=new Date(e),a=n.currentLang,o={en:"en-US",zh:"zh-CN",es:"es-ES"}[a]||"en-US";return t.toLocaleDateString(o,{year:"numeric",month:"long",day:"numeric"})}}const C=new fe,ye={features:{href:"/features",labels:{en:"Explore every MeCollage feature",zh:"查看所�?MeCollage 功能",es:"Explora todas las funciones de MeCollage"}},tutorial:{href:"/tutorial",labels:{en:"Follow the step-by-step tutorial",zh:"查看分步教程",es:"Sigue el tutorial paso a paso"}},works:{href:"/works",labels:{en:"Browse the public collage gallery",zh:"浏览公开作品画廊",es:"Explora la galería pública"}}},L=(u=[])=>u.map(e=>ye[e]).filter(Boolean);`
                    <h2>Introduction</h2>
                    <p>Creating a photo collage is a great way to combine multiple images into a single, stunning composition. Whether you're making a memory book, social media post, or portfolio layout, this guide will walk you through the process step by step.</p>
                    
                    <h2>Step 1: Choose Your Photos</h2>
                    <p>Start by selecting 2-20 photos that tell a story or share a theme. For best results:</p>
                    <ul>
                        <li>Choose photos with similar lighting and color tones</li>
                        <li>Select images with similar dimensions (or crop them first)</li>
                        <li>Pick photos that complement each other visually</li>
                    </ul>
                    
                    <h2>Step 2: Upload Your Images</h2>
                    <p>Using MeCollage, you can upload images in two ways:</p>
                    <ol>
                        <li><strong>Drag and Drop:</strong> Simply drag your photos into the upload area</li>
                        <li><strong>Click to Browse:</strong> Click the "Select Photos" button to choose files from your device</li>
                    </ol>
                    <p>You can upload multiple images at once - there's no limit!</p>
                    
                    <h2>Step 3: Select a Template</h2>
                    <p>MeCollage offers 20+ pre-designed templates:</p>
                    <ul>
                        <li><strong>Horizontal Layouts:</strong> Perfect for wide images and landscapes</li>
                        <li><strong>Vertical Layouts:</strong> Great for portraits and story-style sequences</li>
                        <li><strong>Grid Layouts:</strong> Classic 2x2, 3x3, 4x4, and more</li>
                        <li><strong>Custom Grids:</strong> Create your own layout up to 30x30</li>
                    </ul>
                    <p>Our AI will recommend the best templates based on your photo count!</p>
                    
                    <h2>Step 4: Customize Your Collage</h2>
                    <p>Make your collage unique with these customization options:</p>
                    <ul>
                        <li><strong>Spacing:</strong> Adjust the gap between images (0-20px)</li>
                        <li><strong>Borders:</strong> Add borders with custom colors (0-10px)</li>
                        <li><strong>Background:</strong> Choose a background color that complements your photos</li>
                        <li><strong>Filters:</strong> Apply filters to individual images or all images</li>
                        <li><strong>Text & Stickers:</strong> Add captions and decorative elements</li>
                    </ul>
                    
                    <h2>Step 5: Export Your Collage</h2>
                    <p>Once you're happy with your collage:</p>
                    <ol>
                        <li>Choose your export format (PNG for highest quality, JPG for smaller file size)</li>
                        <li>Adjust quality settings (100% for best quality)</li>
                        <li>Select aspect ratio (Original, Square, Story, or Landscape)</li>
                        <li>Click "Export Collage" to download</li>
                    </ol>
                    
                    <h2>Pro Tips</h2>
                    <ul>
                        <li>Use similar-sized images for a cleaner look</li>
                        <li>Experiment with different templates to find your style</li>
                        <li>Don't be afraid to use filters to create a cohesive look</li>
                        <li>Save your favorite templates by clicking the star icon</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Creating a photo collage is easy with MeCollage! Start with a simple template, experiment with customization options, and soon you'll be creating stunning collages in minutes.</p>
                    
                    <p><strong>Ready to create your first collage?</strong> <a href="/">Try MeCollage now</a> - it's completely free!</p>
                `},zh:{title:"如何制作照片拼图：初学者完整指�?,excerpt:"学习如何一步步创建精美的照片拼图。非常适合想要将多张照片组合成精美布局的初学者�?,content:`
                    <h2>介绍</h2>
                    <p>创建照片拼图是将多张图片组合成一张精美作品的好方法。无论您是在制作记忆册、社交媒体帖子还是作品集布局，本指南都将逐步引导您完成整个过程�?/p>
                    
                    <h2>步骤 1：选择您的照片</h2>
                    <p>首先选择 2-20 张讲述故事或共享主题的照片。为了获得最佳效果：</p>
                    <ul>
                        <li>选择具有相似光线和色调的照片</li>
                        <li>选择尺寸相似的图片（或先裁剪它们�?/li>
                        <li>选择在视觉上相互补充的照�?/li>
                    </ul>
                    
                    <h2>步骤 2：上传您的图�?/h2>
                    <p>使用 MeCollage，您可以通过两种方式上传图片�?/p>
                    <ol>
                        <li><strong>拖放�?/strong>只需将照片拖放到上传区域</li>
                        <li><strong>点击浏览�?/strong>点击"选择照片"按钮从设备中选择文件</li>
                    </ol>
                    <p>您可以一次上传多张图�?- 没有限制�?/p>
                    
                    <h2>步骤 3：选择模板</h2>
                    <p>MeCollage 提供 20+ 种预设计模板�?/p>
                    <ul>
                        <li><strong>横向布局�?/strong>非常适合宽幅图片和风景照</li>
                        <li><strong>纵向布局�?/strong>非常适合人像和故事风格的序列</li>
                        <li><strong>网格布局�?/strong>经典�?2x2�?x3�?x4 �?/li>
                        <li><strong>自定义网格：</strong>创建最�?30x30 的自己的布局</li>
                    </ul>
                    <p>我们�?AI 会根据您的照片数量推荐最佳模板！</p>
                    
                    <h2>步骤 4：自定义您的拼图</h2>
                    <p>使用这些自定义选项让您的拼图独一无二�?/p>
                    <ul>
                        <li><strong>间距�?/strong>调整图片之间的间隙（0-20px�?/li>
                        <li><strong>边框�?/strong>添加自定义颜色的边框�?-10px�?/li>
                        <li><strong>背景�?/strong>选择与照片相配的背景颜色</li>
                        <li><strong>滤镜�?/strong>对单张图片或所有图片应用滤�?/li>
                        <li><strong>文字和贴纸：</strong>添加标题和装饰元�?/li>
                    </ul>
                    
                    <h2>步骤 5：导出您的拼�?/h2>
                    <p>当您对拼图满意时�?/p>
                    <ol>
                        <li>选择导出格式（PNG 质量最高，JPG 文件更小�?/li>
                        <li>调整质量设置�?00% 为最佳质量）</li>
                        <li>选择宽高比（原始、方形、故事或横向�?/li>
                        <li>点击"导出拼图"下载</li>
                    </ol>
                    
                    <h2>专业技�?/h2>
                    <ul>
                        <li>使用相似尺寸的图片以获得更整洁的外观</li>
                        <li>尝试不同的模板以找到您的风格</li>
                        <li>不要害怕使用滤镜来创建统一的外�?/li>
                        <li>通过点击星形图标保存您喜欢的模板</li>
                    </ul>
                    
                    <h2>结论</h2>
                    <p>使用 MeCollage 创建照片拼图很容易！从一个简单的模板开始，尝试自定义选项，很快您就能在几分钟内创建精美的拼图�?/p>
                    
                    <p><strong>准备好创建您的第一个拼图了吗？</strong> <a href="/">立即尝试 MeCollage</a> - 完全免费�?/p>
                `},es:{title:"Cómo Hacer un Collage de Fotos: Guía Completa para Principiantes",excerpt:"Aprende paso a paso cómo crear hermosos collages de fotos. Perfecto para principiantes que quieren combinar múltiples fotos en diseños impresionantes.",content:`
                    <h2>Introducción</h2>
                    <p>Crear un collage de fotos es una excelente manera de combinar múltiples imágenes en una sola composición impresionante. Ya sea que estés haciendo un libro de recuerdos, una publicación en redes sociales o un diseño de portafolio, esta guía te llevará paso a paso a través del proceso.</p>
                    
                    <h2>Paso 1: Elige Tus Fotos</h2>
                    <p>Comienza seleccionando 2-20 fotos que cuenten una historia o compartan un tema. Para mejores resultados:</p>
                    <ul>
                        <li>Elige fotos con iluminación y tonos de color similares</li>
                        <li>Selecciona imágenes con dimensiones similares (o recórtalas primero)</li>
                        <li>Elige fotos que se complementen visualmente</li>
                    </ul>
                    
                    <h2>Paso 2: Sube Tus Imágenes</h2>
                    <p>Usando MeCollage, puedes subir imágenes de dos maneras:</p>
                    <ol>
                        <li><strong>Arrastrar y Soltar:</strong> Simplemente arrastra tus fotos al área de carga</li>
                        <li><strong>Hacer Clic para Buscar:</strong> Haz clic en el botón "Seleccionar Fotos" para elegir archivos de tu dispositivo</li>
                    </ol>
                    <p>¡Puedes subir múltiples imágenes a la vez - no hay límite!</p>
                    
                    <h2>Paso 3: Selecciona una Plantilla</h2>
                    <p>MeCollage ofrece más de 20 plantillas prediseñadas:</p>
                    <ul>
                        <li><strong>Diseños Horizontales:</strong> Perfectos para imágenes anchas y paisajes</li>
                        <li><strong>Diseños Verticales:</strong> Excelentes para retratos y secuencias estilo historia</li>
                        <li><strong>Diseños en Rejilla:</strong> Clásicos 2x2, 3x3, 4x4 y más</li>
                        <li><strong>Rejillas Personalizadas:</strong> Crea tu propio diseño hasta 30x30</li>
                    </ul>
                    <p>¡Nuestra IA recomendará las mejores plantillas según tu cantidad de fotos!</p>
                    
                    <h2>Paso 4: Personaliza Tu Collage</h2>
                    <p>Haz que tu collage sea único con estas opciones de personalización:</p>
                    <ul>
                        <li><strong>Espaciado:</strong> Ajusta el espacio entre imágenes (0-20px)</li>
                        <li><strong>Bordes:</strong> Agrega bordes con colores personalizados (0-10px)</li>
                        <li><strong>Fondo:</strong> Elige un color de fondo que complemente tus fotos</li>
                        <li><strong>Filtros:</strong> Aplica filtros a imágenes individuales o a todas</li>
                        <li><strong>Texto y Pegatinas:</strong> Agrega subtítulos y elementos decorativos</li>
                    </ul>
                    
                    <h2>Paso 5: Exporta Tu Collage</h2>
                    <p>Una vez que estés satisfecho con tu collage:</p>
                    <ol>
                        <li>Elige tu formato de exportación (PNG para máxima calidad, JPG para archivos más pequeños)</li>
                        <li>Ajusta la configuración de calidad (100% para la mejor calidad)</li>
                        <li>Selecciona la relación de aspecto (Original, Cuadrado, Historia o Paisaje)</li>
                        <li>Haz clic en "Exportar Collage" para descargar</li>
                    </ol>
                    
                    <h2>Consejos Profesionales</h2>
                    <ul>
                        <li>Usa imágenes de tamaño similar para una apariencia más limpia</li>
                        <li>Experimenta con diferentes plantillas para encontrar tu estilo</li>
                        <li>No tengas miedo de usar filtros para crear un aspecto cohesivo</li>
                        <li>Guarda tus plantillas favoritas haciendo clic en el icono de estrella</li>
                    </ul>
                    
                    <h2>Conclusión</h2>
                    <p>¡Crear un collage de fotos es fácil con MeCollage! Comienza con una plantilla simple, experimenta con las opciones de personalización y pronto estarás creando collages impresionantes en minutos.</p>
                    
                    <p><strong>¿Listo para crear tu primer collage?</strong> <a href="/">Prueba MeCollage ahora</a> - ¡es completamente gratis!</p>
                `}},relatedLinks:[{href:"/features",label:{en:"Explore every MeCollage feature",zh:"查看所�?MeCollage 功能",es:"Explora todas las funciones de MeCollage"}},{href:"/tutorial",label:{en:"Follow the step-by-step tutorial",zh:"查看分步教程",es:"Sigue el tutorial paso a paso"}},{href:"/blog/mobile-collage-tips",label:{en:"Create collages on your phone",zh:"学习移动端拼图技�?,es:"Crea collages en tu teléfono"}}]},{id:"collage-design-tips",category:"Design Tips",tags:["design","tips","professional","layout"],date:new Date().toISOString().split("T")[0],author:"MeCollage Team",translations:{en:{title:"10 Pro Tips for Creating Stunning Photo Collages",excerpt:"Master the art of collage design with these professional tips. Learn about color harmony, image arrangement, spacing techniques, and more.",content:`
                    <h2>1. Choose a Focal Point</h2>
                    <p>Every great collage has a main focal point - one image that draws the eye first. Place your most important or visually striking photo in a prominent position, such as the center or top-left (where the eye naturally starts).</p>
                    
                    <h2>2. Maintain Visual Balance</h2>
                    <p>Balance your collage by distributing visual weight evenly. If you have one large, dark image, balance it with lighter or smaller images. Use the rule of thirds to create a more dynamic composition.</p>
                    
                    <h2>3. Create Color Harmony</h2>
                    <p>Select photos with complementary colors or use filters to create a cohesive color palette. You can:</p>
                    <ul>
                        <li>Use warm tones (reds, oranges, yellows) for a cozy feel</li>
                        <li>Use cool tones (blues, greens, purples) for a calm atmosphere</li>
                        <li>Use a monochromatic scheme for elegance</li>
                    </ul>
                    
                    <h2>4. Pay Attention to Spacing</h2>
                    <p>Proper spacing is crucial for a professional look:</p>
                    <ul>
                        <li><strong>Tight spacing (0-5px):</strong> Creates a unified, grid-like appearance</li>
                        <li><strong>Medium spacing (5-10px):</strong> Provides breathing room while maintaining cohesion</li>
                        <li><strong>Wide spacing (10-20px):</strong> Emphasizes individual images</li>
                    </ul>
                    
                    <h2>5. Use Borders Strategically</h2>
                    <p>Borders can help define images and create structure:</p>
                    <ul>
                        <li>White borders create a clean, gallery-like look</li>
                        <li>Colored borders can add personality and match your theme</li>
                        <li>Thick borders (5-10px) make images stand out more</li>
                    </ul>
                    
                    <h2>6. Tell a Story</h2>
                    <p>Arrange your photos to tell a story or show progression:</p>
                    <ul>
                        <li>Chronological order (before �?after, morning �?evening)</li>
                        <li>Thematic grouping (all portraits together, all landscapes together)</li>
                        <li>Visual flow (guide the eye from one image to the next)</li>
                    </ul>
                    
                    <h2>7. Mix Image Sizes</h2>
                    <p>Vary image sizes to create visual interest:</p>
                    <ul>
                        <li>Use one large image as the hero</li>
                        <li>Surround it with smaller supporting images</li>
                        <li>Create rhythm with alternating sizes</li>
                    </ul>
                    
                    <h2>8. Consider Aspect Ratios</h2>
                    <p>Match your collage's aspect ratio to its intended use:</p>
                    <ul>
                        <li><strong>Square (1:1):</strong> Perfect for Instagram posts</li>
                        <li><strong>Story (9:16):</strong> Ideal for Instagram Stories and TikTok</li>
                        <li><strong>Landscape (16:9):</strong> Great for Facebook covers and banners</li>
                    </ul>
                    
                    <h2>9. Use Filters Consistently</h2>
                    <p>Apply the same filter to all images for a cohesive look, or use filters strategically to:</p>
                    <ul>
                        <li>Unify different lighting conditions</li>
                        <li>Create a specific mood (vintage, modern, dramatic)</li>
                        <li>Match the color palette</li>
                    </ul>
                    
                    <h2>10. Add Text Thoughtfully</h2>
                    <p>When adding text overlays:</p>
                    <ul>
                        <li>Keep it minimal - less is more</li>
                        <li>Choose readable fonts and sizes</li>
                        <li>Use high contrast (light text on dark images, or vice versa)</li>
                        <li>Position text where it won't obscure important details</li>
                    </ul>
                    
                    <h2>Bonus: Practice Makes Perfect</h2>
                    <p>The best way to improve is to practice! Try different templates, experiment with filters, and don't be afraid to start over if something doesn't look right. With MeCollage, you can create unlimited collages and refine your skills.</p>
                    
                    <p><strong>Ready to apply these tips?</strong> <a href="/">Start creating your collage</a> with MeCollage today!</p>
                `},zh:{title:"创建精美照片拼图�?0个专业技�?,excerpt:"通过这些专业技巧掌握拼图设计艺术。学习色彩和谐、图片排列、间距技巧等�?,content:`
                    <h2>1. 选择焦点</h2>
                    <p>每个优秀的拼图都有一个主要焦�?- 一张首先吸引眼球的图片。将您最重要或视觉上最引人注目的照片放在显眼的位置，例如中心或左上角（眼睛自然开始的地方）�?/p>
                    
                    <h2>2. 保持视觉平衡</h2>
                    <p>通过均匀分布视觉重量来平衡您的拼图。如果您有一张大而暗的图片，用较亮或较小的图片来平衡它。使用三分法则创建更具动感的构图�?/p>
                    
                    <h2>3. 创造色彩和�?/h2>
                    <p>选择具有互补色的照片或使用滤镜创建统一的调色板。您可以�?/p>
                    <ul>
                        <li>使用暖色调（红色、橙色、黄色）营造温馨感</li>
                        <li>使用冷色调（蓝色、绿色、紫色）营造平静氛�?/li>
                        <li>使用单色方案营造优雅感</li>
                    </ul>
                    
                    <h2>4. 注意间距</h2>
                    <p>适当的间距对于专业外观至关重要：</p>
                    <ul>
                        <li><strong>紧密间距�?-5px）：</strong>创建统一的网格状外观</li>
                        <li><strong>中等间距�?-10px）：</strong>在保持凝聚力的同时提供呼吸空�?/li>
                        <li><strong>宽间距（10-20px）：</strong>强调单个图片</li>
                    </ul>
                    
                    <h2>5. 策略性地使用边框</h2>
                    <p>边框可以帮助定义图片并创建结构：</p>
                    <ul>
                        <li>白色边框营造干净、画廊般的外�?/li>
                        <li>彩色边框可以增加个性并匹配您的主题</li>
                        <li>厚边框（5-10px）使图片更突�?/li>
                    </ul>
                    
                    <h2>6. 讲述故事</h2>
                    <p>排列您的照片以讲述故事或显示进展�?/p>
                    <ul>
                        <li>时间顺序（之�?�?之后，早�?�?晚上�?/li>
                        <li>主题分组（所有人像在一起，所有风景在一起）</li>
                        <li>视觉流动（引导眼睛从一张图片到下一张）</li>
                    </ul>
                    
                    <h2>7. 混合图片尺寸</h2>
                    <p>改变图片尺寸以创造视觉趣味：</p>
                    <ul>
                        <li>使用一张大图片作为主角</li>
                        <li>用较小的辅助图片围绕�?/li>
                        <li>用交替的尺寸创造节�?/li>
                    </ul>
                    
                    <h2>8. 考虑宽高�?/h2>
                    <p>将您的拼图宽高比与其预期用途匹配：</p>
                    <ul>
                        <li><strong>方形�?:1）：</strong>非常适合 Instagram 帖子</li>
                        <li><strong>故事�?:16）：</strong>非常适合 Instagram Stories �?TikTok</li>
                        <li><strong>横向�?6:9）：</strong>非常适合 Facebook 封面和横�?/li>
                    </ul>
                    
                    <h2>9. 一致地使用滤镜</h2>
                    <p>对所有图片应用相同的滤镜以获得统一的外观，或策略性地使用滤镜来：</p>
                    <ul>
                        <li>统一不同的光照条�?/li>
                        <li>创造特定情绪（复古、现代、戏剧性）</li>
                        <li>匹配调色�?/li>
                    </ul>
                    
                    <h2>10. 深思熟虑地添加文字</h2>
                    <p>添加文字叠加时：</p>
                    <ul>
                        <li>保持简�?- 少即是多</li>
                        <li>选择可读的字体和大小</li>
                        <li>使用高对比度（深色图片上的浅色文字，或反之）</li>
                        <li>将文字放在不会遮挡重要细节的位置</li>
                    </ul>
                    
                    <h2>奖励：熟能生�?/h2>
                    <p>提高的最佳方法是练习！尝试不同的模板，尝试滤镜，如果某些东西看起来不对，不要害怕重新开始。使�?MeCollage，您可以创建无限拼图并完善您的技能�?/p>
                    
                    <p><strong>准备好应用这些技巧了吗？</strong> <a href="/">立即开始创建您的拼�?/a>�?/p>
                `},es:{title:"10 Consejos Profesionales para Crear Collages de Fotos Impresionantes",excerpt:"Domina el arte del diseño de collages con estos consejos profesionales. Aprende sobre armonía de colores, disposición de imágenes, técnicas de espaciado y más.",content:`
                    <h2>1. Elige un Punto Focal</h2>
                    <p>Cada gran collage tiene un punto focal principal: una imagen que atrae la atención primero. Coloca tu foto más importante o visualmente impactante en una posición prominente, como el centro o la esquina superior izquierda (donde el ojo comienza naturalmente).</p>
                    
                    <h2>2. Mantén el Equilibrio Visual</h2>
                    <p>Equilibra tu collage distribuyendo el peso visual de manera uniforme. Si tienes una imagen grande y oscura, equilíbrala con imágenes más claras o más pequeñas. Usa la regla de los tercios para crear una composición más dinámica.</p>
                    
                    <h2>3. Crea Armonía de Colores</h2>
                    <p>Selecciona fotos con colores complementarios o usa filtros para crear una paleta de colores cohesiva. Puedes:</p>
                    <ul>
                        <li>Usar tonos cálidos (rojos, naranjas, amarillos) para una sensación acogedora</li>
                        <li>Usar tonos fríos (azules, verdes, morados) para una atmósfera tranquila</li>
                        <li>Usar un esquema monocromático para elegancia</li>
                    </ul>
                    
                    <h2>4. Presta Atención al Espaciado</h2>
                    <p>El espaciado adecuado es crucial para una apariencia profesional:</p>
                    <ul>
                        <li><strong>Espaciado estrecho (0-5px):</strong> Crea una apariencia unificada tipo rejilla</li>
                        <li><strong>Espaciado medio (5-10px):</strong> Proporciona espacio para respirar manteniendo la cohesión</li>
                        <li><strong>Espaciado amplio (10-20px):</strong> Enfatiza imágenes individuales</li>
                    </ul>
                    
                    <h2>5. Usa Bordes Estratégicamente</h2>
                    <p>Los bordes pueden ayudar a definir imágenes y crear estructura:</p>
                    <ul>
                        <li>Los bordes blancos crean una apariencia limpia tipo galería</li>
                        <li>Los bordes de colores pueden agregar personalidad y coincidir con tu tema</li>
                        <li>Los bordes gruesos (5-10px) hacen que las imágenes destaquen más</li>
                    </ul>
                    
                    <h2>6. Cuenta una Historia</h2>
                    <p>Organiza tus fotos para contar una historia o mostrar progresión:</p>
                    <ul>
                        <li>Orden cronológico (antes �?después, mañana �?noche)</li>
                        <li>Agrupación temática (todos los retratos juntos, todos los paisajes juntos)</li>
                        <li>Flujo visual (guía el ojo de una imagen a la siguiente)</li>
                    </ul>
                    
                    <h2>7. Mezcla Tamaños de Imagen</h2>
                    <p>Varía los tamaños de imagen para crear interés visual:</p>
                    <ul>
                        <li>Usa una imagen grande como protagonista</li>
                        <li>Rodéala con imágenes de apoyo más pequeñas</li>
                        <li>Crea ritmo con tamaños alternados</li>
                    </ul>
                    
                    <h2>8. Considera las Relaciones de Aspecto</h2>
                    <p>Haz coincidir la relación de aspecto de tu collage con su uso previsto:</p>
                    <ul>
                        <li><strong>Cuadrado (1:1):</strong> Perfecto para publicaciones de Instagram</li>
                        <li><strong>Historia (9:16):</strong> Ideal para Instagram Stories y TikTok</li>
                        <li><strong>Paisaje (16:9):</strong> Excelente para portadas y banners de Facebook</li>
                    </ul>
                    
                    <h2>9. Usa Filtros Consistentemente</h2>
                    <p>Aplica el mismo filtro a todas las imágenes para una apariencia cohesiva, o usa filtros estratégicamente para:</p>
                    <ul>
                        <li>Unificar diferentes condiciones de iluminación</li>
                        <li>Crear un estado de ánimo específico (vintage, moderno, dramático)</li>
                        <li>Coincidir con la paleta de colores</li>
                    </ul>
                    
                    <h2>10. Agrega Texto con Cuidado</h2>
                    <p>Al agregar superposiciones de texto:</p>
                    <ul>
                        <li>Manténlo mínimo - menos es más</li>
                        <li>Elige fuentes y tamaños legibles</li>
                        <li>Usa alto contraste (texto claro en imágenes oscuras, o viceversa)</li>
                        <li>Posiciona el texto donde no oculte detalles importantes</li>
                    </ul>
                    
                    <h2>Bonus: La Práctica Hace al Maestro</h2>
                    <p>¡La mejor manera de mejorar es practicar! Prueba diferentes plantillas, experimenta con filtros y no tengas miedo de empezar de nuevo si algo no se ve bien. Con MeCollage, puedes crear collages ilimitados y refinar tus habilidades.</p>
                    
                    <p><strong>¿Listo para aplicar estos consejos?</strong> <a href="/">¡Comienza a crear tu collage</a> con MeCollage hoy!</p>
                `}},internalLinks:L(["features","tutorial","mobileTips"])},{id:"holiday-collage-guide",category:"Holiday",tags:["holiday","christmas","valentine","birthday","seasonal"],date:new Date().toISOString().split("T")[0],author:"MeCollage Team",translations:{en:{title:"Holiday Collage Guide: Create Memorable Seasonal Collages",excerpt:"Create beautiful holiday collages for Christmas, Valentine's Day, birthdays, and more. Discover themed templates and creative ideas.",content:`
                    <h2>Introduction</h2>
                    <p>Holiday collages are a wonderful way to preserve and share your special moments. Whether it's Christmas, Valentine's Day, birthdays, or any celebration, a well-crafted collage can capture the essence of the occasion.</p>
                    
                    <h2>Christmas Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Featured Layout:</strong> Perfect for showcasing a main Christmas photo with supporting images</li>
                        <li><strong>Grid Layouts:</strong> Great for displaying multiple family photos or decorations</li>
                        <li><strong>Vertical Layouts:</strong> Ideal for Christmas tree photos and family portraits</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Classic red and green</li>
                        <li>Elegant gold and white</li>
                        <li>Cozy warm tones (oranges, browns, deep reds)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Include photos of decorations, family gatherings, and gifts</li>
                        <li>Add text overlays with holiday greetings</li>
                        <li>Use warm filters to create a cozy atmosphere</li>
                    </ul>
                    
                    <h2>Valentine's Day Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Two-Column Layout:</strong> Perfect for couple photos</li>
                        <li><strong>Heart-shaped arrangements:</strong> Use custom grids to create heart shapes</li>
                        <li><strong>Featured Layout:</strong> Highlight a special moment</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Romantic pink and red</li>
                        <li>Elegant black and white</li>
                        <li>Soft pastels (pink, lavender, peach)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Focus on couple photos and romantic moments</li>
                        <li>Add sweet text messages or quotes</li>
                        <li>Use soft, dreamy filters</li>
                    </ul>
                    
                    <h2>Birthday Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Grid Layouts:</strong> Showcase party photos, cake, decorations</li>
                        <li><strong>Featured Layout:</strong> Highlight the birthday person</li>
                        <li><strong>Horizontal Layout:</strong> Great for group photos</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Bright and festive (rainbow colors)</li>
                        <li>Theme-based (match the party theme)</li>
                        <li>Age-appropriate (pastels for kids, bold for adults)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Include photos from throughout the day</li>
                        <li>Add the birthday person's age as text</li>
                        <li>Use vibrant filters to match the festive mood</li>
                    </ul>
                    
                    <h2>General Holiday Collage Tips</h2>
                    <ul>
                        <li><strong>Plan Your Photos:</strong> Think about what moments you want to capture before the event</li>
                        <li><strong>Mix Photo Types:</strong> Include wide shots, close-ups, and detail shots</li>
                        <li><strong>Add Context:</strong> Include photos of decorations, food, and atmosphere</li>
                        <li><strong>Tell the Story:</strong> Arrange photos chronologically or thematically</li>
                        <li><strong>Share Immediately:</strong> Post your collage on social media while the event is fresh</li>
                    </ul>
                    
                    <h2>Seasonal Themes</h2>
                    <h3>Spring</h3>
                    <p>Use bright, fresh colors and include photos of flowers, outdoor activities, and spring celebrations.</p>
                    
                    <h3>Summer</h3>
                    <p>Capture beach trips, vacations, and outdoor fun with vibrant, sunny filters.</p>
                    
                    <h3>Fall</h3>
                    <p>Embrace warm tones (oranges, reds, browns) and include photos of fall foliage and cozy moments.</p>
                    
                    <h3>Winter</h3>
                    <p>Use cool tones and include photos of snow, winter activities, and indoor gatherings.</p>
                    
                    <h2>Conclusion</h2>
                    <p>Holiday collages are a beautiful way to preserve memories and share joy with others. With MeCollage, you can create stunning holiday collages in minutes, no matter the occasion.</p>
                    
                    <p><strong>Ready to create your holiday collage?</strong> <a href="/">Start creating</a> with MeCollage today!</p>
                `},zh:{title:"节日拼图指南：创建难忘的季节性拼�?,excerpt:"为圣诞节、情人节、生日等创建精美的节日拼图。发现主题模板和创意想法�?,content:`
                    <h2>介绍</h2>
                    <p>节日拼图是保存和分享特殊时刻的好方法。无论是圣诞节、情人节、生日还是任何庆祝活动，精心制作的拼图都能捕捉到场合的精髓�?/p>
                    
                    <h2>圣诞节拼�?/h2>
                    <h3>模板推荐</h3>
                    <ul>
                        <li><strong>特色布局�?/strong>非常适合展示主要圣诞照片和辅助图�?/li>
                        <li><strong>网格布局�?/strong>非常适合展示多张家庭照片或装饰品</li>
                        <li><strong>纵向布局�?/strong>非常适合圣诞树照片和家庭肖像</li>
                    </ul>
                    
                    <h3>配色方案</h3>
                    <ul>
                        <li>经典红绿配色</li>
                        <li>优雅的金白色</li>
                        <li>温馨的暖色调（橙色、棕色、深红色�?/li>
                    </ul>
                    
                    <h3>技�?/h3>
                    <ul>
                        <li>包括装饰品、家庭聚会和礼物的照�?/li>
                        <li>添加节日问候的文字叠加</li>
                        <li>使用暖色调滤镜营造温馨氛�?/li>
                    </ul>
                    
                    <h2>情人节拼�?/h2>
                    <h3>模板推荐</h3>
                    <ul>
                        <li><strong>两列布局�?/strong>非常适合情侣照片</li>
                        <li><strong>心形排列�?/strong>使用自定义网格创建心�?/li>
                        <li><strong>特色布局�?/strong>突出特殊时刻</li>
                    </ul>
                    
                    <h3>配色方案</h3>
                    <ul>
                        <li>浪漫的粉红色和红�?/li>
                        <li>优雅的黑白色</li>
                        <li>柔和�?pastel 色调（粉色、淡紫色、桃色）</li>
                    </ul>
                    
                    <h3>技�?/h3>
                    <ul>
                        <li>专注于情侣照片和浪漫时刻</li>
                        <li>添加甜蜜的文字信息或引用</li>
                        <li>使用柔和、梦幻的滤镜</li>
                    </ul>
                    
                    <h2>生日拼图</h2>
                    <h3>模板推荐</h3>
                    <ul>
                        <li><strong>网格布局�?/strong>展示派对照片、蛋糕、装饰品</li>
                        <li><strong>特色布局�?/strong>突出寿星</li>
                        <li><strong>横向布局�?/strong>非常适合集体�?/li>
                    </ul>
                    
                    <h3>配色方案</h3>
                    <ul>
                        <li>明亮和节日感（彩虹色�?/li>
                        <li>基于主题（匹配派对主题）</li>
                        <li>适合年龄（儿童用 pastel，成人用大胆色彩�?/li>
                    </ul>
                    
                    <h3>技�?/h3>
                    <ul>
                        <li>包括一天中的照�?/li>
                        <li>添加寿星的年龄作为文�?/li>
                        <li>使用充满活力的滤镜匹配节日氛�?/li>
                    </ul>
                    
                    <h2>一般节日拼图技�?/h2>
                    <ul>
                        <li><strong>规划您的照片�?/strong>在活动前思考要捕捉的时�?/li>
                        <li><strong>混合照片类型�?/strong>包括广角、特写和细节照片</li>
                        <li><strong>添加上下文：</strong>包括装饰品、食物和氛围的照�?/li>
                        <li><strong>讲述故事�?/strong>按时间顺序或主题排列照片</li>
                        <li><strong>立即分享�?/strong>在活动新鲜时在社交媒体上发布您的拼图</li>
                    </ul>
                    
                    <h2>季节性主�?/h2>
                    <h3>春天</h3>
                    <p>使用明亮、清新的颜色，包括花朵、户外活动和春季庆祝活动的照片�?/p>
                    
                    <h3>夏天</h3>
                    <p>用充满活力、阳光的滤镜捕捉海滩旅行、假期和户外乐趣�?/p>
                    
                    <h3>秋天</h3>
                    <p>拥抱暖色调（橙色、红色、棕色），包括秋叶和温馨时刻的照片�?/p>
                    
                    <h3>冬天</h3>
                    <p>使用冷色调，包括雪、冬季活动和室内聚会的照片�?/p>
                    
                    <h2>结论</h2>
                    <p>节日拼图是保存记忆和与他人分享快乐的好方法。使�?MeCollage，您可以在几分钟内创建精美的节日拼图，无论是什么场合�?/p>
                    
                    <p><strong>准备好创建您的节日拼图了吗？</strong> <a href="/">立即开始创�?/a>�?/p>
                `},es:{title:"Guía de Collages Festivos: Crea Collages Estacionales Memorables",excerpt:"Crea hermosos collages festivos para Navidad, San Valentín, cumpleaños y más. Descubre plantillas temáticas e ideas creativas.",content:`
                    <h2>Introducción</h2>
                    <p>Los collages festivos son una forma maravillosa de preservar y compartir tus momentos especiales. Ya sea Navidad, San Valentín, cumpleaños o cualquier celebración, un collage bien elaborado puede capturar la esencia de la ocasión.</p>
                    
                    <h2>Collages de Navidad</h2>
                    <h3>Recomendaciones de Plantillas</h3>
                    <ul>
                        <li><strong>Diseño Destacado:</strong> Perfecto para mostrar una foto principal de Navidad con imágenes de apoyo</li>
                        <li><strong>Diseños en Rejilla:</strong> Excelentes para mostrar múltiples fotos familiares o decoraciones</li>
                        <li><strong>Diseños Verticales:</strong> Ideales para fotos del árbol de Navidad y retratos familiares</li>
                    </ul>
                    
                    <h3>Esquemas de Color</h3>
                    <ul>
                        <li>Rojo y verde clásicos</li>
                        <li>Dorado y blanco elegantes</li>
                        <li>Tonos cálidos acogedores (naranjas, marrones, rojos profundos)</li>
                    </ul>
                    
                    <h3>Consejos</h3>
                    <ul>
                        <li>Incluye fotos de decoraciones, reuniones familiares y regalos</li>
                        <li>Agrega superposiciones de texto con saludos festivos</li>
                        <li>Usa filtros cálidos para crear una atmósfera acogedora</li>
                    </ul>
                    
                    <h2>Collages de San Valentín</h2>
                    <h3>Recomendaciones de Plantillas</h3>
                    <ul>
                        <li><strong>Diseño de Dos Columnas:</strong> Perfecto para fotos de pareja</li>
                        <li><strong>Arreglos en Forma de Corazón:</strong> Usa rejillas personalizadas para crear formas de corazón</li>
                        <li><strong>Diseño Destacado:</strong> Destaca un momento especial</li>
                    </ul>
                    
                    <h3>Esquemas de Color</h3>
                    <ul>
                        <li>Rosa y rojo románticos</li>
                        <li>Negro y blanco elegantes</li>
                        <li>Pasteles suaves (rosa, lavanda, melocotón)</li>
                    </ul>
                    
                    <h3>Consejos</h3>
                    <ul>
                        <li>Enfócate en fotos de pareja y momentos románticos</li>
                        <li>Agrega mensajes de texto dulces o citas</li>
                        <li>Usa filtros suaves y soñadores</li>
                    </ul>
                    
                    <h2>Collages de Cumpleaños</h2>
                    <h3>Recomendaciones de Plantillas</h3>
                    <ul>
                        <li><strong>Diseños en Rejilla:</strong> Muestra fotos de fiesta, pastel, decoraciones</li>
                        <li><strong>Diseño Destacado:</strong> Destaca a la persona del cumpleaños</li>
                        <li><strong>Diseño Horizontal:</strong> Excelente para fotos grupales</li>
                    </ul>
                    
                    <h3>Esquemas de Color</h3>
                    <ul>
                        <li>Brillante y festivo (colores del arcoíris)</li>
                        <li>Basado en tema (coincide con el tema de la fiesta)</li>
                        <li>Apropiado para la edad (pasteles para niños, audaz para adultos)</li>
                    </ul>
                    
                    <h3>Consejos</h3>
                    <ul>
                        <li>Incluye fotos de todo el día</li>
                        <li>Agrega la edad de la persona del cumpleaños como texto</li>
                        <li>Usa filtros vibrantes para coincidir con el ambiente festivo</li>
                    </ul>
                    
                    <h2>Consejos Generales para Collages Festivos</h2>
                    <ul>
                        <li><strong>Planifica Tus Fotos:</strong> Piensa en qué momentos quieres capturar antes del evento</li>
                        <li><strong>Mezcla Tipos de Fotos:</strong> Incluye tomas amplias, primeros planos y tomas de detalle</li>
                        <li><strong>Agrega Contexto:</strong> Incluye fotos de decoraciones, comida y ambiente</li>
                        <li><strong>Cuenta la Historia:</strong> Organiza fotos cronológicamente o temáticamente</li>
                        <li><strong>Comparte Inmediatamente:</strong> Publica tu collage en redes sociales mientras el evento está fresco</li>
                    </ul>
                    
                    <h2>Temas Estacionales</h2>
                    <h3>Primavera</h3>
                    <p>Usa colores brillantes y frescos e incluye fotos de flores, actividades al aire libre y celebraciones de primavera.</p>
                    
                    <h3>Verano</h3>
                    <p>Captura viajes a la playa, vacaciones y diversión al aire libre con filtros vibrantes y soleados.</p>
                    
                    <h3>Otoño</h3>
                    <p>Abraza tonos cálidos (naranjas, rojos, marrones) e incluye fotos de follaje otoñal y momentos acogedores.</p>
                    
                    <h3>Invierno</h3>
                    <p>Usa tonos fríos e incluye fotos de nieve, actividades invernales y reuniones en interiores.</p>
                    
                    <h2>Conclusión</h2>
                    <p>Los collages festivos son una hermosa forma de preservar recuerdos y compartir alegría con otros. Con MeCollage, puedes crear collages festivos impresionantes en minutos, sin importar la ocasión.</p>
                    
                    <p><strong>¿Listo para crear tu collage festivo?</strong> <a href="/">¡Comienza a crear</a> con MeCollage hoy!</p>
                `}},internalLinks:L(["features","proTips","works"])},{id:"mobile-collage-tips",category:"Mobile",tags:["mobile","phone","social-media","tips"],date:new Date().toISOString().split("T")[0],author:"MeCollage Team",translations:{en:{title:"Mobile Collage Tips: Create Collages on Your Phone",excerpt:"Learn how to create professional photo collages directly on your mobile device. Tips for selecting photos and sharing on social media.",content:`
                    <h2>Introduction</h2>
                    <p>Creating collages on your phone is convenient and fast. MeCollage is fully optimized for mobile devices, so you can create beautiful collages anywhere, anytime.</p>
                    
                    <h2>Getting Started on Mobile</h2>
                    <h3>1. Access MeCollage</h3>
                    <p>Simply open your mobile browser and visit <a href="https://www.mecollage.top">www.mecollage.top</a>. No app download required!</p>
                    
                    <h3>2. Upload Photos</h3>
                    <p>On mobile, you can upload photos by:</p>
                    <ul>
                        <li><strong>Tap to Browse:</strong> Tap the upload area to select photos from your gallery</li>
                        <li><strong>Camera:</strong> Take new photos directly from the camera</li>
                        <li><strong>Multiple Selection:</strong> Select multiple photos at once from your gallery</li>
                    </ul>
                    
                    <h2>Mobile-Optimized Features</h2>
                    <h3>Touch-Friendly Interface</h3>
                    <ul>
                        <li>Large, easy-to-tap buttons</li>
                        <li>Swipe gestures for navigation</li>
                        <li>Pinch-to-zoom for detailed editing</li>
                    </ul>
                    
                    <h3>Mobile Navigation</h3>
                    <p>Use the quick navigation bar at the top to jump between sections:</p>
                    <ul>
                        <li>Upload Images</li>
                        <li>Layout Templates</li>
                        <li>Decorate</li>
                        <li>Filters</li>
                        <li>Canvas</li>
                    </ul>
                    
                    <h2>Best Templates for Mobile</h2>
                    <h3>Instagram Stories (9:16)</h3>
                    <p>Perfect for vertical content:</p>
                    <ul>
                        <li>Use vertical templates</li>
                        <li>Export in Story format (9:16)</li>
                        <li>Add text at the top or bottom</li>
                    </ul>
                    
                    <h3>Instagram Posts (1:1)</h3>
                    <p>Square collages work great for Instagram:</p>
                    <ul>
                        <li>Use grid templates (2x2, 3x3)</li>
                        <li>Export in Square format (1:1)</li>
                        <li>Keep text minimal</li>
                    </ul>
                    
                    <h3>Facebook/Twitter (16:9)</h3>
                    <p>Wide collages for social feeds:</p>
                    <ul>
                        <li>Use horizontal templates</li>
                        <li>Export in Landscape format (16:9)</li>
                        <li>Perfect for cover photos</li>
                    </ul>
                    
                    <h2>Mobile Editing Tips</h2>
                    <h3>Photo Selection</h3>
                    <ul>
                        <li>Select photos with good lighting (easier to see on mobile)</li>
                        <li>Choose photos that are already oriented correctly</li>
                        <li>Use recent photos for faster loading</li>
                    </ul>
                    
                    <h3>Template Selection</h3>
                    <ul>
                        <li>Use AI recommendations for quick selection</li>
                        <li>Browse by category (All, Essentials, Grid, etc.)</li>
                        <li>Star your favorite templates for quick access</li>
                    </ul>
                    
                    <h3>Customization</h3>
                    <ul>
                        <li>Use sliders for precise adjustments (spacing, filters)</li>
                        <li>Tap to add text and stickers</li>
                        <li>Drag to reposition elements</li>
                    </ul>
                    
                    <h2>Sharing from Mobile</h2>
                    <h3>Direct Share</h3>
                    <p>After exporting:</p>
                    <ol>
                        <li>Download your collage</li>
                        <li>Use your phone's share menu</li>
                        <li>Share directly to Instagram, Facebook, Twitter, etc.</li>
                    </ol>
                    
                    <h3>Save to Gallery</h3>
                    <p>Save your collage to your phone's gallery for later sharing or editing.</p>
                    
                    <h2>Mobile Performance Tips</h2>
                    <ul>
                        <li><strong>Wi-Fi Recommended:</strong> Use Wi-Fi for faster uploads</li>
                        <li><strong>Close Other Apps:</strong> Free up memory for better performance</li>
                        <li><strong>Use WebP:</strong> MeCollage automatically uses WebP for faster loading</li>
                        <li><strong>Clear Cache:</strong> If experiencing issues, clear your browser cache</li>
                    </ul>
                    
                    <h2>Common Mobile Issues & Solutions</h2>
                    <h3>Photos Not Uploading</h3>
                    <ul>
                        <li>Check your internet connection</li>
                        <li>Try selecting fewer photos at once</li>
                        <li>Ensure photos aren't too large (under 10MB each)</li>
                    </ul>
                    
                    <h3>Slow Performance</h3>
                    <ul>
                        <li>Close other browser tabs</li>
                        <li>Use a modern browser (Chrome, Safari, Firefox)</li>
                        <li>Update your browser to the latest version</li>
                    </ul>
                    
                    <h2>Mobile-Specific Features</h2>
                    <ul>
                        <li><strong>Quick Templates:</strong> Swipe through templates quickly</li>
                        <li><strong>One-Tap Export:</strong> Fast export to your gallery</li>
                        <li><strong>Mobile Preview:</strong> See exactly how your collage will look on mobile</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Creating collages on mobile is easy and convenient with MeCollage. Whether you're at an event, on vacation, or just want to create something quickly, our mobile-optimized interface makes it simple.</p>
                    
                    <p><strong>Try it on your phone now!</strong> Visit <a href="https://www.mecollage.top">www.mecollage.top</a> and start creating beautiful collages on the go.</p>
                `},zh:{title:"移动端拼图技巧：在手机上创建拼图",excerpt:"学习如何在移动设备上直接创建专业的照片拼图。选择照片和在社交媒体上分享的技巧�?,content:`
                    <h2>介绍</h2>
                    <p>在手机上创建拼图既方便又快速。MeCollage 完全针对移动设备进行了优化，因此您可以随时随地创建精美的拼图�?/p>
                    
                    <h2>移动端入�?/h2>
                    <h3>1. 访问 MeCollage</h3>
                    <p>只需打开移动浏览器并访问 <a href="https://www.mecollage.top">www.mecollage.top</a>。无需下载应用�?/p>
                    
                    <h3>2. 上传照片</h3>
                    <p>在移动设备上，您可以通过以下方式上传照片�?/p>
                    <ul>
                        <li><strong>点击浏览�?/strong>点击上传区域从图库中选择照片</li>
                        <li><strong>相机�?/strong>直接从相机拍摄新照片</li>
                        <li><strong>多选：</strong>从图库中一次选择多张照片</li>
                    </ul>
                    
                    <h2>移动端优化功�?/h2>
                    <h3>触摸友好界面</h3>
                    <ul>
                        <li>大而易点击的按�?/li>
                        <li>滑动手势导航</li>
                        <li>捏合缩放进行详细编辑</li>
                    </ul>
                    
                    <h3>移动端导�?/h3>
                    <p>使用顶部的快速导航栏在部分之间跳转：</p>
                    <ul>
                        <li>上传图片</li>
                        <li>布局模板</li>
                        <li>装饰</li>
                        <li>滤镜</li>
                        <li>画布</li>
                    </ul>
                    
                    <h2>移动端最佳模�?/h2>
                    <h3>Instagram Stories (9:16)</h3>
                    <p>非常适合垂直内容�?/p>
                    <ul>
                        <li>使用纵向模板</li>
                        <li>�?Story 格式导出�?:16�?/li>
                        <li>在顶部或底部添加文字</li>
                    </ul>
                    
                    <h3>Instagram 帖子 (1:1)</h3>
                    <p>方形拼图非常适合 Instagram�?/p>
                    <ul>
                        <li>使用网格模板�?x2�?x3�?/li>
                        <li>以方形格式导出（1:1�?/li>
                        <li>保持文字简�?/li>
                    </ul>
                    
                    <h3>Facebook/Twitter (16:9)</h3>
                    <p>适合社交动态的宽拼图：</p>
                    <ul>
                        <li>使用横向模板</li>
                        <li>以横向格式导出（16:9�?/li>
                        <li>非常适合封面照片</li>
                    </ul>
                    
                    <h2>移动端编辑技�?/h2>
                    <h3>照片选择</h3>
                    <ul>
                        <li>选择光照良好的照片（在移动设备上更容易查看）</li>
                        <li>选择已经正确定向的照�?/li>
                        <li>使用最近的照片以加快加载速度</li>
                    </ul>
                    
                    <h3>模板选择</h3>
                    <ul>
                        <li>使用 AI 推荐进行快速选择</li>
                        <li>按类别浏览（全部、基础、网格等�?/li>
                        <li>收藏您喜欢的模板以便快速访�?/li>
                    </ul>
                    
                    <h3>自定�?/h3>
                    <ul>
                        <li>使用滑块进行精确调整（间距、滤镜）</li>
                        <li>点击添加文字和贴�?/li>
                        <li>拖拽重新定位元素</li>
                    </ul>
                    
                    <h2>从移动端分享</h2>
                    <h3>直接分享</h3>
                    <p>导出后：</p>
                    <ol>
                        <li>下载您的拼图</li>
                        <li>使用手机的分享菜�?/li>
                        <li>直接分享�?Instagram、Facebook、Twitter �?/li>
                    </ol>
                    
                    <h3>保存到图�?/h3>
                    <p>将您的拼图保存到手机图库，以便稍后分享或编辑�?/p>
                    
                    <h2>移动端性能技�?/h2>
                    <ul>
                        <li><strong>建议使用 Wi-Fi�?/strong>使用 Wi-Fi 以加快上传速度</li>
                        <li><strong>关闭其他应用�?/strong>释放内存以获得更好的性能</li>
                        <li><strong>使用 WebP�?/strong>MeCollage 自动使用 WebP 以加快加载速度</li>
                        <li><strong>清除缓存�?/strong>如果遇到问题，请清除浏览器缓�?/li>
                    </ul>
                    
                    <h2>常见移动端问题及解决方案</h2>
                    <h3>照片无法上传</h3>
                    <ul>
                        <li>检查您的互联网连接</li>
                        <li>尝试一次选择更少的照�?/li>
                        <li>确保照片不太大（每张不超�?10MB�?/li>
                    </ul>
                    
                    <h3>性能缓慢</h3>
                    <ul>
                        <li>关闭其他浏览器标签页</li>
                        <li>使用现代浏览器（Chrome、Safari、Firefox�?/li>
                        <li>将浏览器更新到最新版�?/li>
                    </ul>
                    
                    <h2>移动端特定功�?/h2>
                    <ul>
                        <li><strong>快速模板：</strong>快速滑动浏览模�?/li>
                        <li><strong>一键导出：</strong>快速导出到图库</li>
                        <li><strong>移动端预览：</strong>准确查看拼图在移动设备上的外�?/li>
                    </ul>
                    
                    <h2>结论</h2>
                    <p>使用 MeCollage 在移动设备上创建拼图既简单又方便。无论您是在活动中、度假中，还是只想快速创建一些东西，我们针对移动设备优化的界面都让这一切变得简单�?/p>
                    
                    <p><strong>立即在手机上试试吧！</strong> 访问 <a href="https://www.mecollage.top">www.mecollage.top</a>，开始随时随地创建精美的拼图�?/p>
                `},es:{title:"Consejos para Collages Móviles: Crea Collages en Tu Teléfono",excerpt:"Aprende a crear collages de fotos profesionales directamente en tu dispositivo móvil. Consejos para seleccionar fotos y compartir en redes sociales.",content:`
                    <h2>Introducción</h2>
                    <p>Crear collages en tu teléfono es conveniente y rápido. MeCollage está completamente optimizado para dispositivos móviles, por lo que puedes crear hermosos collages en cualquier lugar y en cualquier momento.</p>
                    
                    <h2>Empezar en Móvil</h2>
                    <h3>1. Acceder a MeCollage</h3>
                    <p>Simplemente abre tu navegador móvil y visita <a href="https://www.mecollage.top">www.mecollage.top</a>. ¡No se requiere descarga de aplicación!</p>
                    
                    <h3>2. Subir Fotos</h3>
                    <p>En móvil, puedes subir fotos de las siguientes maneras:</p>
                    <ul>
                        <li><strong>Tocar para Buscar:</strong> Toca el área de carga para seleccionar fotos de tu galería</li>
                        <li><strong>Cámara:</strong> Toma nuevas fotos directamente desde la cámara</li>
                        <li><strong>Selección Múltiple:</strong> Selecciona múltiples fotos a la vez de tu galería</li>
                    </ul>
                    
                    <h2>Características Optimizadas para Móvil</h2>
                    <h3>Interfaz Táctil</h3>
                    <ul>
                        <li>Botones grandes y fáciles de tocar</li>
                        <li>Gestos de deslizamiento para navegación</li>
                        <li>Pellizcar para hacer zoom para edición detallada</li>
                    </ul>
                    
                    <h3>Navegación Móvil</h3>
                    <p>Usa la barra de navegación rápida en la parte superior para saltar entre secciones:</p>
                    <ul>
                        <li>Subir Imágenes</li>
                        <li>Plantillas de Diseño</li>
                        <li>Decorar</li>
                        <li>Filtros</li>
                        <li>Lienzo</li>
                    </ul>
                    
                    <h2>Mejores Plantillas para Móvil</h2>
                    <h3>Instagram Stories (9:16)</h3>
                    <p>Perfecto para contenido vertical:</p>
                    <ul>
                        <li>Usa plantillas verticales</li>
                        <li>Exporta en formato Story (9:16)</li>
                        <li>Agrega texto en la parte superior o inferior</li>
                    </ul>
                    
                    <h3>Publicaciones de Instagram (1:1)</h3>
                    <p>Los collages cuadrados funcionan muy bien para Instagram:</p>
                    <ul>
                        <li>Usa plantillas de rejilla (2x2, 3x3)</li>
                        <li>Exporta en formato Cuadrado (1:1)</li>
                        <li>Mantén el texto mínimo</li>
                    </ul>
                    
                    <h3>Facebook/Twitter (16:9)</h3>
                    <p>Collages anchos para feeds sociales:</p>
                    <ul>
                        <li>Usa plantillas horizontales</li>
                        <li>Exporta en formato Paisaje (16:9)</li>
                        <li>Perfecto para fotos de portada</li>
                    </ul>
                    
                    <h2>Consejos de Edición Móvil</h2>
                    <h3>Selección de Fotos</h3>
                    <ul>
                        <li>Selecciona fotos con buena iluminación (más fáciles de ver en móvil)</li>
                        <li>Elige fotos que ya estén orientadas correctamente</li>
                        <li>Usa fotos recientes para una carga más rápida</li>
                    </ul>
                    
                    <h3>Selección de Plantilla</h3>
                    <ul>
                        <li>Usa recomendaciones de IA para selección rápida</li>
                        <li>Navega por categoría (Todos, Esenciales, Rejilla, etc.)</li>
                        <li>Marca tus plantillas favoritas para acceso rápido</li>
                    </ul>
                    
                    <h3>Personalización</h3>
                    <ul>
                        <li>Usa deslizadores para ajustes precisos (espaciado, filtros)</li>
                        <li>Toca para agregar texto y pegatinas</li>
                        <li>Arrastra para reposicionar elementos</li>
                    </ul>
                    
                    <h2>Compartir desde Móvil</h2>
                    <h3>Compartir Directo</h3>
                    <p>Después de exportar:</p>
                    <ol>
                        <li>Descarga tu collage</li>
                        <li>Usa el menú de compartir de tu teléfono</li>
                        <li>Comparte directamente a Instagram, Facebook, Twitter, etc.</li>
                    </ol>
                    
                    <h3>Guardar en Galería</h3>
                    <p>Guarda tu collage en la galería de tu teléfono para compartir o editar más tarde.</p>
                    
                    <h2>Consejos de Rendimiento Móvil</h2>
                    <ul>
                        <li><strong>Wi-Fi Recomendado:</strong> Usa Wi-Fi para cargas más rápidas</li>
                        <li><strong>Cierra Otras Aplicaciones:</strong> Libera memoria para mejor rendimiento</li>
                        <li><strong>Usa WebP:</strong> MeCollage usa WebP automáticamente para carga más rápida</li>
                        <li><strong>Limpia la Caché:</strong> Si experimentas problemas, limpia la caché de tu navegador</li>
                    </ul>
                    
                    <h2>Problemas Comunes Móviles y Soluciones</h2>
                    <h3>Fotos No Se Suben</h3>
                    <ul>
                        <li>Verifica tu conexión a internet</li>
                        <li>Intenta seleccionar menos fotos a la vez</li>
                        <li>Asegúrate de que las fotos no sean demasiado grandes (menos de 10MB cada una)</li>
                    </ul>
                    
                    <h3>Rendimiento Lento</h3>
                    <ul>
                        <li>Cierra otras pestañas del navegador</li>
                        <li>Usa un navegador moderno (Chrome, Safari, Firefox)</li>
                        <li>Actualiza tu navegador a la última versión</li>
                    </ul>
                    
                    <h2>Características Específicas Móviles</h2>
                    <ul>
                        <li><strong>Plantillas Rápidas:</strong> Desliza rápidamente por las plantillas</li>
                        <li><strong>Exportación de Un Toque:</strong> Exportación rápida a tu galería</li>
                        <li><strong>Vista Previa Móvil:</strong> Ve exactamente cómo se verá tu collage en móvil</li>
                    </ul>
                    
                    <h2>Conclusión</h2>
                    <p>Crear collages en móvil es fácil y conveniente con MeCollage. Ya sea que estés en un evento, de vacaciones, o solo quieras crear algo rápidamente, nuestra interfaz optimizada para móvil lo hace simple.</p>
                    
                    <p><strong>¡Pruébalo en tu teléfono ahora!</strong> Visita <a href="https://www.mecollage.top">www.mecollage.top</a> y comienza a crear hermosos collages sobre la marcha.</p>
                `}},internalLinks:L(["tutorial","holidayGuide","works"])},{id:"social-media-collage-guide",category:"Social Media",tags:["social-media","instagram","facebook","twitter","marketing"],date:new Date(Date.now()-864e5).toISOString().split("T")[0],author:"MeCollage Team",translations:{en:{title:"Social Media Collage Guide: Perfect Collages for Instagram, Facebook & More",excerpt:"Create collages optimized for Instagram, Facebook, Twitter, and other social platforms. Learn the best sizes, formats, and design tips.",content:`
                    <h2>Introduction</h2>
                    <p>Social media collages are essential for engaging your audience and telling your story visually. Each platform has its own optimal sizes and formats. This guide will help you create perfect collages for every platform.</p>
                    
                    <h2>Instagram Collages</h2>
                    <h3>Instagram Posts (Square - 1:1)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1080 pixels</li>
                        <li><strong>Best Templates:</strong> Grid layouts (2x2, 3x3, 4x4)</li>
                        <li><strong>Tips:</strong> Keep text minimal, use high contrast</li>
                    </ul>
                    
                    <h3>Instagram Stories (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1920 pixels</li>
                        <li><strong>Best Templates:</strong> Vertical layouts, featured layouts</li>
                        <li><strong>Tips:</strong> Add text at top/bottom (safe zones), use vibrant colors</li>
                    </ul>
                    
                    <h3>Instagram Reels (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1920 pixels</li>
                        <li><strong>Best Templates:</strong> Vertical layouts with multiple images</li>
                        <li><strong>Tips:</strong> Create before/after collages, showcase products</li>
                    </ul>
                    
                    <h2>Facebook Collages</h2>
                    <h3>Facebook Posts</h3>
                    <ul>
                        <li><strong>Size:</strong> 1200x630 pixels (recommended)</li>
                        <li><strong>Best Templates:</strong> Horizontal layouts, featured layouts</li>
                        <li><strong>Tips:</strong> Include engaging text, use clear images</li>
                    </ul>
                    
                    <h3>Facebook Cover Photo</h3>
                    <ul>
                        <li><strong>Size:</strong> 1640x859 pixels</li>
                        <li><strong>Best Templates:</strong> Wide horizontal layouts</li>
                        <li><strong>Tips:</strong> Keep important content in center (mobile crop area)</li>
                    </ul>
                    
                    <h2>Twitter/X Collages</h2>
                    <ul>
                        <li><strong>Size:</strong> 1200x675 pixels (recommended)</li>
                        <li><strong>Best Templates:</strong> Horizontal layouts, 2-column layouts</li>
                        <li><strong>Tips:</strong> Keep it simple, high contrast for visibility</li>
                    </ul>
                    
                    <h2>Pinterest Collages</h2>
                    <ul>
                        <li><strong>Size:</strong> 1000x1500 pixels (vertical, 2:3 ratio)</li>
                        <li><strong>Best Templates:</strong> Vertical layouts, grid layouts</li>
                        <li><strong>Tips:</strong> Use bright, eye-catching colors, include text overlays</li>
                    </ul>
                    
                    <h2>General Social Media Tips</h2>
                    <ul>
                        <li><strong>Brand Consistency:</strong> Use consistent colors and filters</li>
                        <li><strong>Text Readability:</strong> Ensure text is readable on small screens</li>
                        <li><strong>Call to Action:</strong> Include clear CTAs in your collages</li>
                        <li><strong>Hashtags:</strong> Leave space for hashtags in your design</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>With MeCollage, you can create platform-optimized collages quickly and easily. Just select the right aspect ratio, choose a template, and export!</p>
                `},zh:{title:"社交媒体拼图指南：为 Instagram、Facebook 等创建完美拼�?,excerpt:"创建针对 Instagram、Facebook、Twitter 和其他社交平台优化的拼图。学习最佳尺寸、格式和设计技巧�?,content:`
                    <h2>介绍</h2>
                    <p>社交媒体拼图对于吸引受众和以视觉方式讲述您的故事至关重要。每个平台都有自己的最佳尺寸和格式。本指南将帮助您为每个平台创建完美的拼图�?/p>
                    
                    <h2>Instagram 拼图</h2>
                    <h3>Instagram 帖子（方�?- 1:1�?/h3>
                    <ul>
                        <li><strong>尺寸�?/strong> 1080x1080 像素</li>
                        <li><strong>最佳模板：</strong> 网格布局�?x2�?x3�?x4�?/li>
                        <li><strong>技巧：</strong> 保持文字简洁，使用高对比度</li>
                    </ul>
                    
                    <h3>Instagram Stories（纵�?- 9:16�?/h3>
                    <ul>
                        <li><strong>尺寸�?/strong> 1080x1920 像素</li>
                        <li><strong>最佳模板：</strong> 纵向布局、特色布局</li>
                        <li><strong>技巧：</strong> 在顶�?底部添加文字（安全区域），使用鲜艳的颜色</li>
                    </ul>
                    
                    <h3>Instagram Reels（纵�?- 9:16�?/h3>
                    <ul>
                        <li><strong>尺寸�?/strong> 1080x1920 像素</li>
                        <li><strong>最佳模板：</strong> 多图片纵向布局</li>
                        <li><strong>技巧：</strong> 创建前后对比拼图，展示产�?/li>
                    </ul>
                    
                    <h2>Facebook 拼图</h2>
                    <h3>Facebook 帖子</h3>
                    <ul>
                        <li><strong>尺寸�?/strong> 1200x630 像素（推荐）</li>
                        <li><strong>最佳模板：</strong> 横向布局、特色布局</li>
                        <li><strong>技巧：</strong> 包含引人入胜的文字，使用清晰的图�?/li>
                    </ul>
                    
                    <h3>Facebook 封面照片</h3>
                    <ul>
                        <li><strong>尺寸�?/strong> 1640x859 像素</li>
                        <li><strong>最佳模板：</strong> 宽横向布局</li>
                        <li><strong>技巧：</strong> 将重要内容保持在中心（移动端裁剪区域�?/li>
                    </ul>
                    
                    <h2>Twitter/X 拼图</h2>
                    <ul>
                        <li><strong>尺寸�?/strong> 1200x675 像素（推荐）</li>
                        <li><strong>最佳模板：</strong> 横向布局、两列布局</li>
                        <li><strong>技巧：</strong> 保持简洁，高对比度以提高可见�?/li>
                    </ul>
                    
                    <h2>Pinterest 拼图</h2>
                    <ul>
                        <li><strong>尺寸�?/strong> 1000x1500 像素（纵向，2:3 比例�?/li>
                        <li><strong>最佳模板：</strong> 纵向布局、网格布局</li>
                        <li><strong>技巧：</strong> 使用明亮、引人注目的颜色，包含文字叠�?/li>
                    </ul>
                    
                    <h2>一般社交媒体技�?/h2>
                    <ul>
                        <li><strong>品牌一致性：</strong> 使用一致的颜色和滤�?/li>
                        <li><strong>文字可读性：</strong> 确保文字在小屏幕上可�?/li>
                        <li><strong>行动号召�?/strong> 在拼图中包含清晰�?CTA</li>
                        <li><strong>标签�?/strong> 在设计中为标签留出空�?/li>
                    </ul>
                    
                    <h2>结论</h2>
                    <p>使用 MeCollage，您可以快速轻松地创建针对平台优化的拼图。只需选择正确的宽高比，选择模板，然后导出！</p>
                `},es:{title:"Guía de Collages para Redes Sociales: Collages Perfectos para Instagram, Facebook y Más",excerpt:"Crea collages optimizados para Instagram, Facebook, Twitter y otras plataformas sociales. Aprende los mejores tamaños, formatos y consejos de diseño.",content:`
                    <h2>Introducción</h2>
                    <p>Los collages de redes sociales son esenciales para involucrar a tu audiencia y contar tu historia visualmente. Cada plataforma tiene sus propios tamaños y formatos óptimos. Esta guía te ayudará a crear collages perfectos para cada plataforma.</p>
                    
                    <h2>Collages de Instagram</h2>
                    <h3>Publicaciones de Instagram (Cuadrado - 1:1)</h3>
                    <ul>
                        <li><strong>Tamaño:</strong> 1080x1080 píxeles</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños en rejilla (2x2, 3x3, 4x4)</li>
                        <li><strong>Consejos:</strong> Mantén el texto mínimo, usa alto contraste</li>
                    </ul>
                    
                    <h3>Instagram Stories (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Tamaño:</strong> 1080x1920 píxeles</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños verticales, diseños destacados</li>
                        <li><strong>Consejos:</strong> Agrega texto en la parte superior/inferior (zonas seguras), usa colores vibrantes</li>
                    </ul>
                    
                    <h3>Instagram Reels (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Tamaño:</strong> 1080x1920 píxeles</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños verticales con múltiples imágenes</li>
                        <li><strong>Consejos:</strong> Crea collages antes/después, muestra productos</li>
                    </ul>
                    
                    <h2>Collages de Facebook</h2>
                    <h3>Publicaciones de Facebook</h3>
                    <ul>
                        <li><strong>Tamaño:</strong> 1200x630 píxeles (recomendado)</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños horizontales, diseños destacados</li>
                        <li><strong>Consejos:</strong> Incluye texto atractivo, usa imágenes claras</li>
                    </ul>
                    
                    <h3>Foto de Portada de Facebook</h3>
                    <ul>
                        <li><strong>Tamaño:</strong> 1640x859 píxeles</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños horizontales anchos</li>
                        <li><strong>Consejos:</strong> Mantén el contenido importante en el centro (área de recorte móvil)</li>
                    </ul>
                    
                    <h2>Collages de Twitter/X</h2>
                    <ul>
                        <li><strong>Tamaño:</strong> 1200x675 píxeles (recomendado)</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños horizontales, diseños de 2 columnas</li>
                        <li><strong>Consejos:</strong> Manténlo simple, alto contraste para visibilidad</li>
                    </ul>
                    
                    <h2>Collages de Pinterest</h2>
                    <ul>
                        <li><strong>Tamaño:</strong> 1000x1500 píxeles (vertical, relación 2:3)</li>
                        <li><strong>Mejores Plantillas:</strong> Diseños verticales, diseños en rejilla</li>
                        <li><strong>Consejos:</strong> Usa colores brillantes y llamativos, incluye superposiciones de texto</li>
                    </ul>
                    
                    <h2>Consejos Generales para Redes Sociales</h2>
                    <ul>
                        <li><strong>Consistencia de Marca:</strong> Usa colores y filtros consistentes</li>
                        <li><strong>Legibilidad del Texto:</strong> Asegúrate de que el texto sea legible en pantallas pequeñas</li>
                        <li><strong>Llamada a la Acción:</strong> Incluye CTAs claros en tus collages</li>
                        <li><strong>Hashtags:</strong> Deja espacio para hashtags en tu diseño</li>
                    </ul>
                    
                    <h2>Conclusión</h2>
                    <p>Con MeCollage, puedes crear collages optimizados para plataformas de forma rápida y fácil. ¡Solo selecciona la relación de aspecto correcta, elige una plantilla y exporta!</p>
                `}},internalLinks:L(["mobileTips","features","socialGuide"])},{id:"portfolio-collage-tips",category:"Portfolio",tags:["portfolio","professional","showcase","photography"],date:new Date(Date.now()-1728e5).toISOString().split("T")[0],author:"MeCollage Team",translations:{en:{title:"Portfolio Collage Tips: Showcase Your Work Professionally",excerpt:"Learn how to create professional portfolio collages that showcase your photography, design, or artwork effectively.",content:`
                    <h2>Introduction</h2>
                    <p>A well-crafted portfolio collage can showcase multiple pieces of your work in a single, impactful image. Whether you're a photographer, designer, or artist, collages are an excellent way to display your range and style.</p>
                    
                    <h2>Portfolio Collage Best Practices</h2>
                    <h3>1. Choose Your Best Work</h3>
                    <p>Select 4-12 of your strongest pieces that represent your style and range. Quality over quantity!</p>
                    
                    <h3>2. Maintain Consistency</h3>
                    <ul>
                        <li>Use similar lighting and color tones</li>
                        <li>Apply consistent filters</li>
                        <li>Keep the same style or theme</li>
                    </ul>
                    
                    <h3>3. Create Visual Flow</h3>
                    <p>Arrange images so the eye moves naturally through the collage. Use:</p>
                    <ul>
                        <li>Symmetrical layouts for balance</li>
                        <li>Asymmetrical layouts for dynamism</li>
                        <li>Featured layouts to highlight your best piece</li>
                    </ul>
                    
                    <h2>Template Recommendations</h2>
                    <ul>
                        <li><strong>Grid Layouts:</strong> Clean, professional, easy to scan</li>
                        <li><strong>Featured Layouts:</strong> Highlight one piece with supporting images</li>
                        <li><strong>Custom Grids:</strong> Create unique arrangements</li>
                    </ul>
                    
                    <h2>Export Settings for Portfolios</h2>
                    <ul>
                        <li><strong>Format:</strong> PNG for highest quality</li>
                        <li><strong>Quality:</strong> 100%</li>
                        <li><strong>Size:</strong> Original or high resolution</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Portfolio collages are a powerful way to showcase your work. With MeCollage, you can create professional portfolio collages in minutes.</p>
                `},zh:{title:"作品集拼图技巧：专业展示您的作品",excerpt:"学习如何创建专业的作品集拼图，有效展示您的摄影、设计或艺术作品�?,content:`
                    <h2>介绍</h2>
                    <p>精心制作的作品集拼图可以在单张有影响力的图片中展示您的多件作品。无论您是摄影师、设计师还是艺术家，拼图都是展示您范围和风格的绝佳方式�?/p>
                    
                    <h2>作品集拼图最佳实�?/h2>
                    <h3>1. 选择您的最佳作�?/h3>
                    <p>选择 4-12 件最能代表您风格和范围的最强作品。质量胜过数量！</p>
                    
                    <h3>2. 保持一致�?/h3>
                    <ul>
                        <li>使用相似的光照和色调</li>
                        <li>应用一致的滤镜</li>
                        <li>保持相同的风格或主题</li>
                    </ul>
                    
                    <h3>3. 创造视觉流�?/h3>
                    <p>排列图片，使眼睛自然地在拼图中移动。使用：</p>
                    <ul>
                        <li>对称布局以获得平�?/li>
                        <li>不对称布局以获得动�?/li>
                        <li>特色布局以突出您的最佳作�?/li>
                    </ul>
                    
                    <h2>模板推荐</h2>
                    <ul>
                        <li><strong>网格布局�?/strong> 干净、专业、易于浏�?/li>
                        <li><strong>特色布局�?/strong> 用辅助图片突出一个作�?/li>
                        <li><strong>自定义网格：</strong> 创建独特的排�?/li>
                    </ul>
                    
                    <h2>作品集导出设�?/h2>
                    <ul>
                        <li><strong>格式�?/strong> PNG 以获得最高质�?/li>
                        <li><strong>质量�?/strong> 100%</li>
                        <li><strong>尺寸�?/strong> 原始或高分辨�?/li>
                    </ul>
                    
                    <h2>结论</h2>
                    <p>作品集拼图是展示您作品的强大方式。使�?MeCollage，您可以在几分钟内创建专业的作品集拼图�?/p>
                `},es:{title:"Consejos para Collages de Portafolio: Muestra Tu Trabajo Profesionalmente",excerpt:"Aprende a crear collages de portafolio profesionales que muestren efectivamente tu fotografía, diseño u obra de arte.",content:`
                    <h2>Introducción</h2>
                    <p>Un collage de portafolio bien elaborado puede mostrar múltiples piezas de tu trabajo en una sola imagen impactante. Ya seas fotógrafo, diseñador o artista, los collages son una excelente forma de mostrar tu rango y estilo.</p>
                    
                    <h2>Mejores Prácticas para Collages de Portafolio</h2>
                    <h3>1. Elige Tu Mejor Trabajo</h3>
                    <p>Selecciona 4-12 de tus piezas más fuertes que representen tu estilo y rango. ¡Calidad sobre cantidad!</p>
                    
                    <h3>2. Mantén la Consistencia</h3>
                    <ul>
                        <li>Usa iluminación y tonos de color similares</li>
                        <li>Aplica filtros consistentes</li>
                        <li>Mantén el mismo estilo o tema</li>
                    </ul>
                    
                    <h3>3. Crea Flujo Visual</h3>
                    <p>Organiza las imágenes para que el ojo se mueva naturalmente a través del collage. Usa:</p>
                    <ul>
                        <li>Diseños simétricos para equilibrio</li>
                        <li>Diseños asimétricos para dinamismo</li>
                        <li>Diseños destacados para resaltar tu mejor pieza</li>
                    </ul>
                    
                    <h2>Recomendaciones de Plantillas</h2>
                    <ul>
                        <li><strong>Diseños en Rejilla:</strong> Limpios, profesionales, fáciles de escanear</li>
                        <li><strong>Diseños Destacados:</strong> Resalta una pieza con imágenes de apoyo</li>
                        <li><strong>Rejillas Personalizadas:</strong> Crea arreglos únicos</li>
                    </ul>
                    
                    <h2>Configuración de Exportación para Portafolios</h2>
                    <ul>
                        <li><strong>Formato:</strong> PNG para máxima calidad</li>
                        <li><strong>Calidad:</strong> 100%</li>
                        <li><strong>Tamaño:</strong> Original o alta resolución</li>
                    </ul>
                    
                    <h2>Conclusión</h2>
                    <p>Los collages de portafolio son una forma poderosa de mostrar tu trabajo. Con MeCollage, puedes crear collages de portafolio profesionales en minutos.</p>
                `}},internalLinks:L(["portfolio","works","proTips"])}],this.categories=["All","Tutorial","Design Tips","Holiday","Mobile","Social Media","Portfolio"],this.currentCategory="All",this.searchQuery="",this.currentPost=null}getAllPosts(){return this.posts}getPostById(e){return this.posts.find(t=>t.id===e)}getLocalizedPost(e,t="en"){return e?e.translations&&e.translations[t]?P(v({},e),{title:e.translations[t].title,excerpt:e.translations[t].excerpt,content:e.translations[t].content}):e.translations&&e.translations.en?P(v({},e),{title:e.translations.en.title,excerpt:e.translations.en.excerpt,content:e.translations.en.content}):e:null}getLocalizedPosts(e="en"){return this.posts.map(t=>this.getLocalizedPost(t,e))}getPostsByCategory(e){return e==="All"?this.posts:this.posts.filter(t=>t.category===e)}searchPosts(e,t="en"){if(!e)return this.posts;const a=e.toLowerCase();return this.posts.filter(i=>{const o=this.getLocalizedPost(i,t);return o.title.toLowerCase().includes(a)||o.excerpt.toLowerCase().includes(a)||i.tags.some(s=>s.toLowerCase().includes(a))||i.category.toLowerCase().includes(a)})}getFilteredPosts(e="en"){let t=this.posts;if(this.currentCategory!=="All"&&(t=t.filter(a=>a.category===this.currentCategory)),this.searchQuery){const a=this.searchQuery.toLowerCase();t=t.filter(i=>{const o=this.getLocalizedPost(i,e);return o.title.toLowerCase().includes(a)||o.excerpt.toLowerCase().includes(a)||i.tags.some(s=>s.toLowerCase().includes(a))||i.category.toLowerCase().includes(a)})}return t}getCategories(){return this.categories}getAllTags(){const e=new Set;return this.posts.forEach(t=>{t.tags.forEach(a=>e.add(a))}),Array.from(e).sort()}getRelatedPosts(e,t=3,a="en"){const i=this.getPostById(e);return i?this.posts.filter(s=>s.id!==e).map(s=>{const l=s.tags.filter(g=>i.tags.includes(g)).length,r=s.category===i.category?1:0;return{post:s,score:l*2+r}}).filter(s=>s.score>0).sort((s,l)=>l.score-s.score).slice(0,t).map(s=>s.post):[]}}const ve="dztbpf6ke",xe="public_works_unsigned";function Ce(i){return x(this,arguments,function*(u,{folder:e="works",fileName:t=`collage-${Date.now()}.jpg`,tags:a=["mecollage"]}={}){const o=`https://api.cloudinary.com/v1_1/${ve}/image/upload`,s=new FormData;s.append("file",u,t),s.append("upload_preset",xe),e&&s.append("folder",e),a&&a.length&&s.append("tags",a.join(","));const l=yield fetch(o,{method:"POST",body:s});if(!l.ok){const r=yield l.text().catch(()=>"");throw new Error(`Cloudinary upload failed: ${l.status} ${r}`)}return yield l.json()})}function we(u){return encodeURIComponent(u)}const U=[{id:"original",nameKey:"filters.presetOriginal",adjustments:{brightness:100,contrast:100,saturation:100,warmth:0,blur:0}},{id:"warm",nameKey:"filters.presetWarm",adjustments:{brightness:105,contrast:102,saturation:118,warmth:20,blur:0}},{id:"vivid",nameKey:"filters.presetVivid",adjustments:{brightness:102,contrast:108,saturation:135,warmth:5,blur:0}},{id:"mono",nameKey:"filters.presetMono",adjustments:{brightness:105,contrast:105,saturation:0,warmth:0,blur:0}},{id:"film",nameKey:"filters.presetFilm",adjustments:{brightness:104,contrast:98,saturation:110,warmth:-10,blur:1}},{id:"soft",nameKey:"filters.presetSoft",adjustments:{brightness:110,contrast:92,saturation:112,warmth:12,blur:2}}],G={brightness:100,contrast:100,saturation:100,warmth:0,blur:0};class Se{constructor(){this.imageManager=new ue,this.templateManager=new pe,this.collageMaker=new ne,this.exportManager=new he,this.currentLayout=null,this.userSelectedTemplate=!1,this.settings={spacing:5,border:0,borderColor:"#ffffff",backgroundColor:"#ffffff",aspectRatio:"auto",imageFit:"cover"},this.decorations=[],this.decorationIdCounter=0,this.stickerLibrary=this.getStickerLibrary(),this.isMobileView=!1,this.activeDecorationId=null,this.activeImageIndex=-1,this.dragState=null,this.sidebarSections=[],this.sectionToggles=[],this.mobileNavButtons=[],this.canvasExpandBtn=null,this.canvasCloseBtn=null,this.uploadCTAButton=null,this.canvasAreaEl=null,this.handleCanvasKeyUp=this.handleCanvasKeyUp.bind(this),this.handleDecorationPointerMove=this.handleDecorationPointerMove.bind(this),this.handleDecorationPointerUp=this.handleDecorationPointerUp.bind(this),this.filterPresetButtons=[],this.filterPresetContainer=null,this.filterBrightnessInput=null,this.filterContrastInput=null,this.filterSaturationInput=null,this.filterWarmthInput=null,this.filterBlurInput=null,this.filterResetBtn=null,this.filterEmptyMessage=null,this.filtersSectionContent=null,this.filterBlocks=[],this.filterSliderDisplays={},this.filterTargetLabel=null,this.filterScopeGroup=null,this.filterScopeButtons=[],this.filterScope="single",this.imageDragState=null,this.imageFitButtons=[],this.imageFitHint=null,this.handleImageDragStart=this.handleImageDragStart.bind(this),this.handleImageDragOver=this.handleImageDragOver.bind(this),this.handleImageDragEnter=this.handleImageDragEnter.bind(this),this.handleImageDragLeave=this.handleImageDragLeave.bind(this),this.handleImageDrop=this.handleImageDrop.bind(this),this.handleImageDragEnd=this.handleImageDragEnd.bind(this),this.handleCanvasKeyUp=this.handleCanvasKeyUp.bind(this),this.handleDecorationPointerMove=this.handleDecorationPointerMove.bind(this),this.handleDecorationPointerUp=this.handleDecorationPointerUp.bind(this),this.init()}init(){this.setupEventListeners(),this.setupLanguageSwitcher(),this.setupNavigation(),this.setupResponsiveControls(),this.setupBackToTop(),this.setupFilterControls(),this.setupBlog(),this.templateManager.loadFavorites(),this.templateManager.renderThemeNavigator(),this.templateManager.renderCategories(),this.templateManager.renderTemplates(),this.updateImageCount();const e=C.currentPage||"home";k.updateSEO(e),document.addEventListener("language-changed",()=>{if(this.refreshLanguageDependentUI(),C.currentPage==="blog"||C.currentPage.startsWith("blog/"))if(C.currentPage==="blog")this.renderBlogPage(),k.updateSEO("blog");else{const t=C.currentPage.replace("blog/",""),a=I.getPostById(t);a&&(C.renderBlogPost(a),k.updateSEO(`blog/${t}`,a))}else k.updateSEO(C.currentPage)})}setupLanguageSwitcher(){const e=document.querySelector(".lang-selector"),t=e==null?void 0:e.querySelector(".lang-selector-toggle"),a=e==null?void 0:e.querySelector(".lang-menu"),i=e?Array.from(e.querySelectorAll(".lang-option")):[],o=e==null?void 0:e.querySelector(".lang-menu-backdrop");if(!e||!t||!a||!i.length||!o)return;const s=()=>{e.classList.remove("is-open"),t.setAttribute("aria-expanded","false"),o.setAttribute("aria-hidden","true")},l=()=>{e.classList.add("is-open"),t.setAttribute("aria-expanded","true"),o.setAttribute("aria-hidden","false")},r=()=>{const g=e.querySelector(`.lang-option[data-lang="${n.currentLang}"]`);i.forEach(d=>{d.classList.toggle("is-active",d===g)});const c=document.querySelector('.lang-selector-toggle [data-i18n="lang.name"]');c&&(c.textContent=n.t("lang.name"))};t.addEventListener("click",g=>{g.stopPropagation(),e.classList.contains("is-open")?s():l()}),o.addEventListener("click",()=>{s()}),i.forEach(g=>{g.addEventListener("click",c=>{c.stopPropagation();const d=g.dataset.lang;d&&n.currentLang!==d&&n.setLanguage(d),s()})}),document.addEventListener("keydown",g=>{g.key==="Escape"&&e.classList.contains("is-open")&&s()}),document.addEventListener("language-changed",r),r()}setupNavigation(){var a,i;(((i=(a=document.body)==null?void 0:a.dataset)==null?void 0:i.navMode)||"spa")!=="static"&&(document.querySelectorAll(".nav-link, .quick-link").forEach(o=>{o.addEventListener("click",s=>{const l=o.getAttribute("href");if(l&&(l.startsWith("/")||l.startsWith("#"))){s.preventDefault();const r=o.dataset.page||this.getPageFromHref(l);if(r){if(r.startsWith("blog/")){const g=r.replace("blog/","");C.showBlogPost(g,!0)}else C.navigate(r),r==="blog"&&setTimeout(()=>this.renderBlogPage(),100);}}})}),document.addEventListener("click",o=>{const s=o.target.closest('a[href^="/blog/"]');if(s){o.preventDefault();const r=s.getAttribute("href").replace("/blog/","");C.showBlogPost(r,!0),this.renderNavShare()}}))}getPageFromHref(e){return e==="/"||e==="/index.html"||e==="#home"?"home":e.startsWith("/blog/")||e.startsWith("#blog/")?`blog/${e.replace(/^\/blog\//,"").replace(/^#blog\//,"")}`:e.replace(/^#/,"").replace(/^\//,"").replace(/\.html$/,"")||"home"}setupEventListeners(){const e=document.getElementById("uploadArea"),t=document.getElementById("fileInput");e.addEventListener("click",()=>t.click()),e.addEventListener("dragover",r=>{r.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",r=>x(this,null,function*(){var c;r.preventDefault(),e.classList.remove("drag-over");const g=(c=r.dataTransfer)!=null&&c.files?Array.from(r.dataTransfer.files):[];yield this.handleFiles(g)})),t.addEventListener("change",r=>x(this,null,function*(){const g=r.target.files?Array.from(r.target.files):[];g.length&&(yield this.handleFiles(g),this.resetFileInput())})),this.uploadCTAButton=document.getElementById("uploadCtaBtn"),this.uploadCTAButton&&this.uploadCTAButton.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),r.stopImmediatePropagation(),t.click()}),document.addEventListener("template-selected",r=>{const{template:g,auto:c=!1}=r.detail;this.selectTemplate(g,c)}),document.getElementById("applyCustomGrid").addEventListener("click",()=>{const r=parseInt(document.getElementById("customRows").value),g=parseInt(document.getElementById("customCols").value);this.selectTemplate({type:"grid",rows:r,cols:g}),this.templateManager.clearActiveSelection()});const a=document.getElementById("spacingSlider"),i=document.getElementById("borderSlider"),o=document.getElementById("qualitySlider");a.addEventListener("input",r=>{this.settings.spacing=parseInt(r.target.value),document.getElementById("spacingValue").textContent=`${this.settings.spacing}px`,this.updateRangeProgress("spacingSlider","spacingProgress"),this.renderCollage()}),i.addEventListener("input",r=>{this.settings.border=parseInt(r.target.value),document.getElementById("borderValue").textContent=`${this.settings.border}px`,this.updateRangeProgress("borderSlider","borderProgress"),this.renderCollage()}),document.getElementById("borderColor").addEventListener("change",r=>{this.settings.borderColor=r.target.value,this.renderCollage()}),document.getElementById("backgroundColor").addEventListener("change",r=>{this.settings.backgroundColor=r.target.value,this.renderCollage()}),this.imageFitButtons=Array.from(document.querySelectorAll(".image-fit-option")),this.imageFitHint=document.getElementById("imageFitHint"),this.imageFitButtons.forEach(r=>{r.addEventListener("click",()=>{const g=r.dataset.fit;!g||this.settings.imageFit===g||(this.settings.imageFit=g,this.updateImageFitToggle(),this.renderCollage())})}),this.updateImageFitToggle(),document.getElementById("exportBtn").addEventListener("click",()=>{this.exportCollage()});const s=document.getElementById("uploadPublicBtn");s&&s.addEventListener("click",()=>this.uploadPublicWork()),o.addEventListener("input",r=>{const g=parseFloat(r.target.value);document.getElementById("qualityValue").textContent=`${Math.round(g*100)}%`,this.updateRangeProgress("qualitySlider","qualityProgress")});const l=document.getElementById("exportSizePreset");l&&l.addEventListener("change",r=>{this.settings.aspectRatio=r.target.value,this.renderCollage()}),this.updateRangeProgress("spacingSlider","spacingProgress"),this.updateRangeProgress("borderSlider","borderProgress"),this.updateRangeProgress("qualitySlider","qualityProgress"),this.setupDecorationControls()}setupBackToTop(){const e=document.getElementById("backToTop");if(!e)return;const t=()=>{window.innerWidth<=768&&window.scrollY>240?e.classList.add("is-visible"):e.classList.remove("is-visible")};e.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})}),window.addEventListener("scroll",t,{passive:!0}),window.addEventListener("resize",t),this.updateBackToTopLabel(),t()}setupBlog(){window.blogManager=I,(()=>{const o=window.location.pathname;(o==="/blog"||o==="/blog/")&&this.renderBlogPage()})();const t=document.getElementById("blogSearchInput"),a=document.querySelector(".blog-search-btn"),i=()=>{t&&(I.searchQuery=t.value.trim(),this.renderBlogPage())};t&&(t.addEventListener("input",i),t.addEventListener("keypress",o=>{o.key==="Enter"&&i()})),a&&a.addEventListener("click",i)}renderBlogPage(){const e=document.querySelector("#page-blog .page-title"),t=document.querySelector("#page-blog .page-subtitle");e&&(e.textContent=n.t("blog.title")),t&&(t.textContent=n.t("blog.subtitle"));const a=document.getElementById("blogSearchInput");a&&(a.placeholder=n.t("blog.searchPlaceholder"));const i=document.getElementById("blogCategories");if(i){const r=I.getCategories(),g={All:n.t("blog.categories.all"),Tutorial:n.t("blog.categories.tutorial"),"Design Tips":n.t("blog.categories.designTips"),Holiday:n.t("blog.categories.holiday"),Mobile:n.t("blog.categories.mobile"),"Social Media":n.t("blog.categories.socialMedia"),Portfolio:n.t("blog.categories.portfolio")};i.innerHTML=r.map(c=>`<button type="button" class="blog-category-btn ${I.currentCategory===c?"is-active":""}" 
                         data-category="${c}" role="tab">${g[c]||c}</button>`).join(""),i.querySelectorAll(".blog-category-btn").forEach(c=>{c.addEventListener("click",()=>{I.currentCategory=c.dataset.category,this.renderBlogPage()})})}const o=document.getElementById("blogTagsFilter");if(o){const g=I.getAllTags().slice(0,8);o.innerHTML=`
                <span class="blog-tags-label">${n.t("blog.popularTags")}</span>
                ${g.map(c=>`<button type="button" class="blog-tag-btn" data-tag="${c}">#${c}</button>`).join("")}
            `,o.querySelectorAll(".blog-tag-btn").forEach(c=>{c.addEventListener("click",()=>{const d=document.getElementById("blogSearchInput");d&&(d.value=c.dataset.tag,I.searchQuery=c.dataset.tag,this.renderBlogPage())})})}const s=document.getElementById("blogList"),l=document.getElementById("blogEmpty");if(s){const r=n.currentLang,g=I.getFilteredPosts(r);if(g.length===0)s.style.display="none",l&&(l.style.display="block",l.querySelector("p").textContent=n.t("blog.noArticles"));else{s.style.display="grid",l&&(l.style.display="none");const c={Tutorial:n.t("blog.categories.tutorial"),"Design Tips":n.t("blog.categories.designTips"),Holiday:n.t("blog.categories.holiday"),Mobile:n.t("blog.categories.mobile"),"Social Media":n.t("blog.categories.socialMedia"),Portfolio:n.t("blog.categories.portfolio")};s.innerHTML=g.map(d=>{const p=I.getLocalizedPost(d,r);return`
                    <article class="blog-post">
                        <h2 class="blog-post-title">
                            <a href="/blog/${d.id}">${p.title}</a>
                        </h2>
                        <div class="blog-post-meta">
                            <span class="blog-date">${this.formatBlogDate(d.date)}</span>
                            <span class="blog-category">${c[d.category]||d.category}</span>
                        </div>
                        <p class="blog-post-excerpt">${p.excerpt}</p>
                        <div class="blog-post-tags">
                            ${d.tags.map(m=>`<span class="blog-tag">#${m}</span>`).join("")}
                        </div>
                        <a href="/blog/${d.id}" class="blog-read-more">${n.t("blog.readMore")} �?/a>
                    </article>
                `}).join("")}}}formatBlogDate(e){const t=new Date(e),a=n.currentLang,o={en:"en-US",zh:"zh-CN",es:"es-ES"}[a]||"en-US";return t.toLocaleDateString(o,{year:"numeric",month:"long",day:"numeric"})}updateBackToTopLabel(){const e=document.getElementById("backToTop");if(!e)return;e.setAttribute("aria-label",n.t("common.backToTop"));const t=e.querySelector("span[data-i18n]");t&&(t.textContent=n.t("common.backToTop"))}handleFiles(e){return x(this,null,function*(){if(!e||typeof e.length=="undefined")return;const a=Array.from(e).filter(s=>s.type&&s.type.startsWith("image/"));if(!a.length)return;const i=this.imageManager.getImages().length>0;for(const s of a)yield this.imageManager.addImage(s);const o=this.imageManager.getImages().length;o>0&&(i?this.activeImageIndex=Math.min(this.activeImageIndex>=0?this.activeImageIndex:0,o-1):this.activeImageIndex=0),this.updateImageCount(),this.updateImageList(),this.handleImageCollectionChange()})}selectTemplate(e,t=!1){this.currentLayout=e,t||(this.userSelectedTemplate=!0),this.renderCollage()}renderCollage(){const e=this.imageManager.getImages();if(e.length===0){document.getElementById("canvasPlaceholder").style.display="flex",document.getElementById("collageCanvas").style.display="none";return}if(document.getElementById("canvasPlaceholder").style.display="none",document.getElementById("collageCanvas").style.display="block",this.decorations.forEach(t=>this.ensureDecorationCoordinates(t)),!this.currentLayout){const t=e.length;if(t<=1)this.currentLayout={type:"grid",rows:1,cols:1};else{const a=Math.ceil(Math.sqrt(t)),i=Math.ceil(t/a);this.currentLayout={type:"grid",rows:i,cols:a}}}this.collageMaker.render(document.getElementById("collageCanvas"),e,this.currentLayout,this.settings,this.decorations),this.bindDecorationOverlayEvents()}updateImageCount(){const e=this.imageManager.getImages().length;n.updateImageCount(e)}updateImageList(){const e=document.getElementById("imageList"),t=this.imageManager.getImages();if(!t.length){e.innerHTML="",this.activeImageIndex=-1,this.syncFilterControls();return}(this.activeImageIndex<0||this.activeImageIndex>=t.length)&&(this.activeImageIndex=0),e.innerHTML=t.map((a,i)=>`
            <div class="image-item${i===this.activeImageIndex?" is-selected":""}" data-index="${i}" draggable="true">
                <img src="${a.url}" alt="Image ${i+1}" loading="lazy" decoding="async">
                <div class="image-item-footer">
                    <button class="image-reorder-handle" type="button" aria-label="${n.t("imagePanel.dragHandle")}">
                        <span aria-hidden="true">⋮⋮</span>
                    </button>
                    <div class="image-order-buttons">
                        <button class="image-move-btn move-up" type="button" data-index="${i}" aria-label="${n.t("imagePanel.moveUp")}" ${i===0?"disabled":""}>
                            <span aria-hidden="true">�?/span>
                        </button>
                        <button class="image-move-btn move-down" type="button" data-index="${i}" aria-label="${n.t("imagePanel.moveDown")}" ${i===t.length-1?"disabled":""}>
                            <span aria-hidden="true">�?/span>
                        </button>
                    </div>
                </div>
                <button class="remove-btn" data-index="${i}" aria-label="${n.t("imagePanel.remove")}" title="${n.t("imagePanel.remove")}"></button>
            </div>
        `).join(""),e.querySelectorAll(".image-item").forEach(a=>{a.addEventListener("click",()=>{const i=parseInt(a.dataset.index);this.setActiveImage(i)}),a.addEventListener("dragstart",this.handleImageDragStart),a.addEventListener("dragover",this.handleImageDragOver),a.addEventListener("dragenter",this.handleImageDragEnter),a.addEventListener("dragleave",this.handleImageDragLeave),a.addEventListener("drop",this.handleImageDrop),a.addEventListener("dragend",this.handleImageDragEnd)}),e.querySelectorAll(".remove-btn").forEach(a=>{a.addEventListener("click",i=>{i.stopPropagation();const o=parseInt(i.target.dataset.index);this.imageManager.removeImage(o),this.updateImageCount();const s=this.imageManager.getImages().length;s===0?this.activeImageIndex=-1:this.activeImageIndex>=s&&(this.activeImageIndex=s-1),this.updateImageList(),this.handleImageCollectionChange()})}),e.querySelectorAll(".image-reorder-handle").forEach(a=>{a.addEventListener("mousedown",i=>{i.stopPropagation()}),a.addEventListener("touchstart",i=>{i.stopPropagation()},{passive:!0})}),e.querySelectorAll(".image-move-btn").forEach(a=>{a.addEventListener("click",i=>{i.stopPropagation();const o=parseInt(a.dataset.index,10);if(Number.isNaN(o))return;const s=a.classList.contains("move-up")?-1:1;this.nudgeImagePosition(o,s)})}),this.syncFilterControls(),n.updateSidebar()}refreshLanguageDependentUI(){var s;const e=this.imageManager.getImages().length,t=((s=this.currentLayout)==null?void 0:s.key)||this.templateManager.getActiveTemplateKey(),a=this.templateManager.getBestTemplateKeyForCount(e)||this.templateManager.getRecommendedKeys()[0]||this.templateManager.getDefaultTemplateKey(),i=this.userSelectedTemplate&&t?t:a,o=i?this.templateManager.getTemplateByKey(i):null;o?(this.selectTemplate(o,!0),this.templateManager.activateTemplate(i,{dispatch:!1,auto:!this.userSelectedTemplate})):this.renderCollage(),this.templateManager.renderThemeNavigator(),this.templateManager.renderCategories(),this.templateManager.renderTemplates(),this.templateManager.updateRecommendations(e),this.updateImageCount(),this.updateBackToTopLabel(),this.updateMobileNavLabels(),this.renderDecorationList(),this.updateStickerOptionLabels(),this.renderFilterPresets(),this.setupFilterLocalization(),this.updateImageList(),this.templateManager.renderRecommendationSummary(),this.templateManager.refreshTemplateTexts(),n.updateSidebar(),this.syncFilterControls(),this.updateImageFitToggle()}setupFilterLocalization(){this.filterPresetContainer&&this.filterPresetContainer.querySelectorAll(".filter-preset").forEach(e=>{const t=e.dataset.id,a=U.find(o=>o.id===t),i=e.querySelector(".filter-preset-label");a&&i&&(i.textContent=n.t(a.nameKey))}),this.filterScopeButtons&&this.filterScopeButtons.length&&this.filterScopeButtons.forEach(e=>{const t=e.dataset.scope==="all"?"filters.scopeAll":"filters.scopeCurrent";e.textContent=n.t(t)}),this.filterEmptyMessage&&(this.filterEmptyMessage.textContent=n.t("filters.noImage"))}handleImageCollectionChange(){const t=this.imageManager.getImages().length;if(t===0){this.activeImageIndex=-1,this.currentLayout=null,this.userSelectedTemplate=!1,this.renderCollage(),this.syncFilterControls(),this.templateManager.updateRecommendations(t);return}const a=this.templateManager.getBestTemplateKeyForCount(t)||this.templateManager.getRecommendedKeys()[0]||this.templateManager.getDefaultTemplateKey();if(a){const i=this.templateManager.getTemplateByKey(a);i&&(this.userSelectedTemplate=!1,this.selectTemplate(i,!0),this.templateManager.activateTemplate(a,{dispatch:!1,auto:!0}))}else this.renderCollage();this.syncFilterControls(),this.templateManager.updateRecommendations(t)}exportCollage(){return x(this,null,function*(){const e=document.getElementById("collageCanvas"),t=parseFloat(document.getElementById("qualitySlider").value),a=document.getElementById("exportFormat").value;yield this.exportManager.export({element:e,quality:t,format:a,images:this.imageManager.getImages(),decorations:this.decorations,settings:this.settings})})}uploadPublicWork(){return x(this,null,function*(){const e=document.getElementById("publicUploadResult"),t=document.getElementById("uploadPublicBtn");if(!(!e||!t))try{t.disabled=!0,t.textContent=n.t("works.uploading"),e.style.display="none",e.innerHTML="";const a=document.getElementById("collageCanvas");(!a||a.style.display==="none")&&this.renderCollage();const i=yield this.exportManager.renderToCanvas({element:document.getElementById("collageCanvas"),images:this.imageManager.getImages(),decorations:this.decorations,settings:this.settings,quality:1,format:"jpg"}),o=yield new Promise(h=>i.toBlob(h,"image/jpeg",.92));if(!o)throw new Error("Failed to create image blob");const s=yield Ce(o,{folder:"works",fileName:`collage-${Date.now()}.jpg`}),l=s.secure_url,r=s.public_id,c=`/works/${we(r)}`,d=`<a href="https://www.mecollage.top${c}" target="_blank" rel="noopener"><img src="${l}" alt="MeCollage Public Work" loading="lazy" decoding="async" /></a>`;e.innerHTML=`
                <div>${n.t("works.uploadDone")}</div>
                <div class="result-actions">
                    <a href="${c}" class="btn" target="_blank" rel="noopener">${n.t("works.viewPublicPage")}</a>
                    <button type="button" id="copyImageUrlBtn">${n.t("works.copyImageUrl")}</button>
                    <button type="button" id="copyEmbedBtn">${n.t("works.copyEmbedCode")}</button>
                </div>
                <div style="margin-top:8px;">
                    <div style="opacity:.8;font-size:12px;margin-bottom:4px;">${n.t("works.embedLabel")}:</div>
                    <textarea id="embedCodeArea" readonly rows="3" style="width:100%;resize:vertical;">${d}</textarea>
                </div>
            `,e.style.display="block";const p=document.getElementById("copyImageUrlBtn"),m=document.getElementById("copyEmbedBtn"),f=document.getElementById("embedCodeArea");p==null||p.addEventListener("click",()=>x(this,null,function*(){yield navigator.clipboard.writeText(l);const{showToast:h}=yield Q(()=>x(this,null,function*(){const{showToast:y}=yield Promise.resolve().then(()=>X);return{showToast:y}}),void 0);h==null||h(n.t("share.copied"))})),m==null||m.addEventListener("click",()=>x(this,null,function*(){yield navigator.clipboard.writeText(f.value);const{showToast:h}=yield Q(()=>x(this,null,function*(){const{showToast:y}=yield Promise.resolve().then(()=>X);return{showToast:y}}),void 0);h==null||h(n.t("share.copied"))}))}catch(a){console.error(a),alert((a==null?void 0:a.message)||"Upload failed")}finally{t.disabled=!1,t.textContent=n.t("works.uploadAndLink")}})}updateRangeProgress(e,t){const a=document.getElementById(e),i=document.getElementById(t);if(!a||!i)return;const o=parseFloat(a.min)||0,s=parseFloat(a.max)||1,l=parseFloat(a.value),r=s===o?0:(l-o)/(s-o)*100;i.style.width=`${r}%`}updateImageFitToggle(){if(!(!this.imageFitButtons||!this.imageFitButtons.length)&&(this.imageFitButtons.forEach(e=>{const t=e.dataset.fit===this.settings.imageFit;e.classList.toggle("is-active",t),e.setAttribute("aria-pressed",String(t))}),this.imageFitHint)){const e=this.settings.imageFit==="contain"?"sidebar.imageFitHintContain":"sidebar.imageFitHintCover";this.imageFitHint.textContent=n.t(e)}}setupDecorationControls(){this.decorationListEl=document.getElementById("decorationList");const e=document.getElementById("addTextBtn");this.textInput=document.getElementById("decorTextContent"),this.textColorInput=document.getElementById("decorTextColor"),this.textSizeSelect=document.getElementById("decorTextSize"),this.textPositionSelect=document.getElementById("decorTextPosition"),this.textSwatchRow=document.getElementById("decorTextSwatches"),this.textMoreBtn=document.getElementById("decorTextMore");const t=document.getElementById("stickerOptions");this.stickerSizeSelect=document.getElementById("decorStickerSize"),this.stickerPositionSelect=document.getElementById("decorStickerPosition"),t&&(t.innerHTML="",this.stickerLibrary.forEach(a=>{const i=document.createElement("button");i.type="button",i.className="sticker-option",i.textContent=a.emoji,i.dataset.stickerId=a.id;try{const o=n.t(a.labelKey);i.setAttribute("aria-label",o),i.setAttribute("title",o)}catch(o){i.setAttribute("aria-label",a.fallbackLabel),i.setAttribute("title",a.fallbackLabel)}i.addEventListener("click",o=>{o.preventDefault(),this.addStickerDecoration(a)}),t.appendChild(i)})),e&&e.addEventListener("click",a=>{a.preventDefault(),this.handleAddTextDecoration()}),this.textInput&&(this.textInput.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),this.handleAddTextDecoration())}),this.textInput.addEventListener("input",()=>{this.activeDecorationId&&this.updateActiveDecoration({content:this.textInput.value},["text"])})),this.textSwatchRow&&this.renderTextSwatches(),this.textMoreBtn&&this.textColorInput&&this.textMoreBtn.addEventListener("click",a=>{a.preventDefault(),this.textColorInput.click()}),this.textColorInput&&this.textColorInput.addEventListener("input",()=>{this.updateActiveDecoration({color:this.textColorInput.value},["text"]),this.highlightActiveSwatch(this.textColorInput.value)}),this.textSizeSelect&&this.textSizeSelect.addEventListener("change",()=>{this.updateActiveDecoration({size:this.textSizeSelect.value},["text"])}),this.textPositionSelect&&this.textPositionSelect.addEventListener("change",()=>{const a=this.textPositionSelect.value;if(a==="custom"){this.updateActiveDecoration({position:"custom"},["text"]);return}const i=this.positionToCoordinates(a);this.updateActiveDecoration({position:a,x:i.x,y:i.y},["text"])}),this.stickerSizeSelect&&this.stickerSizeSelect.addEventListener("change",()=>{this.updateActiveDecoration({size:this.stickerSizeSelect.value},["sticker"])}),this.stickerPositionSelect&&this.stickerPositionSelect.addEventListener("change",()=>{const a=this.stickerPositionSelect.value;if(a==="custom"){this.updateActiveDecoration({position:"custom"},["sticker"]);return}const i=this.positionToCoordinates(a);this.updateActiveDecoration({position:a,x:i.x,y:i.y},["sticker"])}),this.renderDecorationList(),this.updateStickerOptionLabels(),this.syncControlsWithActiveDecoration()}setupFilterControls(){if(this.filterPresetContainer=document.getElementById("filterPresets"),this.filterBrightnessInput=document.getElementById("filterBrightness"),this.filterContrastInput=document.getElementById("filterContrast"),this.filterSaturationInput=document.getElementById("filterSaturation"),this.filterWarmthInput=document.getElementById("filterWarmth"),this.filterBlurInput=document.getElementById("filterBlur"),this.filterResetBtn=document.getElementById("filterResetBtn"),this.filterEmptyMessage=document.getElementById("filterEmptyMessage"),this.filtersSectionContent=document.getElementById("filtersSectionContent"),!this.filtersSectionContent)return;this.filterBlocks=Array.from(this.filtersSectionContent.querySelectorAll(".filter-block")),this.filterSliderDisplays={brightness:document.getElementById("filterBrightnessValue"),contrast:document.getElementById("filterContrastValue"),saturation:document.getElementById("filterSaturationValue"),warmth:document.getElementById("filterWarmthValue"),blur:document.getElementById("filterBlurValue")},this.filterTargetLabel=document.getElementById("filterActiveTarget"),this.filterScopeGroup=document.getElementById("filterScopeGroup"),this.filterScopeGroup&&this.filterScopeGroup.setAttribute("aria-label",n.t("filters.scopeAria")),this.filterScopeButtons=Array.from(document.querySelectorAll(".filter-scope-btn")),this.filterScopeButtons.forEach(t=>{t.addEventListener("click",()=>{const a=t.dataset.scope;this.setFilterScope(a)})}),this.renderFilterPresets(),this.setupFilterLocalization(),[{input:this.filterBrightnessInput,key:"brightness"},{input:this.filterContrastInput,key:"contrast"},{input:this.filterSaturationInput,key:"saturation"},{input:this.filterWarmthInput,key:"warmth"},{input:this.filterBlurInput,key:"blur"}].forEach(({input:t,key:a})=>{t&&t.addEventListener("input",i=>{const o=parseInt(i.target.value,10);Number.isNaN(o)||this.updateFilterAdjustment(a,o)})}),this.filterResetBtn&&this.filterResetBtn.addEventListener("click",t=>{t.preventDefault(),this.resetFilters()}),this.syncFilterControls(),document.addEventListener("language-changed",()=>{this.filterScopeGroup&&this.filterScopeGroup.setAttribute("aria-label",n.t("filters.scopeAria")),this.updateFilterTargetLabel()})}renderFilterPresets(){var e,t;this.filterPresetContainer&&(this.filterPresetContainer.innerHTML=U.map(a=>{const i=n.t(a.nameKey),o=this.collageMaker.buildFilterString({adjustments:a.adjustments})||"none";return`
                 <button type="button" class="filter-preset" data-id="${a.id}">
                     <span class="filter-preset-thumb" style="filter:${o};"></span>
                    <span class="filter-preset-label" data-i18n="${a.nameKey}">${i}</span>
                 </button>
             `}).join(""),this.filterPresetButtons=Array.from(this.filterPresetContainer.querySelectorAll(".filter-preset")),this.filterPresetButtons.forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.id;this.applyFilterPreset(i)})}),this.highlightActiveFilterPreset((t=(e=this.getActiveImage())==null?void 0:e.filters)==null?void 0:t.preset),this.updateFilterScopeUI())}forEachFilterTarget(e){const t=this.imageManager.getImages();if(!t.length)return[];if(this.filterScope==="all")return t.forEach((i,o)=>e(i,o)),t;let a=this.getActiveImage();return a||(this.activeImageIndex=0,a=this.getActiveImage()),a?(e(a,this.activeImageIndex),[a]):[]}setFilterScope(e){if(!(e!=="single"&&e!=="all")){if(this.filterScope===e){this.updateFilterScopeUI();return}this.filterScope=e,e==="all"&&this.syncAllImagesWithActive(),this.updateFilterScopeUI(),this.renderCollage(),this.syncFilterControls()}}syncAllImagesWithActive(){const e=this.imageManager.getImages();if(!e.length)return;const t=this.getActiveImage()||e[0];t.filters||(t.filters=this.imageManager.getDefaultFilters());const a={preset:t.filters.preset||"custom",adjustments:v(v({},G),t.filters.adjustments||{})};e.forEach(i=>{i.filters||(i.filters=this.imageManager.getDefaultFilters()),i.filters.preset=a.preset,i.filters.adjustments=v({},a.adjustments)})}updateFilterScopeUI(){this.filterScopeButtons.length&&(this.filterScopeButtons.forEach(e=>{const t=e.dataset.scope===this.filterScope;e.classList.toggle("is-active",t),e.setAttribute("aria-pressed",String(t))}),this.updateFilterTargetLabel())}updateFilterTargetLabel(){if(!this.filterTargetLabel)return;const t=this.imageManager.getImages().length;if(!t){this.filterTargetLabel.setAttribute("data-i18n","filters.targetNone"),this.filterTargetLabel.removeAttribute("data-i18n-params"),this.filterTargetLabel.textContent=n.t("filters.targetNone");return}if(this.filterScope==="all"){const o={total:t};this.filterTargetLabel.setAttribute("data-i18n","filters.targetAll"),this.filterTargetLabel.setAttribute("data-i18n-params",JSON.stringify(o)),this.filterTargetLabel.textContent=n.t("filters.targetAll",o);return}const i={index:this.activeImageIndex>=0?this.activeImageIndex+1:1,total:t};this.filterTargetLabel.setAttribute("data-i18n","filters.targetSingle"),this.filterTargetLabel.setAttribute("data-i18n-params",JSON.stringify(i)),this.filterTargetLabel.textContent=n.t("filters.targetSingle",i)}syncFilterControls(){if(!this.filtersSectionContent)return;const e=this.getActiveImage();if(!e){this.filterEmptyMessage&&(this.filterEmptyMessage.style.display=""),this.filterBlocks.forEach(i=>i.classList.add("is-disabled")),this.filterPresetContainer&&this.filterPresetContainer.classList.add("is-disabled"),this.filterResetBtn&&this.filterResetBtn.classList.add("is-disabled"),[this.filterBrightnessInput,this.filterContrastInput,this.filterSaturationInput,this.filterWarmthInput].forEach(i=>{i&&(i.disabled=!0)}),this.filterBlurInput&&(this.filterBlurInput.disabled=!0),this.highlightActiveFilterPreset(null),this.updateFilterTargetLabel();return}this.filterEmptyMessage&&(this.filterEmptyMessage.style.display="none"),this.filterBlocks.forEach(i=>i.classList.remove("is-disabled")),this.filterPresetContainer&&this.filterPresetContainer.classList.remove("is-disabled"),this.filterResetBtn&&this.filterResetBtn.classList.remove("is-disabled"),[this.filterBrightnessInput,this.filterContrastInput,this.filterSaturationInput,this.filterWarmthInput].forEach(i=>{i&&(i.disabled=!1)}),this.filterBlurInput&&(this.filterBlurInput.disabled=!1),e.filters||(e.filters=this.imageManager.getDefaultFilters()),e.filters.adjustments=v(v({},G),e.filters.adjustments||{});const{adjustments:t,preset:a}=e.filters;this.filterBrightnessInput&&(this.filterBrightnessInput.value=t.brightness,this.updateFilterSliderDisplay("brightness",t.brightness)),this.filterContrastInput&&(this.filterContrastInput.value=t.contrast,this.updateFilterSliderDisplay("contrast",t.contrast)),this.filterSaturationInput&&(this.filterSaturationInput.value=t.saturation,this.updateFilterSliderDisplay("saturation",t.saturation)),this.filterWarmthInput&&(this.filterWarmthInput.value=t.warmth,this.updateFilterSliderDisplay("warmth",t.warmth)),this.filterBlurInput&&(this.filterBlurInput.value=t.blur,this.updateFilterSliderDisplay("blur",t.blur)),this.highlightActiveFilterPreset(a),this.updateFilterScopeUI()}setActiveImage(e){const t=this.imageManager.getImages();if(!t.length){this.activeImageIndex=-1,this.syncFilterControls();return}const a=Math.max(0,Math.min(e,t.length-1));if(this.activeImageIndex===a)return;this.activeImageIndex=a;const i=document.getElementById("imageList");i&&i.querySelectorAll(".image-item").forEach(o=>{const s=parseInt(o.dataset.index,10);o.classList.toggle("is-selected",s===a)}),this.syncFilterControls()}getActiveImage(){const e=this.imageManager.getImages();return this.activeImageIndex<0||this.activeImageIndex>=e.length?null:e[this.activeImageIndex]}applyFilterPreset(e){if(!this.imageManager.getImages().length)return;const a=U.find(i=>i.id===e);a&&(this.forEachFilterTarget(i=>{i.filters||(i.filters=this.imageManager.getDefaultFilters()),i.filters.preset=a.id,i.filters.adjustments=v({},a.adjustments)}),this.renderCollage(),this.syncFilterControls())}updateFilterAdjustment(e,t){this.imageManager.getImages().length&&(this.forEachFilterTarget(i=>{i.filters||(i.filters=this.imageManager.getDefaultFilters()),i.filters.adjustments=v(v({},G),i.filters.adjustments||{}),i.filters.adjustments[e]=t,i.filters.preset="custom"}),this.updateFilterSliderDisplay(e,t),this.highlightActiveFilterPreset(null),this.renderCollage())}resetFilters(){this.imageManager.getImages().length&&(this.forEachFilterTarget(t=>{t.filters=this.imageManager.getDefaultFilters()}),this.renderCollage(),this.syncFilterControls())}highlightActiveFilterPreset(e){!this.filterPresetButtons||!this.filterPresetButtons.length||this.filterPresetButtons.forEach(t=>{const a=t.dataset.id===e;t.classList.toggle("is-active",a),t.setAttribute("aria-pressed",String(a))})}updateFilterSliderDisplay(e,t){if(!this.filterSliderDisplays||!this.filterSliderDisplays[e])return;let a=`${t}%`;if(e==="warmth"){const i=Number(t)||0;a=i>0?`+${i}`:`${i}`}else e==="blur"&&(a=`${t}px`);this.filterSliderDisplays[e].textContent=a}getStickerLibrary(){return[{id:"sparkles",emoji:"�?,labelKey:"decorations.stickerSparkles",fallbackLabel:"Sparkles"},{id:"heart",emoji:"❤️",labelKey:"decorations.stickerHeart",fallbackLabel:"Heart"},{id:"camera",emoji:"📷",labelKey:"decorations.stickerCamera",fallbackLabel:"Camera"},{id:"star",emoji:"�?,labelKey:"decorations.stickerStar",fallbackLabel:"Star"},{id:"leaf",emoji:"🍃",labelKey:"decorations.stickerLeaf",fallbackLabel:"Leaf"}]}addStickerDecoration(e){const t=this.stickerSizeSelect?this.stickerSizeSelect.value:"medium",a=this.stickerPositionSelect?this.stickerPositionSelect.value:"center",i={id:this.createDecorationId(),type:"sticker",emoji:e.emoji,labelKey:e.labelKey,fallbackLabel:e.fallbackLabel,size:t,position:a},o=this.positionToCoordinates(a);i.x=o.x,i.y=o.y,this.decorations.push(i),this.activeDecorationId=i.id,this.renderCollage(),this.renderDecorationList(),this.syncControlsWithActiveDecoration()}handleAddTextDecoration(){if(!this.textInput)return;const e=this.textInput.value.trim();if(!e){this.textInput.focus();return}const t={id:this.createDecorationId(),type:"text",content:e,color:this.textColorInput?this.textColorInput.value:"#ffffff",size:this.textSizeSelect?this.textSizeSelect.value:"medium",position:this.textPositionSelect?this.textPositionSelect.value:"center"},a=this.positionToCoordinates(t.position);t.x=a.x,t.y=a.y,this.decorations.push(t),this.activeDecorationId=t.id,this.textInput.value="",this.renderCollage(),this.renderDecorationList(),this.syncControlsWithActiveDecoration()}renderTextSwatches(){const e=this.getTextColorPresets();this.textSwatchRow.innerHTML=e.map(t=>{const a=n.t(t.labelKey);return`<button type="button" class="color-swatch" data-color="${t.value}" aria-label="${a}" title="${a}" style="background:${t.value}"></button>`}).join(""),this.textSwatchRow.querySelectorAll(".color-swatch").forEach(t=>{t.addEventListener("click",a=>{a.preventDefault();const i=t.getAttribute("data-color");this.textColorInput&&(this.textColorInput.value=i),this.updateActiveDecoration({color:i},["text"]),this.highlightActiveSwatch(i)})}),this.textColorInput&&this.highlightActiveSwatch(this.textColorInput.value)}highlightActiveSwatch(e){if(!this.textSwatchRow)return;const t=e?e.toLowerCase():"";this.textSwatchRow.querySelectorAll(".color-swatch").forEach(a=>{const i=(a.getAttribute("data-color")||"").toLowerCase();a.classList.toggle("is-active",i===t)})}getTextColorPresets(){return[{value:"#ffffff",labelKey:"decorations.presetWhite"},{value:"#222222",labelKey:"decorations.presetBlack"},{value:"#e53935",labelKey:"decorations.presetRed"},{value:"#ffb300",labelKey:"decorations.presetYellow"},{value:"#43a047",labelKey:"decorations.presetGreen"}]}renderDecorationList(){if(this.decorationListEl){if(!this.decorations.length){const e=n.t("decorations.empty");this.decorationListEl.innerHTML=`<div class="decorate-empty">${e}</div>`;return}this.decorationListEl.innerHTML=this.decorations.map(e=>{const t=e.type==="text"?n.t("decorations.textHeading"):n.t("decorations.stickerHeading"),a=this.getPositionLabel(e.position),i=e.type==="text"?`<span class="decorate-text-sample" style="color:${e.color||"#ffffff"};">${this.escapeHtmlContent(e.content)||n.t("decorations.textPlaceholder")}</span>`:`${e.emoji} ${this.getStickerLabel(e)}`,o=this.getDecorationSummary(e,a);return`
                <div class="decorate-item${e.id===this.activeDecorationId?" is-active":""}" data-id="${e.id}" data-highlight-mode="${e.type==="text"?"text":"sticker"}">
                    <div>
                        <div class="decorate-item-type">${t}</div>
                        <div class="decorate-item-content">${i}</div>
                        <div class="decorate-item-meta">${o}</div>
                    </div>
                    <button type="button" class="decorate-remove" data-id="${e.id}">
                        <span aria-hidden="true">�?/span>
                        <span data-i18n="decorations.remove">${n.t("decorations.remove")}</span>
                    </button>
                </div>
            `}).join(""),this.decorationListEl.querySelectorAll(".decorate-item").forEach(e=>{const t=e.getAttribute("data-id");e.addEventListener("click",()=>{this.setActiveDecoration(t)})}),this.decorationListEl.querySelectorAll(".decorate-remove").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const a=e.getAttribute("data-id");this.removeDecoration(a)})})}}removeDecoration(e){const t=this.decorations.length;this.decorations=this.decorations.filter(a=>a.id!==e),this.decorations.length!==t&&(this.activeDecorationId===e&&(this.activeDecorationId=this.decorations.length?this.decorations[this.decorations.length-1].id:null),this.renderCollage(),this.renderDecorationList(),this.syncControlsWithActiveDecoration())}getStickerLabel(e){try{return n.t(e.labelKey)}catch(t){return e.fallbackLabel}}escapeHtmlContent(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}positionToCoordinates(e){const t={"top-left":{x:.15,y:.15},"top-center":{x:.5,y:.15},"top-right":{x:.85,y:.15},center:{x:.5,y:.5},"bottom-left":{x:.2,y:.85},"bottom-center":{x:.5,y:.85},"bottom-right":{x:.85,y:.85},custom:{x:.5,y:.5}};return t[e]||t.center}getDecorationSummary(e,t){const a=e.size==="large"?"decorations.sizeLarge":e.size==="small"?"decorations.sizeSmall":"decorations.sizeMedium",i=n.t(a);if(e.position==="custom"){const o=this.formatPercentage(e.x),s=this.formatPercentage(e.y);return e.type==="text"?`${n.t("decorations.positionCustom")} · ${i} · ${o}, ${s}`:`${n.t("decorations.positionCustom")} · ${i} · ${o}, ${s}`}return e.type==="text"?`${t} · ${i} · ${e.color}`:`${t} · ${i}`}getPositionLabel(e){const t={"top-left":"decorations.positionTopLeft","top-center":"decorations.positionTopCenter","top-right":"decorations.positionTopRight",center:"decorations.positionCenter","bottom-left":"decorations.positionBottomLeft","bottom-center":"decorations.positionBottomCenter","bottom-right":"decorations.positionBottomRight"};if(e==="custom")return n.t("decorations.positionCustom");const a=t[e]||t.center;try{return n.t(a)}catch(i){return e}}createDecorationId(){return this.decorationIdCounter+=1,`decor-${this.decorationIdCounter}`}formatPercentage(e){const t=this.clampNormalized(e||.5);return`${Math.round(t*100)}%`}updateStickerOptionLabels(){const e=document.getElementById("stickerOptions");e&&e.querySelectorAll(".sticker-option").forEach(t=>{const a=t.dataset.stickerId,i=this.stickerLibrary.find(o=>o.id===a);if(i)try{const o=n.t(i.labelKey);t.setAttribute("aria-label",o),t.setAttribute("title",o)}catch(o){t.setAttribute("aria-label",i.fallbackLabel),t.setAttribute("title",i.fallbackLabel)}})}setActiveDecoration(e){if(!e){this.activeDecorationId=null,this.syncControlsWithActiveDecoration(),this.renderDecorationList();return}this.decorations.find(a=>a.id===e)&&(this.activeDecorationId=e,this.renderDecorationList(),this.syncControlsWithActiveDecoration())}syncControlsWithActiveDecoration(){const e=this.decorations.find(t=>t.id===this.activeDecorationId);e&&(e.type==="text"&&(this.textInput&&(this.textInput.value=e.content),this.textColorInput&&(this.textColorInput.value=e.color),this.textSizeSelect&&(this.textSizeSelect.value=e.size),this.highlightActiveSwatch(e.color)),this.textPositionSelect&&(this.textPositionSelect.value=e.position),e.type==="sticker"&&(this.stickerSizeSelect&&(this.stickerSizeSelect.value=e.size),this.stickerPositionSelect&&(this.stickerPositionSelect.value=e.position),this.highlightActiveSwatch(null)))}updateActiveDecoration(e,t=null){if(!this.decorations.length)return;this.activeDecorationId||(this.activeDecorationId=this.decorations[this.decorations.length-1].id);const a=this.decorations.find(i=>i.id===this.activeDecorationId);a&&(t&&!t.includes(a.type)||(Object.assign(a,e),this.ensureDecorationCoordinates(a),this.renderCollage(),this.renderDecorationList(),this.syncControlsWithActiveDecoration(),a.type==="text"&&e.color&&this.highlightActiveSwatch(a.color)))}setupResponsiveControls(){this.sidebarSections=Array.from(document.querySelectorAll(".sidebar-section")),this.sectionToggles=Array.from(document.querySelectorAll(".sidebar-section-toggle")),this.sectionToggles.forEach(t=>{t.addEventListener("click",()=>{this.handleSectionToggle(t)})});const e=document.getElementById("mobileSectionNav");e&&(this.mobileNavButtons=Array.from(e.querySelectorAll(".mobile-nav-btn")),this.mobileNavButtons.forEach(t=>{t.addEventListener("click",a=>{a.preventDefault(),this.handleMobileNavClick(t)})})),window.addEventListener("resize",()=>this.handleResponsiveLayout()),this.handleResponsiveLayout(!0),this.updateMobileNavLabels(),this.canvasExpandBtn=document.getElementById("canvasExpandBtn"),this.canvasCloseBtn=document.getElementById("canvasCloseBtn"),this.canvasAreaEl=document.getElementById("canvasArea"),this.canvasExpandBtn&&this.canvasExpandBtn.addEventListener("click",()=>{this.toggleCanvasExpanded(!0)}),this.canvasCloseBtn&&this.canvasCloseBtn.addEventListener("click",()=>{this.toggleCanvasExpanded(!1)})}handleResponsiveLayout(e=!1){const t=window.innerWidth<=768;(e||t!==this.isMobileView)&&(document.body.classList.toggle("is-mobile",t),t?(this.sidebarSections.forEach((i,o)=>{const s=i.querySelector(".sidebar-section-toggle");i.dataset.mobileInitialized||(i.classList.toggle("is-open",o===0),i.dataset.mobileInitialized="true"),s&&s.setAttribute("aria-expanded",i.classList.contains("is-open")?"true":"false")}),this.mobileNavButtons.length&&this.mobileNavButtons.forEach((i,o)=>{i.classList.toggle("is-active",o===0)})):(this.sidebarSections.forEach(i=>{i.classList.add("is-open"),delete i.dataset.mobileInitialized;const o=i.querySelector(".sidebar-section-toggle");o&&o.setAttribute("aria-expanded","true")}),this.mobileNavButtons.length&&this.mobileNavButtons.forEach(i=>i.classList.remove("is-active")),document.body.classList.contains("is-canvas-expanded")&&this.toggleCanvasExpanded(!1)),this.isMobileView=t)}handleSectionToggle(e){const t=e.closest(".sidebar-section");if(!t||!document.body.classList.contains("is-mobile"))return;const i=!t.classList.contains("is-open");this.sidebarSections.forEach(o=>{if(o!==t){o.classList.remove("is-open");const s=o.querySelector(".sidebar-section-toggle");s&&s.setAttribute("aria-expanded","false")}}),t.classList.toggle("is-open",i),e.setAttribute("aria-expanded",i?"true":"false")}handleMobileNavClick(e){if(!this.mobileNavButtons.length)return;this.mobileNavButtons.forEach(i=>{i.classList.toggle("is-active",i===e)});const t=e.dataset.target;if(!t)return;const a=document.getElementById(t);if(a&&a.scrollIntoView({behavior:"smooth",block:"start"}),document.body.classList.contains("is-mobile")){const i=document.getElementById(t);i&&i.classList.contains("sidebar-section")&&this.sidebarSections.forEach(o=>{const s=o.querySelector(".sidebar-section-toggle"),l=o===i;o.classList.toggle("is-open",l),s&&s.setAttribute("aria-expanded",l?"true":"false")}),t==="canvasArea"&&this.canvasExpandBtn&&this.toggleCanvasExpanded(!0)}}updateMobileNavLabels(){this.mobileNavButtons.length&&this.mobileNavButtons.forEach(e=>{const t=e.getAttribute("data-i18n");if(t){const a=n.t(t);e.textContent=a,e.setAttribute("aria-label",a)}})}toggleCanvasExpanded(e){const t=typeof e=="boolean"?e:!document.body.classList.contains("is-canvas-expanded");this.canvasAreaEl&&(document.body.classList.toggle("is-canvas-expanded",t),t&&this.canvasAreaEl?(this.canvasAreaEl.scrollIntoView({behavior:"smooth",block:"start"}),this.isMobileView&&this.mobileNavButtons.length&&this.mobileNavButtons.forEach(a=>{a.classList.toggle("is-active",a.dataset.target==="canvasArea")}),document.addEventListener("keyup",this.handleCanvasKeyUp)):document.removeEventListener("keyup",this.handleCanvasKeyUp))}handleCanvasKeyUp(e){e.key==="Escape"&&document.body.classList.contains("is-canvas-expanded")&&this.toggleCanvasExpanded(!1)}bindDecorationOverlayEvents(){const e=document.getElementById("collageCanvas");if(!e)return;e.querySelectorAll(".collage-overlay .overlay-item").forEach(a=>{a.dataset.dragBound!=="true"&&(a.dataset.dragBound="true",a.addEventListener("pointerdown",i=>this.startDecorationDrag(i,e,a)))})}startDecorationDrag(e,t,a){if(e.button!==void 0&&e.button!==0)return;e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();const i=a.dataset.id,o=this.decorations.find(s=>s.id===i);o&&(this.setActiveDecoration(i),this.ensureDecorationCoordinates(o),a.setPointerCapture(e.pointerId),a.classList.add("is-dragging"),this.dragState={pointerId:e.pointerId,element:a,decoration:o,container:t},a.addEventListener("pointermove",this.handleDecorationPointerMove),a.addEventListener("pointerup",this.handleDecorationPointerUp),a.addEventListener("pointercancel",this.handleDecorationPointerUp))}handleDecorationPointerMove(e){if(!this.dragState||e.pointerId!==this.dragState.pointerId)return;const{container:t,element:a,decoration:i}=this.dragState;this.dragState.cachedRect||(this.dragState.cachedRect=t.getBoundingClientRect());const o=this.dragState.cachedRect;!o.width||!o.height||(this.dragState.rafId&&cancelAnimationFrame(this.dragState.rafId),this.dragState.rafId=requestAnimationFrame(()=>{const s=this.clampNormalized((e.clientX-o.left)/o.width),l=this.clampNormalized((e.clientY-o.top)/o.height);i.x=s,i.y=l,i.position="custom",a.style.left=`${s*100}%`,a.style.top=`${l*100}%`}))}handleDecorationPointerUp(e){if(!this.dragState||e.pointerId!==this.dragState.pointerId)return;const{element:t}=this.dragState;this.dragState.rafId&&(cancelAnimationFrame(this.dragState.rafId),this.dragState.rafId=null),t.releasePointerCapture(e.pointerId),t.classList.remove("is-dragging"),t.removeEventListener("pointermove",this.handleDecorationPointerMove),t.removeEventListener("pointerup",this.handleDecorationPointerUp),t.removeEventListener("pointercancel",this.handleDecorationPointerUp),this.dragState=null,this.renderDecorationList(),this.syncControlsWithActiveDecoration(),this.renderCollage()}ensureDecorationCoordinates(e){if(typeof e.x!="number"||Number.isNaN(e.x)||typeof e.y!="number"||Number.isNaN(e.y)){const t=this.positionToCoordinates(e.position);e.x=t.x,e.y=t.y}e.x=this.clampNormalized(e.x),e.y=this.clampNormalized(e.y)}clampNormalized(e){return Number.isFinite(e)?Math.min(Math.max(e,.05),.95):.5}nudgeImagePosition(e,t){const a=this.imageManager.getImages();if(!a.length)return;const i=e+t;if(i<0||i>=a.length)return;const o=t>0;this.moveImage(e,i,o)}moveImage(e,t,a=!1){const i=this.imageManager.getImages(),o=i.length;if(!o||e<0||e>=o)return;t<0&&(t=0),t>=o&&(t=o-1);const s=this.activeImageIndex>=0?i[this.activeImageIndex]:null,l=i[e];if(this.imageManager.reorderImages(e,t,{insertAfter:a})===!1)return;const g=this.imageManager.getImages();if(s){const c=g.indexOf(s);this.activeImageIndex=c}if(!s&&l){const c=g.indexOf(l);c>=0&&(this.activeImageIndex=c)}this.updateImageList(),this.renderCollage(),this.updateFilterTargetLabel()}handleImageDragStart(e){const t=e.currentTarget,a=parseInt(t.dataset.index,10);Number.isNaN(a)||(this.imageDragState={fromIndex:a,sourceEl:t},t.classList.add("is-dragging"),e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",String(a))))}handleImageDragEnter(e){if(!this.imageDragState)return;const t=e.currentTarget;t!==this.imageDragState.sourceEl&&(this.clearImageDragHover(),t.classList.add("is-drag-over"),this.imageDragState.hoverEl=t)}handleImageDragOver(e){if(!this.imageDragState)return;const t=e.currentTarget;if(t===this.imageDragState.sourceEl)return;e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const a=t.getBoundingClientRect(),i=e.clientY>a.top+a.height/2;t.classList.toggle("drop-after",i),t.classList.toggle("drop-before",!i),t.dataset.dropPosition=i?"after":"before"}handleImageDragLeave(e){if(!this.imageDragState)return;const t=e.currentTarget;t.classList.remove("is-drag-over","drop-before","drop-after"),this.imageDragState&&this.imageDragState.hoverEl===t&&delete this.imageDragState.hoverEl}handleImageDrop(e){if(!this.imageDragState)return;e.preventDefault();const t=e.currentTarget,a=this.imageDragState.fromIndex;let i=parseInt(t.dataset.index,10);if(Number.isNaN(a)||Number.isNaN(i)){this.handleImageDragEnd();return}const o=t.dataset.dropPosition==="after";this.clearImageDragHover(),this.moveImage(a,i,o),this.handleImageDragEnd()}handleImageDragEnd(){this.imageDragState&&this.imageDragState.sourceEl&&this.imageDragState.sourceEl.classList.remove("is-dragging"),this.clearImageDragHover(),this.imageDragState=null}clearImageDragHover(){const e=document.getElementById("imageList");e&&e.querySelectorAll(".image-item").forEach(t=>{t.classList.remove("is-drag-over","drop-before","drop-after","is-dragging"),delete t.dataset.dropPosition})}}document.addEventListener("DOMContentLoaded",()=>{const u=document.querySelector(".ghibli-background");if(u&&!u.style.backgroundImage){const e=document.documentElement.classList.contains("webp-supported");u.style.backgroundImage=e?"url(/wallImage.webp)":"url(/wallImage.png)"}n.init(),new Se});






