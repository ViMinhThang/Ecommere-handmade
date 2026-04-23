import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  iconColor?: string
}

export function StatCard({ title, value, change, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <Card className="bg-[#fdf9f3]/95">
      <CardContent className='p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{title}</p>
            <p className='text-[1.75rem] font-semibold leading-tight mt-2'>{value}</p>
            {change !== undefined && (
              <p className={cn('text-xs mt-2 font-semibold', change >= 0 ? 'text-[#576957]' : 'text-destructive')}>
                {change >= 0 ? '+' : ''}{change}% so với tháng trước
              </p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl bg-muted', iconColor)}>
            <Icon className='h-5 w-5' />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
