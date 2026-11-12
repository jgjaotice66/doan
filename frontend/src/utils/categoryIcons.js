import { Car, Cube, DiceFive, MaskHappy, Robot, Smiley, Sparkle, Tag, Wrench } from '@phosphor-icons/react'

// Danh mục chưa có ảnh → dùng icon theo slug (slug lạ dùng icon Tag).
const CATEGORY_ICONS = {
  figure: MaskHappy,
  gundam: Robot,
  lego: Cube,
  'mo-hinh-xe': Car,
  'funko-pop': Smiley,
  'anime-figure': Sparkle,
  'board-game': DiceFive,
  'phu-kien': Wrench,
}

export const categoryIcon = (slug) => CATEGORY_ICONS[slug] ?? Tag
