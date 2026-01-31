import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Side - Form Area */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <Link href="/">
              <Image 
                src="/logotlm.png" 
                alt="The Lodge Connect" 
                width={150} 
                height={60} 
                className="h-12 w-auto object-contain" 
              />
            </Link>
          </div>
          {children}
        </div>
      </div>

      {/* Right Side - Image Area */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <Image
          className="absolute inset-0 h-full w-full object-cover"
          src="/BEAMXTHELODGE-3091.jpg"
          alt="The Lodge Glamping"
          fill
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-20 text-white">
          <h2 className="text-4xl font-black uppercase tracking-tight mb-4">
            Nature Awaits
          </h2>
          <p className="text-lg text-gray-200 max-w-md">
            Gabung dengan The Lodge Connect. Nikmati diskon eksklusif, kumpulkan poin, dan rasakan pengalaman liburan tak terlupakan.
          </p>
        </div>
      </div>
    </div>
  );
}
