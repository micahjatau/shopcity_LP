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
      aria-label={`ShopCity card preview for ${customerName}; serial ${serialNumber}; status ${status}`}
      className="relative isolate mx-auto flex aspect-[1.586] min-h-[13rem] w-full max-w-md flex-col justify-between overflow-hidden rounded-2xl border border-red-900/40 bg-neutral-900 p-4 shadow-sm sm:p-5"
    >
      <Image
        src="/brand/supervisor/IMG-20260802-WA0001.jpg"
        alt=""
        width={1280}
        height={907}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="relative z-10 flex items-start justify-end gap-3">
        <span className="shrink-0 rounded-full border border-white/50 bg-neutral-950/70 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-white">
          {status}
        </span>
      </div>
      <div className="relative z-10 max-w-[82%] rounded-md bg-neutral-950/70 p-2 text-white shadow-sm">
        <p className="break-words text-sm font-semibold sm:text-base">
          {customerName}
        </p>
        <p className="mt-2 text-[0.6rem] font-medium tracking-[0.14em] text-white/80">
          CARD SERIAL
        </p>
        <p className="break-all font-mono text-xs font-semibold tracking-wide sm:text-sm">
          {serialNumber}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-5 right-5 grid h-8 w-11 grid-cols-2 gap-px overflow-hidden rounded-md border border-amber-600/40 bg-amber-200/70 p-1"
      >
        <span className="rounded-l-sm border-r border-amber-700/30" />
        <span className="rounded-r-sm" />
        <span className="col-span-2 rounded-sm border-t border-amber-700/30" />
      </div>
    </figure>
  );
}
