/** @type {import('next').NextConfig} */
const nextConfig = {
    // Several local sessions sometimes work in this checkout at once, and
    // `next dev` / `next build` corrupt each other when they share `.next`.
    // NEXT_DIST_DIR gives each one its own build directory; deployments never
    // set it, so they keep the default.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
