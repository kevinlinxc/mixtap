import Link from "next/link";
import { Suspense } from "react";

import { BlendLinkDisplay } from "../blend-link-display";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Main({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }> | { error?: string };
}) {
    const resolvedSearchParams = await Promise.resolve(searchParams);
    const error = resolvedSearchParams?.error ?? null;

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-black via-zinc-950 to-black font-sans">
            {/* Clickable Title */}
            <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl px-6 py-6">
                    <Link href="/landing" className="group inline-block">
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300 group-hover:from-green-300 group-hover:to-emerald-400">
                            mixtap
                        </h1>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
                <div className="space-y-12 animate-fadeIn">
                    {/* Instructions Section */}
                    <section className="space-y-8">
                        <h2 className="text-2xl font-semibold text-zinc-100">How It Works</h2>

                        {/* Step 1 */}
                        <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/50 hover:bg-zinc-900">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-500">
                                    1
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-semibold text-zinc-100">Get Your Hands on an NFC Tag</h3>
                                    <p className="text-sm text-zinc-400">
                                        Purchase an NFC tag or sticker online or from a local electronics store. They're usually super cheap and your friends may have extra!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/50 hover:bg-zinc-900">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-500">
                                    2
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-semibold text-zinc-100">Authorize with Spotify to Get Your URL</h3>
                                    <p className="text-sm text-zinc-400">
                                        Click the button below to connect your Spotify account. Mixtap will generate a unique Blend URL that automatically updates with whoever taps your tag.
                                    </p>
                                    <div className="pt-2">
                                        <Link
                                            href="/auth"
                                            className="inline-flex items-center justify-center rounded-md bg-green-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600"
                                        >
                                            Authorize with Spotify
                                        </Link>
                                    </div>
                                    <div>
                                        <Suspense fallback={null}>
                                            <BlendLinkDisplay />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/50 hover:bg-zinc-900">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-500">
                                    3
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-semibold text-zinc-100">Load It Onto the NFC Tag</h3>
                                    <p className="text-sm text-zinc-400">
                                        Use an NFC writing app like NFC Tools (
                                        <a
                                            href="https://apps.apple.com/us/app/nfc-tools/id1252962749"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 underline"
                                        >
                                            iOS
                                        </a>
                                        ,{" "}
                                        <a
                                            href="https://play.google.com/store/apps/details?id=com.wakdev.wdnfc&hl=en_US"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 underline"
                                        >
                                            Android
                                        </a>
                                        ) to write your generated URL to the tag. The URL will be displayed below once you authorize.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/50 hover:bg-zinc-900">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-500">
                                    4
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-semibold text-zinc-100">Tap!</h3>
                                    <p className="text-sm text-zinc-400">
                                        When your friends tap the tag with their phone, they'll be taken to a new Spotify Blend URL that's automatically created for you!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                            <p className="text-sm text-red-400">
                                Something went wrong: {decodeURIComponent(error)}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
