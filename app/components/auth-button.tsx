"use client";

import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function AuthButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md bg-green-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-600"
            >
                Authorize with Spotify
            </button>
            <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
