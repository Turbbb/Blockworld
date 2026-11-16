import * as React from "react";
import { Camera, ImagePlus, RefreshCcw, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { useAnalyzeBlueprintFromImage } from "@workspace/api-client-react";
import type { BlockBlueprint } from "@workspace/api-client-react";

export interface CameraBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlueprint: (blueprint: BlockBlueprint) => void;
}

export function CameraBlueprintDialog({
  open,
  onOpenChange,
  onBlueprint
}: CameraBlueprintDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const cameraRequestRef = React.useRef(0);
  const isOpenRef = React.useRef(open);
  isOpenRef.current = open;

  const [permissionError, setPermissionError] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const { mutate: analyze, isPending } = useAnalyzeBlueprintFromImage();

  const stopCamera = React.useCallback(() => {
    cameraRequestRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = React.useCallback(async () => {
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    setPermissionError(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionError(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (requestId !== cameraRequestRef.current || !isOpenRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setPermissionError(true);
    }
  }, []);

  const resetState = React.useCallback(() => {
    setCapturedImage(null);
    setAnalyzeError(null);
    setFlash(false);
    setSuccess(false);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    
    if (open && !capturedImage && !success) {
      startCamera();
    } else {
      stopCamera();
      if (!open) {
        setTimeout(() => {
          if (mounted) resetState();
        }, 300);
      }
    }
    
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [open, capturedImage, success, startCamera, stopCamera, resetState]);

  const processImageFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      const maxSize = 1280;
      if (width > height && width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      } else if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setCapturedImage(dataUrl);
      stopCamera();
    };
    img.src = url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      const maxSize = 1280;
      if (width > height && width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      } else if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
      
      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = width;
      resizeCanvas.height = height;
      const rCtx = resizeCanvas.getContext('2d');
      if (!rCtx) return;
      rCtx.fillStyle = '#ffffff';
      rCtx.fillRect(0, 0, width, height);
      rCtx.drawImage(img, 0, 0, width, height);
      
      const compressedDataUrl = resizeCanvas.toDataURL('image/jpeg', 0.82);
      setCapturedImage(compressedDataUrl);
      stopCamera();
    };
    img.src = dataUrl;
  };

  const retake = () => {
    setCapturedImage(null);
    setAnalyzeError(null);
  };

  const handleSubmit = () => {
    if (!capturedImage) return;
    setAnalyzeError(null);
    
    const base64Data = capturedImage.replace(/^data:image\/[a-z]+;base64,/, '');
    
    analyze({
      data: {
        imageData: base64Data,
        mimeType: "image/jpeg"
      }
    }, {
      onSuccess: (data) => {
        setSuccess(true);
        setTimeout(() => {
          onBlueprint(data);
          onOpenChange(false);
          setTimeout(resetState, 300);
        }, 1500);
      },
      onError: (err: any) => {
        setAnalyzeError(err?.message || "Fehler beim Analysieren des Bildes.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 sm:rounded-none border-[6px] border-black bg-[#2b2b2b] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] [&>button]:text-white [&>button]:top-4 [&>button]:right-4 [&>button]:opacity-100 [&>button]:hover:bg-white/10 [&>button]:p-2 [&>button]:rounded-none"
        aria-describedby="camera-dialog-description"
      >
        <div className="p-4 bg-[#1e1e1e] border-b-[4px] border-black flex flex-col justify-center min-h-[5rem]">
          <DialogTitle className="font-mono text-2xl text-primary drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wide">
            Scanner
          </DialogTitle>
          <DialogDescription id="camera-dialog-description" className="text-stone-300 font-sans text-sm mt-1 leading-snug">
            Zielobjekt erfassen, um eine Block-Blaupause zu generieren.
          </DialogDescription>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-black pixel-block overflow-hidden mx-auto rounded-sm ring-[4px] ring-black shadow-inner">
            <style>{`
              @keyframes scan-vertical {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }
            `}</style>
            
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedImage}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Gescanntes Objekt"
              />
            )}

            {!capturedImage && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-l border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white rounded-full opacity-50"></div>
                  </div>
                  <div className="border-l border-white"></div>
                  <div className="border-r border-t border-white"></div>
                  <div className="border-t border-white"></div>
                  <div className="border-l border-t border-white"></div>
                </div>
                
                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
                
                <div className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_12px_3px_theme(colors.primary.DEFAULT)] opacity-70" style={{ animation: 'scan-vertical 3s linear infinite' }}></div>
              </div>
            )}

            {flash && (
              <div className="absolute inset-0 bg-white z-10 animate-out fade-out duration-300 pointer-events-none"></div>
            )}
            
            {isPending && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
                <span className="font-mono text-xl text-primary font-bold drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-pulse">BERECHNE...</span>
              </div>
            )}

            {success && (
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-md flex flex-col items-center justify-center z-30">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_theme(colors.primary.DEFAULT)] animate-in zoom-in duration-300">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <span className="font-mono text-2xl text-white font-bold drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 duration-300 text-center px-4">SCAN ERFOLGREICH!</span>
              </div>
            )}

            {analyzeError && (
              <div className="absolute top-4 left-4 right-4 bg-destructive border-[3px] border-black text-destructive-foreground p-3 text-sm z-20 shadow-lg flex items-start gap-3 rounded-none animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="flex-1 font-sans">{analyzeError}</div>
                <button onClick={() => setAnalyzeError(null)} className="opacity-70 hover:opacity-100 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {permissionError && !capturedImage && (
              <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-accent" />
                <p className="text-sm text-stone-300 font-sans">Kamerazugriff verweigert oder nicht verfügbar.</p>
                <Button 
                  className="pixel-btn bg-stone-700 hover:bg-stone-600 text-white mt-4 border-2 border-black" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-5 h-5 mr-2" />
                  Aus Galerie wählen
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex justify-center items-center pb-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {!capturedImage ? (
              <div className="flex items-center justify-between w-full px-4 sm:px-8">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="w-14 h-14 rounded-none pixel-btn bg-stone-700 hover:bg-stone-600 text-white"
                  onClick={() => fileInputRef.current?.click()}
                  title="Galerie"
                >
                  <ImagePlus className="w-6 h-6" />
                </Button>
                
                <button 
                  className="w-20 h-20 rounded-full bg-stone-300 border-[6px] border-stone-500 hover:bg-white active:scale-95 transition-all shadow-[inset_0_-4px_0_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center group disabled:opacity-50 disabled:pointer-events-none"
                  onClick={takePhoto}
                  disabled={permissionError}
                  aria-label="Foto aufnehmen"
                >
                  <div className="w-14 h-14 rounded-full border-[4px] border-stone-400 group-hover:border-stone-300 transition-colors"></div>
                </button>
                
                <div className="w-14 h-14" />
              </div>
            ) : (
              <div className="flex gap-4 w-full">
                <Button 
                  variant="secondary" 
                  className="pixel-btn h-14 flex-1 bg-stone-700 hover:bg-stone-600 text-white font-mono text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
                  onClick={retake}
                  disabled={isPending || success}
                >
                  <RefreshCcw className="w-5 h-5 mr-2" />
                  NEU
                </Button>
                <Button 
                  className="pixel-btn h-14 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
                  onClick={handleSubmit}
                  disabled={isPending || success}
                >
                  {isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-6 h-6 mr-2" />
                      BAUEN
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
