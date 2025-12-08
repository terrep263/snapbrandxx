# SnapBrandXX Ops

Internal bulk image watermarking tool for processing Fiverr and Etsy orders quickly and consistently.

## Project Structure

```
snapbrandxx-ops/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx             # Main application page (single route)
│   │   └── globals.css          # Global styles with Tailwind
│   ├── components/
│   │   ├── OrderPanel.tsx       # Client name, order ID, notes input
│   │   ├── UploadPanel.tsx      # Drag-and-drop image upload
│   │   ├── PreviewGrid.tsx      # Watermarked image preview grid
│   │   ├── WatermarkSettingsPanel.tsx  # All watermark controls
│   │   └── PresetsPanel.tsx     # Save/load watermark presets
│   └── lib/
│       ├── watermarkEngine.ts   # Core watermark rendering engine (canvas-based)
│       └── presets.ts           # localStorage preset management
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Key Features

- **Bulk Image Upload**: Drag-and-drop or file picker for multiple JPG/PNG files
- **Real-time Preview**: Canvas-generated previews with watermark applied
- **Flexible Watermarking**: Text only, logo only, or text + logo combinations
- **Full Resolution Export**: Generate watermarked images at original resolution
- **ZIP Export**: Download all processed images as a single ZIP file
- **Client Presets**: Save and load watermark configurations per client
- **Client-side Processing**: All processing happens in the browser (no server uploads)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage Workflow

1. **Enter Order Info**: Fill in Client Name and Order ID in the left panel
2. **Upload Images**: Drag and drop or select multiple JPG/PNG images
3. **Configure Watermark**: Adjust text, font, size, opacity, position, and logo in the right panel
4. **Preview**: See real-time previews in the center grid
5. **Generate**: Click "Generate Watermarked Images" to process at full resolution
6. **Export**: Download individual images or all as ZIP

## Watermark Engine

The core watermarking logic lives in `src/lib/watermarkEngine.ts`. It uses HTML5 Canvas to:
- Load source images
- Calculate watermark positions based on corner/center + margins
- Apply text with outline for visibility
- Overlay logo images with proper scaling
- Export as Blob (for ZIP) or data URL (for previews)

## Presets

Presets are stored in browser localStorage. Each preset saves:
- Mode (text/logo/text+logo)
- Text content
- Font family and size
- Opacity
- Position and margins
- Logo image (stored as data URL)

## Performance Notes

- Preview generation uses 30% scale for performance
- Full-resolution processing happens on-demand
- Sequential processing with event loop yielding keeps UI responsive
- Warning shown if loading >500 images (recommend splitting batches)

## Future: Electron Wrapper

This codebase is designed to be wrapped in Electron later for a downloadable Windows .exe. All core logic is client-side and framework-agnostic where possible.

## License

Internal tool - not for public distribution.

