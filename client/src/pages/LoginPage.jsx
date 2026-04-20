import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/logo.jpg';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logo} alt="GCC" className="w-20 h-auto mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary-700">Gospel Coalition Church</h1>
          <p className="text-sm text-gray-500 italic">Sharing Christ, Changing Lives</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Sign In</h2>
          <p className="text-sm text-gray-500 mb-5">Access the attendance management system.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="input-field"
                autoComplete="email"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-xs text-accent-red">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="input-field"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-xs text-accent-red">{errors.password.message}</p>}
            </div>

            {serverError && (
              <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {serverError}
              </p>
            )}

            <button type="submit" className="btn-primary w-full mt-1" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Gospel Coalition Church
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
