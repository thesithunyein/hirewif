import Image from 'next/image';

export function Logo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="HireWif"
      width={32}
      height={32}
      className={className}
      priority
    />
  );
}
