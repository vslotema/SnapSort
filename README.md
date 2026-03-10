# SnapSort

**AI-powered file organizer with non-destructive preview**

SnapSort intelligently organizes your files by analyzing content with AI, while giving you full control through a preview-before-apply workflow. Unlike traditional file organizers, SnapSort shows you exactly what will happen before touching your files.

## Key Features

- **🔍 Smart File Analysis** - Plugin-based extractors for images, text, PDFs, CSVs, and more
- **🤖 AI-Powered Organization** - CLIP embeddings for images, Sentence Transformers for text
- **👀 Non-Destructive Preview** - Review all changes before applying to filesystem
- **🎯 File-Type Agnostic** - Designed to handle any file type through modular extractors
- **💻 Local-First** - All processing happens on your machine
- **🔄 Rollback Support** - Undo applied changes if needed

## Architecture

```
SnapSort/
├── app/
│   ├── main/                   # Electron main process
│   │   ├── index.js            # Main entry point + IPC handlers
│   │   ├── preload.js          # Secure IPC bridge
│   │   ├── extractors/         # Plugin-based content extractors
│   │   │   ├── ImageExtractor.js
│   │   │   ├── TextExtractor.js
│   │   │   └── [Add your own!]
│   │   ├── scanner/            # File system scanner
│   │   │   └── FileScanner.js
│   │   ├── engine/             # Organization engine
│   │   │   └── OrganizationEngine.js
│   │   └── apply/              # Filesystem committer
│   │       └── FileSystemCommitter.js
│   │
│   └── renderer/               # Vue 3 frontend
│       ├── src/
│       │   ├── App.vue
│       │   ├── components/
│       │   └── stores/
│       └── index.html
│
├── ai-service/                 # Python AI backend
│   ├── main.py                 # FastAPI server
│   ├── extractors/             # Python extractors (PDF, etc.)
│   └── models/                 # Model cache
│
└── shared/
    └── types/                  # Shared type definitions
```

## How It Works

### 1. Scan Phase
```javascript
// Select root folder
const folder = await window.snapSortAPI.selectFolder();

// Recursively scan all files/folders
await window.snapSortAPI.scanFolder(folder);
```

### 2. Extract Phase
```javascript
// Extract content using plugin-based extractors
const extracted = await extractorRegistry.extract(
  filePath,
  mimeType,
  fileId
);

// Extractors return:
// - Images → buffer for CLIP
// - Text → raw string
// - PDFs → text/OCR (future)
// - CSVs → summary (future)
```

### 3. AI Analysis Phase
```javascript
// Generate embeddings via Python AI service
const embedding = await window.snapSortAPI.embedFile(
  fileId,
  content,
  type
);

// Compare similarities, suggest organization
```

### 4. Preview Phase
```javascript
// Add actions to preview (NOT filesystem yet!)
await window.snapSortAPI.addAction({
  type: 'move',
  fileId: 'abc123',
  params: {
    originalPath: '/old/path/file.txt',
    newPath: '/new/folder/file.txt'
  }
});

// Review in dashboard, make adjustments
```

### 5. Apply Phase
```javascript
// User confirms → apply to filesystem
const result = await window.snapSortAPI.applyChanges();

// Or rollback if needed
await window.snapSortAPI.rollbackChanges(5); // undo last 5 actions
```

## Installation

### Prerequisites
- Node.js 16+ & npm
- Python 3.8+

### Setup

```bash
cd SnapSort

# Install Node dependencies
npm install

# Install Python dependencies
cd ai-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cd ..
```

## Running SnapSort

### Development Mode

**Terminal 1 - Python AI Service:**
```bash
cd ai-service
source venv/bin/activate
python main.py
```

AI service runs on http://localhost:8000

**Terminal 2 - Electron App:**
```bash
NODE_ENV=development npm run electron:dev
```

