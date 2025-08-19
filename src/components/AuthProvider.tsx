import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { setCredentials, clearError } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          dispatch(setCredentials({
            token: session.access_token,
            user: {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email || '',
              email: session.user.email || '',
            }
          }));
        } else {
          dispatch(clearError());
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setCredentials({
          token: session.access_token,
          user: {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email || '',
            email: session.user.email || '',
          }
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
};