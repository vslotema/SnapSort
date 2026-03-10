from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import torch
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SnapSort AI Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
clip_model = None
text_model = None
device = None

class EmbedImageRequest(BaseModel):
    image_path: str

class EmbedTextRequest(BaseModel):
    text: str

class BatchEmbedRequest(BaseModel):
    items: List[dict]  # {type: 'image'|'text', content: str}

class GenerateClusterNameRequest(BaseModel):
    file_names: List[str]

@app.on_event("startup")
async def load_models():
    """Load AI models on startup"""
    global clip_model, text_model, device

    try:
        logger.info("Loading models...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")

        # TODO: Load CLIP for images
        # import open_clip
        # clip_model, _, preprocess = open_clip.create_model_and_transforms(
        #     'ViT-B-32', pretrained='laion2b_s34b_b79k'
        # )
        # clip_model = clip_model.to(device)

        # TODO: Load Sentence Transformer for text
        # from sentence_transformers import SentenceTransformer
        # text_model = SentenceTransformer('all-MiniLM-L6-v2')
        # text_model = text_model.to(device)

        logger.info("Models loaded successfully (stub mode)")
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        raise

@app.get("/")
async def root():
    return {
        "service": "SnapSort AI Service",
        "status": "running",
        "device": device,
        "mode": "stub"  # Will be "production" when models loaded
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": clip_model is not None or text_model is not None,
        "device": device
    }

@app.post("/embed/image")
async def embed_image(request: EmbedImageRequest):
    """Generate embedding for image"""
    try:
        # TODO: Implement CLIP embedding
        # For now, return mock embedding
        import numpy as np
        mock_embedding = np.random.rand(512).tolist()

        return {
            "success": True,
            "embedding": mock_embedding,
            "model": "CLIP-ViT-B-32",
            "dimension": len(mock_embedding)
        }
    except Exception as e:
        logger.error(f"Error embedding image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/text")
async def embed_text(request: EmbedTextRequest):
    """Generate embedding for text"""
    try:
        # TODO: Implement text embedding
        # For now, return mock embedding
        import numpy as np
        mock_embedding = np.random.rand(384).tolist()

        return {
            "success": True,
            "embedding": mock_embedding,
            "model": "all-MiniLM-L6-v2",
            "dimension": len(mock_embedding)
        }
    except Exception as e:
        logger.error(f"Error embedding text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/batch")
async def embed_batch(request: BatchEmbedRequest):
    """Batch embedding for mixed content types"""
    try:
        results = []

        for item in request.items:
            if item['type'] == 'image':
                embedding = await embed_image(EmbedImageRequest(image_path=item['content']))
            elif item['type'] == 'text':
                embedding = await embed_text(EmbedTextRequest(text=item['content']))
            else:
                raise ValueError(f"Unknown type: {item['type']}")

            results.append({
                "type": item['type'],
                "embedding": embedding['embedding'],
                "model": embedding['model']
            })

        return {
            "success": True,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-cluster-name")
async def generate_cluster_name(request: GenerateClusterNameRequest):
    """Generate a descriptive name for a cluster based on file names"""
    try:
        # TODO: Use LLM to generate better names
        # For now, use simple heuristics

        file_names = request.file_names
        if not file_names:
            return {"success": True, "cluster_name": "Misc"}

        # Extract file extensions
        extensions = set()
        for name in file_names:
            if '.' in name:
                ext = name.split('.')[-1].lower()
                extensions.add(ext)

        # Try to identify common patterns
        name_lower = ' '.join(file_names).lower()

        # Check for common themes
        if any(ext in ['jpg', 'jpeg', 'png', 'gif', 'heic', 'raw'] for ext in extensions):
            if 'vacation' in name_lower or 'trip' in name_lower:
                return {"success": True, "cluster_name": "Vacation Photos"}
            elif 'screenshot' in name_lower or 'screen' in name_lower:
                return {"success": True, "cluster_name": "Screenshots"}
            elif 'portrait' in name_lower or 'selfie' in name_lower:
                return {"success": True, "cluster_name": "Portraits"}
            else:
                return {"success": True, "cluster_name": "Photos"}

        elif any(ext in ['mp4', 'mov', 'avi', 'mkv'] for ext in extensions):
            return {"success": True, "cluster_name": "Videos"}

        elif any(ext in ['mp3', 'wav', 'flac', 'm4a'] for ext in extensions):
            return {"success": True, "cluster_name": "Audio Files"}

        elif any(ext in ['pdf', 'doc', 'docx', 'txt'] for ext in extensions):
            if 'invoice' in name_lower or 'receipt' in name_lower:
                return {"success": True, "cluster_name": "Documents - Invoices"}
            elif 'report' in name_lower:
                return {"success": True, "cluster_name": "Documents - Reports"}
            else:
                return {"success": True, "cluster_name": "Documents"}

        elif any(ext in ['zip', 'rar', '7z', 'tar', 'gz'] for ext in extensions):
            return {"success": True, "cluster_name": "Archives"}

        elif any(ext in ['csv', 'xlsx', 'xls'] for ext in extensions):
            return {"success": True, "cluster_name": "Spreadsheets"}

        else:
            # Default to extension-based naming
            if len(extensions) == 1:
                ext = list(extensions)[0]
                return {"success": True, "cluster_name": f"{ext.upper()} Files"}
            else:
                return {"success": True, "cluster_name": "Mixed Files"}

    except Exception as e:
        logger.error(f"Error generating cluster name: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
