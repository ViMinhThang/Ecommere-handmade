import Link from "next/link";
import { Share2, Camera } from "lucide-react";

export function CustomerFooter() {
  return (
    <footer className="bg-accent dark:bg-[#151512] w-full mt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 px-12 py-20 w-full max-w-[1600px] mx-auto">
        <div>
          <Link href="/" className="font-headline italic text-lg text-primary mb-6 block">
            The Artisanal Curator
          </Link>
          <p className="text-muted-foreground max-w-sm mb-8 font-body">
            Gìn giữ giá trị con người trong thế giới kỹ thuật số. Tham gia hành trình thủ công của chúng tôi.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-muted-foreground hover:text-primary transition-all p-2 -ml-2">
              <Share2 className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-primary transition-all p-2 -ml-2">
              <Camera className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h5 className="font-headline italic text-foreground mb-6">Bộ sưu tập</h5>
            <ul className="space-y-4">
              <li>
                <Link href="/categories/ceramics" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Gốm sứ
                </Link>
              </li>
              <li>
                <Link href="/categories/textiles" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Dệt may
                </Link>
              </li>
              <li>
                <Link href="/categories/woodwork" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Đồ gỗ
                </Link>
              </li>
              <li>
                <Link href="/categories/jewelry" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Trang sức
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-headline italic text-foreground mb-6">Xưởng Chế tác</h5>
            <ul className="space-y-4">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Câu chuyện Người bán
                </Link>
              </li>
              <li>
                <Link href="/sustainability" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Phát triển Bền vững
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Giao hàng & Đổi trả
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-all font-body text-sm tracking-wide">
                  Câu chuyện Người bán
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="px-12 py-8 border-t border-border/10 text-center">
        <p className="text-muted-foreground font-body text-sm tracking-wide">
          © {new Date().getFullYear()} The Artisanal Curator. Chế tác với Tâm hồn.
        </p>
      </div>
    </footer>
  );
}
