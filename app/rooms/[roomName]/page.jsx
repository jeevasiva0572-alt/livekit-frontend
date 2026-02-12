import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';

export default async function Page({
    params,
    searchParams,
}) {
    // ✅ MUST await params
    const resolvedParams = await params;

    // ✅ MUST await searchParams
    const resolvedSearchParams = await searchParams;

    const roomName = resolvedParams.roomName;

    // We try to get from searchParams, but if they are missing (clean URL), 
    // PageClientImpl will look in sessionStorage.
    const token = resolvedSearchParams.token || null;
    const url = resolvedSearchParams.url || null;

    return (
        <PageClientImpl
            roomName={roomName}
            token={token}
            url={url}
        />
    );
}
