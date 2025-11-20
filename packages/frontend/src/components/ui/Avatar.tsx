import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Avatar variant styles using Class Variance Authority
 * Defines visual variants for size
 */
const avatarVariants = cva(
  'inline-block rounded-full bg-gray-200 object-cover',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

/**
 * Props for the Avatar component
 */
export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Image source URL */
  src?: string | null;
  /** Alt text for accessibility */
  alt?: string;
  /** Fallback text to display when image is not available (usually initials) */
  fallback?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Avatar component for displaying user profile images
 * Supports multiple sizes and fallback to initials when image is not available
 *
 * @param src - URL of the avatar image
 * @param alt - Alternative text for accessibility
 * @param fallback - Text to display when image is unavailable (e.g., user initials)
 * @param size - Size variant: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * // With image
 * <Avatar src="/avatar.jpg" alt="John Doe" size="lg" />
 *
 * // With fallback initials
 * <Avatar fallback="JD" alt="John Doe" size="md" />
 *
 * // Small avatar
 * <Avatar src="/avatar.jpg" alt="Jane" size="sm" />
 * ```
 */
export function Avatar({ src, alt = '', fallback, size, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={avatarVariants({ size, className })}
      />
    );
  }

  if (fallback) {
    return (
      <div
        className={avatarVariants({ size, className }) + ' flex items-center justify-center bg-primary-100 text-primary-700 font-semibold'}
        aria-label={alt}
      >
        {fallback}
      </div>
    );
  }

  // Default fallback: user icon
  return (
    <div
      className={avatarVariants({ size, className }) + ' flex items-center justify-center bg-gray-300 text-gray-600'}
      aria-label={alt}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-2/3 w-2/3"
      >
        <path
          fillRule="evenodd"
          d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
