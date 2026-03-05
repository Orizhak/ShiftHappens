import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
  username: z.string().min(1, 'שם משתמש נדרש'),
  password: z.string().min(1, 'סיסמה נדרשת'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const { user } = await authApi.login(data.username, data.password);
      setUser(user);
      navigate('/user/dashboard');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)] border-blue-500/10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Logo" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-[0_0_20px_rgba(59,130,246,0.4)]" />
          <h1 className="text-2xl font-bold text-white">כניסה למערכת</h1>
          <p className="text-gray-400 mt-1">ניהול משמרות יחידה</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="glass-card border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">שם משתמש</label>
            <input
              {...register('username')}
              placeholder="הכנס שם משתמש"
              className="glass-input w-full px-4 py-2"
              dir="rtl"
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">סיסמה</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="הכנס סיסמה"
                className="glass-input w-full px-4 py-2"
                dir="rtl"
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="glass-button-primary w-full py-2.5 disabled:opacity-60"
          >
            {isSubmitting ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          אין לך חשבון?{' '}
          <Link to="/auth/register" className="text-blue-400 hover:text-blue-300">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}
