const BASE_URL = "https://dsa-verse.vercel.app";

export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
