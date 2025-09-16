import * as React from 'react';
type BadgeProps = React.HTMLAttributes<HTMLDivElement>;
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>((props, ref) => (
  <div ref={ref} {...props} />
));
Badge.displayName = "Badge";

export { Badge };