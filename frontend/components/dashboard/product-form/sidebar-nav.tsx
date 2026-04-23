"use client"

import { memo } from 'react'
import { HelpCircle } from 'lucide-react'

interface SidebarNavProps {
  sections: { id: string; label: string }[]
}

export const SidebarNav = memo(function SidebarNav({ sections }: SidebarNavProps) {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = 120
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = el.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <aside className="hidden lg:block w-52 shrink-0">
      <div className="sticky top-[58px] space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">Điều hướng nhanh</p>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-[#dac1b8]/10 transition-all font-medium flex items-center gap-2 group"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-[#dac1b8] group-hover:bg-primary transition-colors" />
              {section.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 rounded-2xl bg-[#dac1b8]/5 border border-[#dac1b8]/10">
          <p className="text-xs font-semibold text-[#853724] mb-2 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Mẹo nhỏ
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Sản phẩm có ít nhất 3 ảnh chất lượng cao thường có tỷ lệ chuyển đổi tốt hơn 40%.
          </p>
        </div>
      </div>
    </aside>
  )
})
