import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
    id: number;
    email: string;
    role: number;
    name: string;
    picture: string;
}

export function useAuth(requireAuth = true) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/me')
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('Not authenticated');
            })
            .then((data) => {
                if (data.authenticated) {
                    setUser(data.user);
                } else {
                    setUser(null);
                    if (requireAuth) router.push('/login');
                }
            })
            .catch(() => {
                setUser(null);
                if (requireAuth) router.push('/login');
            })
            .finally(() => setLoading(false));
    }, [requireAuth, router]);

    return { user, loading };
}