This starts both Vite dev server (http://localhost:5173) and Electron window.

## Adding New File Type Extractors

SnapSort uses a plugin-based extractor system. Here's how to add support for PDFs:

### 1. Create Extractor

```javascript
// app/main/extractors/PDFExtractor.js
const BaseExtractor = require('./BaseExtractor');
const pdf = require('pdf-parse');
const fs = require('fs').promises;

class PDFExtractor extends BaseExtractor {
  constructor() {
    super('PDFExtractor');
    this.supportedMimeTypes = ['application/pdf'];
  }

  supports(mimeType) {
    return mimeType === 'application/pdf';
  }

  async extractContent(filePath, fileId) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    return {
      fileId,
      type: 'pdf',
      content: data.text,  // Extracted text
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    };
  }
}

module.exports = PDFExtractor;
```

### 2. Register Extractor

```javascript
// app/main/extractors/index.js
const PDFExtractor = require('./PDFExtractor');

class ExtractorRegistry {
  _registerDefaultExtractors() {
    this.register(new ImageExtractor());
    this.register(new TextExtractor());
    this.register(new PDFExtractor());  // ← Add here
  }
}
```

Done! SnapSort will now extract text from PDFs automatically.

## Organization Action Types

SnapSort supports these preview actions:

| Action | Description | Example |
|--------|-------------|---------|
| `move` | Move file/folder | Move vacation.jpg to Photos/2024/ |
| `rename` | Rename file/folder | Rename IMG_001.jpg to beach.jpg |
| `delete` | Mark for deletion | Delete duplicate.jpg |
| `create_folder` | Create new folder | Create Projects/AI/ |
| `merge` | Merge folders | Merge Screenshots/ into Images/ |

## API Reference

### Electron IPC API

```javascript
// Available via window.snapSortAPI in renderer

// Folder operations
selectFolder(): Promise<string|null>
scanFolder(path: string): Promise<ScanResult>

// Preview state
getPreviewState(): Promise<PreviewState>

// Actions
addAction(action: OrganizationAction): Promise<void>
removeAction(actionId: string): Promise<void>
resetActions(): Promise<void>

// Apply/Rollback
applyChanges(): Promise<ApplyResult>
rollbackChanges(count?: number): Promise<RollbackResult>

// Event listeners
onScanProgress(callback: (data) => void): void
onExtractProgress(callback: (data) => void): void
onApplyProgress(callback: (data) => void): void
```

### Python AI Service API

```bash
# Health check
GET http://localhost:8000/health

# Embed image
POST http://localhost:8000/embed/image
{
  "image_path": "/path/to/image.jpg"
}

# Embed text
POST http://localhost:8000/embed/text
{
  "text": "Project proposal document"
}

# Batch embedding
POST http://localhost:8000/embed/batch
{
  "items": [
    {"type": "image", "content": "/path/to/img.jpg"},
    {"type": "text", "content": "README content..."}
  ]
}
```

## Configuration

### Supported MIME Types (Default)

**Images:**
- image/jpeg, image/png, image/gif, image/webp, image/heic

**Text:**
- text/plain, text/markdown, text/html, text/csv
- application/json, application/javascript

### Future Extractors (Planned)

- ✅ Images (CLIP)
- ✅ Text (SentenceTransformers)
- ⏳ PDF (text + OCR)
- ⏳ CSV (structure analysis)
- ⏳ Audio (metadata + transcription)
- ⏳ Video (frame analysis + metadata)

## Development

### Project Structure

- `app/main/` - Electron main process (Node.js)
- `app/renderer/` - Vue 3 frontend
- `ai-service/` - Python FastAPI backend
- `shared/` - Shared types/utilities

### Key Classes

**FileScanner**
- Recursively scans folder structure
- Generates unique IDs (SHA-256)
- Detects MIME types

**OrganizationEngine**
- Manages preview state vs. original filesystem
- Stores pending actions
- Applies actions to preview tree (not disk!)

**FileSystemCommitter**
- Executes actions on actual filesystem
- Rollback capability
- Transaction-like safety

**ExtractorRegistry**
- Plugin manager for file extractors
- Routes files to appropriate extractor
- Extensible for new file types

## Roadmap

### MVP (Current)
- [x] Plugin-based extractors (images, text)
- [x] File scanner with recursive traversal
- [x] Organization engine with preview state
- [x] Vue 3 dashboard (basic)
- [x] Apply/rollback layer
- [ ] AI embeddings (stubbed - needs full implementation)
- [ ] Similarity-based organization

### Phase 2
- [ ] PDF extractor with OCR
- [ ] CSV analyzer
- [ ] Duplicate detection
- [ ] User folder preferences
- [ ] Clustering for unassigned files
- [ ] Search & filter

### Phase 3
- [ ] Batch processing optimizations
- [ ] Cloud sync (optional)
- [ ] Multi-user support
- [ ] Advanced AI features

## Troubleshooting

### Electron won't start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Python AI service fails
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### File scanning is slow
- Scanning 10,000+ files may take time
- Progress is shown in real-time
- Future: implement progressive scanning

## Contributing

SnapSort is designed for extensibility!

**Easy contributions:**
- Add new file type extractors
- Improve UI components
- Add clustering algorithms
- Enhance preview visualizations

## License

MIT License

---

**Built with**: Electron, Vue 3, Vuetify, Python, FastAPI, CLIP, Sentence Transformers
