# MeCollage - AI-Powered Image Collage Maker

MeCollage is a browser-based collage tool that lets anyone create multi-photo layouts in minutes. It supports AI-enhanced template recommendations, fine-grained controls, and a mobile-friendly editing flow with no install required.

## Highlights

- Unlimited uploads: manage 20+ images per project with drag-and-drop sorting and quick reorder arrows.
- Smart layout system: browse horizontal, vertical, featured, and 40+ grid templates, including AI recommendations based on your photo count.
- Theme spotlight: curated holiday, commerce, travel, photography, social, and family collections with localized descriptions.
- Custom grids: build layouts up to 30x30 with adjustable spacing, borders, and background colors.
- Filters per image or all images: quick presets, manual sliders (brightness, contrast, saturation, warmth, blur), and scope-aware reset.
- Text and stickers: freeform drag positioning, live size/color controls, and Enter-to-add shortcuts optimized for mobile and desktop.
- Multilingual UI: English, Simplified Chinese, and Spanish with instant switching via dropdown.
- High-fidelity export: canvas-based renderer preserves filters, decorations, and layout in PNG or JPG output.
- Favicon bundle: pre-configured icons for desktop, iOS, and Android launchers.

## Getting Started

```bash
npm install
npm run dev
```

The development server runs on `http://localhost:3000` (configure via your bundler if different).

### Build & Preview

```bash
npm run build
npm run preview
```

Deploy the generated `dist` folder (or your configured output directory) to any static hosting platform.

## Usage Workflow

1. Upload images via drag-and-drop or the Select Photos button (supports batch uploads).
2. Pick a template from AI recommendations, categories, or themes; reorder images as needed.
3. Customize spacing, borders, background, filters, and add text/stickers with drag positioning.
4. Export the collage as PNG or JPG; filters and decorations are rendered directly on canvas.

## Keyboard & Accessibility

- Enter in the text overlay field adds a new text element immediately.
- Drag handles and arrow buttons allow reordering without relying solely on drag-and-drop.
- Language dropdown provides screen-reader labels; filter scope buttons include ARIA descriptions.

## Browser Support

- Chrome (latest)
- Edge (latest)
- Firefox (latest)
- Safari (latest)

### 🔗 Live Preview
The project demo is deployed and available at:

https://www.mecollage.top/

## License

MIT

