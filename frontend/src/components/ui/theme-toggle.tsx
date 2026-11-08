import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeProvider'
import { Button } from './button'

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode (current: ${theme})`}
      className="rounded-full w-9 h-9"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

