import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook to fetch top-level exam preparation categories from the backend.
 * Returns only top-level categories (parentCategory === null).
 */
export const useCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await api.get('/categories');
                // Only top-level categories (no parentCategory) are exam prep options
                const topLevel = (response.data.categories || []).filter(
                    (cat) => !cat.parentCategory
                );
                setCategories(topLevel);
            } catch (err) {
                setError(err.message || 'Failed to load categories');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return { categories, loading, error };
};
