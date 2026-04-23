import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputAreaProps {
  draftText: string;
  setDraftText: (text: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isSending: boolean;
  activeConversationId: string;
  onSendMessage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInputArea({
  draftText,
  setDraftText,
  selectedFile,
  setSelectedFile,
  isSending,
  activeConversationId,
  onSendMessage,
  fileInputRef,
}: ChatInputAreaProps) {
  return (
    <div className="border-t border-border/60 px-3 py-3">
      {selectedFile ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
          <p className="truncate text-xs text-muted-foreground">
            {selectedFile.name}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <Input
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="Nhập tin nhắn..."
          maxLength={2000}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(event) =>
            setSelectedFile(event.target.files?.[0] ?? null)
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          disabled={
            isSending ||
            (!draftText.trim() && !selectedFile) ||
            !activeConversationId
          }
          onClick={onSendMessage}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
