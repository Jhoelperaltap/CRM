import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  describe('basic functionality', () => {
    it('should merge single class', () => {
      expect(cn('px-4')).toBe('px-4');
    });

    it('should merge multiple classes', () => {
      expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    });

    it('should handle empty strings', () => {
      expect(cn('px-4', '', 'py-2')).toBe('px-4 py-2');
    });

    it('should handle undefined values', () => {
      expect(cn('px-4', undefined, 'py-2')).toBe('px-4 py-2');
    });

    it('should handle null values', () => {
      expect(cn('px-4', null, 'py-2')).toBe('px-4 py-2');
    });

    it('should handle false values', () => {
      expect(cn('px-4', false, 'py-2')).toBe('px-4 py-2');
    });
  });

  describe('tailwind merge behavior', () => {
    it('should merge conflicting padding classes', () => {
      expect(cn('px-4', 'px-6')).toBe('px-6');
    });

    it('should merge conflicting margin classes', () => {
      expect(cn('mt-4', 'mt-8')).toBe('mt-8');
    });

    it('should merge conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should merge conflicting background classes', () => {
      expect(cn('bg-white', 'bg-gray-100')).toBe('bg-gray-100');
    });

    it('should keep non-conflicting classes', () => {
      expect(cn('px-4', 'py-2', 'mt-4')).toBe('px-4 py-2 mt-4');
    });
  });

  describe('conditional classes', () => {
    it('should handle conditional classes with object syntax', () => {
      const isActive = true;
      expect(cn('base', { active: isActive })).toBe('base active');
    });

    it('should not include false conditional classes', () => {
      const isActive = false;
      expect(cn('base', { active: isActive })).toBe('base');
    });

    it('should handle mixed conditionals', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', { active: isActive, disabled: isDisabled })).toBe(
        'base active'
      );
    });
  });

  describe('array syntax', () => {
    it('should handle array of classes', () => {
      expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
    });

    it('should handle nested arrays', () => {
      expect(cn(['px-4', ['py-2', 'mt-4']])).toBe('px-4 py-2 mt-4');
    });
  });

  describe('real-world examples', () => {
    it('should merge button variant classes', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md';
      const variantClasses = 'bg-primary text-white';
      const customClasses = 'bg-blue-500';

      const result = cn(baseClasses, variantClasses, customClasses);

      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('bg-primary');
    });

    it('should handle responsive classes', () => {
      expect(cn('text-sm', 'md:text-base', 'lg:text-lg')).toBe(
        'text-sm md:text-base lg:text-lg'
      );
    });

    it('should handle state modifiers', () => {
      expect(cn('bg-white', 'hover:bg-gray-100', 'focus:bg-gray-200')).toBe(
        'bg-white hover:bg-gray-100 focus:bg-gray-200'
      );
    });
  });
});
