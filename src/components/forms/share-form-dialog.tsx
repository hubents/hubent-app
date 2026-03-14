"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  RiFileCopyLine,
  RiExternalLinkLine,
  RiCodeLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface ShareFormDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareFormDialog({ slug, open, onOpenChange }: ShareFormDialogProps) {
  const [height, setHeight] = useState("700");

  const formUrl = typeof window !== "undefined"
    ? `${window.location.origin}/f/${slug}`
    : `/f/${slug}`;

  const embedCode = `<iframe src="${formUrl}?embed=true" width="100%" height="${height}" frameborder="0" style="border:none;max-width:640px;margin:0 auto;display:block;"></iframe>`;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartir formulario</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Link */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Link público</Label>
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="text-sm bg-muted" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyText(formUrl, "Link")}
                title="Copiar link"
              >
                <RiFileCopyLine className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(formUrl, "_blank")}
                title="Abrir en nueva pestaña"
              >
                <RiExternalLinkLine className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RiCodeLine className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Código embed</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Copia el código y pégalo en el HTML de tu sitio web.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Altura (px)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-24 h-8 text-xs"
                min="300"
                max="2000"
              />
            </div>
            <Textarea
              value={embedCode}
              readOnly
              rows={3}
              className="text-xs font-mono bg-muted resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => copyText(embedCode, "Código embed")}
            >
              <RiFileCopyLine className="h-3.5 w-3.5" />
              Copiar código embed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
