import * as React from 'react';
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ type, ...props }, ref) => (
  <input type={type} ref={ref} {...props} />
));
Input.displayName = "Input";

export { Input };