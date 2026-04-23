'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'
import { mockPlatformSettings } from '@/lib/mock-data'
import { useState } from 'react'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    platformName: mockPlatformSettings.platformName,
    platformDescription: mockPlatformSettings.platformDescription,
    commissionRate: mockPlatformSettings.commissionRate,
  })

  return (
    <div className='space-y-7'>
      <div>
        <h1 className='artisan-title text-4xl'>Cài đặt</h1>
        <p className='artisan-subtitle mt-2'>Quản lý cấu hình nền tảng theo style mới.</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card className='bg-[#ffffffd9]'>
          <CardHeader>
            <CardTitle>Thông tin nền tảng</CardTitle>
            <CardDescription>Cập nhật thông tin nền tảng của bạn</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='platformName'>Tên nền tảng</Label>
              <Input
                id='platformName'
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='platformDescription'>Mô tả</Label>
              <Input
                id='platformDescription'
                value={settings.platformDescription}
                onChange={(e) => setSettings({ ...settings, platformDescription: e.target.value })}
              />
            </div>
            <Button>Lưu thay đổi</Button>
          </CardContent>
        </Card>

        <Card className='bg-[#f7f3ed]'>
          <CardHeader>
            <CardTitle>Cài đặt hoa hồng</CardTitle>
            <CardDescription>Đặt tỷ lệ hoa hồng nền tảng</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='commissionRate'>Tỷ lệ hoa hồng (%)</Label>
              <Input
                id='commissionRate'
                type='number'
                value={settings.commissionRate}
                onChange={(e) => setSettings({ ...settings, commissionRate: parseInt(e.target.value) })}
              />
            </div>
            <Button>Lưu thay đổi</Button>
          </CardContent>
        </Card>

        <Card className='bg-[#ebe8e2]'>
          <CardHeader>
            <CardTitle>Giao diện</CardTitle>
            <CardDescription>Tùy chỉnh giao diện bảng điều khiển</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <Label>Chế độ tối</Label>
                <p className='text-sm text-muted-foreground'>Chuyển đổi giữa giao diện sáng và tối</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-[#ffffffd9]'>
          <CardHeader>
            <CardTitle>Danh mục</CardTitle>
            <CardDescription>Quản lý danh mục sản phẩm</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {mockPlatformSettings.categories.map((category) => (
                <div key={category} className='flex items-center justify-between rounded-lg bg-muted/70 px-3 py-2'>
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


