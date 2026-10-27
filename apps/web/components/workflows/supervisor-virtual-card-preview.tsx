import Image from 'next/image';

type SupervisorVirtualCardPreviewProps = {
  customerName: string;
  serialNumber: string;
  status: string;
  compact?: boolean;
  confirmation?: boolean;
  ariaLabel?: string;
};

export function SupervisorVirtualCardPreview({
  customerName,
  serialNumber,
  status,
  compact = false,
  confirmation = false,
  ariaLabel,
}: SupervisorVirtualCardPreviewProps) {
  return (
    <figure
      role="img"
      aria-label={
        ariaLabel ??
        `ShopCity card preview for ${customerName}; card number ${serialNumber}; status ${status}`
      }
      className={`relative isolate flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-red-900/40 bg-neutral-900 shadow-sm ${confirmation ? 'ml-auto mr-0 aspect-[1.586] min-h-0 max-w-[20rem] p-4' : 'mx-auto'} ${confirmation ? '' : compact ? 'aspect-[1.586] min-h-0 max-w-[248px] p-3' : 'aspect-[1.586] min-h-[13rem] max-w-md p-4 sm:p-5'}`}
    >
      <Image
        src="/brand/supervisor/IMG-20260802-WA0001.jpg"
        alt=""
        width={1280}
        height={907}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div
        className={`absolute z-10 max-w-[75%] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${confirmation ? 'bottom-4 left-4' : compact ? 'bottom-3 left-3' : 'bottom-5 left-5'}`}
      >
        <p
          className={`break-words font-semibold text-white uppercase ${confirmation ? 'text-[13px] sm:text-[14px]' : compact ? 'text-[11px]' : 'text-[28px] sm:text-[32px]'}`}
          style={{ color: '#fff' }}
        >
          {customerName.toUpperCase()}
        </p>
        <p
          className={`break-all font-mono font-semibold tracking-wide text-white ${confirmation ? 'mt-1 text-[12px] sm:text-[13px]' : compact ? 'mt-1 text-[10px]' : 'mt-2 text-[28px] sm:text-[32px]'}`}
          style={{ color: '#fff' }}
        >
          {serialNumber || 'Not provided'}
        </p>
      </div>
    </figure>
  );
}
