import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { get, set } from 'idb-keyval';
import { Upload, Image as ImageIcon, Loader2, Download, RefreshCw, Sparkles, X, User, Shirt, Footprints, Palette, Layers, Users, LayoutTemplate, ZoomIn, FolderPlus, Folder } from 'lucide-react';
import { Camera, Eye, MapPin, PersonStanding, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface PhotoItem {
  id: string;
  originalFile: File;
  originalUrl: string;
  enhancedUrl?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isInitial?: boolean;
}

export default function App() {
  const [appMode, setAppMode] = useState<'enhance' | 'colorswap' | 'duo' | 'banners' | 'copywriter' | 'upscale' | 'models_library' | 'collections' | 'lookbook'>('enhance');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [copywriterPhoto, setCopywriterPhoto] = useState<PhotoItem | null>(null);
  const [copywriterMessages, setCopywriterMessages] = useState<ChatMessage[]>([]);
  const [copywriterInput, setCopywriterInput] = useState('');
  const [copywriterContext, setCopywriterContext] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const copyFileInputRef = useRef<HTMLInputElement>(null);
  const [upscalePhoto, setUpscalePhoto] = useState<PhotoItem | null>(null);
  const upscaleInputRef = useRef<HTMLInputElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [libraryModelPrompt, setLibraryModelPrompt] = useState<string>('');
  const [isGeneratingLibraryModel, setIsGeneratingLibraryModel] = useState(false);
  const [generatedLibraryModelUrl, setGeneratedLibraryModelUrl] = useState<string | null>(null);
  const [libraryModelError, setLibraryModelError] = useState<string | undefined>(undefined);
  const [lookbookTopPhoto, setLookbookTopPhoto] = useState<PhotoItem | null>(null);
  const [lookbookBottomPhoto, setLookbookBottomPhoto] = useState<PhotoItem | null>(null);
  const [lookbookScenePhoto, setLookbookScenePhoto] = useState<PhotoItem | null>(null);
  const [enhanceScenePhoto, setEnhanceScenePhoto] = useState<PhotoItem | null>(null);
  const [lookbookPrompt, setLookbookPrompt] = useState('');
  const [lookbookModelId, setLookbookModelId] = useState<string>('random');
  const [lookbookResult, setLookbookResult] = useState<{ url: string; status: 'idle'|'loading'|'success'|'error'; error?: string }>({ status: 'idle', url: '' });
  const lookbookTopInputRef = useRef<HTMLInputElement>(null);
  const lookbookBottomInputRef = useRef<HTMLInputElement>(null);
  const lookbookSceneInputRef = useRef<HTMLInputElement>(null);
  const enhanceSceneInputRef = useRef<HTMLInputElement>(null);
  const [uploadedModelFile, setUploadedModelFile] = useState<{file: File, url: string} | null>(null);
  const [uploadedModelAnalysis, setUploadedModelAnalysis] = useState<{description: string, suggestedName: string} | null>(null);
  const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
  const [modelNameInput, setModelNameInput] = useState('');
  const uploadModelInputRef = useRef<HTMLInputElement>(null);
  const [generationStyle, setGenerationStyle] = useState<'product' | 'model'>('product');
  const [productPresentation, setProductPresentation] = useState<'ghost' | 'flatlay' | 'hanger' | 'folded' | 'original' | 'flat_unfolded' | 'flatlay_colored_table'>('ghost');
  const [modelGender, setModelGender] = useState<'male' | 'female'>('male');
  const [modelAesthetic, setModelAesthetic] = useState<'casual' | 'chic' | 'street' | 'elegant' | 'elegant_sport' | 'sporty'>('casual');
  const [modelBackground, setModelBackground] = useState<'studio' | 'urban' | 'nature' | 'interior'>('studio');
  const [foldedBackground, setFoldedBackground] = useState<'wood' | 'marble' | 'white_table' | 'concrete'>('wood');
  const [hangerBackground, setHangerBackground] = useState<'rustic' | 'studio' | 'closet'>('rustic');
  const [bgType, setBgType] = useState<'scene' | 'solid'>('scene');
  const [solidBgColor, setSolidBgColor] = useState<string>('#e5e7eb');
  const [modelPose, setModelPose] = useState<'standing' | 'walking' | 'running' | 'editorial' | 'sitting' | 'leaning' | 'arms_crossed' | 'relaxed' | 'pockets' | 'stretching' | 'hand_on_hip' | 'action' | 'back_facing'>('standing');
  const [modelGaze, setModelGaze] = useState<'camera' | 'away'>('camera');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [imageResolution, setImageResolution] = useState<'1K' | '2K'>('1K');
  
  const [savedModels, setSavedModels] = useState<{id: string, originalFile: File, originalUrl: string, name?: string, description?: string}[]>([]);
  
  useEffect(() => {
    get('vura_saved_models').then((data) => {
       if (data && Array.isArray(data)) {
          const restored = data.map((item: any) => ({
             id: item.id,
             originalFile: item.file,
             originalUrl: URL.createObjectURL(item.file),
             name: item.name,
             description: item.description
          }));
          setSavedModels(restored);
       }
    }).catch(err => console.error("Error loading models from IDB", err));
  }, []);

  const updateSavedModels = (updater: any) => {
     setSavedModels(prev => {
        const updated = typeof updater === 'function' ? updater(prev) : updater;
        const toSave = updated.map((m: any) => ({ id: m.id, file: m.originalFile, name: m.name, description: m.description }));
        set('vura_saved_models', toSave).catch(err => console.error("Error saving models to IDB", err));
        return updated;
     });
  };

  // Collections State
  interface CollectionItem {
    id: string;
    url: string;
    createdAt: number;
  }
  interface Collection {
    id: string;
    name: string;
    images: CollectionItem[];
  }
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [imageToAdd, setImageToAdd] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  useEffect(() => {
    get('vura_collections').then((data) => {
       if (data && Array.isArray(data)) {
          setCollections(data);
       }
    }).catch(err => console.error("Error loading collections", err));
  }, []);

  const updateCollections = (updater: any) => {
     setCollections(prev => {
        const updated = typeof updater === 'function' ? updater(prev) : updater;
        set('vura_collections', updated).catch(err => console.error("Error saving collections", err));
        return updated;
     });
  };

  const openAddCollectionModal = (imageUrl: string) => {
    setImageToAdd(imageUrl);
    setIsAddCollectionModalOpen(true);
    setNewCollectionName('');
    setSelectedCollectionId(collections.length > 0 ? collections[0].id : '');
  };

  const closeAddCollectionModal = () => {
    setIsAddCollectionModalOpen(false);
    setImageToAdd(null);
  };

  const handleAddToCollection = () => {
    if (!imageToAdd) return;
    
    let targetCollectionId = selectedCollectionId;
    const imageInfo = {
       id: Math.random().toString(36).substring(7),
       url: imageToAdd,
       createdAt: Date.now()
    };

    if (newCollectionName.trim()) {
      const newId = Math.random().toString(36).substring(7);
      updateCollections((prev: Collection[]) => [...prev, {
         id: newId,
         name: newCollectionName.trim(),
         images: [imageInfo]
      }]);
    } else if (targetCollectionId) {
       updateCollections((prev: Collection[]) => prev.map(c => 
          c.id === targetCollectionId ? { ...c, images: [...c.images, imageInfo] } : c
       ));
    }
    closeAddCollectionModal();
  };

  const [selectedModelId, setSelectedModelId] = useState<string | 'random'>('random');
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  
  const [productType, setProductType] = useState<'clothing' | 'sneakers'>('clothing');
  const [userInstructions, setUserInstructions] = useState<string>('');
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('vura_custom_api_key') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKeyAndCreateModel = async () => {
    let currentApiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) throw new Error('No API key available. Please enter a valid API Key.');
    return new GoogleGenAI({ apiKey: currentApiKey });
  };

  const generateImageHelper = async (contentsValidation: any) => {
    const currentAi = await checkApiKeyAndCreateModel();
    const modelToUse = imageResolution === '2K' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
    const config: any = {
       imageConfig: { aspectRatio: imageAspectRatio }
    };
    if (imageResolution === '2K') {
       config.imageConfig.imageSize = '2K';
    }
    
    const response = await currentAi.models.generateContent({
      model: modelToUse,
      contents: contentsValidation,
      config: config
    });
    
    let generatedUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }
    return generatedUrl;
  };

  // Color Swap State
  const [baseColorImage, setBaseColorImage] = useState<PhotoItem | null>(null);
  const [colorReferences, setColorReferences] = useState<PhotoItem[]>([]);
  const baseInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Duo Mode State
  const [duoImage1, setDuoImage1] = useState<PhotoItem | null>(null);
  const [duoImage2, setDuoImage2] = useState<PhotoItem | null>(null);
  const [duoModel1, setDuoModel1] = useState<'male' | 'female'>('male');
  const [duoModel2, setDuoModel2] = useState<'male' | 'female'>('female');
  const [duoPose, setDuoPose] = useState<'together' | 'walking' | 'back_to_back' | 'editorial'>('together');
  const [duoResult, setDuoResult] = useState<{ url: string; status: 'idle'|'loading'|'success'|'error'; error?: string }>({ status: 'idle', url: '' });
  const duoInput1Ref = useRef<HTMLInputElement>(null);
  const duoInput2Ref = useRef<HTMLInputElement>(null);

  // Banners Mode State
  const [bannerProduct, setBannerProduct] = useState<PhotoItem | null>(null);
  const [bannerTheme, setBannerTheme] = useState<'deportivo' | 'urbano' | 'elegante' | 'sneakers' | 'smart_casual' | 'mix'>('deportivo');
  const [bannerOrientation, setBannerOrientation] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [bannerBgType, setBannerBgType] = useState<'dynamic' | 'solid'>('dynamic');
  const [bannerSolidBgColor, setBannerSolidBgColor] = useState<string>('#ffffff');
  const [bannerResult, setBannerResult] = useState<{ url: string; status: 'idle'|'loading'|'success'|'error'; error?: string }>({ status: 'idle', url: '' });
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const pastedFiles = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));
        if (pastedFiles.length > 0) {
          const newPhotos = pastedFiles.map((file: File) => ({
            id: Math.random().toString(36).substring(7),
            originalFile: file,
            originalUrl: URL.createObjectURL(file),
            status: 'idle' as const,
          }));
          if (appMode === 'enhance') {
            setPhotos(prev => [...prev, ...newPhotos]);
          } else if (appMode === 'models_library') {
            analyzeUploadedModel(pastedFiles[0]);
          } else if (appMode === 'color') {
            setColorReferences(prev => [...prev, ...newPhotos]);
          } else if (appMode === 'duo') {
            setDuoInputPhoto(newPhotos[0]);
          } else if (appMode === 'banner') {
            setBannerInputPhoto(newPhotos[0]);
          } else if (appMode === 'upscale') {
            setUpscalePhoto(newPhotos[0]);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [appMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle' as const,
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newPhotos = Array.from(e.dataTransfer.files)
        .filter((file: File) => file.type.startsWith('image/'))
        .map((file: File) => ({
          id: Math.random().toString(36).substring(7),
          originalFile: file,
          originalUrl: URL.createObjectURL(file),
          status: 'idle' as const,
        }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handleCopywriterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCopywriterPhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const handleLookbookTopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLookbookTopPhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const handleLookbookBottomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLookbookBottomPhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const handleLookbookSceneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLookbookScenePhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const handleEnhanceSceneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setEnhanceScenePhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const handleUpscaleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUpscalePhoto({
        id: Math.random().toString(36).substring(7),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'idle',
      });
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, part
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    });
  };

  const getStylePrompt = () => {
    let stylePrompt = '';
    const solidOverride = bgType === 'solid' ? `CRITICAL BACKGROUND OVERRIDE: The background MUST be a pure, strictly monochromatic solid color described by the hex code ${solidBgColor}. Do not add any gradients, textures, or real-world background elements. Just a pristine, solid ${solidBgColor} backdrop.` : '';

    if (generationStyle === 'product') {
      let presentationText = '';
      let backgroundPrompt = '';
      
      if (productType === 'clothing') {
        if (productPresentation === 'ghost') {
            presentationText = 'The item should have a premium "ghost mannequin" effect, looking full and 3-dimensional.';
            backgroundPrompt = 'Use a clean, solid white studio background with a subtle drop shadow.';
        }
        if (productPresentation === 'flatlay') {
            presentationText = 'The item should be beautifully and naturally folded or styled flat on a surface from a top-down perspective (aesthetic flat lay).';
            backgroundPrompt = 'Use a highly aesthetic, premium textured background like concrete, stone, or a minimalist wooden floor. Use moody, realistic natural lighting with soft shadows, not clinical studio lighting.';
        }
        if (productPresentation === 'hanger') {
            presentationText = 'The item MUST be hanging naturally on a real, visible physical hanger (e.g. wooden or metal). CRITICAL: NO 3D renders, NO "ghost mannequin" effect. The garment must look like a real, physical object suspended on a real hanger, keeping its true shape.';
            if (bgType === 'scene') {
                if (hangerBackground === 'rustic') backgroundPrompt = 'The background should be a realistic, textured rustic wall (like raw concrete, plaster, or exposed brick). Add realistic soft shadows cast by the garment onto the wall. Make it look like a highly stylized indie fashion brand photo, not a clinical studio shot.';
                if (hangerBackground === 'studio') backgroundPrompt = 'The background should be a clean, minimalist photography studio paper backdrop with soft, professional rim lighting and a subtle drop shadow from the garment on the wall.';
                if (hangerBackground === 'closet') backgroundPrompt = 'The background should be a luxurious, modern walk-in closet or high-end boutique interior, with clothing racks slightly out of focus in the background to provide a premium retail context.';
            }
        }
        if (productPresentation === 'folded') {
            presentationText = 'The item should be beautifully and neatly folded, laid flat on a tabletop surface from a top-down perspective.';
            if (bgType === 'scene') {
                if (foldedBackground === 'wood') backgroundPrompt = 'The background MUST be a premium, realistic wooden tabletop surface with soft natural lighting.';
                if (foldedBackground === 'marble') backgroundPrompt = 'The background MUST be a luxurious, clean white marble tabletop surface with soft studio lighting.';
                if (foldedBackground === 'white_table') backgroundPrompt = 'The background MUST be a pristine matte white tabletop surface. Minimalist and clean aesthetic.';
                if (foldedBackground === 'concrete') backgroundPrompt = 'The background MUST be a modern minimalist textured concrete tabletop surface. Moody, aesthetic natural light.';
            }
        }
        if (productPresentation === 'flat_unfolded') {
            presentationText = 'The garment MUST be laid completely flat and fully extended from a direct top-down perspective. CRITICAL: DO NOT fold the garment. Show its complete, natural full shape spread out cleanly, perfectly ironed with no messy wrinkles. Like a technical flat lay, but photorealistic.';
            if (bgType === 'scene') {
                backgroundPrompt = 'Use a clean, perfectly flat surface with even, soft studio lighting to eliminate harsh shadows. The surface should be minimal and distraction-free.';
            }
        }
        if (productPresentation === 'flatlay_colored_table') {
            presentationText = 'The item MUST be completely laid flat on a tabletop, beautifully ironed and steamed with perfectly smooth fabric and NO messy wrinkles. CRITICAL: Use strictly direct top-down overhead zenithal lighting perfectly centered above the garment to absolutely eliminate any weird long shadows on the sleeves or body (extremely important for short-sleeve t-shirts). It must look pristine, perfectly flat, and highly professional.';
            if (bgType === 'scene') {
                backgroundPrompt = 'The table surface should be a pristine flat surface with very soft, diffused, perfectly centered overhead zenithal lighting to prevent harsh shadows from sleeves.';
            } else {
                backgroundPrompt = `CRITICAL OVERRIDE: The table MUST be a pure, strictly flat, monochromatic solid color using the hex code ${solidBgColor}. Pure flat color tabletop ${solidBgColor} with perfectly centered overhead top-down zenithal lighting.`;
            }
        }
        if (productPresentation === 'original') {
            presentationText = 'Keep the EXACT same layout, arrangement, folds, and visual shape of the garment as seen in the original image. However, PERFECTLY IRON and STEAM the garment to remove all messy or excessive wrinkles, crinkles, and shadows. It should look brand new, smooth, and professionally prepared while maintaining its exact original pose/flat lay composition.';
            if (bgType === 'scene') {
                backgroundPrompt = 'Maintain a high-quality, aesthetic version of the original surface/background.';
            }
        }
      } else {
        if (productPresentation === 'ghost') {
             presentationText = 'The sneakers should be neatly arranged in a premium 3D studio product shot.';
             backgroundPrompt = 'Use a clean, solid white studio background with a subtle drop shadow.';
        }
        if (productPresentation === 'flatlay') {
             presentationText = 'The sneakers should be arranged flat on a surface from a top-down perspective (aesthetic flat lay).';
             backgroundPrompt = 'Use a highly aesthetic, premium textured background like concrete, street tarmac, or stone. Use moody, realistic natural lighting with soft shadows.';
        }
        if (productPresentation === 'hanger') {
             presentationText = 'The sneakers should be floating dynamically in mid-air.';
             backgroundPrompt = 'The background should be a realistic, textured urban or rustic wall. Add realistic soft light and shadow play.';
        }
      }

      if (bgType === 'solid') {
          backgroundPrompt = `Use a clean, pure solid ${solidBgColor} background. Replace any textured or real-world background with this exact solid color. Add a subtle, realistic drop shadow under the item.`;
      }

      stylePrompt = productType === 'clothing'
        ? `Step 2: Generate a highly realistic, professional e-commerce product photo. ${presentationText} ${backgroundPrompt} Use lighting that does not alter the garment's true color. Extremely sharp focus on the fabric texture. ${solidOverride}`
        : `Step 2: Generate a highly realistic, professional e-commerce product photo. ${presentationText} ${backgroundPrompt} Use lighting that does not alter the item's true color. Extremely sharp focus on the material texture. ${solidOverride}`;
    } else {
      let poseText = '';
      if (modelPose === 'standing') poseText = 'standing in a natural relaxed posture';
      if (modelPose === 'walking') poseText = 'captured mid-stride walking confidently';
      if (modelPose === 'running') poseText = 'captured mid-stride running athletically, like a high-end sports brand campaign';
      if (modelPose === 'editorial') poseText = 'striking a sophisticated, high-fashion editorial pose without looking unnatural or exaggerated';
      if (modelPose === 'sitting') poseText = 'sitting naturally on a modern minimalist chair or stool';
      if (modelPose === 'leaning') poseText = 'casually leaning back against a wall or flat surface';
      if (modelPose === 'arms_crossed') poseText = 'standing confidently with arms crossed over the chest';
      if (modelPose === 'relaxed') poseText = 'in a very relaxed pose, hands resting behind the head or neck';
      if (modelPose === 'pockets') poseText = 'standing casually with hands tucked loosely into the front pockets or hoodie pouch';
      if (modelPose === 'stretching') poseText = 'in an active athletic pose, doing a dynamic fitness stretch or warm-up';
      if (modelPose === 'hand_on_hip') poseText = 'standing confidently with one hand resting delicately on the hip, stylish and classic posture';
      if (modelPose === 'action') poseText = 'captured mid-action in an intense, explosive sports or fitness movement';
      if (modelPose === 'back_facing') poseText = 'standing with their back turned towards the camera, looking away, to clearly show the back design of the garment';

      let gazeText = '';
      if (modelGaze === 'camera') gazeText = 'looking directly at the camera with a confident expression';
      if (modelGaze === 'away') gazeText = 'looking away from the camera, candid and natural';

      let backgroundText = '';
      if (bgType === 'solid') {
         backgroundText = `pure solid ${solidBgColor} color background, clean minimal studio setup`;
      } else if (bgType === 'scene' && enhanceScenePhoto) {
         backgroundText = `the precise physical environment from the uploaded reference scene image`;
      } else {
         if (modelBackground === 'studio') backgroundText = 'clean minimalist photography studio background, seamless paper';
         if (modelBackground === 'urban') backgroundText = 'modern urban street environment, city aesthetics';
         if (modelBackground === 'nature') backgroundText = 'natural outdoor environment, soft sunlight';
         if (modelBackground === 'interior') backgroundText = 'luxurious high-end modern interior architecture';
      }

      let aestheticText = '';
      if (modelAesthetic === 'casual') aestheticText = 'Casual Everyday style. Pair with unobtrusive modern jeans or chinos. DO NOT TUCK IN THE TOP. The garment must be completely untucked, falling naturally.';
      if (modelAesthetic === 'chic') aestheticText = 'Chic Smart-Casual style. Pair with stylish everyday trousers, a nice skirt, or premium denim. The perfect balance between elegant and everyday wear. The garment must fall naturally.';
      if (modelAesthetic === 'street') aestheticText = 'Edgy Street-Style. Pair with trendy, generic urban streetwear pants. The top should be worn loose and naturally.';
      if (modelAesthetic === 'elegant') aestheticText = 'Modern Elegant style. Pair with tailored trousers or a sophisticated skirt. CRITICAL: DO NOT TUCK IN THE TOP. The garment must be completely untucked, falling naturally outside the pants with a young modern aesthetic - do NOT make the styling look outdated.';
      if (modelAesthetic === 'elegant_sport') aestheticText = 'Smart Casual / Elegant Sport style. CRITICAL: Pair with classic chino pants (gabardine) and clean white sneakers. CRITICAL STYLING RULE: THE SHIRT/TOP MUST BE COMPLETELY UNTUCKED (worn fully outside the pants). DO NOT TUCK IT IN UNDER ANY CIRCUMSTANCES. If it is a button-up shirt, it should be buttoned up but worn untucked. This is a very common, modern "Elegante Sport" look.';
      if (modelAesthetic === 'sporty') aestheticText = 'Athleisure Sporty style. Pair with sleek athletic wear or joggers. Modern athletic fit.';

      let modelSubject = `A young ${modelGender} model`;
      if (generationStyle === 'model' && selectedModelId !== 'random') {
          modelSubject = `The EXTREMELY SPECIFIC REFERENCE PERSON shown in the second image`;
      }

      stylePrompt = productType === 'clothing'
        ? `Step 2: Generate a high-quality lifestyle photo. ${modelSubject} ${poseText}, ${gazeText}, wearing EXACTLY this garment. CRITICAL STYLING RULE: DO NOT add any vests, jackets, coats, or extra layers on top of the provided garment. The garment from the image must be the absolute protagonist. MODESTY RULE (CRITICAL): The model MUST be fully clothed. If the provided garment is pants/bottoms, the model MUST wear a complementary, unobtrusive shirt/top. UNDER NO CIRCUMSTANCES should the model be shirtless. If the garment is a top, pair with simple bottoms. ${aestheticText} The focus must be on the garment, showing a mid-shot or torso crop, DO NOT show the full body. Step 3: Context: ${backgroundText}. Soft, flattering NEUTRAL lighting that preserves the true color of the garment. Sharp focus on the garment. ${solidOverride}`
        : `Step 2: Generate a high-quality lifestyle photo. ${modelSubject} ${poseText}, wearing EXACTLY these sneakers/shoes. ${aestheticText} The focus MUST be entirely on the footwear and feet/legs. Show a close-up of the feet or a posed lower-body shot, DO NOT show the full body. Step 3: Context: ${backgroundText}. Soft, flattering NEUTRAL lighting that preserves the true color of the footwear. Sharp focus on the footwear. ${solidOverride}`;
    }
    return stylePrompt;
  };

  const enhancePhoto = async (id: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'loading', error: undefined } : p));
    
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    try {
      const base64Data = await fileToBase64(photo.originalFile);
      
      // Step 0: Analyze the garment using text model to extract ultra-specific physical features
      const currentAi = await checkApiKeyAndCreateModel();
      const analysisResponse = await currentAi.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: photo.originalFile.type,
                },
              },
              {
                text: "Analyze this specific clothing or footwear item in EXTREME technical detail. Describe the exact structural cut (e.g., wide-leg sweatpants, cropped hoodie, oversized fit). Describe the precise material and texture (e.g., heather grey melange knit, smooth nylon, ribbed cotton). Pinpoint the EXACT location, shape, size, and color of ANY logos, branding, drawstrings, or secondary features. Start your description directly, keeping it concise but brutally precise."
              }
            ]
          }
        ]
      });
      const garmentPhysicalDetails = analysisResponse.text || "the item shown";

      let basePrompt = `Step 1: Use the provided product image. CRITICAL PHYSICAL LAWS: You MUST STRICTLY preserve every single micro-detail of the original item (stitching, texture, exact color shades, material properties, structural elements) EXCEPT where explicitly modified by the user instructions. The generated product must be a flawless 1:1 exact match of the original item's geometry and texture. Keep the exact original garment/item but clean it up ready for an online store. Physical features detected: [${garmentPhysicalDetails}]`;
      
      let fullPrompt = `${getStylePrompt()} ${basePrompt}`;
      
      if (userInstructions && userInstructions.trim() !== '') {
        fullPrompt += `\n\n=== EXTREMELY CRITICAL USER OVERRIDES ===
The user has provided explicit instructions that OVERRIDE any contradictory physical laws or styling rules above.
If the user asks to change the material (e.g., "satin"), you MUST change the material of the garment.
If the user asks to remove logos ("sin logos"), you MUST remove them.
If the user asks to change the color, change the color.
Read carefully and obey these instructions perfectly:
- If the user specifies how a garment is worn (e.g., untucked), you MUST render it EXACTLY that way.
Failure to follow these overrides while preserving the rest of the unmentioned garment details will ruin the image.

USER'S INSTRUCTIONS TO FOLLOW AS ABSOLUTE LAW:
"${userInstructions}"`;
      }

      const contentsValidation: any = {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: photo.originalFile.type,
            },
          }
        ]
      };

      let nextInputIndex = 2; // Image 1 is the product

      if (generationStyle === 'model' && selectedModelId !== 'random') {
        const modelReferenceImage = savedModels.find(m => m.id === selectedModelId);
        if (modelReferenceImage) {
          const refBase64 = await fileToBase64(modelReferenceImage.originalFile);
          contentsValidation.parts.push({
            inlineData: {
              data: refBase64,
              mimeType: modelReferenceImage.originalFile.type,
            }
          });
          fullPrompt += `\n\n🚨 ABSOLUTELY CRITICAL DIRECTIVE: MODEL IDENTITY MATCHING 🚨\nThe FIRST image is the clothing/item to wear.\nImage ${nextInputIndex} is the REFERENCE MODEL.\nYou MUST use the exact person from the reference image. Match their face, hair color, hair style, facial features, gender, body type, and skin tone PRECISELY. Do not generate a random face or use a generic model. Look closely at the reference image and duplicate that exact person wearing the clothing from the first image. Failure to match the exact face and physical traits of the reference model is a critical error.`;
          if (modelReferenceImage.description) {
             fullPrompt += `\n\n📌 Reference Model Details (Use these characteristics to ensure perfect likeness):\n${modelReferenceImage.description}\n\nYou must explicitly apply these exact traits (gender, ethnicity, facial features, hair, vibe) to the person in the generated image.`;
          }
          nextInputIndex++;
        }
      }

      if (bgType === 'scene' && enhanceScenePhoto) {
        const sceneBase64 = await fileToBase64(enhanceScenePhoto.originalFile);
        contentsValidation.parts.push({
          inlineData: {
            data: sceneBase64,
            mimeType: enhanceScenePhoto.originalFile.type,
          }
        });
        fullPrompt += `\n\n🚨 CRITICAL SCENE/ENVIRONMENT MATCHING 🚨\nImage ${nextInputIndex} is the REFERENCE SCENE/BACKGROUND.\nYou MUST seamlessly and realistically integrate the product/model into the EXACT physical space of this scene image. CRITICAL: The model MUST NOT float in mid-air. Their feet must be grounded on the floor surface of the scene, or if sitting, they must sit on a tangible object that actually exists in the scene. If your selected pose conflicts with the scene's laws of physics, OVERRIDE the pose to fit the background realistically. Depth, shadows, perspective, and lighting must flawlessly match the environment.`;
        nextInputIndex++;
      }

      contentsValidation.parts.push({ text: fullPrompt });

      const enhancedUrl = await generateImageHelper(contentsValidation);

      if (enhancedUrl) {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'success', enhancedUrl } : p));
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error enhancing photo:', error);
      
      let errorMessage = 'Failed to enhance image';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Límite de velocidad perro. Aguantá un cachito.';
      } else if (errorMessage.toLowerCase().includes('quota')) {
        errorMessage = 'Nos re tapó el agua (cuota excedida). Intentá mañana mostro.';
      }
      
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'error', error: errorMessage } : p));
    }
  };

  const generateColorVariation = async (refId: string) => {
    if (!baseColorImage) return;
    
    setColorReferences(prev => prev.map(p => p.id === refId ? { ...p, status: 'loading', error: undefined } : p));
    const refPhoto = colorReferences.find(p => p.id === refId);
    if (!refPhoto) return;

    try {
      const base64Base = await fileToBase64(baseColorImage.originalFile);
      const base64Ref = await fileToBase64(refPhoto.originalFile);
      
      const prompt = `CRITICAL TASK: Color Swap AND Styling. 
      Image 1 is the BASE product. Image 2 is the COLOR REFERENCE.
      You must generate an image of the EXACT product from Image 1, but change its color to match the exact color of the product in Image 2.
      Preserve all micro-details, textures, stitching, and logos of Image 1. ONLY change the color.
      
      AFTER applying the color swap, apply the following styling instructions:
      ${getStylePrompt()}
      
      CRITICAL: The final image MUST feature the styling requested above, but with the product from Image 1 colored like Image 2.`;

      const enhancedUrl = await generateImageHelper({
        parts: [
          { inlineData: { data: base64Base, mimeType: baseColorImage.originalFile.type } },
          { inlineData: { data: base64Ref, mimeType: refPhoto.originalFile.type } },
          { text: prompt },
        ]
      });

      if (enhancedUrl) {
        setColorReferences(prev => prev.map(p => p.id === refId ? { ...p, status: 'success', enhancedUrl } : p));
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error generating color variation:', error);
      
      let errorMessage = 'Failed to generate';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Límite de velocidad perro. Aguantá un cachito.';
      } else if (errorMessage.toLowerCase().includes('quota')) {
        errorMessage = 'Nos re tapó el agua (cuota excedida). Intentá mañana mostro.';
      }
      
      setColorReferences(prev => prev.map(p => p.id === refId ? { ...p, status: 'error', error: errorMessage } : p));
    }
  };

  const generateAllColors = () => {
    colorReferences.filter(p => p.status === 'idle' || p.status === 'error').forEach(p => generateColorVariation(p.id));
  };

  const generateCopy = async () => {
    if (!copywriterPhoto) return;
    
    setIsGeneratingCopy(true);
    setCopywriterMessages([]);

    try {
      const currentAi = await checkApiKeyAndCreateModel();
      const base64Data = await fileToBase64(copywriterPhoto.originalFile);

      let customInstructionText = '';
      if (copywriterContext && copywriterContext.trim() !== '') {
        customInstructionText = `\n\nEl usuario proporcionó esta información adicional que DEBES usar obligatoriamente para redactar tu texto: "${copywriterContext}"\n\n`;
      }

      const prompt = `Rol: Eres el Senior Copywriter y Especialista en Brand Safety de Vura. Tu misión es transformar productos de ropa en artículos de alto deseo. Escribe textos limpios, directos que venden durabilidad, calce y la sensación de usar la prenda.
${customInstructionText}
Tus Responsabilidades:

Cuando se te proporcione una imagen, analiza extremadamente bien la prenda (color detallado, tipo de tela, caída, detalles característicos, estilo) y tu respuesta DEBE tener estrictamente este formato (usa los mismos espacios y emojis):

Título: [Nombre Descriptivo y Premium] - [Material] ([Color])

Descripción: [Párrafo 1: Describir qué es, qué vibra da y cómo eleva el outfit. Hablar del material sintiendo cómo se ve y toca, además de las características clave de su estructura (frena el viento, es liviano, abriga mucho, etc.)]

[Párrafo 2: Hablar de los detalles técnicos que hacen al calce y funcionalidad (puños, elástico, cierres, botones, tipo de cuello) y terminar diciendo para qué tipo de uso o temporada es ideal, vendiendo facha, comodidad y durabilidad en una pieza.]

🗂️ Etiquetas y Filtros para la Base de Datos de tu App:
Como estás armando el backend de tu plataforma, podés clasificar este producto con estos tags precisos:

Categoría: [Tipo de la prenda]
Corte / Fit: [Fit general]
Material / Tela: [Material principal (y detalle extra si aplica)]
Grosor / Peso: [Pesado, Medio, Ligero, etc.]
Detalles: [Breve listado de detalles importantes].

Ejemplo:
Título: Campera Bomber Premium - Satén Porsche (Azul Marino)

Descripción: Un clásico de la moda urbana que eleva cualquier outfit. Esta campera corte Bomber está confeccionada en Satén Porsche de alta densidad, una tela técnica que se destaca por su acabado semi-mate, su textura suave al tacto y una estructura firme que frena el viento con estilo.

Cuenta con un cuello redondo, puños y cintura terminados en rib elástico reforzado para un calce perfecto. Incluye un cierre frontal metálico completo y bolsillos laterales con cierre para mayor seguridad. Una prenda de media estación e invierno urbano ideal para quienes buscan facha, comodidad y durabilidad en una sola pieza.

🗂️ Etiquetas y Filtros para la Base de Datos de tu App:
Como estás armando el backend de tu plataforma, podés clasificar este producto con estos tags precisos:

Categoría: Abrigos / Camperas
Corte / Fit: Regular Fit (Bomber Jacket)
Material / Tela: Satén Porsche (100% Poliéster Premium)
Grosor / Peso: Medio (Ideal media estación y abrigo urbano)
Detalles: Cierre metálico, cuello de rib, bolsillos con cremallera.

NO INCLUYAS las palabras "G5", "Importado", o términos falsos. Basa tu texto SOLAMENTE en la imagen y los datos extra dados.`;

      const response = await currentAi.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
            { role: 'user', parts: [ { text: prompt }, { inlineData: { data: base64Data, mimeType: copywriterPhoto.originalFile.type } } ] }
        ]
      });

      if (response.text) {
        setCopywriterMessages([
          { role: 'user', text: prompt, isInitial: true },
          { role: 'model', text: response.text }
        ]);
      }
    } catch (e) {
      console.error(e);
      setCopywriterMessages([
        { role: 'model', text: 'Hubo un error al generar los datos. Inténtalo de nuevo o revisa tu API Key.' }
      ]);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleSendCopywriterMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copywriterInput.trim() || isGeneratingCopy || !copywriterPhoto) return;

    const newMessageText = copywriterInput;
    setCopywriterInput('');
    setCopywriterMessages(prev => [...prev, { role: 'user', text: newMessageText }]);
    setIsGeneratingCopy(true);

    try {
      const currentAi = await checkApiKeyAndCreateModel();
      const base64Data = await fileToBase64(copywriterPhoto.originalFile);

      const contents = copywriterMessages.map(msg => {
         if (msg.isInitial && msg.role === 'user') {
            return {
               role: 'user',
               parts: [
                  { text: msg.text },
                  { inlineData: { data: base64Data, mimeType: copywriterPhoto.originalFile.type } }
               ]
            }
         }
         return {
            role: msg.role,
            parts: [{ text: msg.text }]
         }
      });

      contents.push({ role: 'user', parts: [{ text: newMessageText }] });

      const response = await currentAi.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents
      });

      if (response.text) {
        setCopywriterMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (error) {
       console.error(error);
       setCopywriterMessages(prev => [...prev, { role: 'model', text: 'Error al enviar el mensaje. Revisa tu consola o API Key.' }]);
    } finally {
       setIsGeneratingCopy(false);
    }
  };

  const generateUpscale = async () => {
    if (!upscalePhoto) return;
    
    setUpscalePhoto(prev => prev ? { ...prev, status: 'loading', error: undefined } : null);

    try {
      const base64Data = await fileToBase64(upscalePhoto.originalFile);
      
      const prompt = `Upscale and enhance this image to high resolution. Remove blur and improve clarity, sharpness, and textures. CRITICAL STRICT RULES: Do NOT alter the product, do NOT change the subject, do NOT redesign anything, do NOT change the colors, do NOT change the background, and do NOT change the composition. Maintain exact 1:1 structural similarity with the original image. Your ONLY job is to improve the image quality and resolution.`;

      const contentsValidation = {
        parts: [
          { inlineData: { data: base64Data, mimeType: upscalePhoto.originalFile.type } },
          { text: prompt }
        ]
      };

      const enhancedUrl = await generateImageHelper(contentsValidation);

      if (enhancedUrl) {
        setUpscalePhoto(prev => prev ? { ...prev, status: 'success', enhancedUrl } : null);
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      let errorMessage = 'Failed to generate';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Límite de velocidad perro. Esperá un minuto.';
      } else if (errorMessage.toLowerCase().includes('quota')) {
        errorMessage = 'Nos quedamos sin nafta (cuota diaria). Probá mañana, mostro.';
      }
      setUpscalePhoto(prev => prev ? { ...prev, status: 'error', error: errorMessage } : null);
    }
  };

  const generateLibraryModel = async () => {
    if (!libraryModelPrompt.trim()) return;
    setIsGeneratingLibraryModel(true);
    setLibraryModelError(undefined);
    setGeneratedLibraryModelUrl(null);

    try {
      const prompt = `CRITICAL INSTRUCTION: Generate a high-quality, photorealistic portrait or full-body photo of a fashion model based on the following description: ${libraryModelPrompt}. They should be looking naturally at the camera or away, styled fashionably but keeping the focus on their physical features so they can be used as a reference model. DO NOT add text, logos, or weird elements. Just a perfect studio or natural light shot of the model.`;
      
      const contentsValidation = {
        parts: [
          { text: prompt }
        ]
      };

      const generatedUrl = await generateImageHelper(contentsValidation);

      if (generatedUrl) {
        setGeneratedLibraryModelUrl(generatedUrl);
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('Error generating library model:', error);
      setLibraryModelError('Hubo un error al crear la modelo. Intenta de nuevo.');
    } finally {
      setIsGeneratingLibraryModel(false);
    }
  };

  const saveLibraryModel = async () => {
    if (!generatedLibraryModelUrl) return;
    
    try {
        // Convert data URL to Blob to File to match the existing model structure, or we can just bypass it
        // We can create a dummy file since we might not strictly need the file object elsewhere if we handle it
        // Wait, other places use fileToBase64 on originalFile. If we construct a real file it's better.
        const res = await fetch(generatedLibraryModelUrl);
        const blob = await res.blob();
        const file = new File([blob], `model_${Date.now()}.png`, { type: 'image/png' });

        const newModelId = Math.random().toString(36).substring(7);
        updateSavedModels((prev: any) => [...prev, {
            id: newModelId,
            originalFile: file,
            originalUrl: generatedLibraryModelUrl,
            name: 'Modelo AI',
            description: libraryModelPrompt
        }]);

        // Clean up
        setGeneratedLibraryModelUrl(null);
        setLibraryModelPrompt('');
        alert('Modelo guardado correctamente. Ya puedes usarlo en tus generaciones.');
    } catch (e) {
        console.error("Error saving model:", e);
        alert("Error al guardar el modelo.");
    }
  };

  const analyzeUploadedModel = async (file: File) => {
     const url = URL.createObjectURL(file);
     setUploadedModelFile({ file, url });
     setIsAnalyzingModel(true);
     setUploadedModelAnalysis(null);
     setModelNameInput('');
     
     try {
       const base64Data = await fileToBase64(file);
       const currentAi = await checkApiKeyAndCreateModel();
       
       const prompt = `Analiza detalladamente este modelo de referencia en la imagen. Describe sus características físicas principales (género, etnia aparente, edad aproximada, color y estilo de cabello, vello facial, estilo general). Luego sugiere un nombre corto y descriptivo para este modelo (ej. "Mujer Asiática Pelo Corto"). Retorna estrictamente un JSON con este formato: {"description": "descripción de lo que ves", "suggestedName": "Nombre Corto"}`;
       
       const response = await currentAi.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: [
            { role: 'user', parts: [ { text: prompt }, { inlineData: { data: base64Data, mimeType: file.type } } ] }
          ]
       });
       
       if (response.text) {
          try {
             const jsonString = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
             const result = JSON.parse(jsonString);
             setUploadedModelAnalysis(result);
             setModelNameInput(result.suggestedName);
          } catch (e) {
             console.error("Error parsing analysis JSON", e);
             setUploadedModelAnalysis({ description: response.text, suggestedName: "Modelo " + Math.floor(Math.random()*1000) });
          }
       }
     } catch (e) {
       console.error("Error analyzing model", e);
       alert("Error al analizar la imagen del modelo.");
     } finally {
       setIsAnalyzingModel(false);
     }
  };

  const saveUploadedModel = () => {
      if (!uploadedModelFile) return;
      const newModelId = Math.random().toString(36).substring(7);
      
      updateSavedModels((prev: any) => [...prev, {
          id: newModelId,
          originalFile: uploadedModelFile.file,
          originalUrl: uploadedModelFile.url,
          name: modelNameInput,
          description: uploadedModelAnalysis?.description
      }]);

      setUploadedModelFile(null);
      setUploadedModelAnalysis(null);
      setModelNameInput('');
      if (uploadModelInputRef.current) uploadModelInputRef.current.value = '';
      alert('Modelo guardado correctamente.');
  };

  const generateDuoPhoto = async () => {
    if (!duoImage1 || !duoImage2) return;
    setDuoResult(prev => ({ ...prev, status: 'loading', error: undefined }));

    try {
      const base64Data1 = await fileToBase64(duoImage1.originalFile);
      const base64Data2 = await fileToBase64(duoImage2.originalFile);

      let aestheticText = '';
      if (modelAesthetic === 'casual') aestheticText = 'Casual Everyday style';
      if (modelAesthetic === 'chic') aestheticText = 'Chic Smart-Casual style';
      if (modelAesthetic === 'street') aestheticText = 'Edgy urban Street-Style';
      if (modelAesthetic === 'elegant') aestheticText = 'Modern, highly Elegant style';
      if (modelAesthetic === 'elegant_sport') aestheticText = 'Smart Casual / Elegant Sport style with chino pants and clean white sneakers, top completely untucked';
      if (modelAesthetic === 'sporty') aestheticText = 'Athleisure Sporty style';

      let backgroundText = '';
      if (bgType === 'solid') {
          backgroundText = `pure solid ${solidBgColor} color background. CRITICAL: strictly monochromatic solid color background (${solidBgColor})`;
      } else {
          if (modelBackground === 'studio') backgroundText = 'clean minimalist photography studio background, seamless paper';
          if (modelBackground === 'urban') backgroundText = 'modern urban street environment, city aesthetics';
          if (modelBackground === 'nature') backgroundText = 'natural outdoor environment, soft sunlight';
          if (modelBackground === 'interior') backgroundText = 'luxurious high-end modern interior architecture';
      }

      let poseText = '';
      if (duoPose === 'together') poseText = 'standing casually and naturally next to each other, interacting like friends or a couple';
      if (duoPose === 'walking') poseText = 'captured mid-stride walking together confidently towards the camera';
      if (duoPose === 'back_to_back') poseText = 'standing coolly back-to-back in an editorial fashion pose';
      if (duoPose === 'editorial') poseText = 'striking a highly sophisticated, editorial high-fashion couple pose';

      const solidOverride = bgType === 'solid' ? `\nCRITICAL BACKGROUND OVERRIDE: The background MUST be a pure, strictly monochromatic solid color described by the hex code ${solidBgColor}. Do not add any gradients, textures, or real-world background elements. Just a solid ${solidBgColor} backdrop.` : '';
      
      const prompt = `CRITICAL TASK: Generate a highly realistic lifestyle fashion photo featuring EXACTLY TWO people in the same scene.
      Image 1 is "Garment A".
      Image 2 is "Garment B".
      
      Person 1: A young ${duoModel1} model wearing EXACTLY Garment A from Image 1.
      Person 2: A young ${duoModel2} model wearing EXACTLY Garment B from Image 2.
      
      CRITICAL INSTRUCTION: You MUST NOT MIX the garments. Person 1 wears Garment A and NOTHING ELSE on top. Person 2 wears Garment B and NOTHING ELSE on top. You must preserve the colors, textures, and designs of both garments perfectly.
      
      Pose & Relationship: ${poseText}.
      Style & Aesthetic: ${aestheticText}.
      Background Context: ${backgroundText}.
      Use neutral, realistic, high-quality fashion photography lighting.${solidOverride}`;

      const generatedUrl = await generateImageHelper({
        parts: [
          { inlineData: { data: base64Data1, mimeType: duoImage1.originalFile.type } },
          { inlineData: { data: base64Data2, mimeType: duoImage2.originalFile.type } },
          { text: prompt },
        ]
      });

      if (generatedUrl) {
        setDuoResult({ url: generatedUrl, status: 'success' });
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error generating duo photo:', error);
      let errorMessage = 'Failed to generate';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Límite de velocidad perro. Esperá un minuto.';
      } else if (errorMessage.toLowerCase().includes('quota')) {
        errorMessage = 'Nos quedamos sin nafta (cuota diaria). Probá mañana, mostro.';
      }
      setDuoResult(prev => ({ ...prev, status: 'error', error: errorMessage }));
    }
  };

  const generateLookbookPhoto = async () => {
    if (!lookbookTopPhoto && !lookbookBottomPhoto) return;
    setLookbookResult(prev => ({ ...prev, status: 'loading', error: undefined }));

    try {
      const currentAi = await checkApiKeyAndCreateModel();
      
      let topDetails = "a matching top garment that complements the bottom";
      let bottomDetails = "matching bottom garment (pants/skirt/shorts) that complements the top";
      let base64Top = null;
      let base64Bottom = null;

      if (lookbookTopPhoto) {
        base64Top = await fileToBase64(lookbookTopPhoto.originalFile);
        const analyzeResponseTop = await currentAi.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { role: 'user', parts: [
              { inlineData: { data: base64Top, mimeType: lookbookTopPhoto.originalFile.type } },
              { text: "Analyze this top garment in EXTREME technical detail. Describe cut, material, exact color, logos, patterns, collars, pockets. Be concise but brutally precise." }
            ]}
          ]
        });
        topDetails = analyzeResponseTop.text || "top garment";
      }

      if (lookbookBottomPhoto) {
        base64Bottom = await fileToBase64(lookbookBottomPhoto.originalFile);
        const analyzeResponseBottom = await currentAi.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { role: 'user', parts: [
              { inlineData: { data: base64Bottom, mimeType: lookbookBottomPhoto.originalFile.type } },
              { text: "Analyze this bottom garment (pants/skirt/shorts) in EXTREME technical detail. Describe cut, material, exact color, logos, patterns. Be concise but brutally precise." }
            ]}
          ]
        });
        bottomDetails = analyzeResponseBottom.text || "bottom garment";
      }

      let prompt = `CRITICAL TASK: Full Outfit Generation.\n`;
      let nextInputIndex = 1;

      const contentsValidation: any = {
        parts: []
      };

      if (lookbookTopPhoto && base64Top) {
        contentsValidation.parts.push({ inlineData: { data: base64Top, mimeType: lookbookTopPhoto.originalFile.type } });
        prompt += `Image ${nextInputIndex} is the TOP GARMENT (shirt/jacket/sweater etc). `;
        nextInputIndex++;
      }
      
      if (lookbookBottomPhoto && base64Bottom) {
        contentsValidation.parts.push({ inlineData: { data: base64Bottom, mimeType: lookbookBottomPhoto.originalFile.type } });
        prompt += `Image ${nextInputIndex} is the BOTTOM GARMENT (pants/shorts/skirt etc). `;
        nextInputIndex++;
      }

      prompt += `\nYou must generate a photo of a single model wearing a complete outfit.
      
      CRITICAL PHYSICAL LAWS:
      - TOP GARMENT details to instantly replicate/apply: ${topDetails}
      - BOTTOM GARMENT details to instantly replicate/apply: ${bottomDetails}\n`;

      if (lookbookTopPhoto && lookbookBottomPhoto) {
        prompt += `You MUST STRICTLY preserve all structural details, exact color shades, patterns, materials, and logos from BOTH original garment images.`;
      } else if (lookbookTopPhoto) {
        prompt += `You MUST STRICTLY preserve all structural details, exact color shades, patterns, materials, and logos from the original TOP garment image.`;
      } else if (lookbookBottomPhoto) {
        prompt += `You MUST STRICTLY preserve all structural details, exact color shades, patterns, materials, and logos from the original BOTTOM garment image.`;
      }

      let modelSubject = `A fashion model`;
      if (lookbookModelId !== 'random') {
        const modelRef = savedModels.find(m => m.id === lookbookModelId);
        if (modelRef) {
          const refBase64 = await fileToBase64(modelRef.originalFile);
          contentsValidation.parts.push({
            inlineData: { data: refBase64, mimeType: modelRef.originalFile.type }
          });
          modelSubject = `The EXTREMELY SPECIFIC REFERENCE PERSON shown in Image ${nextInputIndex}`;
          prompt += `\n\n🚨 ABSOLUTELY CRITICAL DIRECTIVE: MODEL IDENTITY MATCHING 🚨
Image ${nextInputIndex} is the REFERENCE MODEL. You MUST use the exact person from this reference image. Match their face, hair color, hair style, facial features, gender, body type, and skin tone PRECISELY. Do not generate a random face.`;
          if (modelRef.description) {
            prompt += `\n📌 Reference Model Details:\n${modelRef.description}`;
          }
          nextInputIndex++;
        }
      }

      if (lookbookScenePhoto) {
        const base64Scene = await fileToBase64(lookbookScenePhoto.originalFile);
        contentsValidation.parts.push({
          inlineData: { data: base64Scene, mimeType: lookbookScenePhoto.originalFile.type }
        });
        prompt += `\n\n🚨 CRITICAL SCENE/ENVIRONMENT MATCHING 🚨
Image ${nextInputIndex} is the REFERENCE SCENE/BACKGROUND. You MUST seamlessly and realistically integrate the model into the EXACT physical space of this scene image. CRITICAL: The model MUST NOT float in mid-air. Their feet must be grounded on the floor surface of the scene, or if sitting, they must sit on a tangible object that actually exists in the scene. If your selected pose conflicts with the scene's laws of physics, OVERRIDE the pose to fit the background realistically. Depth, shadows, perspective, and lighting must flawlessly match the environment.`;
      }

      prompt += `\n\nSubject: ${modelSubject} wearing the defined TOP and BOTTOM garments.
      USER STYLE/SCENE INSTRUCTIONS (FOLLOW AS ABSOLUTE LAW): "${lookbookPrompt}"
      If the user specifies a style like "Wanama", "Tucci", "street", or a specific camera distance (e.g., "close up", "full body"), or a pose, or environment, you MUST apply it directly.`;

      contentsValidation.parts.push({ text: prompt });

      const enhancedUrl = await generateImageHelper(contentsValidation);

      if (enhancedUrl) {
        setLookbookResult({ url: enhancedUrl, status: 'success' });
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error in lookbook:', error);
      let errorMessage = 'Failed to generate';
      if (error.message) errorMessage = error.message;
      if (errorMessage.includes('429')) errorMessage = 'Límite de velocidad. Intenta en un rato.';
      if (errorMessage.toLowerCase().includes('quota')) errorMessage = 'Límite diario alcanzado.';
      setLookbookResult({ url: '', status: 'error', error: errorMessage });
    }
  };

  const generateBanner = async () => {
    setBannerResult(prev => ({ ...prev, status: 'loading', error: undefined }));

    try {
      let themePrompt = '';
      if (bannerTheme === 'deportivo') themePrompt = 'High-end athletic sports campaign, dynamic, energetic, fitness lifestyle, highly professional commercial photography.';
      if (bannerTheme === 'urbano') themePrompt = 'Gritty and stylish urban streetwear campaign, modern city environment, edgy editorial photography.';
      if (bannerTheme === 'elegante') themePrompt = 'Sophisticated and luxurious editorial campaign, elegant setting, soft premium lighting, high-fashion photography.';
      if (bannerTheme === 'sneakers') themePrompt = 'Premium sneakerhead culture campaign, focusing on streetwear footwear aesthetics, vibrant and crisp product photography.';
      if (bannerTheme === 'smart_casual') themePrompt = 'Smart casual editorial campaign, stylish everyday wear, chic and polished but relaxed, modern lifestyle photography, elegant sport aesthetic.';
      if (bannerTheme === 'mix') themePrompt = 'A dynamic and eclectic editorial campaign showcasing a diverse mix of styles, combining streetwear, elegant casual, and athletic wear. A vibrant collage-style aesthetic or a highly stylized group shot featuring multiple complementary looks. High-end commercial fashion photography showcasing the brand\'s diverse catalog.';

      let orientationPrompt = '';
      if (bannerOrientation === 'landscape') orientationPrompt = 'Widescreen landscape composition, 16:9 aspect ratio website hero banner.';
      if (bannerOrientation === 'square') orientationPrompt = 'Perfectly square composition, 1:1 aspect ratio grid post.';
      if (bannerOrientation === 'portrait') orientationPrompt = 'Vertical portrait composition, 9:16 aspect ratio mobile banner.';

      let bgPrompt = '';
      if (bannerBgType === 'dynamic') bgPrompt = 'dynamic environment perfectly matching the concept.';
      if (bannerBgType === 'solid') bgPrompt = `solid perfectly uniform flat background color with exact hex code ${bannerSolidBgColor}. Pure flat studio backdrop.`;

      const promptText = `CRITICAL TASK: Generate a highly realistic, professional e-commerce category banner image.
      Theme: ${themePrompt}
      Composition: ${orientationPrompt}
      Background: ${bgPrompt}
      ${bannerProduct ? 'A model or stylized scene featuring the exact garment provided in the reference image. The garment must perfectly match the provided image.' : 'Features high-end fashion models or stylized mood compositions reflecting this category.'}
      The image should be stunning, commercial quality, without any text or typography overlay. Pure visual photography.`;

      const contentsValidation: any = { parts: [{ text: promptText }] };
      if (bannerProduct) {
        const base64Data = await fileToBase64(bannerProduct.originalFile);
        contentsValidation.parts.unshift({ inlineData: { data: base64Data, mimeType: bannerProduct.originalFile.type } });
      }

      const generatedUrl = await generateImageHelper(contentsValidation);

      if (generatedUrl) {
        setBannerResult({ url: generatedUrl, status: 'success' });
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error generating banner:', error);
      let errorMessage = 'Failed to generate';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Límite de velocidad perro. Aguantá un toque.';
      } else if (errorMessage.toLowerCase().includes('quota')) {
        errorMessage = 'Nos re tapó el agua (cuota excedida). Intentá mañana mostro.';
      }
      setBannerResult(prev => ({ ...prev, status: 'error', error: errorMessage }));
    }
  };

  const enhanceAll = () => {
    photos.filter(p => p.status === 'idle' || p.status === 'error').forEach(p => enhancePhoto(p.id));
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Vura <span className="hidden sm:inline">| Creador de buenas fotos</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 shadow-sm">
                 <input 
                   type="password" 
                   value={customApiKey} 
                   onChange={(e) => {
                     setCustomApiKey(e.target.value);
                     localStorage.setItem('vura_custom_api_key', e.target.value);
                   }}
                   placeholder="Pega tu Google API Key..." 
                   className="text-xs px-2 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 w-36 sm:w-48 bg-white transition-all placeholder:text-neutral-400"
                 />
                 <div className="text-[10px] sm:text-xs text-neutral-500 font-medium whitespace-nowrap hidden sm:flex items-center gap-1.5">
                   <div className={`w-2 h-2 rounded-full ${customApiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                   {customApiKey ? "API Key propia" : "API Key del entorno"}
                 </div>
             </div>
          </div>
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center py-4">
          <div className="bg-neutral-100 p-1.5 rounded-2xl inline-flex shadow-inner">
            <button
              onClick={() => setAppMode('enhance')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'enhance' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Layers size={18} />
              Mejorar y Estilar
            </button>
            <button
              onClick={() => setAppMode('colorswap')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'colorswap' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Palette size={18} />
              Variaciones de Color
            </button>
            <button
              onClick={() => setAppMode('duo')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'duo' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Users size={18} />
              Pareja / Dúo
            </button>
            <button
              onClick={() => setAppMode('lookbook')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'lookbook' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <PersonStanding size={18} />
              Lookbook Completo
            </button>
            <button
              onClick={() => setAppMode('banners')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'banners' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <LayoutTemplate size={18} />
              Secciones / Campañas
            </button>
            <button
              onClick={() => setAppMode('copywriter')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'copywriter' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Sparkles size={18} />
              Copywriter SEO
            </button>
            <button
              onClick={() => setAppMode('upscale')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'upscale' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <ZoomIn size={18} />
              Enhancer 200%
            </button>
            <button
              onClick={() => setAppMode('models_library')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'models_library' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <User size={18} />
              Modelos
            </button>
            <button
              onClick={() => setAppMode('collections')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'collections' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Folder size={18} />
              Colecciones
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {appMode === 'enhance' && (
          <div className="mb-8 flex flex-col items-center gap-6">
          
          {/* Product Type Selector */}
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">1. Tipo de Producto</h2>
            <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex shadow-sm">
              <button
                onClick={() => setProductType('clothing')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${productType === 'clothing' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}
              >
                <Shirt size={18} />
                Ropa
              </button>
              <button
                onClick={() => setProductType('sneakers')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${productType === 'sneakers' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}
              >
                <Footprints size={18} />
                Zapatillas
              </button>
            </div>
          </div>

          {/* Style Selector */}
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">2. Estilo de Foto</h2>
            <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex shadow-sm">
              <button
                onClick={() => setGenerationStyle('product')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${generationStyle === 'product' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}
              >
                <ImageIcon size={18} />
                Solo Producto
              </button>
              <button
                onClick={() => setGenerationStyle('model')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${generationStyle === 'model' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}
              >
                <User size={18} />
                En Modelo
              </button>
            </div>

            {/* Sub-options for Product Only */}
            <AnimatePresence>
              {generationStyle === 'product' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden mt-4 flex flex-col sm:flex-row gap-4 items-center"
                >
                  <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex flex-wrap shadow-sm">
                    <button
                      onClick={() => setProductPresentation('ghost')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'ghost' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                    >
                      {productType === 'clothing' ? 'Fondo Minimalista / Catálogo' : 'Estudio 3D Estándar'}
                    </button>
                    <button
                      onClick={() => setProductPresentation('flatlay')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'flatlay' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                    >
                      {productType === 'clothing' ? 'Flat Lay / Superficie Texturizada' : 'Flat Lay / Suelo Urbano'}
                    </button>
                    <button
                      onClick={() => setProductPresentation('hanger')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'hanger' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                    >
                      {productType === 'clothing' ? 'En Percha (Realista)' : 'Flotando / Pared Urbana'}
                    </button>
                    {productType === 'clothing' && (
                      <button
                        onClick={() => setProductPresentation('folded')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'folded' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        Plegado en Mesa
                      </button>
                    )}
                    {productType === 'clothing' && (
                      <button
                        onClick={() => setProductPresentation('flat_unfolded')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'flat_unfolded' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        Estirado Completo (Cenital)
                      </button>
                    )}
                    {productType === 'clothing' && (
                      <button
                        onClick={() => { setProductPresentation('flatlay_colored_table'); setBgType('solid'); }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${productPresentation === 'flatlay_colored_table' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        Mesa Color + Luz Cenital
                      </button>
                    )}
                    {productType === 'clothing' && (
                      <button
                        onClick={() => setProductPresentation('original')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${productPresentation === 'original' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        <Sparkles size={14} /> Solo Mejorar/Planchar (Forma Original)
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sub-options for Model */}
            <AnimatePresence>
              {generationStyle === 'model' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
                >
                  {/* Gender Selector */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <User size={14} /> Género
                    </span>
                    <div className="bg-white p-1 rounded-2xl border border-neutral-200 inline-flex shadow-sm w-full">
                      <button
                        onClick={() => setModelGender('male')}
                        className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${modelGender === 'male' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        Hombre
                      </button>
                      <button
                        onClick={() => setModelGender('female')}
                        className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${modelGender === 'female' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
                      >
                        Mujer
                      </button>
                    </div>
                  </div>

                  {/* Aesthetic Selector */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles size={14} /> Estética
                    </span>
                    <div className="bg-white p-1 rounded-2xl border border-neutral-200 flex flex-wrap justify-center gap-1 w-full shadow-sm">
                      <button
                        onClick={() => setModelAesthetic('casual')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'casual' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Casual
                      </button>
                      <button
                        onClick={() => setModelAesthetic('chic')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'chic' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Chic
                      </button>
                      <button
                        onClick={() => setModelAesthetic('street')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'street' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Urbano
                      </button>
                      <button
                        onClick={() => setModelAesthetic('elegant')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'elegant' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Elegante
                      </button>
                      <button
                        onClick={() => setModelAesthetic('elegant_sport')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'elegant_sport' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Elegante Sport
                      </button>
                      <button
                        onClick={() => setModelAesthetic('sporty')}
                        className={`flex-auto px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${modelAesthetic === 'sporty' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Deportivo
                      </button>
                    </div>
                  </div>

                  {/* Pose Selector */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <PersonStanding size={14} /> Pose
                    </span>
                    <div className="bg-white p-1 rounded-2xl border border-neutral-200 grid grid-cols-3 sm:grid-cols-4 gap-1 w-full shadow-sm">
                      <button
                        onClick={() => setModelPose('standing')}
                        title="Parado normal"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'standing' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Parado
                      </button>
                      <button
                        onClick={() => setModelPose('walking')}
                        title="Caminando"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'walking' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Camina
                      </button>
                      <button
                        onClick={() => setModelPose('running')}
                        title="Corriendo"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'running' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Corre
                      </button>
                      <button
                        onClick={() => setModelPose('pockets')}
                        title="Manos en bolsillos"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'pockets' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Bolsillos
                      </button>
                      
                      <button
                        onClick={() => setModelPose('editorial')}
                        title="Editorial de Moda"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'editorial' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Editor.
                      </button>
                      <button
                        onClick={() => setModelPose('sitting')}
                        title="Sentado en silla"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'sitting' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Sentado
                      </button>
                      <button
                        onClick={() => setModelPose('leaning')}
                        title="Apoyado en pared"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'leaning' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Apoyado
                      </button>
                      <button
                        onClick={() => setModelPose('hand_on_hip')}
                        title="Mano en la cadera"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'hand_on_hip' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Mano/Cad
                      </button>

                      <button
                        onClick={() => setModelPose('crossed')}
                        title="Brazos Cruzados"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'arms_crossed' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Cruzado
                      </button>
                      <button
                        onClick={() => setModelPose('relaxed')}
                        title="Súper relajado / Manos nuca"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'relaxed' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Relajado
                      </button>
                      <button
                        onClick={() => setModelPose('stretching')}
                        title="Elongando / Calentamiento"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'stretching' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Elonga
                      </button>
                      <button
                        onClick={() => setModelPose('action')}
                        title="Acción Deportiva"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'action' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        Acción
                      </button>
                      <button
                        onClick={() => setModelPose('back_facing')}
                        title="De espaldas (Mostrar estampa trasera)"
                        className={`px-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${modelPose === 'back_facing' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        De Espaldas
                      </button>
                    </div>
                  </div>

                  {/* Gaze Selector */}
                  <div className="flex flex-col items-center col-span-1 md:col-span-3 mt-2">
                     <div className="bg-white p-1 rounded-2xl border border-neutral-200 inline-flex shadow-sm">
                      <button
                        onClick={() => setModelGaze('camera')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${modelGaze === 'camera' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        <Eye size={14} /> Mirando a Cámara
                      </button>
                      <button
                        onClick={() => setModelGaze('away')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${modelGaze === 'away' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        <Eye size={14} className="opacity-50" /> Mirando a un lado
                      </button>
                    </div>
                  </div>

                  {/* Reference Model (Optional) */}
                  <div className="col-span-1 md:col-span-3 mt-4 border-t border-neutral-100 pt-4">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2 text-center">Elige tu Modelo</h3>
                    <div className="flex flex-wrap justify-center items-center gap-3">
                      
                      {/* Random Model Option */}
                      <button 
                        onClick={() => setSelectedModelId('random')}
                        className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 ${selectedModelId === 'random' ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 shadow-md' : 'bg-neutral-50 border-2 border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:border-neutral-300'}`}
                      >
                        <Sparkles size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">La IA</span>
                      </button>

                      {/* Add New Model Option */}
                      <button 
                        onClick={() => referenceImageInputRef.current?.click()}
                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 hover:bg-neutral-100 transition-all flex flex-col items-center justify-center gap-1 flex-shrink-0 shadow-inner"
                      >
                        <User size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Subir</span>
                      </button>
                      
                      <input type="file" ref={referenceImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const newId = Date.now().toString();
                          updateSavedModels((prev: any) => [...prev, { id: newId, originalFile: file, originalUrl: URL.createObjectURL(file) }]);
                          setSelectedModelId(newId);
                        }
                      }}/>

                      {/* Saved Models List */}
                      {savedModels.map(model => (
                        <button
                          key={model.id}
                          title={model.name || 'Modelo'}
                          onClick={() => setSelectedModelId(model.id)}
                          className={`w-16 h-16 rounded-2xl overflow-hidden relative border-2 transition-all flex-shrink-0 ${selectedModelId === model.id ? 'border-indigo-500 shadow-md transform scale-105' : 'border-transparent filter grayscale hover:grayscale-0'}`}
                        >
                          <img src={model.originalUrl} alt={model.name || 'Modelo'} className="w-full h-full object-cover" />
                          {selectedModelId === model.id && (
                            <div className="absolute inset-0 ring-inset ring-2 ring-indigo-500 rounded-2xl"></div>
                          )}
                        </button>
                      ))}

                    </div>
                    {selectedModelId !== 'random' && (
                      <div className="flex justify-center mt-3">
                        <button 
                          onClick={() => {
                            updateSavedModels((prev: any) => prev.filter((m: any) => m.id !== selectedModelId));
                            setSelectedModelId('random');
                          }} 
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <X size={12} /> Eliminar modelo seleccionado
                        </button>
                      </div>
                    )}
                  </div>
                  
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* 3. Fondo / Entorno */}
          <div className="flex flex-col items-center w-full max-w-2xl">
             <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">3. Fondo / Entorno</h2>
             <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex shadow-sm mb-4">
                 <button onClick={() => setBgType('scene')} className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${bgType === 'scene' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}> <MapPin size={18} /> Escena / Contexto </button>
                 <button onClick={() => setBgType('solid')} className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${bgType === 'solid' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}> <Palette size={18} /> Color Sólido </button>
             </div>
             
             <AnimatePresence mode="wait">
                {bgType === 'scene' && generationStyle === 'model' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="w-full">
                     <div className="bg-white p-2 rounded-2xl border border-neutral-200 flex flex-wrap justify-center gap-2 shadow-sm">
                        <button onClick={() => setModelBackground('studio')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${modelBackground === 'studio' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Estudio</button>
                        <button onClick={() => setModelBackground('urban')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${modelBackground === 'urban' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Urbano</button>
                        <button onClick={() => setModelBackground('nature')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${modelBackground === 'nature' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Naturaleza</button>
                        <button onClick={() => setModelBackground('interior')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${modelBackground === 'interior' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Interior</button>
                     </div>
                  </motion.div>
                )}
                {bgType === 'scene' && generationStyle === 'product' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                    {productPresentation === 'folded' ? (
                       <div className="bg-white p-2 rounded-2xl border border-neutral-200 flex flex-wrap justify-center gap-2 shadow-sm">
                          <button onClick={() => setFoldedBackground('wood')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${foldedBackground === 'wood' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Mesa de Madera</button>
                          <button onClick={() => setFoldedBackground('marble')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${foldedBackground === 'marble' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Mármol</button>
                          <button onClick={() => setFoldedBackground('white_table')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${foldedBackground === 'white_table' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Mesa Blanca</button>
                          <button onClick={() => setFoldedBackground('concrete')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${foldedBackground === 'concrete' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Concreto</button>
                       </div>
                    ) : productPresentation === 'hanger' && productType === 'clothing' ? (
                       <div className="bg-white p-2 rounded-2xl border border-neutral-200 flex flex-wrap justify-center gap-2 shadow-sm">
                          <button onClick={() => setHangerBackground('rustic')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${hangerBackground === 'rustic' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Pared Rústica</button>
                          <button onClick={() => setHangerBackground('studio')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${hangerBackground === 'studio' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Estudio Limpio</button>
                          <button onClick={() => setHangerBackground('closet')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${hangerBackground === 'closet' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>Boutique / Vestidor</button>
                       </div>
                    ) : productPresentation === 'flat_unfolded' ? (
                       <p className="text-sm text-neutral-500 text-center bg-neutral-100 px-4 py-3 rounded-xl border border-neutral-200 shadow-sm">La prenda se mostrará completamente estirada y planchada vista desde arriba, sin pliegues ni modelo.</p>
                    ) : productPresentation === 'original' ? (
                       <p className="text-sm text-neutral-500 text-center bg-neutral-100 px-4 py-3 rounded-xl border border-neutral-200 shadow-sm">Se mantendrá el fondo original de la imagen, pero con calidad de estudio.</p>
                    ) : productPresentation === 'flatlay_colored_table' ? (
                       <p className="text-sm text-neutral-500 text-center bg-neutral-100 px-4 py-3 rounded-xl border border-neutral-200 shadow-sm">Se usará una mesa con entorno realista pero iluminación plana (cenital) para evitar sombras.</p>
                     ) : (
                       <p className="text-sm text-neutral-500 text-center bg-neutral-100 px-4 py-3 rounded-xl border border-neutral-200 shadow-sm">El entorno realista se adapta automáticamente a la presentación elegida (ej. Pared rústica, Suelo Urbano).</p>
                     )}
                  </motion.div>
                )}
                {bgType === 'solid' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                     <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm">
                        <span className="text-sm font-semibold text-neutral-500">Seleccionar Color:</span>
                        <input type="color" value={solidBgColor} onChange={(e) => setSolidBgColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-neutral-50 border border-neutral-200 p-1" />
                        <span className="font-mono text-sm uppercase text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">{solidBgColor}</span>
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          {/* 4. Formato de Imagen */}
          <div className="flex flex-col items-center w-full max-w-2xl mt-8">
             <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">4. Formato y Resolución</h2>
             <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex flex-wrap shadow-sm mb-3">
                 <button onClick={() => setImageAspectRatio('1:1')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${imageAspectRatio === '1:1' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}>Cuadrado (1:1)</button>
                 <button onClick={() => setImageAspectRatio('9:16')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${imageAspectRatio === '9:16' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}>Vertical (9:16)</button>
                 <button onClick={() => setImageAspectRatio('16:9')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${imageAspectRatio === '16:9' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}>Horizontal (16:9)</button>
             </div>
             
             <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 inline-flex flex-wrap shadow-sm w-full max-w-md justify-center">
                 <button onClick={() => setImageResolution('1K')} className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 transition-all ${imageResolution === '1K' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}>Estándar</button>
                 <button onClick={() => setImageResolution('2K')} className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 transition-all ${imageResolution === '2K' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}>Alta Calidad / Sin límites</button>
             </div>
             {(imageResolution === '2K') && (
                 <p className="text-[11px] sm:text-xs text-amber-600 font-medium text-center mt-2 max-w-md">Para generar en resolución en Alta Calidad u omitir el límite de la cuota del sistema, pega tu API Key de Google arriba a la derecha. Obtenla gratis en aistudio.google.com</p>
             )}
          </div>

          {/* 5. Instrucciones extra */}
          <div className="flex flex-col items-center w-full max-w-2xl mt-8">
             <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">5. Detalles de la Prenda (Opcional)</h2>
             <p className="text-xs text-neutral-400 text-center mb-3 max-w-md">Si el modelo de IA pierde detalles de tu prenda (logos, texturas específicas), descríbelo aquí para forzarla a respetarlos.</p>
             <textarea 
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                placeholder="Ejemplo: Pantalón de corte ancho (wide leg) con textura gris jaspeada (melange). Logo negro pequeño en el muslo izquierdo."
                className="w-full bg-white border border-neutral-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-none shadow-sm min-h-[80px]"
             />
          </div>

          {/* 6. Escena Personalizada */}
          {bgType === 'scene' && (
            <div className="flex flex-col items-center w-full max-w-2xl mt-8">
               <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">6. Escena Personalizada (Opcional)</h2>
               <p className="text-xs text-neutral-400 text-center mb-3 max-w-md">Sube una imagen de fondo/entorno para fusionar la prenda o el modelo perfectamente en ella. La imagen generada girará en torno a esta escena.</p>
               
               <div 
                  className="w-full sm:w-80 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative flex flex-col items-center justify-center overflow-hidden min-h-[120px]"
                  onClick={() => enhanceSceneInputRef.current?.click()}
               >
                  <input type="file" ref={enhanceSceneInputRef} className="hidden" accept="image/*" onChange={handleEnhanceSceneFileChange}/>
                  {enhanceScenePhoto ? (
                    <>
                      <img src={enhanceScenePhoto.originalUrl} alt="Scene" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Cambiar</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-neutral-400 mb-2" size={24} />
                      <span className="text-sm text-neutral-500 font-medium leading-tight">Escena fondo<br/><span className="font-normal text-xs">(Opcional)</span></span>
                    </>
                  )}
               </div>
            </div>
          )}
        </div>
        )}

        {appMode === 'enhance' && (
          <>
        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-neutral-300 rounded-3xl bg-white p-12 text-center hover:bg-neutral-50 transition-colors cursor-pointer group shadow-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Upload className="text-neutral-600" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sube fotos de tu ropa</h3>
          <p className="text-neutral-500 max-w-md mx-auto text-sm leading-relaxed">
            Tirá tus fotos acá, hacé clic para buscar o pegalas (Ctrl+V) perro. Te las vamos a dejar re chetas con maniquí invisible o onda modelos de alta costura, manteniendo todos los detalles para que la prenda se vea facha facha.
          </p>
        </div>

        {/* Action Bar */}
        {photos.length > 0 && (
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Tus Fotos ({photos.length})</h2>
            <button 
              onClick={enhanceAll}
              className="bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm active:scale-95"
            >
              <Sparkles size={16} />
              Mejorar Pendientes
            </button>
          </div>
        )}

        {/* Photos Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {photos.map((photo) => (
              <motion.div 
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm flex flex-col"
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                  <div className="flex items-center gap-3 text-sm font-medium text-neutral-700 truncate">
                    <div className="p-1.5 bg-white rounded-md shadow-sm border border-neutral-200">
                      <ImageIcon size={14} className="text-neutral-500" />
                    </div>
                    <span className="truncate max-w-[200px]">{photo.originalFile.name}</span>
                  </div>
                  <button 
                    onClick={() => removePhoto(photo.id)}
                    className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Images Area */}
                <div className="p-5 flex-1 flex flex-col sm:flex-row gap-5">
                  {/* Original */}
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Original</span>
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-inner">
                      <img src={photo.originalUrl} alt="Original" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Enhanced */}
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Mejorada</span>
                      {photo.status === 'success' && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full"><Sparkles size={10}/> Lista</span>}
                    </span>
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-200 flex items-center justify-center shadow-inner">
                      {photo.status === 'idle' && (
                        <div className="text-center p-4">
                          <p className="text-sm text-neutral-500 mb-4">Aún no generada</p>
                          <button 
                            onClick={() => enhancePhoto(photo.id)}
                            className="bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm active:scale-95"
                          >
                            Generar Ahora
                          </button>
                        </div>
                      )}
                      
                      {photo.status === 'loading' && (
                        <div className="flex flex-col items-center text-neutral-500">
                          <Loader2 className="animate-spin mb-3 text-neutral-400" size={28} />
                          <span className="text-sm font-medium">Procesando...</span>
                        </div>
                      )}

                      {photo.status === 'success' && photo.enhancedUrl && (
                        <img 
                          src={photo.enhancedUrl} 
                          alt="Mejorada" 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setEnlargedImage(photo.enhancedUrl || null)}
                        />
                      )}

                      {photo.status === 'error' && (
                        <div className="text-center p-4 text-red-500">
                          <p className="text-sm font-medium mb-2">Error al generar</p>
                          <p className="text-xs opacity-80 mb-4 px-2 text-center">{photo.error}</p>
                          <button 
                            onClick={() => enhancePhoto(photo.id)}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5 mx-auto active:scale-95"
                          >
                            <RefreshCw size={14} /> Reintentar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                {photo.status === 'success' && photo.enhancedUrl && (
                  <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
                    <button
                      onClick={() => enhancePhoto(photo.id)}
                      className="bg-white border border-neutral-200 text-neutral-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      <RefreshCw size={16} />
                      Mandar de nuevo
                    </button>
                    <button
                      onClick={() => openAddCollectionModal(photo.enhancedUrl!)}
                      className="bg-white border border-neutral-200 text-neutral-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      <FolderPlus size={16} />
                      Guardar
                    </button>
                    <a 
                      href={photo.enhancedUrl} 
                      download={`enhanced-${photo.originalFile.name}`}
                      className="bg-white border border-neutral-200 text-neutral-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      <Download size={16} />
                      Descargar HD
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
          </>
        )}
        
        {appMode === 'colorswap' && (
          /* Color Swap Mode UI */
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Generador de Variaciones de Color</h2>
              <p className="text-neutral-500">Sube una imagen base de tu producto, luego sube imágenes de referencia que contengan los colores que deseas aplicar. Generaremos tu producto base en todos esos colores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Base Image Section */}
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shirt size={20}/> 1. Producto Base</h3>
                <div 
                  className="border-2 border-dashed border-neutral-300 rounded-3xl bg-white p-6 text-center hover:bg-neutral-50 transition-colors cursor-pointer group shadow-sm"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        setBaseColorImage({
                          id: 'base',
                          originalFile: file,
                          originalUrl: URL.createObjectURL(file),
                          status: 'idle'
                        });
                      }
                    }
                  }}
                  onClick={() => baseInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={baseInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setBaseColorImage({
                          id: 'base',
                          originalFile: file,
                          originalUrl: URL.createObjectURL(file),
                          status: 'idle'
                        });
                      }
                    }}
                  />
                  {baseColorImage ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-inner">
                      <img src={baseColorImage.originalUrl} alt="Base" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Cambiar Base</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12">
                      <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                        <Upload className="text-neutral-600" size={24} />
                      </div>
                      <p className="text-sm text-neutral-500">Subir imagen base</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color References Section */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Palette size={20}/> 2. Referencias de Color</h3>
                  {colorReferences.length > 0 && baseColorImage && (
                    <button 
                      onClick={generateAllColors}
                      className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm active:scale-95"
                    >
                      <Sparkles size={16} />
                      Generar Todos los Colores
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-3xl bg-white p-6 text-center hover:bg-neutral-50 transition-colors cursor-pointer group shadow-sm aspect-square flex flex-col items-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const newPhotos = Array.from(e.dataTransfer.files)
                          .filter((file: File) => file.type.startsWith('image/'))
                          .map((file: File) => ({
                            id: Math.random().toString(36).substring(7),
                            originalFile: file,
                            originalUrl: URL.createObjectURL(file),
                            status: 'idle' as const,
                          }));
                        setColorReferences(prev => [...prev, ...newPhotos]);
                      }
                    }}
                    onClick={() => colorInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={colorInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newPhotos = Array.from(e.target.files).map((file: File) => ({
                            id: Math.random().toString(36).substring(7),
                            originalFile: file,
                            originalUrl: URL.createObjectURL(file),
                            status: 'idle' as const,
                          }));
                          setColorReferences(prev => [...prev, ...newPhotos]);
                        }
                        if (colorInputRef.current) colorInputRef.current.value = '';
                      }}
                    />
                    <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                      <Upload className="text-neutral-600" size={20} />
                    </div>
                    <p className="text-xs text-neutral-500">Añadir colores</p>
                  </div>

                  {colorReferences.map((ref) => (
                    <div key={ref.id} className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-neutral-200 shadow-sm group">
                      {ref.status === 'success' && ref.enhancedUrl ? (
                        <img 
                          src={ref.enhancedUrl} 
                          alt="Generated Color" 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setEnlargedImage(ref.enhancedUrl || null)}
                        />
                      ) : (
                        <img src={ref.originalUrl} alt="Color Reference" className="w-full h-full object-cover opacity-50" />
                      )}
                      
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        {ref.status === 'success' && ref.enhancedUrl && (
                          <button
                            onClick={() => generateColorVariation(ref.id)}
                            className="bg-white/90 backdrop-blur text-neutral-800 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                            title="Mandar de nuevo"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        {ref.status === 'success' && ref.enhancedUrl && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openAddCollectionModal(ref.enhancedUrl!)}
                              className="bg-white/90 backdrop-blur text-neutral-800 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                              title="Guardar en colección"
                            >
                              <FolderPlus size={14} />
                            </button>
                            <a 
                              href={ref.enhancedUrl}
                              download={`color-variant-${ref.id}`}
                              className="bg-white/90 backdrop-blur text-neutral-800 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                              title="Descargar HD"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorReferences(prev => prev.filter(p => p.id !== ref.id));
                          }}
                          className="bg-white/90 backdrop-blur text-red-500 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {ref.status === 'idle' && baseColorImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => generateColorVariation(ref.id)}
                            className="bg-white text-neutral-900 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm"
                          >
                            Generar
                          </button>
                        </div>
                      )}

                      {ref.status === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                          <Loader2 className="animate-spin mb-2 text-neutral-900" size={20} />
                          <span className="text-xs font-medium">Procesando...</span>
                        </div>
                      )}

                      {ref.status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm p-2 text-center">
                          <p className="text-xs text-red-500 font-medium mb-2">Error</p>
                          <button 
                            onClick={() => generateColorVariation(ref.id)}
                            className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            <RefreshCw size={12} /> Reintentar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {appMode === 'duo' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Múltiples Modelos (Dúo)</h2>
              <p className="text-neutral-500">Sube dos prendas distintas. Generaremos una foto realista de dos modelos posando juntos, cada uno vistiendo una prenda diferente.</p>
            </div>

            {/* Duo Configuration */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Person 1 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Persona 1</h3>
                  
                  {/* Upload Image 1 */}
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          setDuoImage1({ id: 'd1', originalFile: file, originalUrl: URL.createObjectURL(file), status: 'idle' });
                        }
                      }
                    }}
                    onClick={() => duoInput1Ref.current?.click()}
                  >
                    <input type="file" ref={duoInput1Ref} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setDuoImage1({ id: 'd1', originalFile: file, originalUrl: URL.createObjectURL(file), status: 'idle' });
                      }
                    }}/>
                    {duoImage1 ? (
                      <>
                        <img src={duoImage1.originalUrl} alt="Persona 1" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium">Prenda Persona 1</span>
                      </>
                    )}
                  </div>

                  {/* Gender 1 */}
                  <div className="bg-neutral-100 p-1 rounded-xl flex">
                    <button onClick={() => setDuoModel1('male')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${duoModel1 === 'male' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Hombre</button>
                    <button onClick={() => setDuoModel1('female')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${duoModel1 === 'female' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Mujer</button>
                  </div>
                </div>

                {/* Person 2 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Persona 2</h3>
                  
                  {/* Upload Image 2 */}
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          setDuoImage2({ id: 'd2', originalFile: file, originalUrl: URL.createObjectURL(file), status: 'idle' });
                        }
                      }
                    }}
                    onClick={() => duoInput2Ref.current?.click()}
                  >
                    <input type="file" ref={duoInput2Ref} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setDuoImage2({ id: 'd2', originalFile: file, originalUrl: URL.createObjectURL(file), status: 'idle' });
                      }
                    }}/>
                    {duoImage2 ? (
                      <>
                        <img src={duoImage2.originalUrl} alt="Persona 2" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium">Prenda Persona 2</span>
                      </>
                    )}
                  </div>

                  {/* Gender 2 */}
                  <div className="bg-neutral-100 p-1 rounded-xl flex">
                    <button onClick={() => setDuoModel2('male')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${duoModel2 === 'male' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Hombre</button>
                    <button onClick={() => setDuoModel2('female')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${duoModel2 === 'female' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Mujer</button>
                  </div>
                </div>
              </div>

              {/* Shared Styles */}
              <div className="mt-8 pt-6 border-t border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 text-center">Entorno Compartido</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Aesthetic */}
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 mb-2 block">Estética</span>
                    <select 
                      value={modelAesthetic} 
                      onChange={(e) => setModelAesthetic(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    >
                      <option value="casual">Casual</option>
                      <option value="chic">Chic</option>
                      <option value="street">Streetwear</option>
                      <option value="elegant">Elegante</option>
                      <option value="elegant_sport">Elegante Sport</option>
                      <option value="sporty">Deportivo</option>
                    </select>
                  </div>

                  {/* Pose */}
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 mb-2 block">Interacción</span>
                    <select 
                      value={duoPose} 
                      onChange={(e) => setDuoPose(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    >
                      <option value="together">Juntos (Casual)</option>
                      <option value="walking">Caminando</option>
                      <option value="back_to_back">Espalda con espalda</option>
                      <option value="editorial">Editorial (Moda)</option>
                    </select>
                  </div>

                  {/* Background */}
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 mb-2 block">Tipo de Fondo</span>
                    <select 
                      value={bgType} 
                      onChange={(e) => setBgType(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-none mb-3"
                    >
                      <option value="scene">Escena Realista</option>
                      <option value="solid">Color Sólido</option>
                    </select>

                    {bgType === 'scene' ? (
                        <select 
                          value={modelBackground} 
                          onChange={(e) => setModelBackground(e.target.value as any)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                        >
                          <option value="studio">Estudio</option>
                          <option value="urban">Urbano</option>
                          <option value="nature">Naturaleza</option>
                          <option value="interior">Interior</option>
                        </select>
                    ) : (
                        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2">
                           <input type="color" value={solidBgColor} onChange={(e) => setSolidBgColor(e.target.value)} className="w-8 h-8 rounded-md cursor-pointer border-0 bg-transparent p-0" />
                           <span className="font-mono text-sm uppercase text-neutral-600">{solidBgColor}</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button Wrapper */}
              <div className="mt-8 text-center flex justify-center">
                <button 
                  onClick={generateDuoPhoto}
                  disabled={!duoImage1 || !duoImage2 || duoResult.status === 'loading'}
                  className="bg-neutral-900 text-white px-8 py-3.5 rounded-xl text-base font-medium flex items-center gap-2 hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                >
                  {duoResult.status === 'loading' ? (
                    <><Loader2 className="animate-spin" size={20} /> Generando Dúo...</>
                  ) : (
                    <><Users size={20} /> Generar Foto Dúo</>
                  )}
                </button>
              </div>
            </div>

            {/* Duo Result */}
            {(duoResult.status === 'success' || duoResult.status === 'error') && (
              <div className="max-w-3xl mx-auto bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden">
                {duoResult.status === 'error' ? (
                   <div className="p-8 text-center text-red-500">
                     <p className="font-semibold mb-2">Error al generar la foto conjunta.</p>
                     <p className="text-sm opacity-80">{duoResult.error}</p>
                   </div>
                ) : (
                   <div className="relative aspect-[4/5] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center">
                     <img 
                       src={duoResult.url} 
                       alt="Duo Result" 
                       className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                       onClick={() => setEnlargedImage(duoResult.url)}
                     />
                     <div className="absolute top-4 right-4 flex gap-2 z-10">
                       <button
                         onClick={generateDuoPhoto}
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <RefreshCw size={16} /> Mandar de nuevo
                       </button>
                       <a 
                         href={duoResult.url}
                         download="vura-duo-photo.png"
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <Download size={16} /> Descargar HD
                       </a>
                       <button
                         onClick={() => openAddCollectionModal(duoResult.url)}
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <FolderPlus size={16} /> Guardar
                       </button>
                     </div>
                   </div>
                )}
              </div>
            )}

          </div>
        )}
        
        {appMode === 'lookbook' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Lookbook Completo (Top + Bottom)</h2>
              <p className="text-neutral-500">Sube una prenda superior, una inferior, o ambas. Generaremos una foto realista de un modelo vistiendo el outfit completo según tu descripción.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Top Garment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Superior</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
                    onClick={() => lookbookTopInputRef.current?.click()}
                  >
                    <input type="file" ref={lookbookTopInputRef} className="hidden" accept="image/*" onChange={handleLookbookTopFileChange}/>
                    {lookbookTopPhoto ? (
                      <>
                        <img src={lookbookTopPhoto.originalUrl} alt="Top" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium leading-tight">Sube top<br/><span className="text-xs font-normal">(O una sola prenda)</span></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Garment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Inferior</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
                    onClick={() => lookbookBottomInputRef.current?.click()}
                  >
                    <input type="file" ref={lookbookBottomInputRef} className="hidden" accept="image/*" onChange={handleLookbookBottomFileChange}/>
                    {lookbookBottomPhoto ? (
                      <>
                        <img src={lookbookBottomPhoto.originalUrl} alt="Bottom" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium leading-tight">Sube pantalón<br/><span className="text-xs font-normal">(O una sola prenda)</span></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Scene/Background */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2 flex gap-2 items-center justify-center md:justify-start">Entorno (Opcional)</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
                    onClick={() => lookbookSceneInputRef.current?.click()}
                  >
                    <input type="file" ref={lookbookSceneInputRef} className="hidden" accept="image/*" onChange={handleLookbookSceneFileChange}/>
                    {lookbookScenePhoto ? (
                      <>
                        <img src={lookbookScenePhoto.originalUrl} alt="Scene" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium leading-tight">Escena fondo<br/><span className="font-normal text-xs">(Opcional)</span></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Modelo a usar (Opcional)</label>
                    <select
                      value={lookbookModelId}
                      onChange={(e) => setLookbookModelId(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="random">Cualquier modelo (Automático)</option>
                      {savedModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name || 'Modelo Guardado'}</option>
                      ))}
                    </select>
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Directriz de Escena y Estilo</label>
                    <textarea 
                      value={lookbookPrompt}
                      onChange={(e) => setLookbookPrompt(e.target.value)}
                      placeholder="Ej: Caminando por la calle de Nueva York de día, mirando el celular con auriculares, cámara cuerpo entero estilo Wanama/Tucci, ambiente urbano, alta calidad."
                      className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none font-medium"
                    />
                 </div>
              </div>

              <button 
                onClick={generateLookbookPhoto}
                disabled={lookbookResult.status === 'loading' || (!lookbookTopPhoto && !lookbookBottomPhoto)}
                className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-8"
              >
                {lookbookResult.status === 'loading' ? (
                  <><Loader2 className="animate-spin" size={20} /> Generando Outfit Completo...</>
                ) : (
                  <><Sparkles size={20} /> Generar Lookbook</>
                )}
              </button>
            </div>

            {/* Lookbook Result */}
            {lookbookResult.status !== 'idle' && (
              <div className="max-w-4xl mx-auto">
                 {lookbookResult.status === 'loading' && (
                    <div className="bg-white p-12 rounded-3xl border border-neutral-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <Loader2 className="animate-spin text-neutral-900 mb-4" size={40} />
                      <h4 className="text-lg font-bold text-neutral-900">Analizando prendas y generando outfit...</h4>
                      <p className="text-neutral-500 mt-2">Estamos vistiendo al modelo y aplicando el entorno. Esto puede tomar unos segundos.</p>
                    </div>
                 )}
                 {lookbookResult.status === 'error' && (
                    <div className="bg-red-50 p-12 rounded-3xl border border-red-200 flex flex-col items-center justify-center text-center">
                      <p className="text-red-500 font-bold text-lg mb-2">Error al generar la imagen</p>
                      <p className="text-red-400">{lookbookResult.error}</p>
                    </div>
                 )}
                 {lookbookResult.status === 'success' && lookbookResult.url && (
                    <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm overflow-hidden relative group">
                      <img src={lookbookResult.url} alt="Lookbook Generado" className="w-full h-auto rounded-2xl" />
                      <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={lookbookResult.url} 
                          download="lookbook-vura.jpg"
                          className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                        >
                          <Download size={16} /> Descargar
                        </a>
                        <button
                          onClick={() => openAddCollectionModal(lookbookResult.url)}
                          className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                        >
                          <FolderPlus size={16} /> Guardar
                        </button>
                      </div>
                    </div>
                 )}
              </div>
            )}
          </div>
        )}

        {appMode === 'banners' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Secciones y Campañas</h2>
              <p className="text-neutral-500">Crea banners temáticos para tu tienda. Puedes generar imágenes conceptuales o incluir una de tus prendas para que el modelo la use en la campaña.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Optional Product Upload */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Prenda Central (Opcional)</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-square flex flex-col items-center justify-center overflow-hidden"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setBannerProduct({ id: 'b1', originalFile: file, originalUrl: URL.createObjectURL(file), status: 'idle' });
                      }
                    }}/>
                    {bannerProduct ? (
                      <>
                        <img src={bannerProduct.originalUrl} alt="Prenda Base" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Cambiar Prenda</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-2" size={24} />
                        <span className="text-sm text-neutral-500 font-medium px-4">Sube un producto (opcional). Si no subes nada, generaremos una imagen conceptual de categoría.</span>
                      </>
                    )}
                  </div>
                  {bannerProduct && (
                    <button onClick={() => setBannerProduct(null)} className="w-full text-xs text-red-500 hover:text-red-600 font-medium mt-1 uppercase tracking-wide flex items-center justify-center gap-1 group">
                      <X size={14} className="group-hover:scale-110 transition-transform"/> Eliminar Prenda
                    </button>
                  )}
                </div>

                {/* Banner Settings */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2">Configuración</h3>
                    
                    <div>
                      <span className="text-xs font-semibold text-neutral-500 mb-2 block">Temática de Colección</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setBannerTheme('deportivo')} className={`py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'deportivo' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Deportivo</button>
                        <button onClick={() => setBannerTheme('urbano')} className={`py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'urbano' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Urbano</button>
                        <button onClick={() => setBannerTheme('elegante')} className={`py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'elegante' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Elegante</button>
                        <button onClick={() => setBannerTheme('sneakers')} className={`py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'sneakers' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Sneakers</button>
                        <button onClick={() => setBannerTheme('smart_casual')} className={`col-span-2 py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'smart_casual' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Smart Casual (Elegante Sport)</button>
                        <button onClick={() => setBannerTheme('mix')} className={`col-span-2 py-2 rounded-xl text-sm font-medium transition-all ${bannerTheme === 'mix' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 border-2 border-dashed border-neutral-300 text-neutral-600 hover:bg-neutral-100'}`}>Mix de todo el catálogo</button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-neutral-500 mb-2 block">Formato (Aspect Ratio)</span>
                      <div className="space-y-2">
                        <button onClick={() => setBannerOrientation('landscape')} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${bannerOrientation === 'landscape' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>
                          <LayoutTemplate size={16} /> Horizontal (Hero Banner)
                        </button>
                        <button onClick={() => setBannerOrientation('portrait')} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${bannerOrientation === 'portrait' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>
                          <Layers size={16} /> Vertical (Mobile/Stories)
                        </button>
                        <button onClick={() => setBannerOrientation('square')} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${bannerOrientation === 'square' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>
                          <ImageIcon size={16} /> Cuadrado (Instagram/Grid)
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-neutral-500 mb-2 block">Fondo de Campaña</span>
                      <div className="space-y-2">
                        <button onClick={() => setBannerBgType('dynamic')} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${bannerBgType === 'dynamic' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>
                          <Sparkles size={16} /> Fondo Dinámico
                        </button>
                        <div className="flex gap-2">
                          <button onClick={() => setBannerBgType('solid')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${bannerBgType === 'solid' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>
                            <Palette size={16} /> Color Sólido
                          </button>
                          {bannerBgType === 'solid' && (
                            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1">
                               <input type="color" value={bannerSolidBgColor} onChange={(e) => setBannerSolidBgColor(e.target.value)} className="w-8 h-8 rounded-md cursor-pointer border-0 bg-transparent p-0" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Generate Button Wrapper */}
              <div className="mt-8 text-center flex justify-center border-t border-neutral-100 pt-6">
                <button 
                  onClick={generateBanner}
                  disabled={bannerResult.status === 'loading'}
                  className="bg-neutral-900 text-white px-8 py-3.5 rounded-xl text-base font-medium flex items-center gap-2 hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                >
                  {bannerResult.status === 'loading' ? (
                    <><Loader2 className="animate-spin" size={20} /> Generando Campaña...</>
                  ) : (
                    <><Sparkles size={20} /> Generar Banner HQ</>
                  )}
                </button>
              </div>
            </div>

            {/* Banner Result */}
            {(bannerResult.status === 'success' || bannerResult.status === 'error') && (
              <div className="max-w-4xl mx-auto bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden">
                {bannerResult.status === 'error' ? (
                   <div className="p-8 text-center text-red-500">
                     <p className="font-semibold mb-2">Error al generar la campaña.</p>
                     <p className="text-sm opacity-80">{bannerResult.error}</p>
                   </div>
                ) : (
                   <div className={`relative rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center ${bannerOrientation === 'landscape' ? 'aspect-video' : bannerOrientation === 'portrait' ? 'aspect-[9/16] max-h-[80vh] w-auto mx-auto' : 'aspect-square max-w-lg mx-auto'}`}>
                     <img 
                       src={bannerResult.url} 
                       alt="Campaign Result" 
                       className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                       onClick={() => setEnlargedImage(bannerResult.url)}
                     />
                     <div className="absolute top-4 right-4 flex gap-2 z-10">
                       <button
                         onClick={generateBanner}
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <RefreshCw size={16} />  Mandar de nuevo
                       </button>
                       <a 
                         href={bannerResult.url}
                         download="vura-campaign-banner.png"
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <Download size={16} /> Descargar Banner HQ
                       </a>
                       <button
                         onClick={() => openAddCollectionModal(bannerResult.url)}
                         className="bg-white/90 backdrop-blur text-neutral-900 px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold shadow-md hover:bg-white transition-all transform hover:scale-105"
                       >
                         <FolderPlus size={16} /> Guardar
                       </button>
                     </div>
                   </div>
                )}
              </div>
            )}

          </div>
        )}

        {appMode === 'copywriter' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Generador de Textos de Venta</h2>
              <p className="text-neutral-500">Crea descripciones de productos que venden. Sube una imagen de tu ropa y la inteligencia artificial escribirá los nombres comerciales, las características de la tela y blindará tu copy para evitar problemas de marca registrada.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2 text-center md:text-left">1. Foto del Producto</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-[4/5] flex flex-col items-center justify-center overflow-hidden max-w-xs mx-auto md:max-w-none md:mx-0 w-full"
                    onClick={() => copyFileInputRef.current?.click()}
                  >
                    <input type="file" ref={copyFileInputRef} className="hidden" accept="image/*" onChange={handleCopywriterFileChange}/>
                    {copywriterPhoto ? (
                      <>
                        <img src={copywriterPhoto.originalUrl} alt="Producto a evaluar" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <Upload className="text-white mb-2" size={24} />
                          <span className="text-white text-sm font-medium px-4">Toca para cambiar de prenda</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-3" size={32} />
                        <span className="text-sm text-neutral-500 font-medium px-4">Toca para subir la foto principal del producto que quieres vender.</span>
                      </>
                    )}
                  </div>
                  
                  <textarea
                    placeholder="Instrucciones extra (ej: 'Campera bomber satén porsche')..."
                    value={copywriterContext}
                    onChange={(e) => setCopywriterContext(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none h-20"
                  />
                  
                  <button 
                    onClick={generateCopy}
                    disabled={!copywriterPhoto || isGeneratingCopy}
                    className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
                  >
                    {isGeneratingCopy ? <><Loader2 className="animate-spin" size={20} /> Escribiendo y Analizando...</> : <><Sparkles size={20} /> Transformar en Producto Épico</>}
                  </button>
                </div>
                
                <div className="space-y-4 h-full flex flex-col">
                   <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2 text-center md:text-left">2. Chat con Copywriter</h3>
                   <div className="bg-neutral-50/50 rounded-2xl p-6 flex-1 h-[450px] border border-neutral-200 shadow-inner overflow-y-auto flex flex-col gap-4">
                     {copywriterMessages.length > 0 ? (
                       copywriterMessages.filter(msg => !(msg.role === 'user' && msg.isInitial)).map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-800 shadow-sm'} text-sm font-medium leading-relaxed font-sans whitespace-pre-wrap`}>
                             {msg.text}
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center py-12">
                         <LayoutTemplate size={48} className="mb-4 opacity-30" />
                         <p className="max-w-[280px]">Aquí aparecerá el nombre del producto, la descripción vendedora, las especificaciones técnicas y los tags para SEO.</p>
                       </div>
                     )}
                   </div>
                   
                   <form onSubmit={handleSendCopywriterMessage} className="flex gap-2">
                     <textarea
                       placeholder="Pídele ajustes (Shift+Enter salto, Enter enviar)..."
                       value={copywriterInput}
                       onChange={(e) => setCopywriterInput(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleSendCopywriterMessage(e as any);
                         }
                       }}
                       disabled={isGeneratingCopy || copywriterMessages.length === 0}
                       className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:opacity-50 disabled:bg-neutral-50 resize-none"
                       rows={Math.min(5, Math.max(1, copywriterInput.split('\n').length))}
                     />
                     <button
                       type="submit"
                       disabled={isGeneratingCopy || !copywriterInput.trim() || copywriterMessages.length === 0}
                       className="bg-neutral-900 text-white px-4 py-3 rounded-xl flex items-center justify-center hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                     >
                       {isGeneratingCopy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                     </button>
                   </form>
                </div>
              </div>
            </div>
          </div>
        )}
        {appMode === 'upscale' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Enhancer 200%</h2>
              <p className="text-neutral-500">Mejora la resolución, los detalles y la iluminación de una imagen sin alterar el diseño original del producto. Ideal para fotos borrosas o de baja calidad.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2 text-center md:text-left">1. Sube tu imagen original</h3>
                  <div 
                    className="border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors cursor-pointer group shadow-inner relative aspect-square flex flex-col items-center justify-center overflow-hidden w-full"
                    onClick={() => upscaleInputRef.current?.click()}
                  >
                    <input type="file" ref={upscaleInputRef} className="hidden" accept="image/*" onChange={handleUpscaleFileChange}/>
                    {upscalePhoto ? (
                      <>
                        <img src={upscalePhoto.originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <Upload className="text-white mb-2" size={24} />
                          <span className="text-white text-sm font-medium px-4">Toca para cambiar imagen</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400 mb-3" size={32} />
                        <span className="text-sm text-neutral-500 font-medium px-4">Sube la foto que quieres mejorar en un 200%.</span>
                      </>
                    )}
                  </div>
                  
                  <button 
                    onClick={generateUpscale}
                    disabled={!upscalePhoto || upscalePhoto.status === 'loading'}
                    className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
                  >
                    {upscalePhoto?.status === 'loading' ? <><Loader2 className="animate-spin" size={20} /> Mejorando Calidad...</> : <><ZoomIn size={20} /> Mejorar 200%</>}
                  </button>
                </div>
                
                <div className="space-y-4 h-full flex flex-col">
                   <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-2 text-center md:text-left">2. Resultado Mejorado</h3>
                   <div className="bg-neutral-50 rounded-2xl flex-1 border border-neutral-200 shadow-inner overflow-hidden relative aspect-square flex items-center justify-center">
                     {upscalePhoto?.status === 'success' && upscalePhoto.enhancedUrl ? (
                        <>
                          <img 
                            src={upscalePhoto.enhancedUrl} 
                            alt="Resultado Mejorado" 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setEnlargedImage(upscalePhoto.enhancedUrl || null)}
                          />
                          <div className="absolute top-4 right-4 flex gap-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddCollectionModal(upscalePhoto.enhancedUrl!);
                              }}
                              className="bg-white/90 backdrop-blur text-neutral-900 p-2.5 rounded-full hover:bg-white transition-colors shadow-sm"
                              title="Guardar en Colección"
                            >
                              <FolderPlus size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = upscalePhoto.enhancedUrl!;
                                link.download = 'vura_enhanced.jpg';
                                link.click();
                              }}
                              className="bg-white/90 backdrop-blur text-neutral-900 p-2.5 rounded-full hover:bg-white transition-colors shadow-sm"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </>
                     ) : upscalePhoto?.status === 'loading' ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                         <p className="text-sm font-medium text-neutral-600">Mejorando texturas e iluminación...</p>
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center py-12">
                         <ZoomIn size={48} className="mb-4 opacity-30" />
                         <p className="max-w-[280px]">Aquí aparecerá tu imagen con calidad aumentada 200% y texturas hiper-realistas.</p>
                       </div>
                     )}
                     
                     {upscalePhoto?.status === 'error' && (
                        <div className="absolute inset-x-4 bottom-4 p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                          <p className="text-sm text-red-600 font-medium">
                            {upscalePhoto.error || 'Error al mejorar la imagen. Intenta de nuevo.'}
                          </p>
                        </div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {appMode === 'models_library' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Modelos</h2>
              <p className="text-neutral-500">Crea modelos hiper-realistas mediante inteligencia artificial o sube fotos de modelos existentes para añadirlos a tu biblioteca.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm max-w-5xl mx-auto flex flex-col gap-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch border-b border-neutral-100 pb-8">
                  {/* GENERAR MODELO */}
                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2 mb-4"><Sparkles className="text-indigo-600" size={20}/> Generar con IA</h3>
                     <textarea
                        value={libraryModelPrompt}
                        onChange={(e) => setLibraryModelPrompt(e.target.value)}
                        placeholder="Ej: Mujer asiática de 25 años, pecas, cabello oscuro, estilo urbano..."
                        className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        disabled={isGeneratingLibraryModel}
                     />
                     <button 
                        onClick={generateLibraryModel}
                        disabled={!libraryModelPrompt.trim() || isGeneratingLibraryModel}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                     >
                        {isGeneratingLibraryModel ? <><Loader2 className="animate-spin" size={18} /> Generando...</> : 'Generar Modelo'}
                     </button>
                     {libraryModelError && <p className="text-xs text-red-600 font-medium text-center">{libraryModelError}</p>}
                     
                     {generatedLibraryModelUrl && !isGeneratingLibraryModel && (
                       <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50 rounded-2xl">
                          <img src={generatedLibraryModelUrl} className="w-full aspect-square object-cover rounded-xl mb-3 cursor-pointer" onClick={() => setEnlargedImage(generatedLibraryModelUrl)} />
                          <button onClick={saveLibraryModel} className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700"><Download size={16}/> Guardar Generado</button>
                       </div>
                     )}
                  </div>

                  {/* SUBIR MODELO */}
                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2 mb-4"><Camera className="text-indigo-600" size={20}/> Subir Existente</h3>
                     
                     <div 
                        onClick={() => uploadModelInputRef.current?.click()}
                        className={`w-full ${!uploadedModelFile ? 'h-24' : 'py-3'} border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors text-neutral-500`}
                     >
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm font-medium text-center px-4">{uploadedModelFile ? 'Cambiar Foto' : 'Sube o pega (Ctrl+V) una Foto'}</span>
                        <input 
                           type="file" 
                           ref={uploadModelInputRef} 
                           className="hidden" 
                           accept="image/*" 
                           onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                 analyzeUploadedModel(e.target.files[0]);
                              }
                           }}
                        />
                     </div>

                     {isAnalyzingModel && (
                        <div className="flex items-center justify-center gap-2 py-8 text-neutral-500">
                           <Loader2 className="animate-spin" size={20} />
                           <span className="text-sm">IA Analizando modelo...</span>
                        </div>
                     )}

                     {uploadedModelFile && !isAnalyzingModel && (
                        <div className="mt-4 border border-neutral-200 rounded-2xl p-4 bg-neutral-50">
                           <div className="flex gap-4 mb-4">
                              <img src={uploadedModelFile.url} className="w-24 h-24 object-cover rounded-xl border border-neutral-200" />
                              <div className="flex-1">
                                 <p className="text-xs text-neutral-500 mb-1">Análisis de IA:</p>
                                 <p className="text-sm text-neutral-800 leading-snug">{uploadedModelAnalysis?.description || 'Modelo seleccionado'}</p>
                              </div>
                           </div>
                           <div className="space-y-3">
                              <div>
                                 <label className="text-xs font-semibold text-neutral-500 ml-1">Nombre sugerido (puedes cambiarlo)</label>
                                 <input 
                                    type="text" 
                                    value={modelNameInput}
                                    onChange={(e) => setModelNameInput(e.target.value)}
                                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                 />
                              </div>
                              <button onClick={saveUploadedModel} disabled={!modelNameInput.trim()} className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                                 <Download size={16}/> Guardar Modelo
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* List of saved models */}
            <div className="max-w-5xl mx-auto mt-12">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Layers size={24} className="text-indigo-600"/> Mis Modelos Guardados</h3>
               
               {savedModels.length === 0 ? (
                 <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-12 text-center text-neutral-500">
                    <User size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No tienes modelos guardados todavía. Usa el panel de arriba para añadir uno.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {savedModels.map(model => (
                      <div key={model.id} className="relative bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm group">
                         <div className="aspect-[3/4] relative">
                            <img src={model.originalUrl} className="w-full h-full object-cover" alt={model.name || 'Saved Model'} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <button
                                  onClick={() => setEnlargedImage(model.originalUrl)}
                                  className="bg-white/90 text-neutral-900 p-2 rounded-full hover:bg-white shadow-sm"
                                  title="Ver más grande"
                                >
                                   <ZoomIn size={18} />
                                </button>
                                <button
                                  onClick={() => updateSavedModels((prev: any) => prev.filter((m: any) => m.id !== model.id))}
                                  className="bg-red-500/90 text-white p-2 rounded-full hover:bg-red-500 shadow-sm"
                                  title="Eliminar"
                                >
                                   <X size={18} />
                                </button>
                            </div>
                         </div>
                         <div className="p-3">
                            <p className="text-sm font-semibold text-neutral-800 line-clamp-1">{model.name || 'Modelo'}</p>
                            {model.description && <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-tight">{model.description}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}
        {appMode === 'collections' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Mis Colecciones</h2>
              <p className="text-neutral-500">Aquí puedes ver, organizar y descargar todas las imágenes que has guardado desde las distintas herramientas.</p>
            </div>

            <div className="max-w-6xl mx-auto">
               {collections.length === 0 ? (
                 <div className="bg-white border border-neutral-200 rounded-3xl p-16 text-center text-neutral-500 flex flex-col items-center shadow-sm">
                    <Folder size={64} className="mb-6 opacity-20 text-indigo-600" />
                    <h3 className="text-xl font-bold text-neutral-800 mb-2">No tienes colecciones aún</h3>
                    <p className="max-w-md mx-auto">Genera imágenes en cualquier herramienta y presiona el botón "Guardar" para añadirlas a tus colecciones.</p>
                 </div>
               ) : (
                 <div className="space-y-12">
                   {collections.map(collection => (
                     <div key={collection.id} className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
                        <div className="flex justify-between items-end mb-8 border-b border-neutral-100 pb-4">
                           <div>
                             <h3 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                               <Folder className="text-indigo-600" size={24} /> {collection.name}
                             </h3>
                             <p className="text-sm text-neutral-500 mt-1">{collection.images.length} {collection.images.length === 1 ? 'imagen' : 'imágenes'}</p>
                           </div>
                           <button 
                             onClick={() => {
                                if(confirm(`¿Estás seguro de eliminar la colección "${collection.name}"?`)) {
                                   updateCollections((prev: Collection[]) => prev.filter(c => c.id !== collection.id));
                                }
                             }}
                             className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                           >
                             <X size={14} /> Eliminar Colección
                           </button>
                        </div>
                        
                        {collection.images.length === 0 ? (
                           <p className="text-neutral-400 text-sm italic">No hay imágenes en esta colección.</p>
                        ) : (
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                              {collection.images.map(img => (
                                 <div key={img.id} className="relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 group">
                                    <img src={img.url} className="w-full h-full object-cover" alt="Saved" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <button
                                          onClick={() => setEnlargedImage(img.url)}
                                          className="bg-white/90 text-neutral-900 p-2 rounded-full hover:bg-white shadow-sm"
                                          title="Ver más grande"
                                        >
                                           <ZoomIn size={18} />
                                        </button>
                                        <a
                                          href={img.url}
                                          download={`vura-${collection.name.replace(/\s+/g, '-').toLowerCase()}-${img.id}.png`}
                                          className="bg-indigo-600/90 text-white p-2 rounded-full hover:bg-indigo-600 shadow-sm"
                                          title="Descargar HD"
                                        >
                                           <Download size={18} />
                                        </a>
                                        <button
                                          onClick={() => {
                                             updateCollections((prev: Collection[]) => prev.map(c => 
                                                c.id === collection.id ? { ...c, images: c.images.filter(i => i.id !== img.id) } : c
                                             ));
                                          }}
                                          className="bg-red-500/90 text-white p-2 rounded-full hover:bg-red-500 shadow-sm"
                                          title="Eliminar imagen"
                                        >
                                           <X size={18} />
                                        </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      {/* Enlarged Image Modal */}
      <AnimatePresence>
        {enlargedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm"
            onClick={() => setEnlargedImage(null)}
          >
            <button 
              className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setEnlargedImage(null)}
            >
              <X size={24} />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={enlargedImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add To Collection Modal */}
      <AnimatePresence>
        {isAddCollectionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeAddCollectionModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><FolderPlus size={20} className="text-indigo-600"/> Añadir a Colección</h3>
                <button onClick={closeAddCollectionModal} className="text-neutral-400 hover:text-neutral-700">
                  <X size={20} />
                </button>
              </div>

              {imageToAdd && (
                 <img src={imageToAdd} alt="Preview" className="w-full h-32 object-cover rounded-xl mb-6 shadow-sm border border-neutral-100" />
              )}

              {collections.length > 0 && (
                 <div className="mb-4">
                   <label className="block text-sm font-semibold text-neutral-700 mb-2">Seleccionar existente</label>
                   <select 
                     value={selectedCollectionId}
                     onChange={e => {
                        setSelectedCollectionId(e.target.value);
                        setNewCollectionName('');
                     }}
                     className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   >
                     {collections.map(c => (
                       <option key={c.id} value={c.id}>{c.name} ({c.images.length})</option>
                     ))}
                   </select>
                 </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">O crear una nueva</label>
                <input 
                  type="text" 
                  value={newCollectionName}
                  onChange={e => {
                     setNewCollectionName(e.target.value);
                     if (e.target.value) setSelectedCollectionId('');
                     else setSelectedCollectionId(collections.length > 0 ? collections[0].id : '');
                  }}
                  placeholder="Ej: Campaña Verano"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button 
                onClick={handleAddToCollection}
                disabled={!newCollectionName && !selectedCollectionId}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Guardar en Colección
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


