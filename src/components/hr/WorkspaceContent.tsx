"use client";

import { useState, useEffect } from "react";
import { 
  Folder, 
  File, 
  Link as LinkIcon, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  FilePlus,
  User,
  Shield,
  Upload,
  Pencil,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Workspace {
  id: string;
  owner_staff_id: string;
  type: "STAFF" | "MANAGER";
  name: string;
  workspace_items: WorkspaceItem[];
}

interface WorkspaceItem {
  id: string;
  workspace_id: string;
  item_type: "FILE" | "LINK";
  title: string;
  url: string;
  folder_path: string;
  tags?: string[];
  created_at: string;
}

export function WorkspaceContent() {
  const { user, isAdmin } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newItem, setNewItem] = useState({
    item_type: "FILE",
    title: "",
    url: "",
    folder_path: "ROOT",
    tags: ""
  });

  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [renameFolderData, setRenameFolderData] = useState({
    workspaceId: "",
    oldPath: "",
    newPath: ""
  });

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: user?.name ? user.name + "'s Workspace" : "New Workspace",
    type: "STAFF"
  });

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const handleCreateWorkspace = async () => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_staff_id: user?.id,
          ...newWorkspace
        })
      });

      if (res.ok) {
        toast.success("Workspace berjaya dicipta");
        setIsCreateWorkspaceOpen(false);
        fetchWorkspaces();
      }
    } catch (err) {
      toast.error("Gagal mencipta workspace");
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const url = isAdmin 
        ? "/api/workspaces" 
        : user?.role?.includes("Manager") 
          ? `/api/workspaces?manager_id=${user?.id}`
          : `/api/workspaces?owner_id=${user?.id}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `workspace-files/${fileName}`;

      const { data, error } = await supabase.storage
        .from('workspaces')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('workspaces')
        .getPublicUrl(filePath);

      setNewItem(prev => ({
        ...prev,
        url: publicUrl,
        title: prev.title || file.name
      }));
      toast.success("Fail berjaya dimuat naik");
    } catch (err: any) {
      toast.error("Gagal memuat naik fail: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedWorkspaceId || !newItem.title || !newItem.url) {
      toast.error("Sila isi semua maklumat item");
      return;
    }

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: selectedWorkspaceId,
          ...newItem,
          tags: newItem.tags.split(",").map(t => t.trim()).filter(t => t)
        })
      });

      if (res.ok) {
        toast.success("Item berjaya ditambah");
        setIsAddItemOpen(false);
        setNewItem({ item_type: "FILE", title: "", url: "", folder_path: "ROOT", tags: "" });
        fetchWorkspaces();
      }
    } catch (err) {
      toast.error("Gagal menambah item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Padam item ini?")) return;
    try {
      const res = await fetch(`/api/workspaces?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item dipadam");
        fetchWorkspaces();
      }
    } catch (err) {
      toast.error("Gagal memadam item");
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolderData.newPath) return;
    try {
      const res = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: renameFolderData.workspaceId,
          old_folder_path: renameFolderData.oldPath,
          new_folder_path: renameFolderData.newPath
        })
      });

      if (res.ok) {
        toast.success("Folder berjaya dijenamakan semula");
        setIsRenameFolderOpen(false);
        fetchWorkspaces();
      }
    } catch (err) {
      toast.error("Gagal menamakan semula folder");
    }
  };

  // Group items by folder
  const groupItems = (items: WorkspaceItem[]) => {
    const groups: Record<string, WorkspaceItem[]> = {};
    items.forEach(item => {
      const path = item.folder_path || "ROOT";
      if (!groups[path]) groups[path] = [];
      groups[path].push(item);
    });
    return groups;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6 text-emerald-500" /> Workspace Kerja
          </h2>
          <p className="text-muted-foreground">Penyimpanan dokumen, link kerja, dan fail rujukan</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 gap-2">
                <Plus className="w-4 h-4" /> Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input 
                    value={newWorkspace.name}
                    onChange={e => setNewWorkspace({...newWorkspace, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={newWorkspace.type}
                    onValueChange={val => setNewWorkspace({...newWorkspace, type: val as any})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff Workspace</SelectItem>
                      <SelectItem value="MANAGER">Manager Workspace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateWorkspaceOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateWorkspace} className="bg-emerald-600">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari dalam workspace..." 
              className="pl-10 w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
          <Folder className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 mb-4">Tiada workspace ditemui</p>
          <Button variant="outline" onClick={() => setIsCreateWorkspaceOpen(true)}>
            Mula Cipta Workspace Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {workspaces.map(ws => {
            const grouped = groupItems(ws.workspace_items.filter(item => 
              item.title.toLowerCase().includes(search.toLowerCase()) ||
              item.folder_path.toLowerCase().includes(search.toLowerCase())
            ));
            
            return (
              <Card key={ws.id} className="overflow-hidden border-t-4 border-t-emerald-500 flex flex-col h-full">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {ws.type === "MANAGER" ? <Shield className="w-4 h-4 text-amber-500" /> : <User className="w-4 h-4 text-emerald-500" />}
                        {ws.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {ws.type === "MANAGER" ? "Manager Workspace" : "Staff Workspace"}
                      </CardDescription>
                    </div>
                    <Dialog open={isAddItemOpen && selectedWorkspaceId === ws.id} onOpenChange={(open) => {
                      setIsAddItemOpen(open);
                      if (open) setSelectedWorkspaceId(ws.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-8">
                          <Plus className="w-3.5 h-3.5" /> Tambah
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tambah ke {ws.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Jenis Item</Label>
                            <Select 
                              value={newItem.item_type}
                              onValueChange={val => setNewItem({...newItem, item_type: val as any})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FILE">Fail (Upload/URL)</SelectItem>
                                <SelectItem value="LINK">Link Kerja (External)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {newItem.item_type === "FILE" && (
                            <div className="space-y-2">
                              <Label>Upload Fail</Label>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="file" 
                                  className="cursor-pointer" 
                                  onChange={handleFileUpload}
                                  disabled={uploading}
                                />
                                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Tajuk Item</Label>
                            <Input 
                              placeholder="Contoh: SOP Marketing 2026" 
                              value={newItem.title}
                              onChange={e => setNewItem({...newItem, title: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>{newItem.item_type === "FILE" ? "URL Fail" : "URL Link"}</Label>
                            <Input 
                              placeholder="https://..." 
                              value={newItem.url}
                              onChange={e => setNewItem({...newItem, url: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Folder (Opsional)</Label>
                            <Select 
                              value={newItem.folder_path}
                              onValueChange={val => setNewItem({...newItem, folder_path: val})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih Folder" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ROOT">ROOT</SelectItem>
                                {Object.keys(grouped).filter(f => f !== "ROOT").map(folder => (
                                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                                ))}
                                <SelectItem value="NEW">+ Create New Folder</SelectItem>
                              </SelectContent>
                            </Select>
                            {newItem.folder_path === "NEW" && (
                              <Input 
                                className="mt-2"
                                placeholder="Nama folder baru..."
                                onChange={e => setNewItem({...newItem, folder_path: e.target.value})}
                              />
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Batal</Button>
                          <Button onClick={handleAddItem} className="bg-emerald-600" disabled={uploading}>
                            {uploading ? "Memuat Naik..." : "Tambah Item"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                  {ws.workspace_items.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <FilePlus className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                      <p className="text-sm text-slate-400 italic">Workspace masih kosong. Sila tambah dokumen atau link rujukan anda.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(grouped).sort(([a], [b]) => a === "ROOT" ? -1 : b === "ROOT" ? 1 : a.localeCompare(b)).map(([folder, items]) => (
                        <div key={folder} className="bg-white dark:bg-transparent">
                          {folder !== "ROOT" && (
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50">
                              <div className="flex items-center gap-2 group/folder">
                                <Folder className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{folder}</span>
                                {(isAdmin || ws.owner_staff_id === user?.id) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 opacity-0 group-hover/folder:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setRenameFolderData({ workspaceId: ws.id, oldPath: folder, newPath: folder });
                                      setIsRenameFolderOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </Button>
                                )}
                              </div>
                              <Badge variant="outline" className="text-[9px] font-normal">{items.length} item</Badge>
                            </div>
                          )}
                          <div className="p-1">
                            {items.map(item => (
                              <div key={item.id} className="group flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-transparent last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn(
                                    "w-8 h-8 rounded flex items-center justify-center",
                                    item.item_type === "FILE" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
                                  )}>
                                    {item.item_type === "FILE" ? <File className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate group-hover:text-emerald-600 transition-colors">{item.title}</p>
                                    <p className="text-[10px] text-slate-400">Ditambah pada {new Date(item.created_at).toLocaleDateString("ms-MY")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" asChild title="Buka fail/link">
                                    <a href={item.url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </Button>
                                  {(isAdmin || ws.owner_staff_id === user?.id) && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteItem(item.id)} title="Padam item">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rename Folder Dialog */}
      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Old Path</Label>
              <Input value={renameFolderData.oldPath} disabled className="bg-slate-100" />
            </div>
            <div className="space-y-2">
              <Label>New Folder Name</Label>
              <Input 
                value={renameFolderData.newPath}
                onChange={e => setRenameFolderData({...renameFolderData, newPath: e.target.value})}
                placeholder="Enter new folder name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameFolderOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameFolder} className="bg-emerald-600">Update Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
