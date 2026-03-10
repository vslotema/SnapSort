# SnapSort - Quick Start Guide

## Install Dependencies

### 1. Node.js Dependencies
```bash
cd /Users/vien/PhpstormProjects/SnapSort/SnapSort
npm install
```

### 2. Python Dependencies
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Run the Application

### Terminal 1: Start Python AI Service
```bash
cd /Users/vien/PhpstormProjects/SnapSort/SnapSort/ai-service
source venv/bin/activate
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Loading models...
INFO:     Models loaded successfully (stub mode)
```

### Terminal 2: Start Electron App
```bash
cd /Users/vien/PhpstormProjects/SnapSort/SnapSort
NODE_ENV=development npm run electron:dev
```

The Electron window will open automatically!

## First Use

1. **Select Folder** - Click "Select Folder to Organize"
2. **Wait for Scan** - SnapSort will recursively scan all files
3. **Review Structure** - See your files in the left panel
4. **Make Changes** - Add organization actions in the right panel
5. **Apply** - Click "Apply Changes" when ready

## What's Working Now

✅ Folder selection & scanning
✅ File tree building
✅ Plugin-based extractors (images, text)
✅ Preview state management
✅ Action system (move, rename, delete, etc.)
✅ Apply/rollback to filesystem
⚠️ AI embeddings (stub mode - returns mock data)

## Next Steps to Complete MVP

1. **Enable Real AI Embeddings**
   - Uncomment model loading in `ai-service/main.py`
   - First run will download models (~500MB for CLIP)

2. **Build Folder Tree UI**
   - Expand `FolderTreeView.vue` to show actual file tree
   - Add click handlers for file selection

3. **Build File Preview**
   - Show thumbnails for images
   - Show text content preview
   - Display file metadata

4. **Add Organization Logic**
   - Similarity comparison between embeddings
   - Auto-suggest folder assignments
   - Clustering for unassigned files

5. **Polish UI**
   - Drag & drop support
   - Search & filter
   - Better visualizations

## Project Structure

```
SnapSort/
├── app/
│   ├── main/              # Electron backend (complete!)
│   │   ├── index.js       # ← Main process
│   │   ├── extractors/    # ← Plugin system
│   │   ├── scanner/       # ← File scanner
│   │   ├── engine/        # ← Organization engine
│   │   └── apply/         # ← Filesystem committer
│   │
│   └── renderer/          # Vue 3 frontend (basic scaffold)
│       └── src/
│           ├── App.vue
│           ├── components/
│           └── stores/
│
├── ai-service/            # Python AI (stub mode)
│   └── main.py
│
└── shared/
    └── types/             # Shared type definitions
```

## Testing the Core Features

### Test 1: Scan Folder
```javascript
// In Electron DevTools console
const result = await window.snapSortAPI.scanFolder('/path/to/test/folder');
console.log(result);
```

### Test 2: Add Action
```javascript
await window.snapSortAPI.addAction({
  type: 'rename',
  fileId: 'some-file-id',
  params: {
    originalPath: '/old/name.txt',
    newName: 'new-name.txt'
  }
});
```

### Test 3: Get Preview State
```javascript
const state = await window.snapSortAPI.getPreviewState();
console.log('Pending actions:', state.actions.length);
```

### Test 4: Apply Changes
```javascript
const result = await window.snapSortAPI.applyChanges();
console.log('Applied:', result.applied, 'Failed:', result.failed);
```

## Troubleshooting

**Q: Electron window is blank**
A: Check if Vite dev server is running on http://localhost:5173

**Q: "snapSortAPI is not defined"**
A: Check `app/main/preload.js` is loaded correctly

**Q: Python service won't start**
A: Make sure virtual environment is activated and dependencies installed

**Q: Scanning is slow**
A: Normal for large folders. Progress is shown in real-time.

## Development Tips

- **Hot Reload**: Vite handles Vue component hot reload automatically
- **Electron Restart**: After changing main process files, restart Electron
- **Python Reload**: Use `uvicorn main:app --reload` for auto-restart
- **DevTools**: Already open in development mode (F12)

## Adding Your First Feature

Let's add a simple feature to count files by type:

1. **Add to OrganizationEngine:**
```javascript
// app/main/engine/OrganizationEngine.js
getFilesByType() {
  const counts = {};
  for (const [id, node] of this.originalTree) {
    if (node.type === 'file') {
      const ext = node.name.split('.').pop();
      counts[ext] = (counts[ext] || 0) + 1;
    }
  }
  return counts;
}
```

2. **Add IPC Handler:**
```javascript
// app/main/index.js
ipcMain.handle('get-file-counts', async () => {
  return engine.getFilesByType();
});
```

3. **Add to Preload:**
```javascript
// app/main/preload.js
getFileCounts: () => ipcRenderer.invoke('get-file-counts'),
```

4. **Use in Vue:**
```vue
<script setup>
const counts = await window.snapSortAPI.getFileCounts();
console.log('File counts:', counts);
</script>
```

Done! You just extended SnapSort.

---

**Ready to build something amazing!** 🚀
