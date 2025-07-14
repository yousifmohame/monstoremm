import { useState, useCallback, useEffect } from 'react';

// Defines the structure of our site settings
export interface SiteSettings {
  shippingCost: number;
  taxRate: number;
  currency: string;
}

export const useSiteSettings = () => {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Function to fetch settings from our public API
    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) {
                throw new Error('Failed to fetch site settings');
            }
            const data = await response.json();
            setSettings(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch settings when the hook is first used
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, error, fetchSettings };
};
