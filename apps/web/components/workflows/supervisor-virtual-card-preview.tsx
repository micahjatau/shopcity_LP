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
      className="relative isolate mx-auto flex aspect-[1.586] min-h-[13rem] w-full max-w-md flex-col justify-between overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-neutral-50 to-rose-50 p-4 shadow-sm sm:p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full border-[18px] border-red-100/70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-12 size-44 rounded-full border-[18px] border-orange-100/70"
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <Image
          src="/brand/supervisor/cutomer-profile/card-branding.png"
          alt=""
          width={120}
          height={76}
          className="h-14 w-auto shrink-0 object-contain object-left"
        />
        <span className="shrink-0 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-neutral-700">
          {status}
        </span>
      </div>
      <div className="relative z-10 max-w-[82%]">
        <p className="break-words text-sm font-semibold text-neutral-800 sm:text-base">
          {customerName}
        </p>
        <p className="mt-2 text-[0.6rem] font-medium tracking-[0.14em] text-neutral-500">
          CARD SERIAL
        </p>
        <p className="break-all font-mono text-xs font-semibold tracking-wide text-red-800 sm:text-sm">
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
