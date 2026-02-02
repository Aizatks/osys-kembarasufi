"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Film, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  Video, 
  Image as ImageIcon,
  Trash2,
  Filter,
  Eye,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function MediaLibraryContent() {
  const { user, isMedia, isVideoGraphic, isAdmin } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const canUpload = isAdmin || isMedia || isVideoGraphic;

  useEffect(() => {
    fetchAssets();
  }, [categoryFilter, packageFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (packageFilter !== "all") params.append("package", packageFilter);
      
      const response = await fetch(`/api/media-library?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const file = formData.get("file") as File;
      const title = formData.get("title") as string;
      const category = formData.get("category") as string;
      const pkg = formData.get("package") as string;

      if (!file) {
        toast.error("Sila pilih fail");
        return;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${category.replace(/\s+/g, '_')}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('creative-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Gagal muat naik ke storage: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('creative-assets')
        .getPublicUrl(filePath);

      let fileType = file.type.split('/')[0];
      if (!fileType || fileType === 'application' || file.type === 'video/quicktime') {
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'quicktime'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        if (videoExts.includes(fileExt || '') || file.type === 'video/quicktime') fileType = 'video';
        else if (imageExts.includes(fileExt || '')) fileType = 'image';
        else fileType = 'file';
      }

      const response = await fetch('/api/media-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          package: pkg,
          file_url: publicUrl,
          file_type: fileType,
          userId: user?.id
        })
      });

      if (response.ok) {
        toast.success("Bahan kreatif telah dimuat naik");
        setIsUploadOpen(false);
        fetchAssets();
      } else {
        const err = await response.json();
        throw new Error(err.error || "Gagal menyimpan rekod");
      }
    } catch (error: any) {
      console.error("Ralat muat naik:", error);
      toast.error(error.message || "Ralat berlaku");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Adakah anda pasti mahu membuang "${title}"?`)) return;

    try {
      const response = await fetch(`/api/media-library?id=${id}&userId=${user?.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success("Bahan telah dibuang");
        fetchAssets();
      } else {
        toast.error("Gagal membuang bahan");
      }
    } catch (error) {
      toast.error("Ralat berlaku semasa membuang");
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.title.toLowerCase().includes(search.toLowerCase()) ||
    asset.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Film className="w-6 h-6 text-violet-500" /> Media Library
            </h2>
            <p className="text-sm text-muted-foreground">Arkib bahan kreatif, poster dan video</p>
          </div>

          {canUpload && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Muat Naik Bahan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Muat Naik Bahan Kreatif</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Tajuk Bahan</Label>
                    <Input name="title" placeholder="cth: Poster Promosi Eropah" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select name="category" defaultValue="Media" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Media">Media (Poster/Gambar)</SelectItem>
                          <SelectItem value="Video Graphic">Video Graphic</SelectItem>
                          <SelectItem value="Itinerary">Itinerary (PDF/Doc)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pakej (Opsional)</Label>
                      <Input name="package" placeholder="cth: Eropah" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fail</Label>
                    <Input name="file" type="file" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? "Sedang memuat naik..." : "Muat Naik"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Cari bahan..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Video Graphic">Video</SelectItem>
                    <SelectItem value="Itinerary">Itinerary</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={fetchAssets}>
                  Segarkan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))
          ) : filteredAssets.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Tiada bahan kreatif ditemui</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <Card key={asset.id} className="overflow-hidden group border-slate-200 dark:border-slate-800 hover:border-violet-400 transition-all">
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                  {asset.file_type === 'image' ? (
                    <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : asset.file_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                      <Video className="w-12 h-12 text-slate-400" />
                    </div>
                  ) : (
                    <FileText className="w-12 h-12 text-slate-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {asset.file_type === 'video' ? (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => setPreviewVideo(asset.file_url)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Lihat
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" asChild>
                        <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-1" /> Lihat
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" asChild>
                      <a href={asset.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-1" /> Muat Turun
                      </a>
                    </Button>
                    {canUpload && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="bg-red-500/80 hover:bg-red-600"
                        onClick={() => handleDelete(asset.id, asset.title)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{asset.title}</h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase",
                      asset.category === "Media" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                    )}>
                      {asset.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded italic">
                      {asset.package || "Umum"}
                    </span>
                    <span>•</span>
                    <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="relative aspect-video w-full">
              <video 
                src={previewVideo} 
                className="w-full h-full" 
                controls 
                autoPlay 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-white hover:bg-white/20"
                onClick={() => setPreviewVideo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
