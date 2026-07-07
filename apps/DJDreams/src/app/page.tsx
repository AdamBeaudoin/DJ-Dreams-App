import { AppBrand } from '@/components/app-brand'
import { HomeClient } from '@/components/home-client'

export default function HomePage() {
  return <HomeClient brand={<AppBrand />} />
}
