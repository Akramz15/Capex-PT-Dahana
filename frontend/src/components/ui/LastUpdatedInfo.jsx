import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { statusApi } from '../../api/status';

const LastUpdatedInfo = ({ moduleName }) => {
    const [updateInfo, setUpdateInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUpdates = async () => {
            try {
                const data = await statusApi.getModuleUpdates();
                const moduleData = data.find(m => m.module_name === moduleName);
                if (moduleData) {
                    setUpdateInfo(moduleData);
                }
            } catch (error) {
                console.error("Failed to fetch module updates:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUpdates();
    }, [moduleName]);

    if (loading || !updateInfo) return null;

    const date = new Date(updateInfo.updated_at);
    const formatter = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    });

    const formattedDate = formatter.format(date).replace('pukul', '').trim();

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'var(--clr-surface)',
            border: '1px solid var(--clr-border)',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: 'var(--clr-text-secondary)',
            marginBottom: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <Clock size={14} style={{ color: 'var(--clr-primary)' }} />
            <span>Terakhir diperbarui: <strong style={{ color: 'var(--clr-text)' }}>{formattedDate} WIB</strong> oleh <strong style={{ color: 'var(--clr-text)' }}>{updateInfo.updated_by}</strong></span>
        </div>
    );
};

export default LastUpdatedInfo;
