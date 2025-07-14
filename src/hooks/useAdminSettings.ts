import { useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';

export interface SiteSettings {
  shippingCost: number;
  taxRate: number;
  currency: string;
  featuredBannerTitle: string;
  featuredBannerTitleAr: string;
  featuredBannerSubtitle: string;
  featuredBannerSubtitleAr: string;
  featuredBannerButtonText: string;
  featuredBannerButtonTextAr: string;
  featuredBannerLink: string;
}

export const useAdminSettings = () => {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // This API route does not require authentication to fetch public settings
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            const data = await response.json();
            setSettings(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (newSettings: Partial<SiteSettings>) => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) throw new Error("Authentication required");

            // Use the new admin-specific API route for updating
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify(newSettings),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update settings');
            }
            
            // Update local state immediately for a better user experience
            setSettings(prev => prev ? { ...prev, ...newSettings } : newSettings as SiteSettings);
        } catch (err: any) {
            setError(err.message);
            throw err; // Re-throw the error to be handled in the component
        } finally {
            setLoading(false);
        }
    }, []);

    return { settings, loading, error, fetchSettings, updateSettings };
};
