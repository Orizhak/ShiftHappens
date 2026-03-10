import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Gender } from '@/types';

const schema = z.object({
  username: z.string().min(2, 'שם משתמש חייב להכיל לפחות 2 תווים'),
  name: z.string().min(2, 'שם מלא נדרש'),
  gender: z.nativeEnum(Gender),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: Gender.Male },
  });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const { user } = await authApi.register({
        username: data.username,
        password: data.password,
        name: data.name,
        gender: data.gender,
      });
      setUser(user);
      navigate('/user/dashboard');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהרשמה');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-8 shadow-[0_0_30px_rgba(34,197,94,0.1)] border-green-500/10">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Logo" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
          <h1 className="text-2xl font-bold text-white">הרשמה למערכת</h1>
          <p className="text-gray-400 mt-1">צור חשבון חדש</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="glass-card border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">שם משתמש</label>
            <input
              {...register('username')}
              className="glass-input w-full px-4 py-2"
              placeholder="שם משתמש"
              dir="rtl"
            />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">שם מלא</label>
            <input
              {...register('name')}
              className="glass-input w-full px-4 py-2"
              placeholder="שם פרטי ומשפחה"
              dir="rtl"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">מגדר</label>
            <select
              {...register('gender', { valueAsNumber: true })}
              className="glass-input w-full px-4 py-2"
              dir="rtl"
            >
              <option value="">בחר מגדר</option>
              <option value={Gender.Male}>זכר</option>
              <option value={Gender.Female}>נקבה</option>
            </select>
            {errors.gender && <p className="text-red-400 text-xs mt-1">{errors.gender.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">סיסמה</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="glass-input w-full px-4 py-2"
                placeholder="לפחות 6 תווים"
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
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">אימות סיסמה</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className="glass-input w-full px-4 py-2"
              placeholder="הכנס סיסמה שוב"
              dir="rtl"
            />
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-lg font-medium text-white transition-all disabled:opacity-60"
          >
            {isSubmitting ? 'נרשם...' : 'הרשמה'}
          </button>

          <div className="glass-card bg-blue-500/10 border-blue-500/20 p-3">
            <p className="text-sm text-blue-300 text-center">💡 לאחר ההרשמה תוכל להתחבר עם הפרטים שהכנסת</p>
          </div>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          כבר יש לך חשבון?{' '}
          <Link to="/auth/login" className="text-blue-400 hover:text-blue-300">
            כניסה
          </Link>
        </p>
      </div>
    </div>
  );
}
