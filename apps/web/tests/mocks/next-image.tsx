import type { ImgHTMLAttributes } from 'react';

export default function Image(
  props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean },
) {
  const { priority: _priority, alt, ...rest } = props;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt ?? ''} {...rest} />;
}
