import { useState, forwardRef } from 'react';

/**
 * Password input with a show/hide eye toggle.
 * Forwards refs + spreads any extra props onto the underlying <input>,
 * so it works seamlessly with react-hook-form's `register(...)`.
 */
const PasswordInput = forwardRef(({ className = 'input-field', ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={show ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-primary-600 text-sm"
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
