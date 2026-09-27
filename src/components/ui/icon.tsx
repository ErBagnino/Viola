import {
  AlarmClock, ArrowLeft, Bell, BellRing, BookHeart, BookOpen, Bot, Cake, Calendar, CalendarHeart, Camera, Cat,
  Check, Cloud, CloudRain, Coffee, Compass, Crown, Dices, Droplets, Eye, Feather, Film, Flame, Flower, Flower2,
  Footprints, Gamepad2, Gift, GlassWater, Hand, Headphones, Heart, HeartHandshake, HeartPulse, Home, Hourglass,
  Image as ImageIcon, Images, Laugh, Leaf, Lightbulb, Mail, MapPin, MessageCircleHeart, Mic, Moon, MoonStar, Music,
  Notebook, NotebookPen, Orbit, Palette, PawPrint, Pen, Phone, Plane, Puzzle, Rainbow, Send, Shield, Shuffle, Smile,
  Snowflake, Sparkles, Star, Sun, Sunrise, Sunset, Target, Timer, ListChecks, Train, Trophy, Umbrella, Wand2, Waves, Wind, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Curated icon set Adam can pick from in the admin (IconPicker).
 * Any value that is not a known key is rendered as-is (e.g. an emoji).
 */
export const ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  "heart-handshake": HeartHandshake,
  "heart-pulse": HeartPulse,
  flower: Flower2,
  "flower-alt": Flower,
  wind: Wind,
  "shield-heart": Shield,
  gamepad: Gamepad2,
  "message-heart": MessageCircleHeart,
  camera: Camera,
  "book-heart": BookHeart,
  book: BookOpen,
  laugh: Laugh,
  "bot-heart": Bot,
  gift: Gift,
  hourglass: Hourglass,
  "map-pin": MapPin,
  sparkles: Sparkles,
  smile: Smile,
  eye: Eye,
  footprints: Footprints,
  hand: Hand,
  "glass-water": GlassWater,
  droplets: Droplets,
  sun: Sun,
  sunrise: Sunrise,
  sunset: Sunset,
  moon: Moon,
  "moon-star": MoonStar,
  cat: Cat,
  paw: PawPrint,
  pen: Pen,
  notebook: Notebook,
  "notebook-pen": NotebookPen,
  phone: Phone,
  "mail-heart": Mail,
  send: Send,
  "cloud-rain": CloudRain,
  cloud: Cloud,
  rainbow: Rainbow,
  home: Home,
  star: Star,
  music: Music,
  headphones: Headphones,
  mic: Mic,
  image: ImageIcon,
  images: Images,
  calendar: Calendar,
  "calendar-heart": CalendarHeart,
  alarm: AlarmClock,
  timer: Timer,
  bell: Bell,
  "bell-ring": BellRing,
  puzzle: Puzzle,
  dice: Dices,
  target: Target,
  zap: Zap,
  shuffle: Shuffle,
  wand: Wand2,
  palette: Palette,
  orbit: Orbit,
  waves: Waves,
  leaf: Leaf,
  coffee: Coffee,
  cake: Cake,
  plane: Plane,
  train: Train,
  film: Film,
  feather: Feather,
  flame: Flame,
  snowflake: Snowflake,
  umbrella: Umbrella,
  compass: Compass,
  crown: Crown,
  trophy: Trophy,
  "list-checks": ListChecks,
  lightbulb: Lightbulb,
  check: Check,
  back: ArrowLeft,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({
  name,
  className,
  strokeWidth = 2,
  label,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
  label?: string;
}) {
  if (!name) return null;
  const Cmp = ICONS[name];
  if (Cmp) {
    return <Cmp className={cn("size-5 shrink-0", className)} strokeWidth={strokeWidth} aria-hidden={!label} aria-label={label} />;
  }
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)} aria-hidden={!label} aria-label={label}>
      {name}
    </span>
  );
}
