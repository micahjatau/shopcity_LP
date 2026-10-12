import Image from 'next/image';

type SupervisorVirtualCardPreviewProps = {
  customerName: string;
  serialNumber: string;
  status: string;
};

export function SupervisorVirtualCardPreview({
  customerName,
  serialNumber,
  status,
}: SupervisorVirtualCardPreviewProps) {
  return (
    <figure
      role="img"
      aria-label={`ShopCity card preview for ${customerName}; card number ${serialNumber}; status ${status}`}
      className="relative isolate mx-auto flex aspect-[1.586] min-h-[13rem] w-full max-w-md flex-col justify-between overflow-hidden rounded-2xl border border-red-900/40 bg-neutral-900 p-4 shadow-sm sm:p-5"
    >
      <Image
        src="/brand/supervisor/IMG-20260802-WA0001.jpg"
        alt=""
        width={1280}
        height={907}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute bottom-5 left-5 z-10 max-w-[75%] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
        <p
          className="break-words text-[28px] font-semibold text-white uppercase sm:text-[32px]"
          style={{ color: '#fff' }}
        >
          {customerName.toUpperCase()}
        </p>
        <p
          className="mt-2 break-all font-mono text-[28px] font-semibold tracking-wide text-white sm:text-[32px]"
          style={{ color: '#fff' }}
        >
          {serialNumber || 'Not provided'}
        </p>
      </div>
    </figure>
  );
}
