import Image from 'next/image';

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="HireWif"
      width={40}
      height={40}
      className={className}
      priority
      unoptimized
    />
  );
}
