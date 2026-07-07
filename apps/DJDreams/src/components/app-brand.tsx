import Image from 'next/image'

/**
 * Static brand block (logo + tagline). A server component so its markup and the
 * optimized logo ship without pulling the interactive shell into the bundle.
 */
export function AppBrand() {
  return (
    <>
      <div className="mb-2 sm:mb-3 flex justify-center">
        <Image
          src="/DJ-Dreams-Logo.jpg"
          alt="DJ Dreams"
          width={280}
          height={96}
          className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain max-w-[280px] sm:max-w-none drop-shadow-[0_8px_30px_rgba(34,211,238,0.25)]"
          priority
        />
      </div>
      <p className="text-sm text-muted-foreground/80 mb-4 sm:mb-6 px-4 font-normal tracking-wide">
        DJ sets from around the world
      </p>
    </>
  )
}
