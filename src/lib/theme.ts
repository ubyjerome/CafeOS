import { Configs } from '@/configs';
import Color from 'color';

// Get primary color from environment or use default

// Generate color shades using the color library
export const generateColorShades = (hexColor: string) => {
  try {
    const color = Color(hexColor);
    const hsl = color.hsl().object();
    
    return {
      primary: `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`,
      primaryLight: `${Math.round(hsl.h)} ${Math.round(hsl.s * 0.8)}% ${Math.min(95, Math.round(hsl.l + 25))}%`,
      primaryDark: `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.max(15, Math.round(hsl.l - 15))}%`,
    };
  } catch {
    // Fallback to blue
    return {
      primary: '217 91% 60%',
      primaryLight: '217 73% 85%',
      primaryDark: '217 91% 45%',
    };
  }
};

// Apply theme to document
export const applyPrimaryColor = () => {
  const shades = generateColorShades(Configs.theme.primary_color);
  const root = document.documentElement;
  
  // Parse HSL values
  const [h, s, l] = shades.primary.split(' ');
  root.style.setProperty('--primary-h', h);
  root.style.setProperty('--primary-s', s);
  root.style.setProperty('--primary-l', l);
  root.style.setProperty('--primary', shades.primary);
  root.style.setProperty('--primary-light', shades.primaryLight);
  root.style.setProperty('--primary-dark', shades.primaryDark);
};

// Toggle dark mode
export const setDarkMode = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('cafeos-theme', isDark ? 'dark' : 'light');
};

// Get initial theme
export const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('cafeos-theme');
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
